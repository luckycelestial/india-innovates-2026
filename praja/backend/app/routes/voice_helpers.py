"""
Voice IVR — Helper utilities (extracted from voice.py)
"""
import re
import time
import secrets
from datetime import datetime, timezone

from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse

from app.db.database import get_supabase
from app.routes.whatsapp_helpers import get_or_create_user
detect_language, classify_with_groq


# ── Call context (stateful IVR memory based on Supabase) ──────────

def set_call_context(call_sid: str, data: dict):
    """Store call context in Supabase to persist across serverless instances."""
    sb = get_supabase()
    # Purgin stale contexts is now done via DB function or periodic task,
    # but here we just upsert the current SID.
    sb.table("call_contexts").upsert({
        "call_sid": call_sid,
        "data": data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

def get_call_context(call_sid: str) -> dict:
    """Retrieve call context from Supabase."""
    sb = get_supabase()
    res = sb.table("call_contexts").select("data").eq("call_sid", call_sid).execute()
    if res.data:
        return res.data[0].get("data", {})
    return {}

# Define a placeholder for backward compatibility in imports
CALL_CONTEXTS = {}


# ── Response helpers ──────────────────────────────────────────

def xml(resp: VoiceResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


def speak_ticket(ticket_id: str) -> str:
    return " ".join(list(ticket_id or ""))


# ── Language helpers ──────────────────────────────────────────

def detect_voice_language(text: str) -> str:
    """Map detect_language() output to Twilio locale codes."""
    lang = detect_language(text)
    lang_to_locale = {
        "Hindi": "hi-IN", "Tamil": "ta-IN", "Telugu": "te-IN",
        "Kannada": "kn-IN", "Malayalam": "ml-IN", "Bengali": "bn-IN",
        "English": "en-IN",
    }
    return lang_to_locale.get(lang, "en-IN")


def voice_for_lang(lang_code: str) -> str:
    voices = {
        "hi-IN": "Polly.Aditi",
        "ta-IN": "Google.ta-IN-Wavenet-C",
        "te-IN": "Google.te-IN-Wavenet-B",
        "kn-IN": "Google.kn-IN-Standard-A",
        "ml-IN": "Google.ml-IN-Standard-A",
        "bn-IN": "Google.bn-IN-Standard-A",
        "en-IN": "alice",
    }
    return voices.get(lang_code, "alice")


def say(resp: VoiceResponse, text: str, lang_code: str = "en-IN"):
    resp.say(text, voice=voice_for_lang(lang_code), language=lang_code)


# ── Ticket helpers ────────────────────────────────────────────

def normalize_ticket_id(value: str) -> str:
    raw = (value or "").upper()
    raw = re.sub(r"[^A-Z0-9-]", "", raw)
    return raw


def create_voice_grievance(sb, phone: str, issue_text: str, location_text: str):
    combined_text = f"{issue_text.strip()} Location: {location_text.strip()}"
    classification = classify_with_groq(combined_text)
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"

    user_id = get_or_create_user(phone, sb)
    sb.table("grievances").insert({
        "tracking_id": tracking_id,
        "citizen_id": user_id,
        "title": classification.get("title", issue_text[:80]),
        "description": combined_text,
        "ai_category": classification.get("category", "General"),
        "ai_sentiment": classification.get("sentiment", "negative"),
        "priority": classification.get("priority", "medium"),
        "status": "open",
        "channel": "voice",
        "location": classification.get("location", location_text.strip()),
    }).execute()

    return {
        "tracking_id": tracking_id,
        "category": classification.get("category", "General"),
        "priority": classification.get("priority", "medium"),
    }
