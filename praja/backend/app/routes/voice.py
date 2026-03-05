"""
Voice IVR for PRAJA via Twilio
Citizen calls the Canadian number → speaks their complaint → AI classifies → stored in Supabase → SMS confirmation sent back
"""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Form, Request
from fastapi.responses import Response

from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.rest import Client as TwilioClient

from app.config import settings
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


def _xml(resp: VoiceResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


@router.post("/inbound")
async def voice_inbound(From: str = Form(...), To: str = Form(...)):
    """Step 1: Answer the call, greet citizen and start speech gathering."""
    resp = VoiceResponse()
    gather = Gather(
        input="speech",
        action="/api/voice/gather",
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language="hi-IN",          # Supports Hindi; fallback auto-detects English too
        enhanced=True,
    )
    gather.say(WELCOME_MSG, voice="Polly.Aditi", language="hi-IN")
    resp.append(gather)
    # If no input detected after gather timeout
    resp.say(NO_SPEECH_MSG, voice="Polly.Aditi", language="hi-IN")
    return _xml(resp)


@router.post("/gather")
async def voice_gather(
    From: str = Form(...),
    SpeechResult: str = Form(default=""),
    Confidence: str = Form(default="0"),
):
    """Step 2: Receive transcribed speech, classify, store, send SMS, respond with ticket ID."""
    resp = VoiceResponse()

    text = (SpeechResult or "").strip()
    if not text:
        resp.say(FALLBACK_MSG, voice="Polly.Aditi", language="hi-IN")
        return _xml(resp)

    sb = get_supabase()
    phone = From  # e.g. +919876543210

    # Create or get user
    try:
        user_id = get_or_create_user(phone, sb)
    except Exception:
        try:
            user = sb.table("users").insert({
                "name": f"Voice User {phone[-4:]}",
                "email": f"voice_{phone.replace('+', '')}@praja.local",
                "phone": phone,
                "role": "citizen",
            }).execute()
            user_id = user.data[0]["id"]
        except Exception:
            resp.say("Sorry, there was an error creating your account. Please try again.", voice="Polly.Aditi")
            return _xml(resp)

    # AI classification
    classification = classify_with_groq(text)
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"

    try:
        row = sb.table("grievances").insert({
            "tracking_id":  tracking_id,
            "citizen_id":   user_id,
            "title":        classification.get("title", text[:80]),
            "description":  text,
            "ai_category":  classification.get("category", "General"),
            "ai_sentiment": classification.get("sentiment", "negative"),
            "priority":     classification.get("priority", "medium"),
            "status":       "open",
            "channel":      "voice",
        }).execute()
    except Exception as e:
        resp.say("Sorry, we could not file your complaint right now. Please try again.", voice="Polly.Aditi")
        return _xml(resp)

    category = classification.get("category", "General")
    priority = classification.get("priority", "medium")

    # Voice reply
    resp.say(
        f"Thank you. Your complaint about {category} has been registered successfully. "
        f"Your ticket ID is {' '.join(tracking_id)}. "
        f"Priority is {priority}. "
        f"You will receive an SMS confirmation now. "
        f"You can track your complaint by sending 'track {tracking_id}' via SMS to this number.",
        voice="Polly.Aditi",
        language="hi-IN",
    )

    # Send SMS confirmation
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
