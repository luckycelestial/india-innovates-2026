"""
WhatsApp Bot via Twilio Sandbox
"""
import re
import json
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Form
from fastapi.responses import Response
from twilio.twiml.messaging_response import MessagingResponse
from groq import Groq

from app.config import settings
from app.db.database import get_supabase

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

CATEGORIES = [
    "Water Supply", "Roads", "Electricity", "Sanitation",
    "Drainage", "Parks", "Health", "Education", "General"
]

HELP_MSG = (
    "\U0001f44b *Welcome to PRAJA!*\n\n"
    "Send me your complaint in any language and I'll file it immediately.\n\n"
    "Commands:\n"
    "\u2022 *track <id>* \u2014 Check status of a complaint\n"
    "\u2022 *status* \u2014 See your last 3 complaints\n"
    "\u2022 *help* \u2014 Show this message"
)


def _translate(text: str) -> str:
    """Translate any Indic language / Tanglish text to English via Google Translate."""
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source='auto', target='en').translate(text[:500])
        return result or text
    except Exception:
        return text


def detect_language(text: str) -> str:
    """Detect the language of the text using simple Unicode range checks."""
    try:
        from deep_translator import GoogleTranslator
        # Check common Indic script ranges
        devanagari = any('\u0900' <= c <= '\u097F' for c in text)
        tamil      = any('\u0B80' <= c <= '\u0BFF' for c in text)
        telugu     = any('\u0C00' <= c <= '\u0C7F' for c in text)
        kannada    = any('\u0C80' <= c <= '\u0CFF' for c in text)
        malayalam  = any('\u0D00' <= c <= '\u0D7F' for c in text)
        bengali    = any('\u0980' <= c <= '\u09FF' for c in text)
        if devanagari: return "Hindi"
        if tamil:      return "Tamil"
        if telugu:     return "Telugu"
        if kannada:    return "Kannada"
        if malayalam:  return "Malayalam"
        if bengali:    return "Bengali"
        return "English"
    except Exception:
        return "English"


