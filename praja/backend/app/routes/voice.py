"""
Voice IVR for PRAJA via Twilio
Citizen calls the Canadian number → speaks their complaint → AI classifies → stored in Supabase → SMS confirmation sent back
"""
import secrets
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Form, Request
from fastapi.responses import Response

from twilio.twiml.voice_response import VoiceResponse, Gather

from app.db.database import get_supabase
from app.routes.whatsapp import get_or_create_user, classify_with_groq
from app.routes.sms import send_sms_via_twilio

router = APIRouter()

WELCOME_MSG = (
    "Welcome to PRAJA, the AI-powered citizen grievance platform. "
    "Please describe your complaint clearly after the beep, and I will file it for you immediately. "
    "Speak in any language."
)
FALLBACK_MSG = (
    "Sorry, I could not hear you. Please try again or send an SMS to this number with your complaint."
)
NO_SPEECH_MSG = (
    "No input was received. Please call back and describe your complaint, or send us an SMS."
)

CALL_CONTEXTS = {}


def _xml(resp: VoiceResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


def _speak_ticket(ticket_id: str) -> str:
    return " ".join(list(ticket_id or ""))


def _detect_language(text: str) -> str:
    if any('\u0900' <= c <= '\u097F' for c in text):
        return "hi-IN"
    if any('\u0B80' <= c <= '\u0BFF' for c in text):
        return "ta-IN"
    if any('\u0C00' <= c <= '\u0C7F' for c in text):
        return "te-IN"
    if any('\u0C80' <= c <= '\u0CFF' for c in text):
        return "kn-IN"
    if any('\u0D00' <= c <= '\u0D7F' for c in text):
        return "ml-IN"
    if any('\u0980' <= c <= '\u09FF' for c in text):
        return "bn-IN"
    return "en-IN"


def _voice_for_lang(lang_code: str) -> str:
    return "alice"


def _say(resp: VoiceResponse, text: str, lang_code: str = "en-IN"):
    resp.say(text, voice=_voice_for_lang(lang_code), language=lang_code)


def _normalize_ticket_id(value: str) -> str:
    raw = (value or "").upper()
    raw = re.sub(r"[^A-Z0-9-]", "", raw)
    return raw


def _create_voice_grievance(sb, phone: str, issue_text: str, location_text: str):
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
    }).execute()

    return {
        "tracking_id": tracking_id,
        "category": classification.get("category", "General"),
        "priority": classification.get("priority", "medium"),
    }


@router.post("/inbound")
async def voice_inbound(From: str = Form(...), To: str = Form(...), CallSid: str = Form(default="")):
    """Step 1: Interactive entry menu to collect complaint or track ticket."""
    resp = VoiceResponse()

    if CallSid:
        CALL_CONTEXTS[CallSid] = {"from": From}

    gather = Gather(
        input="speech",
        action="/api/voice/menu",
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language="en-IN",
        enhanced=True,
    )
    gather.say(
        "Welcome to Praja voice assistant. Please speak naturally. "
        "Say file complaint to register a new complaint, or say track ticket to check status.",
        voice="alice",
        language="en-IN",
    )
    resp.append(gather)
    _say(resp, NO_SPEECH_MSG, "en-IN")
    return _xml(resp)


