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
        input="dtmf speech",
        num_digits=1,
        action="/api/voice/menu",
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language="en-IN",
        enhanced=True,
    )
    gather.say(
        "Welcome to Praja voice assistant. Press 1 to file a new complaint. "
        "Press 2 to track an existing ticket. "
        "Or say file complaint or track ticket.",
        voice="Polly.Aditi",
        language="en-IN",
    )
    resp.append(gather)
    resp.say(NO_SPEECH_MSG, voice="Polly.Aditi", language="en-IN")
    return _xml(resp)


@router.post("/menu")
async def voice_menu(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    Digits: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    spoken = (SpeechResult or "").strip().lower()
    digit = (Digits or "").strip()

    if CallSid and CallSid not in CALL_CONTEXTS:
        CALL_CONTEXTS[CallSid] = {"from": From}

    wants_file = digit == "1" or "file" in spoken or "complaint" in spoken
    wants_track = digit == "2" or "track" in spoken or "status" in spoken

    if wants_file:
        gather = Gather(
            input="speech",
            action="/api/voice/complaint/issue",
            method="POST",
            timeout=8,
            speech_timeout="auto",
            language="hi-IN",
            enhanced=True,
        )
        gather.say(
            "Please tell your issue briefly after the beep. For example, no water supply for two days.",
            voice="Polly.Aditi",
            language="en-IN",
        )
        resp.append(gather)
        resp.say("No issue captured. Please call again.", voice="Polly.Aditi", language="en-IN")
        return _xml(resp)

    if wants_track:
        gather = Gather(
            input="speech",
            action="/api/voice/track",
            method="POST",
            timeout=8,
            speech_timeout="auto",
            language="en-IN",
            enhanced=True,
        )
        gather.say(
            "Please say your ticket I D, for example P R J dash two six zero three zero five dash A B C one two three.",
            voice="Polly.Aditi",
            language="en-IN",
        )
        resp.append(gather)
        resp.say("No ticket I D received. Please call again.", voice="Polly.Aditi", language="en-IN")
        return _xml(resp)

    resp.say(
        "I could not understand your choice. Please call again and press 1 to file complaint or 2 to track ticket.",
        voice="Polly.Aditi",
        language="en-IN",
    )
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
    if not issue_text:
        resp.say(FALLBACK_MSG, voice="Polly.Aditi", language="en-IN")
        resp.hangup()
        return _xml(resp)

    if CallSid:
        ctx = CALL_CONTEXTS.get(CallSid, {"from": From})
        ctx["issue"] = issue_text
        CALL_CONTEXTS[CallSid] = ctx

    gather = Gather(
        input="speech",
        action="/api/voice/complaint/location",
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language="hi-IN",
        enhanced=True,
    )
    gather.say(
        "Now tell the exact location, such as area name, street, and nearby landmark.",
        voice="Polly.Aditi",
        language="en-IN",
    )
    resp.append(gather)
    resp.say("No location captured. Please call again.", voice="Polly.Aditi", language="en-IN")
    return _xml(resp)


@router.post("/complaint/location")
async def voice_collect_location(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    location_text = (SpeechResult or "").strip()
    if not location_text:
        resp.say("Location not received. Please call again and include landmark details.", voice="Polly.Aditi", language="en-IN")
        resp.hangup()
        return _xml(resp)

    sb = get_supabase()
    issue_text = ""
    if CallSid:
        issue_text = (CALL_CONTEXTS.get(CallSid, {}) or {}).get("issue", "")
    if not issue_text:
        issue_text = "Citizen reported an issue by voice call."

    try:
        created = _create_voice_grievance(sb, From, issue_text, location_text)
    except Exception:
        resp.say("Sorry, we could not file your complaint right now. Please try again.", voice="Polly.Aditi", language="en-IN")
        resp.hangup()
        return _xml(resp)

    tracking_id = created["tracking_id"]
    category = created["category"]
    priority = created["priority"]

    resp.say(
        f"Your complaint has been registered under {category}. "
        f"Ticket I D is {_speak_ticket(tracking_id)}. "
        f"Priority is {priority}. You will get SMS confirmation shortly.",
        voice="Polly.Aditi",
        language="en-IN",
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
    ticket_id = _normalize_ticket_id(raw_ticket)

    if not ticket_id:
        resp.say("I could not capture the ticket I D. Please call again.", voice="Polly.Aditi", language="en-IN")
        resp.hangup()
        return _xml(resp)

    sb = get_supabase()
    rows = sb.table("grievances").select("tracking_id,status,priority,ai_category").eq("tracking_id", ticket_id).execute()
    if not rows.data:
        resp.say(
            "No complaint found with that ticket I D. Please check and try again, or send status on WhatsApp.",
            voice="Polly.Aditi",
            language="en-IN",
        )
        resp.hangup()
        return _xml(resp)

    g = rows.data[0]
    resp.say(
        f"Ticket {_speak_ticket(g['tracking_id'])}. "
        f"Status {str(g.get('status', 'open')).replace('_', ' ')}. "
        f"Department {g.get('ai_category', 'General')}. "
        f"Priority {g.get('priority', 'medium')}.",
        voice="Polly.Aditi",
        language="en-IN",
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
    if not text:
        resp.say(FALLBACK_MSG, voice="Polly.Aditi", language="en-IN")
        return _xml(resp)

    sb = get_supabase()
    try:
        created = _create_voice_grievance(sb, From, text, "Location not provided")
    except Exception:
        resp.say("Sorry, we could not file your complaint right now. Please try again.", voice="Polly.Aditi", language="en-IN")
        return _xml(resp)

    category = created["category"]
    priority = created["priority"]
    tracking_id = created["tracking_id"]

    resp.say(
        f"Thank you. Your complaint about {category} has been registered successfully. "
        f"Your ticket ID is {_speak_ticket(tracking_id)}. "
        f"Priority is {priority}. "
        f"You will receive an SMS confirmation now. "
        f"You can track your complaint by sending 'track {tracking_id}' via SMS to this number.",
        voice="Polly.Aditi",
        language="en-IN",
    )

    sms_body = (
        f"✅ PRAJA Complaint Registered\n"
        f"Ticket: {tracking_id}\n"
        f"Dept: {category}\n"
        f"Priority: {priority.upper()}\n"
        f"Track: reply 'track {tracking_id}' to this number."
    )
    send_sms_via_twilio(phone, sms_body)

    return _xml(resp)


@router.post("/status-callback")
async def voice_status(request: Request):
    """Optional: Twilio calls this when call completes (for logs)."""
    return Response(content="<Response/>", media_type="text/xml")