def classify_with_groq(text: str) -> dict:
    # Translate to English first so classification is language-agnostic
    text_en = _translate(text)
    prompt = f"""Classify this Indian citizen grievance. Respond with ONLY valid JSON (no markdown):
{{
  "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
  "priority": "<low|medium|high|critical>",
  "title": "<accurate 5-8 word English title>",
  "sentiment": "<negative|neutral|positive>"
}}

Rules:
- Suicide/self-harm ? critical, Health
- Death threat or threat to public figure ? critical, General
- Sexual assault / abduction ? critical, General

Complaint (translated to English): {text_en[:500]}"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.1,
        )
        raw = (response.choices[0].message.content or "").strip()
        raw = re.sub(r"^```json\s*|^```\s*|```$", "", raw, flags=re.MULTILINE).strip()
        data = json.loads(raw)
        if data.get("category") not in CATEGORIES:
            data["category"] = "General"
        if data.get("priority") not in ["low", "medium", "high", "critical"]:
            data["priority"] = "medium"
        return data
    except Exception:
        return {"category": "General", "priority": "medium", "title": text[:50], "sentiment": "negative"}


def get_or_create_user(phone: str, sb) -> str:
    from app.utils.jwt import get_password_hash
    clean_phone = phone.replace("whatsapp:", "")
    rows = sb.table("users").select("id").eq("phone", clean_phone).execute()
    if rows.data:
        return rows.data[0]["id"]
    new_user = sb.table("users").insert({
        "name":          f"WhatsApp User {clean_phone[-4:]}",
        "email":         f"wa_{clean_phone.replace('+', '')}@praja.local",
        "phone":         clean_phone,
        "role":          "citizen",
        "password_hash": get_password_hash(secrets.token_urlsafe(16)),
    }).execute()
    return new_user.data[0]["id"]


def priority_emoji(p: str) -> str:
    return {"critical": "\U0001f534", "high": "\U0001f7e0", "medium": "\U0001f7e1", "low": "\U0001f7e2"}.get(p, "\U0001f7e1")


def xml_response(resp: MessagingResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


@router.post("/webhook")
async def whatsapp_webhook(
    Body: str = Form(...),
    From: str = Form(...),
):
    sb = get_supabase()
    text = Body.strip()
    sender = From
    resp = MessagingResponse()

    if text.lower() in ("help", "hi", "hello", "helo", "hai"):
        resp.message(HELP_MSG)
        return xml_response(resp)

    track_match = re.match(r"^track\s+(\S+)", text, re.IGNORECASE)
    if track_match:
        ticket_id = track_match.group(1).strip()
        # Support both tracking_id (PRJ-...) and UUID
        if ticket_id.startswith("PRJ-"):
            rows = sb.table("grievances").select("*").eq("tracking_id", ticket_id).execute()
        else:
            rows = sb.table("grievances").select("*").eq("id", ticket_id).execute()
        if not rows.data:
            resp.message(f"\u274c No complaint found with ID *{ticket_id}*.\nSend *status* to see your complaints.")
            return xml_response(resp)
        g = rows.data[0]
        s_emoji = {"open": "\U0001f4ec", "in_progress": "\U0001f527", "resolved": "\u2705", "escalated": "\U0001f6a8", "closed": "\U0001f512"}.get(g["status"], "\U0001f4cb")
        created_at = g.get("created_at", "")
        sla_hours_left = ""
        if created_at:
            try:
                filed_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                hours_elapsed = (datetime.now(timezone.utc) - filed_time).total_seconds() / 3600
                hours_left = max(0, 72 - hours_elapsed)
                if g.get("status") == "resolved":
                    sla_hours_left = "\n\u2705 *SLA:* Resolved within deadline"
                elif hours_left > 0:
                    sla_hours_left = f"\n\u23f0 *SLA:* {hours_left:.0f}h remaining (72h window)"
                else:
                    sla_hours_left = "\n\U0001f6a8 *SLA:* BREACHED — escalation triggered"
            except Exception:
                pass
        reply = (
            f"{s_emoji} *Complaint Status — PRAJA*\n\n"
            f"\U0001f194 *ID:* {g['tracking_id']}\n"
            f"\U0001f4cc *Title:* {g.get('title', g.get('description', '')[:40])}\n"
            f"\U0001f3f7 *Department:* {g.get('ai_category', 'General')}\n"
            f"\U0001f4ca *Status:* {g['status'].replace('_', ' ').title()}\n"
            f"{priority_emoji(g['priority'])} *Priority:* {g['priority'].title()}"
            f"{sla_hours_left}"
            + (f"\n\n\U0001f4dd *Resolution:* {g['resolution_note']}" if g.get("resolution_note") else "\n\nReply *help* for more commands.")
        )
        resp.message(reply)
        return xml_response(resp)

    if text.lower() == "status":
        user_id = get_or_create_user(sender, sb)
        rows = (
            sb.table("grievances")
            .select("id,tracking_id,title,status,priority,ai_category")
            .eq("citizen_id", user_id)
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )
        if not rows.data:
            resp.message("You have no complaints yet. Send me your issue to get started!")
            return xml_response(resp)
        lines = ["\U0001f4cb *Your Recent Complaints:*\n"]
        for g in rows.data:
            st = g["status"].replace("_", " ").title()
            lines.append(f"\u2022 {g.get('tracking_id', g['id'][:8])} | {g.get('ai_category','General')} | {st}")
        lines.append("\nSend *track <full_id>* to see full details.")
        resp.message("\n".join(lines))
        return xml_response(resp)

    user_id = get_or_create_user(sender, sb)
    lang = detect_language(text)
    classification = classify_with_groq(text)
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
    row = sb.table("grievances").insert({
        "tracking_id":  tracking_id,
        "citizen_id":   user_id,
        "title":        classification.get("title", text[:80]),
        "description":  text,
        "ai_category":  classification["category"],
        "ai_sentiment": classification.get("sentiment", "negative"),
        "priority":     classification["priority"],
        "status":       "open",
        "channel":      "whatsapp",
    }).execute()
    g = row.data[0]
    prio = classification['priority']
    prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
    sentiment = classification.get('sentiment', 'negative').title()
    sentiment_emoji = {"Negative": "\U0001f621", "Positive": "\U0001f604", "Neutral": "\U0001f610"}.get(sentiment, "\U0001f4ac")
    reply = (
        f"\U0001f916 *AI Processing Complete*\n"
        f"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n"
        f"\u2705 Language: *{lang}*\n"
        f"\U0001f3f7 Department: *{classification['category']}*\n"
        f"\u26a1 Priority: *{prio.title()} ({prio_label})*\n"
        f"\U0001f4cd Location: Delhi North Ward\n"
        f"{sentiment_emoji} Sentiment: *{sentiment}*\n\n"
        f"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
        f"\U0001f194 Ticket *{g['tracking_id']}* created.\n"
        f"\U0001f4e4 Routed to *{classification['category']}* Department.\n"
        f"\U0001f4f2 Officer notified.\n\n"
        f"\U0001f3af *SLA Timeline:* 72 hours to resolve\n\n"
        f"Track: reply *track {g['tracking_id']}*"
    )
    resp.message(reply)
    return xml_response(resp)
