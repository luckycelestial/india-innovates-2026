"""
Voice IVR for PRAJA via Twilio — Route handlers only.
Helper utilities live in voice_helpers.py.
"""
import json
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Form, Request, Query
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Gather, Say

from app.db.database import get_supabase
from app.routes.whatsapp_helpers import get_or_create_user
from app.routes.sms import send_sms_via_twilio
agentic_chat_with_groq, translate_to_english, translate_from_english

from app.routes.voice_helpers import (
    get_call_context,
    set_call_context,
    xml,
    speak_ticket,
    detect_voice_language,
    voice_for_lang,
    say,
    normalize_ticket_id,
    create_voice_grievance,
)

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


# ── Inbound IVR flow ─────────────────────────────────────────

@router.post("/inbound")
async def voice_inbound(From: str = Form(...), To: str = Form(...), CallSid: str = Form(default="")):
    """Step 1: Interactive entry menu to collect complaint or track ticket."""
    resp = VoiceResponse()

    if CallSid:
        set_call_context(CallSid, {"from": From})

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
        voice=voice_for_lang("en-IN"),
        language="en-IN",
    )
    resp.append(gather)
    say(resp, NO_SPEECH_MSG, "en-IN")
    return xml(resp)


@router.post("/menu")
async def voice_menu(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    spoken = (SpeechResult or "").strip().lower()
    lang_code = detect_voice_language(SpeechResult or "")

    if CallSid:
        ctx = get_call_context(CallSid)
        if not ctx:
            ctx = {"from": From}
        ctx["lang"] = lang_code
        set_call_context(CallSid, ctx)

    wants_file = any(k in spoken for k in ("file", "complaint", "register", "issue", "புகார்", "शिकायत", "ఫిర్యాదు"))
    wants_track = any(k in spoken for k in ("track", "status", "ticket", "நிலை", "स्थिति", "స్థితి"))

    if wants_file:
        gather = Gather(
            input="speech", action="/api/voice/complaint/issue", method="POST",
            timeout=8, speech_timeout="auto", language=lang_code, enhanced=True,
        )
        gather.say("Please tell your issue briefly after the beep.", voice=voice_for_lang(lang_code), language=lang_code)
        resp.append(gather)
        say(resp, "No issue captured. Please call again.", lang_code)
        return xml(resp)

    if wants_track:
        gather = Gather(
            input="speech", action="/api/voice/track", method="POST",
            timeout=8, speech_timeout="auto", language=lang_code, enhanced=True,
        )
        gather.say("Please say your ticket I D.", voice=voice_for_lang(lang_code), language=lang_code)
        resp.append(gather)
        say(resp, "No ticket I D received. Please call again.", lang_code)
        return xml(resp)

    say(resp, "I could not understand. Please say file complaint or track ticket.", lang_code)
    resp.hangup()
    return xml(resp)


# ── Complaint collection ─────────────────────────────────────

@router.post("/complaint/issue")
async def voice_collect_issue(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    issue_text = (SpeechResult or "").strip()
    lang_code = detect_voice_language(issue_text)
    if not issue_text:
        say(resp, FALLBACK_MSG, lang_code)
        resp.hangup()
        return xml(resp)

    if CallSid:
        ctx = get_call_context(CallSid)
        if not ctx:
            ctx = {"from": From}
        ctx["issue"] = issue_text
        ctx["lang"] = lang_code
        set_call_context(CallSid, ctx)

    gather = Gather(
        input="speech", action="/api/voice/complaint/location", method="POST",
        timeout=8, speech_timeout="auto", language=lang_code, enhanced=True,
    )
    gather.say("Now tell the exact location, such as area name, street, and nearby landmark.", voice=voice_for_lang(lang_code), language=lang_code)
    resp.append(gather)
    say(resp, "No location captured. Please call again.", lang_code)
    return xml(resp)


@router.post("/complaint/location")
async def voice_collect_location(
    From: str = Form(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    location_text = (SpeechResult or "").strip()
    lang_code = detect_voice_language(location_text)
    if not location_text:
        say(resp, "Location not received. Please call again and include landmark details.", lang_code)
        resp.hangup()
        return xml(resp)

    sb = get_supabase()
    issue_text = ""
    if CallSid:
        ctx = get_call_context(CallSid)
        issue_text = ctx.get("issue", "")
        lang_code = ctx.get("lang", lang_code)
    if not issue_text:
        issue_text = "Citizen reported an issue by voice call."

    try:
        created = create_voice_grievance(sb, From, issue_text, location_text)
    except Exception:
        say(resp, "Sorry, we could not file your complaint right now. Please try again.", lang_code)
        resp.hangup()
        return xml(resp)

    tracking_id = created["tracking_id"]
    category = created["category"]
    priority = created["priority"]

    say(
        resp,
        f"Your complaint has been registered under {category}. "
        f"Ticket I D is {speak_ticket(tracking_id)}. "
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

    # Supabase handles cleanup via the migration we ran.

    return xml(resp)


# ── Ticket tracking ──────────────────────────────────────────

@router.post("/track")
async def voice_track_ticket(
    From: str = Form(...),
    SpeechResult: str = Form(default=""),
):
    resp = VoiceResponse()
    raw_ticket = (SpeechResult or "").strip()
    lang_code = detect_voice_language(raw_ticket)
    ticket_id = normalize_ticket_id(raw_ticket)

    if not ticket_id:
        say(resp, "I could not capture the ticket I D. Please call again.", lang_code)
        resp.hangup()
        return xml(resp)

    sb = get_supabase()
    rows = sb.table("grievances").select("tracking_id,status,priority,ai_category").eq("tracking_id", ticket_id).execute()
    if not rows.data:
        say(resp, "No complaint found with that ticket I D. Please check and try again, or send status on WhatsApp.", lang_code)
        resp.hangup()
        return xml(resp)

    g = rows.data[0]
    say(
        resp,
        f"Ticket {speak_ticket(g['tracking_id'])}. "
        f"Status {str(g.get('status', 'open')).replace('_', ' ')}. "
        f"Department {g.get('ai_category', 'General')}. "
        f"Priority {g.get('priority', 'medium')}.",
        lang_code,
    )
    resp.hangup()
    return xml(resp)


# ── Legacy endpoint ──────────────────────────────────────────

@router.post("/gather")
async def voice_gather(
    From: str = Form(...),
    SpeechResult: str = Form(default=""),
    Confidence: str = Form(default="0"),
):
    """Backward compatibility: old Twilio config may still point here."""
    resp = VoiceResponse()
    text = (SpeechResult or "").strip()
    lang_code = detect_voice_language(text)
    if not text:
        say(resp, FALLBACK_MSG, lang_code)
        return xml(resp)

    sb = get_supabase()
    try:
        created = create_voice_grievance(sb, From, text, "Location not provided")
    except Exception:
        say(resp, "Sorry, we could not file your complaint right now. Please try again.", lang_code)
        return xml(resp)

    say(
        resp,
        f"Thank you. Your complaint about {created['category']} has been registered successfully. "
        f"Your ticket ID is {speak_ticket(created['tracking_id'])}. "
        f"Priority is {created['priority']}. "
        f"You will receive an SMS confirmation now. "
        f"You can track your complaint by sending 'track {created['tracking_id']}' via SMS to this number.",
        lang_code,
    )

    sms_body = (
        f"✅ PRAJA Complaint Registered\n"
        f"Ticket: {created['tracking_id']}\n"
        f"Dept: {created['category']}\n"
        f"Priority: {created['priority'].upper()}\n"
        f"Track: reply 'track {created['tracking_id']}' to this number."
    )
    send_sms_via_twilio(From, sms_body)
    return xml(resp)


# ── Outbound call flow ───────────────────────────────────────

@router.post("/outbound/start")
async def voice_outbound_start():
    """Initial greeting with multilingual language selection."""
    resp = VoiceResponse()
    gather = Gather(num_digits=1, action="/api/voice/outbound/language", method="POST", timeout=10)
    gather.append(Say("Welcome to Praja. Press 1 for English.", voice=voice_for_lang("en-IN"), language="en-IN"))
    gather.append(Say("Hindi ke liye 2 dabaaye.", voice=voice_for_lang("hi-IN"), language="hi-IN"))
    gather.append(Say("Tamizhukku en moon-drai azhuthavum.", voice=voice_for_lang("ta-IN"), language="ta-IN"))
    resp.append(gather)
    resp.say("No input received. Goodbye.", voice=voice_for_lang("en-IN"), language="en-IN")
    resp.hangup()
    return xml(resp)


@router.post("/outbound/language")
async def voice_outbound_language(request: Request, Digits: str = Form(default=""), From: str = Form(default="")):
    """Starts the interactive agentic chat session."""
    resp = VoiceResponse()
    lang_map = {"1": "en-IN", "2": "hi-IN", "3": "ta-IN"}
    lang_code = lang_map.get(Digits, "en-IN")

    form_data = await request.form()
    phone = (form_data.get("To") or "").replace("whatsapp:", "").strip()
    if not (phone.startswith("+") and len(phone) > 10):
        phone = (form_data.get("From") or "").replace("whatsapp:", "").strip()

    sb = get_supabase()
    user_id = get_or_create_user(phone, sb)

    # Clean previous drafts
    sb.table("grievances").delete().eq("citizen_id", user_id).eq("status", "closed").eq("title", "Draft Ticket").execute()

    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
    sb.table("grievances").insert({
        "tracking_id":    tracking_id,
        "citizen_id":     user_id,
        "title":          "Draft Ticket",
        "description":    "Voice Conversation Start",
        "status":         "closed",
        "channel":        "voice",
        "resolution_note": json.dumps([]),
    }).execute()

    prompts = {
        "en-IN": "Please describe your issue and its location.",
        "hi-IN": "कृपया अपनी समस्या और उसका स्थान बताएं।",
        "ta-IN": "உங்கள் பிரச்சினை மற்றும் அதன் இடத்தைப் பற்றி சொல்லுங்கள்.",
    }
    prompt = prompts.get(lang_code, prompts["en-IN"])

    gather = Gather(
        input="speech", action=f"/api/voice/outbound/chat?lang={lang_code}",
        method="POST", timeout=10, speech_timeout="auto", language=lang_code,
    )
    gather.say(prompt, voice=voice_for_lang(lang_code), language=lang_code)
    resp.append(gather)
    resp.say("I didn't hear anything. Goodbye.", voice=voice_for_lang(lang_code), language=lang_code)
    resp.hangup()
    return xml(resp)


@router.post("/outbound/chat")
async def voice_outbound_chat(
    request: Request,
    SpeechResult: str = Form(""),
    From: str = Form(""),
    CallSid: str = Form(default=""),
    lang: str = Query("en-IN"),
):
    """The interactive agentic loop turn."""
    resp = VoiceResponse()
    if not SpeechResult:
        resp.say("I couldn't hear you clearly. Please try calling again.", voice=voice_for_lang(lang), language=lang)
        resp.hangup()
        return xml(resp)

    sb = get_supabase()
    form_data = await request.form()
    phone = (form_data.get("To") or "").replace("whatsapp:", "").strip()
    if not phone or "+" not in phone:
        phone = (form_data.get("From") or "").replace("whatsapp:", "").strip()

    user_id = get_or_create_user(phone, sb)

    ctx = get_call_context(CallSid) if CallSid else {}
    if not ctx and CallSid:
        ctx = {"from": From, "history": "[]"}
    
    current_history_str = ctx.get("history")
    history = json.loads(current_history_str) if current_history_str else []

    english_text = translate_to_english(SpeechResult)
    history.append({"role": "user", "content": english_text})

    ai_resp = agentic_chat_with_groq(history, "Citizen")

    if ai_resp["type"] == "question":
        ans_english = ai_resp["text"]
        lang_map_reverse = {"hi-IN": "Hindi", "ta-IN": "Tamil", "te-IN": "Telugu", "kn-IN": "Kannada", "ml-IN": "Malayalam", "bn-IN": "Bengali", "en-IN": "English"}
        target_lang_name = lang_map_reverse.get(lang, "English")
        ans_translated = translate_from_english(ans_english, target_lang_name)

        ctx["history"] = json.dumps(history)
        if CallSid:
            set_call_context(CallSid, ctx)

        gather = Gather(
            input="speech", action=f"/api/voice/outbound/chat?lang={lang}",
            method="POST", timeout=10, speech_timeout="auto", language=lang, enhanced=True,
        )
        gather.say(ans_translated, voice=voice_for_lang(lang), language=lang)
        resp.append(gather)
    else:
        # Complete!
        data = ai_resp["data"]
        # Use a fresh tracking ID if we didn't have one in context
        tracking_id = ctx.get("tracking_id") or f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
        
        sb.table("grievances").upsert({
            "tracking_id":  tracking_id,
            "citizen_id":   user_id,
            "title":        data.get("title", "Voice Complaint"),
            "description":  data.get("clean_description", SpeechResult),
            "ai_category":  data.get("category", "General"),
            "priority":     data.get("priority", "medium"),
            "ai_sentiment": data.get("sentiment", "negative"),
            "location":     data.get("location", "Unknown Location"),
            "status":       "open",
            "channel":      "voice",
        }).execute()

        success_prompts = {
            "en-IN": f"Your complaint has been filed. Your ticket ID is {' '.join(tracking_id or '')}. Thank you.",
            "hi-IN": f"आपकी शिकायत दर्ज कर ली गई है। आपकी टिकट आई डी {' '.join(tracking_id or '')} है। धन्यवाद।",
            "ta-IN": f"உங்கள் புகார் பதிவு செய்யப்பட்டுள்ளது. உங்கள் டிக்கெட் ஐடி {' '.join(tracking_id or '')}. நன்றி.",
        }
        resp.say(success_prompts.get(lang, success_prompts["en-IN"]), voice=voice_for_lang(lang), language=lang)
        resp.hangup()

    return xml(resp)


@router.post("/status-callback")
async def voice_status(request: Request):
    """Optional: Twilio calls this when call completes (for logs)."""
    return Response(content="<Response/>", media_type="text/xml")