@router.post("/menu")
async def voice_menu(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    spoken = (SpeechResult or "").strip().lower()
    lang_code = _detect_language(SpeechResult or "")

    if CallSid and CallSid not in CALL_CONTEXTS:
        CALL_CONTEXTS[CallSid] = {"from": From}
    if CallSid:
        ctx = CALL_CONTEXTS.get(CallSid, {"from": From})
        ctx["lang"] = lang_code
        CALL_CONTEXTS[CallSid] = ctx

    wants_file = any(k in spoken for k in ("file", "complaint", "register", "issue", "புகார்", "शिकायत", "ఫిర్యాదు"))
    wants_track = any(k in spoken for k in ("track", "status", "ticket", "நிலை", "स्थिति", "స్థితి"))

    if wants_file:
        gather = Gather(
            input="speech",
            action="/api/voice/complaint/issue",
            method="POST",
            timeout=8,
            speech_timeout="auto",
            language=lang_code,
            enhanced=True,
        )
        gather.say("Please tell your issue briefly after the beep.", voice=_voice_for_lang(lang_code), language=lang_code)
        resp.append(gather)
        _say(resp, "No issue captured. Please call again.", lang_code)
        return _xml(resp)

    if wants_track:
        gather = Gather(
            input="speech",
            action="/api/voice/track",
            method="POST",
            timeout=8,
            speech_timeout="auto",
            language=lang_code,
            enhanced=True,
        )
        gather.say("Please say your ticket I D.", voice=_voice_for_lang(lang_code), language=lang_code)
        resp.append(gather)
        _say(resp, "No ticket I D received. Please call again.", lang_code)
        return _xml(resp)

    _say(resp, "I could not understand. Please say file complaint or track ticket.", lang_code)
    resp.hangup()
    return _xml(resp)


@router.post("/complaint/issue")
async def voice_collect_issue(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    issue_text = (SpeechResult or "").strip()
    lang_code = _detect_language(issue_text)
    if not issue_text:
        _say(resp, FALLBACK_MSG, lang_code)
        resp.hangup()
        return _xml(resp)

    if CallSid:
        ctx = CALL_CONTEXTS.get(CallSid, {"from": From})
        ctx["issue"] = issue_text
        ctx["lang"] = lang_code
        CALL_CONTEXTS[CallSid] = ctx

    gather = Gather(
        input="speech",
        action="/api/voice/complaint/location",
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language=lang_code,
        enhanced=True,
    )
    gather.say("Now tell the exact location, such as area name, street, and nearby landmark.", voice=_voice_for_lang(lang_code), language=lang_code)
    resp.append(gather)
    _say(resp, "No location captured. Please call again.", lang_code)
    return _xml(resp)


@router.post("/complaint/location")
async def voice_collect_location(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    location_text = (SpeechResult or "").strip()
    lang_code = _detect_language(location_text)
    if not location_text:
        _say(resp, "Location not received. Please call again and include landmark details.", lang_code)
        resp.hangup()
        return _xml(resp)

    sb = get_supabase()
    issue_text = ""
    if CallSid:
        ctx = CALL_CONTEXTS.get(CallSid, {}) or {}
        issue_text = ctx.get("issue", "")
        lang_code = ctx.get("lang", lang_code)
    if not issue_text:
        issue_text = "Citizen reported an issue by voice call."

    try:
        created = _create_voice_grievance(sb, From, issue_text, location_text)
    except Exception:
        _say(resp, "Sorry, we could not file your complaint right now. Please try again.", lang_code)
        resp.hangup()
        return _xml(resp)

    tracking_id = created["tracking_id"]
    category = created["category"]
    priority = created["priority"]

    _say(
        resp,
        f"Your complaint has been registered under {category}. "
        f"Ticket I D is {_speak_ticket(tracking_id)}. "
        f"Priority is {priority}. You will get SMS confirmation shortly.",
        lang_code,
    )
    resp.hangup()

    sms_body = (
        f"PRAJA Voice Complaint Registered\n"
        f"Ticket: {tracking_id}\n"
        f"Dept: {category}\n"
        f"Priority: {priority.upper()}\n"
        f"Track: reply 'track {tracking_id}' to this number."
    )
    send_sms_via_twilio(From, sms_body)

    if CallSid and CallSid in CALL_CONTEXTS:
        CALL_CONTEXTS.pop(CallSid, None)

    return _xml(resp)


@router.post("/track")
async def voice_track_ticket(
    From: str = Form(...),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    raw_ticket = (SpeechResult or "").strip()
    lang_code = _detect_language(raw_ticket)
    ticket_id = _normalize_ticket_id(raw_ticket)

    if not ticket_id:
        _say(resp, "I could not capture the ticket I D. Please call again.", lang_code)
        resp.hangup()
        return _xml(resp)

    sb = get_supabase()
    rows = sb.table("grievances").select("tracking_id,status,priority,ai_category").eq("tracking_id", ticket_id).execute()
    if not rows.data:
        _say(
            resp,
            "No complaint found with that ticket I D. Please check and try again, or send status on WhatsApp.",
            lang_code,
        )
        resp.hangup()
        return _xml(resp)

    g = rows.data[0]
    _say(
        resp,
        f"Ticket {_speak_ticket(g['tracking_id'])}. "
        f"Status {str(g.get('status', 'open')).replace('_', ' ')}. "
        f"Department {g.get('ai_category', 'General')}. "
        f"Priority {g.get('priority', 'medium')}.",
        lang_code,
    )
    resp.hangup()
    return _xml(resp)


@router.post("/gather")
async def voice_gather(
    From: str = Form(...),
    SpeechResult: str = Form(default=""),
    Confidence: str = Form(default="0"),
):
    """Backward compatibility endpoint: old Twilio config may still point here."""
    resp = VoiceResponse()

    text = (SpeechResult or "").strip()
    lang_code = _detect_language(text)
    if not text:
        _say(resp, FALLBACK_MSG, lang_code)
        return _xml(resp)

    sb = get_supabase()
    try:
        created = _create_voice_grievance(sb, From, text, "Location not provided")
    except Exception:
        _say(resp, "Sorry, we could not file your complaint right now. Please try again.", lang_code)
        return _xml(resp)

    category = created["category"]
    priority = created["priority"]
    tracking_id = created["tracking_id"]

    _say(
        resp,
        f"Thank you. Your complaint about {category} has been registered successfully. "
        f"Your ticket ID is {_speak_ticket(tracking_id)}. "
        f"Priority is {priority}. "
        f"You will receive an SMS confirmation now. "
        f"You can track your complaint by sending 'track {tracking_id}' via SMS to this number.",
        lang_code,
    )

    sms_body = (
        f"✅ PRAJA Complaint Registered\n"
        f"Ticket: {tracking_id}\n"
        f"Dept: {category}\n"
        f"Priority: {priority.upper()}\n"
        f"Track: reply 'track {tracking_id}' to this number."
    )
    send_sms_via_twilio(From, sms_body)

    return _xml(resp)


@router.post("/outbound/start")
async def voice_outbound_start():
    """Initial greeting for outbound call triggered from WhatsApp."""
    resp = VoiceResponse()
    # Ask for language via numbers
    gather = Gather(
        num_digits=1,
        action="/api/voice/outbound/language",
        method="POST",
        timeout=10
    )
    gather.say(
        "Welcome to Praja. Press 1 for English. Press 2 for Hindi. Press 3 for Tamil.",
        voice="alice",
        language="en-IN"
    )
    resp.append(gather)
    # Correct handling of no input
    resp.say("No input received. Goodbye.", voice="alice", language="en-IN")
    resp.hangup()
    return _xml(resp)


@router.post("/outbound/language")
async def voice_outbound_language(Digits: str = Form(default=""), CallSid: str = Form(default="")):
    """Handles digit input and asks for complaint in selected language."""
    resp = VoiceResponse()
    lang_map = {"1": "en-IN", "2": "hi-IN", "3": "ta-IN"}
    lang_code = lang_map.get(Digits, "en-IN")

    if CallSid:
        ctx = CALL_CONTEXTS.get(CallSid, {})
        ctx["lang"] = lang_code
        CALL_CONTEXTS[CallSid] = ctx

    # Localized prompts for the selected language
    prompts = {
        "en-IN": "Please describe your complaint clearly after the beep.",
        "hi-IN": "कृपया बीप के बाद अपनी शिकायत बताएं।",
        "ta-IN": "பீப் சத்தத்திற்குப் பிறகு உங்கள் புகாரைத் தெளிவாகக் கூறுங்கள்."
    }
    prompt = prompts.get(lang_code, prompts["en-IN"])

    gather = Gather(
        input="speech",
        action="/api/voice/complaint/issue", # Reuse existing issue gatherer
        method="POST",
        timeout=10,
        speech_timeout="auto",
        language=lang_code,
        enhanced=True
    )
    gather.say(prompt, voice=_voice_for_lang(lang_code), language=lang_code)
    resp.append(gather)
    # Fallback
    resp.say("I could not hear any speech. Goodbye.", voice=_voice_for_lang(lang_code), language=lang_code)
    resp.hangup()
    return _xml(resp)


@router.post("/status-callback")
async def voice_status(request: Request):
    """Optional: Twilio calls this when call completes (for logs)."""
    return Response(content="<Response/>", media_type="text/xml")
