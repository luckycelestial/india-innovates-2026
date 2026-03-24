"""
Voice IVR for PRAJA via Twilio
Citizen calls the Canadian number → speaks their complaint → AI classifies → stored in Supabase → SMS confirmation sent back
"""
import secrets
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Form, Request, Query
from fastapi.responses import Response

from twilio.twiml.voice_response import VoiceResponse, Gather

from app.db.database import get_supabase
from app.routes.whatsapp import get_or_create_user, check_registration_and_get_user
from app.routes.sms import send_sms_via_twilio
from app.utils.ai import CATEGORIES, agentic_chat_with_groq, translate_to_english, detect_language, classify_with_groq
import json

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
async def voice_outbound_language(request: Request, Digits: str = Form(default=""), From: str = Form(default="")):
    """Starts the interactive agentic chat session."""
    resp = VoiceResponse()
    lang_map = {"1": "en-IN", "2": "hi-IN", "3": "ta-IN"}
    lang_code = lang_map.get(Digits, "en-IN")
    
    # Determine Citizen's Phone (In outbound calls From=Twilio, To=User)
    form_data = await request.form()
    print(f"DEBUG: Outbound Language Webhook. Digits: {Digits}, To: {form_data.get('To')}, From: {From}")
    phone = (form_data.get("To") or "").replace("whatsapp:", "").strip()
    if phone.startswith("+") and len(phone) > 10:
        pass # looks like a user phone
    else:
        phone = (form_data.get("From") or "").replace("whatsapp:", "").strip()

    # Initialize Draft in Supabase
    sb = get_supabase()
    user_id = get_or_create_user(phone, sb)
    
    # Clean previous drafts to start fresh
    sb.table("grievances").delete().eq("citizen_id", user_id).eq("status", "closed").eq("title", "Draft Ticket").execute()
    
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
    sb.table("grievances").insert({
        "tracking_id":  tracking_id,
        "citizen_id":   user_id,
        "title":        "Draft Ticket",
        "description":  "Voice Conversation Start",
        "status":       "closed",
        "channel":      "voice",
        "resolution_note": json.dumps([])
    }).execute()

    prompts = {
        "en-IN": "Please describe your issue and its location.",
        "hi-IN": "कृपया अपनी समस्या और उसका स्थान बताएं।",
        "ta-IN": "உங்கள் பிரச்சினை மற்றும் அதன் இடத்தைப் பற்றி சொல்லுங்கள்."
    }
    prompt = prompts.get(lang_code, prompts["en-IN"])

    gather = Gather(
        input="speech",
        action=f"/api/voice/outbound/chat?lang={lang_code}",
        method="POST",
        timeout=10,
        speech_timeout="auto",
        language=lang_code,
        enhanced=True
    )
    gather.say(prompt, voice="alice", language=lang_code)
    resp.append(gather)
    resp.say("I didn't hear anything. Goodbye.", voice="alice", language=lang_code)
    resp.hangup()
    return _xml(resp)

@router.post("/outbound/chat")
async def voice_outbound_chat(
    request: Request, 
    SpeechResult: str = Form(""), 
    From: str = Form(""),
    lang: str = Query("en-IN")
):
    """The interactive loop turn."""
    resp = VoiceResponse()
    if not SpeechResult:
        resp.say("I couldn't hear you clearly. Please try calling again.", voice="alice", language=lang)
        resp.hangup()
        return _xml(resp)

    sb = get_supabase()
    form_data = await request.form()
    phone = (form_data.get("To") or "").replace("whatsapp:", "").strip()
    if not phone or "+" not in phone:
        phone = (form_data.get("From") or "").replace("whatsapp:", "").strip()
        
    user_id = get_or_create_user(phone, sb)
    
    # Get Draft
    drafts = sb.table("grievances").select("*").eq("citizen_id", user_id).eq("status", "closed").eq("title", "Draft Ticket").execute()
    if not drafts.data:
        resp.say("Session expired. Please try again.", voice="alice", language=lang)
        resp.hangup()
        return _xml(resp)
    
    draft = drafts.data[0]
    history = json.loads(draft.get("resolution_note") or "[]")
    
    # Translate to English for Brain
    english_text = translate_to_english(SpeechResult)
    history.append({"role": "user", "content": english_text})
    
    # Brain iteration
    groq_resp = agentic_chat_with_groq(history, "Citizen")
    
    if groq_resp["type"] == "question":
        ans = groq_resp["text"]
        history.append({"role": "assistant", "content": ans})
        sb.table("grievances").update({"resolution_note": json.dumps(history)}).eq("id", draft["id"]).execute()
        
        gather = Gather(
            input="speech",
            action=f"/api/voice/outbound/chat?lang={lang}",
            method="POST",
            timeout=10,
            speech_timeout="auto",
            language=lang,
            enhanced=True
        )
        gather.say(ans, voice="alice", language=lang)
        resp.append(gather)
    else:
        # Complete!
        data = groq_resp["data"]
        sb.table("grievances").update({
            "title":        data.get("title", "Voice Complaint"),
            "description":  data.get("clean_description", SpeechResult),
            "ai_category":  data.get("category", "General"),
            "priority":     data.get("priority", "medium"),
            "ai_sentiment": data.get("sentiment", "negative"),
            "status":       "open",
            "resolution_note": None
        }).eq("id", draft["id"]).execute()
        
        tracking_id = draft["tracking_id"]
        # Success message
        success_prompts = {
            "en-IN": f"Your complaint has been filed. Your ticket ID is {' '.join(tracking_id)}. Thank you.",
            "hi-IN": f"आपकी शिकायत दर्ज कर ली गई है। आपकी टिकट आई डी {' '.join(tracking_id)} है। धन्यवाद।",
            "ta-IN": f"உங்கள் புகார் பதிவு செய்யப்பட்டுள்ளது. உங்கள் டிக்கெட் ஐடி {' '.join(tracking_id)}. நன்றி."
        }
        resp.say(success_prompts.get(lang, success_prompts["en-IN"]), voice="alice", language=lang)
        resp.hangup()

    return _xml(resp)


@router.post("/status-callback")
async def voice_status(request: Request):
    """Optional: Twilio calls this when call completes (for logs)."""
    return Response(content="<Response/>", media_type="text/xml")
