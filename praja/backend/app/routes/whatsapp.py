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


def classify_with_groq(text: str) -> dict:
    prompt = f"""You are a classifier for Indian citizen grievances sent via WhatsApp. Inputs may be in English, Tamil, Telugu, Hindi, Marathi, or Tanglish (Indian language written in English letters like "thanni problem" = water problem, "road la kuzhi" = pothole on road). Translate and understand the ACTUAL meaning first, then classify.

CRITICAL RULES:
- Any mention of suicide, self-harm, or killing oneself → priority=critical, category=Health
- Any death threat or threat to a public figure → priority=critical, category=General
- Sexual assault, abduction, or violence → priority=critical, category=General
- Otherwise: water/thanni=Water Supply, road/pothole/kuzhi=Roads, current/power=Electricity, garbage/sewage/kuppai=Sanitation, hospital/health=Health, school=Education

Generate a concise English title that ACCURATELY reflects the actual complaint meaning.

Respond with ONLY valid JSON (no markdown):
{{
  "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
  "priority": "<low|medium|high|critical>",
  "title": "<accurate 5-8 word English title reflecting the real complaint>",
  "sentiment": "<negative|neutral|positive>"
}}

Complaint: {text[:500]}"""
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
        reply = (
            f"{s_emoji} *Complaint Status*\n\n"
            f"\U0001f194 *ID:* {g['tracking_id']}\n"
            f"\U0001f4cc *Title:* {g.get('title', g.get('description', '')[:40])}\n"
            f"\U0001f3f7 *Category:* {g.get('ai_category', 'General')}\n"
            f"\U0001f4ca *Status:* {g['status'].replace('_', ' ').title()}\n"
            f"{priority_emoji(g['priority'])} *Priority:* {g['priority'].title()}\n"
            + (f"\U0001f4dd *Resolution:* {g['resolution_note']}" if g.get("resolution_note") else "")
        )
        resp.message(reply)
        return xml_response(resp)

    if text.lower() == "status":
        user_id = get_or_create_user(sender, sb)
        rows = (
            sb.table("grievances")
            .select("id,title,status,priority,category")
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
            lines.append(f"\u2022 {g['tracking_id']} | {g.get('ai_category','General')} | {st}")
        lines.append("\nSend *track <full_id>* to see full details.")
        resp.message("\n".join(lines))
        return xml_response(resp)

    user_id = get_or_create_user(sender, sb)
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
    reply = (
        f"\u2705 *Complaint Filed \u2014 PRAJA*\n\n"
        f"\U0001f194 *Tracking ID:* `{g['tracking_id']}`\n"
        f"\U0001f4cc *Category:* {classification['category']}\n"
        f"{priority_emoji(classification['priority'])} *Priority:* {classification['priority'].title()}\n\n"
        f"Your complaint has been registered and assigned to the concerned department.\n\n"
        f"\U0001f4f2 Reply *track {g['tracking_id']}* to check status anytime.\n"
        f"\U0001f4f2 Reply *status* for all your complaints."
    )
    resp.message(reply)
    return xml_response(resp)
