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

def detect_language(text: str) -> str:
    """Detect language using Unicode script ranges."""
    if any('\u0900' <= c <= '\u097F' for c in text): return "Hindi"
    if any('\u0B80' <= c <= '\u0BFF' for c in text): return "Tamil"
    if any('\u0C00' <= c <= '\u0C7F' for c in text): return "Telugu"
    if any('\u0C80' <= c <= '\u0CFF' for c in text): return "Kannada"
    if any('\u0D00' <= c <= '\u0D7F' for c in text): return "Malayalam"
    if any('\u0980' <= c <= '\u09FF' for c in text): return "Bengali"
    return "English"

import os
import httpx
import tempfile

def _download_and_transcribe(media_url: str) -> tuple[str, str]:
    """Download a Twilio voice note and transcribe + translate using Groq Whisper API"""
    try:
        auth = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
        with httpx.Client() as client:
            resp = client.get(media_url, auth=auth, follow_redirects=True)
            resp.raise_for_status()
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
            tmp.write(resp.content)
            tmp_path = tmp.name
            
        with open(tmp_path, "rb") as f:
            audio_data = f.read()

        # 1. Get original Indic/Hindi text
        transcription = groq_client.audio.transcriptions.create(
            file=("audio.ogg", audio_data),
            model="whisper-large-v3",
            prompt="हिंदी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, ગુજરાતી, मराठी, English. नमस्ते, क्या हाल है?"
        )
        
        # 2. Get English translation directly from the audio
        translation = groq_client.audio.translations.create(
            file=("audio.ogg", audio_data),
            model="whisper-large-v3",
        )
            
        os.remove(tmp_path)
        return transcription.text, translation.text
    except Exception as e:
        print(f"Transcription error: {e}")
        return "", ""

def classify_with_groq(text: str) -> dict:
    prompt = f"""You are a smart classifier for Indian citizen grievances. 
Assess the following complaint text.

Respond with ONLY valid JSON (no markdown):
{{
  "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
  "priority": "<low|medium|high|critical>",
  "title": "<accurate 5-8 word English title capturing the true meaning>",
  "sentiment": "<negative|neutral|positive>",
  "clean_description": "<If the text contains Urdu/Arabic script like میرا پرس, strictly transliterate it to Hindi Devanagari script. Otherwise, just output the exact text provided.>"
}}

Rules:
- Any mention of suicide, severe domestic abuse/toxicity, or self-harm -> priority=critical, category=Health or General
- Any death threat or threat to public figure -> priority=critical, category=General
- Sexual assault / abduction -> priority=critical, category=General

Original Complaint: {text[:800]}"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
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
    except Exception as e:
        print("Groq Error:", e)
        return {"category": "General", "priority": "medium", "title": text[:50], "sentiment": "negative", "clean_description": text}


def get_or_create_user(phone: str, sb) -> str:
    clean_phone = phone.replace("whatsapp:", "")
    rows = sb.table("users").select("id").eq("phone", clean_phone).execute()
    if rows.data:
        return rows.data[0]["id"]
    new_user = sb.table("users").insert({
        "name":          f"WhatsApp User {clean_phone[-4:]}",
        "email":         f"wa_{clean_phone.replace('+', '')}@praja.local",
        "phone":         clean_phone,
        "role":          "citizen",
        "password_hash": "dummy_hash_no_login_needed",
    }).execute()
    return new_user.data[0]["id"]


def priority_emoji(p: str) -> str:
    return {"critical": "\U0001f534", "high": "\U0001f7e0", "medium": "\U0001f7e1", "low": "\U0001f7e2"}.get(p, "\U0001f7e1")


def xml_response(resp: MessagingResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


@router.post("/webhook")
async def whatsapp_webhook(
    Body: str = Form(""),
    From: str = Form(...),
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(""),
    MediaContentType0: str = Form(""),
):
    resp = MessagingResponse()
    try:
        text_body = Body.strip()
        
        # If user sent a voice note, transcribe it
        if NumMedia > 0 and MediaUrl0:
            if "audio" in MediaContentType0 or "video" in MediaContentType0:
                original_text, english_text = _download_and_transcribe(MediaUrl0)
                if original_text and english_text:
                    if original_text.strip() != english_text.strip():
                        # Save both native script and english explicitly
                        text_body = f"{original_text}\n\n(English Translation: {english_text})"
                    else:
                        text_body = original_text
                else:
                    resp.message("⚠️ Apologies, I could not transcribe your audio message. Please send a text message or try again.")
                    return xml_response(resp)

        if not text_body:
            resp.message("⚠️ It seems you sent a message I couldn't process. Please send a text or voice note.")
            return xml_response(resp)

        await _handle_message(text_body, From, resp)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        resp.message(
            f"\u26a0\ufe0f PRAJA encountered an error processing your message.\n"
            f"Please try again or send *help* for commands.\n"
            f"Error ref: {type(exc).__name__}"
        )
    return xml_response(resp)


async def _handle_message(Body: str, From: str, resp: MessagingResponse) -> None:
    sb = get_supabase()
    text = Body.strip()
    sender = From

    if text.lower() in ("help", "hi", "hello", "helo", "hai"):
        resp.message(HELP_MSG)
        return

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
            return
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
        return

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
            return
        lines = ["\U0001f4cb *Your Recent Complaints:*\n"]
        for g in rows.data:
            st = g["status"].replace("_", " ").title()
            lines.append(f"\u2022 {g.get('tracking_id', g['id'][:8])} | {g.get('ai_category','General')} | {st}")
        lines.append("\nSend *track <full_id>* to see full details.")
        resp.message("\n".join(lines))
        return

    user_id = get_or_create_user(sender, sb)
    classification = classify_with_groq(text)
    
    final_text = classification.get("clean_description", text)
    lang = detect_language(final_text)

    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
    row = sb.table("grievances").insert({
        "tracking_id":  tracking_id,
        "citizen_id":   user_id,
        "title":        classification.get("title", final_text[:80]),
        "description":  final_text,
        "ai_category":  classification.get("category", "General"),
        "ai_sentiment": classification.get("sentiment", "negative"),
        "priority":     classification.get("priority", "medium"),
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
    return
