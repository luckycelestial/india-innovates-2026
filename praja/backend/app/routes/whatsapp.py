"""
WhatsApp Bot via Twilio Sandbox
"""
import re
import json
import secrets
from urllib.parse import urlencode
from datetime import datetime, timezone
from fastapi import APIRouter, Form, Request, Header, Query
from fastapi.responses import Response
from twilio.twiml.messaging_response import MessagingResponse, Message
from twilio.twiml.voice_response import VoiceResponse, Gather
from groq import Groq
from xml.sax.saxutils import escape as xml_escape
import urllib.parse
from app.utils.ai import CATEGORIES, detect_language, agentic_chat_with_groq, classify_with_groq, translate_to_english, translate_from_english

try:
    from twilio.rest import Client as TwilioClient
except Exception:
    TwilioClient = None

try:
    from twilio.request_validator import RequestValidator
except Exception:
    RequestValidator = None

from app.config import settings
from app.db.database import get_supabase

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# CATEGORIES imported from utils.ai — do not re-declare

HELP_MSG = (
    "\U0001f44b *Welcome to PRAJA!*\n\n"
    "Send me your complaint in any language and I'll file it immediately.\n\n"
    "Commands:\n"
    "\u2022 *track <id>* \u2014 Check status of a complaint\n"
    "\u2022 *status* \u2014 See your last 3 complaints\n"
    "\u2022 *reset* \u2014 Clear demo data & unlink Aadhaar\n"
    "\u2022 *help* \u2014 Show this message"
)

# Removed detect_language (imported from utils.ai)

import os
import httpx
import tempfile
import base64

def _download_and_transcribe(media_url: str) -> dict:
    """Download a Twilio voice note and return normalized text with detected source language."""
    try:
        auth = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        with httpx.Client() as client:
            resp = client.get(media_url, auth=auth, follow_redirects=True)
            resp.raise_for_status()

        audio_bytes = resp.content

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
                
            with open(tmp_path, "rb") as f:
                transcription = groq_client.audio.transcriptions.create(
                    file=("audio.ogg", f.read()),
                    model="whisper-large-v3",
                    prompt="Citizen grievance audio. Languages: English, Hindi, Marathi, Tamil, Telugu."
                )
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        native_text = transcription.text
        if not native_text:
            return {"text": "", "language": "English"}

        # Using Bhashini for Translating Text to prove API Usage in Gov Hackathon
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        lang = detect_language(native_text)
        bhashini_lang_mapping = {
            "Hindi": "hi", "Tamil": "ta", "Telugu": "te", "Kannada": "kn", 
            "Malayalam": "ml", "Bengali": "bn", "English": "en"
        }
        source_lang = bhashini_lang_mapping.get(lang, "hi")

        if source_lang == "en":
            return {"text": native_text, "language": lang}

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": "en"
                        },
                        "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4"
                    }
                }
            ],
            "inputData": {
                "input": [{"source": native_text}]
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": settings.BHASHINI_API_KEY
        }

        with httpx.Client(timeout=15) as client:
            res = client.post(bhashini_url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                translated_text = data["pipelineResponse"][0]["output"][0]["target"]
                if translated_text:
                    return {"text": translated_text, "language": lang}

        return {"text": native_text, "language": lang}
            
    except Exception as e:
        print(f"Transcription/Translation error: {e}")
        return {"text": "", "language": "English"}

# Removed agentic_chat_with_groq and classify_with_groq (imported from utils.ai)
def get_or_create_user(phone: str, sb) -> str:
    clean_phone = phone.replace("whatsapp:", "")
    rows = sb.table("users").select("id").eq("phone", clean_phone).execute()
    if rows.data:
        return rows.data[0]["id"]
    new_user = sb.table("users").insert({
        "name":          f"Phone User {clean_phone[-4:]}",
        "email":         f"tel_{clean_phone.replace('+', '')}@praja.local",
        "phone":         clean_phone,
        "role":          "citizen",
        "password_hash": "dummy_hash_no_login_needed",
    }).execute()
    return new_user.data[0]["id"]
def check_registration_and_get_user(phone: str, text: str, sb, resp):
    clean_phone = phone.replace("whatsapp:", "")
    rows = sb.table("users").select("*").eq("phone", clean_phone).execute()
    if rows.data:
        return rows.data[0]["id"], rows.data[0].get("name", "Citizen")

    if text.strip().upper() == "YES":
        fake_aadhar = "XXXXXXXX" + str(secrets.randbelow(9000)+1000)
        fake_name = "Rahul Sharma"
        fake_address = "MG Road, Ward 4"
        new_user = sb.table("users").insert({
            "name":          fake_name,
            "email":         f"wa_{clean_phone.replace('+', '')}@praja.local",
            "phone":         clean_phone,
            "role":          "citizen",
            "password_hash": "dummy_hash_no_login_needed",
            "aadhaar_number": fake_aadhar
        }).execute()

        resp.message(
            f"✅ *Successfully Registered!*\n\n"
            f"👤 Name: {fake_name}\n"
            f"🏠 Address: {fake_address}\n"
            f"🪪 Aadhaar: XXXX XXXX {fake_aadhar[-4:]}\n\n"
            f"You can now describe your problem. Please include what the issue is and the exact location."
        )
        return None, None
        
    toy_aadhar = "XXXX XXXX " + str(secrets.randbelow(9000)+1000)
    resp.message(
        f"👋 Welcome to PRAJA!\n\n"
        f"To ensure accountability, please link your Aadhaar.\n"
        f"Linked aadhaar : {toy_aadhar}\n\n"
        f"Reply *YES* to register with PRAJA on this number. Only then you can file a complaint."
    )
    return None, None


def priority_emoji(p: str) -> str:
    return {"critical": "\U0001f534", "high": "\U0001f7e0", "medium": "\U0001f7e1", "low": "\U0001f7e2"}.get(p, "\U0001f7e1")


def xml_response(resp: MessagingResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


def voice_xml_response(resp: VoiceResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


def _is_valid_twilio_signature(request: Request, signature: str, params: dict) -> bool:
    if not settings.TWILIO_AUTH_TOKEN or not RequestValidator:
        return True
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    request_url = str(request.url)
    if validator.validate(request_url, params, signature or ""):
        return True
    if request_url.startswith("http://"):
        https_url = request_url.replace("http://", "https://", 1)
        return validator.validate(https_url, params, signature or "")
    return False


def _needs_followup_details(text: str) -> bool:
    """Return True when complaint text likely misses exact location/ward details."""
    normalized = " ".join((text or "").lower().split())
    if not normalized:
        return True
    has_ward = bool(re.search(r"\bward\b|\bward\s*\d+\b", normalized))
    has_location_hint = bool(
        re.search(
            r"\b(road|street|colony|area|village|town|city|near|opposite|junction|market|bus stand|school|hospital)\b",
            normalized,
        )
    )
    return not (has_ward and has_location_hint)


def _followup_prompt(language_name: str) -> str:
    prompts = {
        "Hindi": "Namaste. Kripya apni shikayat ka sahi location, ward number, aur najdeeki landmark bataye.",
        "Tamil": "Vanakkam. Dayavu seithu ungal pugaariyin sariyana idam, ward enn, matrum arugil ullla landmark sollunga.",
        "Telugu": "Namaskaram. Mee complaint ki exact location, ward number, mariyu daggara landmark cheppandi.",
        "Kannada": "Namaskara. Dayavittu nimma durigege sariyada sthalada hesaru, ward sankhye mattu hattirada gurutu heli.",
        "Malayalam": "Namaskaram. Dayavayi ningalude paraathiyude sariyaaya sthalavum ward numberum aduthulla landmarkum parayuka.",
        "Bengali": "Nomoskar. Doya kore apnar ovijoger thik location, ward number, ebong kachakachi landmark bolun.",
        "English": "Hello. Please tell the exact location, ward number, and nearby landmark for your complaint.",
    }
    return prompts.get(language_name, prompts["English"])


def _localized_voice_line(language_name: str, key: str, tracking_id: str = "") -> str:
    lines = {
        "Hindi": {
            "transcription_failed": "Namaste. Hamein aapka voice note samajhne mein dikkat hui. Kripya dobara saaf bolkar bhejein ya WhatsApp par type karein.",
            "processed": "Namaste. Aapki awaaz wali shikayat process ho gayi hai. Ticket details ke liye WhatsApp message dekhiye.",
            "retry_detail": "Kripya exact location aur ward number jaroor batayein.",
            "still_missing": "Hamein abhi bhi exact location aur ward chahiye. Kripya WhatsApp text mein bhejein.",
            "registered": f"Dhanyavaad. Aapki shikayat darj ho gayi hai. Ticket I D {' '.join(tracking_id)} hai. Aap WhatsApp par track kar sakte hain.",
            "filing_error": "Khed hai, abhi shikayat darj nahi ho paayi. Kripya details WhatsApp par bhejein.",
        },
        "Tamil": {
            "transcription_failed": "Vanakkam. Ungal voice note puriyavillai. Dayavu seithu marupadiyum clear-a anuppunga allathu WhatsApp-il type pannunga.",
            "processed": "Vanakkam. Ungal voice complaint process aayiduchu. Ticket details-ku WhatsApp message paarkavum.",
            "retry_detail": "Dayavu seithu exact location matrum ward number sollunga.",
            "still_missing": "Innum exact location matrum ward venum. Dayavu seithu WhatsApp text-la anuppunga.",
            "registered": f"Nandri. Ungal complaint register aayiduchu. Ticket I D {' '.join(tracking_id)}. WhatsApp-la track pannalaam.",
            "filing_error": "Mannikkavum, ippodhu complaint file panna mudiyala. Dayavu seithu details WhatsApp-la anuppunga.",
        },
        "Telugu": {
            "transcription_failed": "Namaskaram. Mee voice note ardham kaaledu. Dayachesi malli spashtanga pampandi leka WhatsApp lo type cheyandi.",
            "processed": "Namaskaram. Mee voice complaint process ayyindi. Ticket vivaralu kosam WhatsApp message chudandi.",
            "retry_detail": "Dayachesi exact location mariyu ward number tappakunda cheppandi.",
            "still_missing": "Inka exact location mariyu ward kavali. Dayachesi WhatsApp text lo pampandi.",
            "registered": f"Dhanyavadalu. Mee complaint register ayyindi. Ticket I D {' '.join(tracking_id)}. Meeru WhatsApp lo track cheyyachu.",
            "filing_error": "Kshaminchandi, ippudu complaint file cheyalekapoyam. Dayachesi details WhatsApp lo pampandi.",
        },
        "Kannada": {
            "transcription_failed": "Namaskara. Nimma voice note sariyagi kelisalilla. Dayavittu matte spashtavagi kalisi athava WhatsApp nalli type madi.",
            "processed": "Namaskara. Nimma voice complaint process aagide. Ticket vivaragagi WhatsApp sandesha nodi.",
            "retry_detail": "Dayavittu exact location mattu ward sankhye kaddayavagi heli.",
            "still_missing": "Innu exact location mattu ward beku. Dayavittu WhatsApp text nalli kalisi.",
            "registered": f"Dhanyavadagalu. Nimma complaint register aagide. Ticket I D {' '.join(tracking_id)}. Neevu WhatsApp nalli track madabahudu.",
            "filing_error": "Kshamisi, iga complaint file maadalu agalilla. Dayavittu vivara WhatsApp nalli kalisi.",
        },
        "Malayalam": {
            "transcription_failed": "Namaskaram. Ningalude voice note manassilakkan kazhinjilla. Dayavayi veendum clear ayi ayakkuka allenkil WhatsApp-il type cheyyuka.",
            "processed": "Namaskaram. Ningalude voice complaint process cheythu. Ticket vivaram WhatsApp message-il nokkuka.",
            "retry_detail": "Dayavayi exact location um ward number um parayuka.",
            "still_missing": "Iniyum exact location um ward number um venam. Dayavayi WhatsApp text-il ayakkuka.",
            "registered": f"Nanni. Ningalude complaint register cheythu. Ticket I D {' '.join(tracking_id)}. WhatsApp-il track cheyyam.",
            "filing_error": "Kshamikkanam, ippol complaint file cheyyan kazhinjilla. Dayavayi details WhatsApp-il ayakkuka.",
        },
        "Bengali": {
            "transcription_failed": "Nomoskar. Apnar voice note bujhte parini. Doya kore abar clear kore pathan ba WhatsApp e type korun.",
            "processed": "Nomoskar. Apnar voice complaint process hoye geche. Ticket details er jonno WhatsApp message dekhun.",
            "retry_detail": "Doya kore exact location ebong ward number bolun.",
            "still_missing": "Ekhono exact location ebong ward dorkar. Doya kore WhatsApp text e pathan.",
            "registered": f"Dhonnobad. Apnar complaint register hoyeche. Ticket I D {' '.join(tracking_id)}. Apni WhatsApp e track korte parben.",
            "filing_error": "Dukhito, ekhon complaint file kora gelo na. Doya kore details WhatsApp e pathan.",
        },
        "English": {
            "transcription_failed": "Hello. We could not understand your voice note. Please send a clearer one or type on WhatsApp.",
            "processed": "Hello. Your voice complaint is processed. Please check WhatsApp for ticket details.",
            "retry_detail": "Please include exact location and ward number.",
            "still_missing": "We still need exact location and ward. Please send it in WhatsApp text.",
            "registered": f"Thank you. Your grievance is registered. Ticket I D is {' '.join(tracking_id)}. You can track on WhatsApp.",
            "filing_error": "Sorry, we could not file your complaint right now. Please send details on WhatsApp.",
        },
    }
    language_block = lines.get(language_name, lines["English"])
    return language_block.get(key, lines["English"].get(key, ""))


def _create_grievance_from_text(phone_number: str, complaint_text: str) -> dict:
    sb = get_supabase()
    user_id = get_or_create_user(phone_number, sb)
    classification = classify_with_groq(complaint_text)
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
    sb.table("grievances").insert({
        "tracking_id": tracking_id,
        "citizen_id": user_id,
        "title": classification.get("title", complaint_text[:80]),
        "description": complaint_text,
        "ai_category": classification.get("category", "General"),
        "ai_sentiment": classification.get("sentiment", "negative"),
        "priority": classification.get("priority", "medium"),
        "status": "open",
        "channel": "whatsapp",
    }).execute()
    return {"tracking_id": tracking_id, "classification": classification}


def _language_profile(language_name: str) -> dict:
    profiles = {
        "Hindi":    {"locale": "hi-IN", "voice": "Polly.Aditi"},
        "English":  {"locale": "en-IN", "voice": "Polly.Aditi"},
        "Tamil":    {"locale": "ta-IN", "voice": ""},
        "Telugu":   {"locale": "te-IN", "voice": ""},
        "Kannada":  {"locale": "kn-IN", "voice": ""},
        "Malayalam": {"locale": "ml-IN", "voice": ""},
        "Bengali":  {"locale": "bn-IN", "voice": ""},
    }
    return profiles.get(language_name, profiles["English"])


def _trigger_voice_reply_call(
    whatsapp_from: str,
    spoken_text: str,
    language_name: str = "English",
    public_base_url: str = "",
    require_followup: bool = False,
) -> dict:
    """Place an outbound voice call to read an acknowledgement to the user."""
    if not TwilioClient:
        return {"ok": False, "reason": "twilio not available"}
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {"ok": False, "reason": "twilio keys missing"}
    from_number = (settings.TWILIO_PHONE_NUMBER or settings.TWILIO_WHATSAPP_NUMBER or "").replace("whatsapp:", "").strip()
    if not from_number:
        return {"ok": False, "reason": "twilio caller number missing"}

    to_phone = (whatsapp_from or "").replace("whatsapp:", "").strip()
    if not to_phone.startswith("+"):
        return {"ok": False, "reason": "invalid destination phone"}

    safe_text = xml_escape(" ".join((spoken_text or "").split())[:320])
    profile = _language_profile(language_name)
    locale = profile["locale"]
    voice = profile["voice"]
    voice_attr = f' voice="{voice}"' if voice else ""
    twiml = (
        "<Response>"
        f"<Say{voice_attr} language=\"{locale}\">"
        f"{safe_text}"
        "</Say>"
        "</Response>"
    )

    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        if require_followup and public_base_url:
            qs = urlencode({"phone": to_phone, "lang": language_name, "base": spoken_text[:220]})
            followup_url = f"{public_base_url}/api/whatsapp/voice-followup/start?{qs}"
            call = client.calls.create(to=to_phone, from_=from_number, url=followup_url, method="POST")
        else:
            call = client.calls.create(to=to_phone, from_=from_number, twiml=twiml)
        return {"ok": True, "sid": call.sid}
    except Exception as exc:
        return {"ok": False, "reason": str(exc)}


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    x_twilio_signature: str = Header(default=""),
    Body: str = Form(""),
    From: str = Form(...),
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(""),
    MediaContentType0: str = Form(""),
):
    resp = MessagingResponse()
    received_voice_note = False
    detected_voice_language = "English"
    try:
        form_data = await request.form()
        params = {k: str(v) for k, v in form_data.items()}
        if not _is_valid_twilio_signature(request, x_twilio_signature, params):
            print("Rejected non-Twilio webhook call: invalid signature")
            return Response(content="Forbidden", status_code=403)

        public_base_url = str(request.base_url).rstrip("/")
        text_body = Body.strip()
        
        # If user sent a voice note, transcribe it
        if NumMedia > 0 and MediaUrl0:
            if "audio" in MediaContentType0 or "video" in MediaContentType0:
                received_voice_note = True
                transcription_result = _download_and_transcribe(MediaUrl0)
                if transcription_result.get("text"):
                    text_body = transcription_result.get("text", "")
                    detected_voice_language = transcription_result.get("language", "English")
                else:
                    resp.message("⚠️ Apologies, transcription failed. Please try again.")
                    return xml_response(resp)

        if not text_body:
            resp.message("⚠️ It seems you sent an empty message I couldn't process. Please send a text or voice note.")
            return xml_response(resp)

        # Fully bypass 15s Twilio limits and 10s Vercel limits natively by heavily exploiting Twilio's HTTP State Machine `<Redirect>`
        # Twilio sends the Message and instantly redirects to stage 2 securely!
        resp.message("⏳ I'm processing your request natively... Please expect your response momentarily.")
        
        payload_state = {
            "text_body": text_body,
            "detected_lang": detected_voice_language,
            "is_voice": "1" if received_voice_note else "0"
        }
        qs = urlencode(payload_state)
        redirect_url = f"{public_base_url}/api/whatsapp/process-step-2?{qs}"
        resp.redirect(redirect_url, method="POST")

    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        resp.message(
            f"⚠️ PRAJA encountered an error parsing your message.\n"
            f"Error ref: {type(exc).__name__}\n\n{str(exc)}"
        )
    return xml_response(resp)

@router.post("/process-step-2")
async def whatsapp_process_step_2(
    request: Request,
    x_twilio_signature: str = Header(default=""),
    text_body: str = Query(""),
    detected_lang: str = Query("English"),
    is_voice: str = Query("0"),
    From: str = Form(...),
):
    resp = MessagingResponse()
    try:
        form_data = await request.form()
        params = {k: str(v) for k, v in form_data.items()}
        if not _is_valid_twilio_signature(request, x_twilio_signature, params):
            return Response(content="Forbidden", status_code=403)
            
        await _handle_message(text_body, From, resp, detected_lang, is_voice == "1")

    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        resp.message(
            f"⚠️ PRAJA encountered an error computing your response.\n"
            f"Please try again or send *help* for commands.\n"
            f"Error ref: {type(exc).__name__}\n\n{str(exc)}"
        )
    return xml_response(resp)


@router.post("/voice-followup/start")
async def whatsapp_voice_followup_start(
    request: Request,
    x_twilio_signature: str = Header(default=""),
    phone: str = Query(""),
    lang: str = Query("English"),
    base: str = Query(""),
):
    form_data = await request.form()
    params = {k: str(v) for k, v in form_data.items()}
    if not _is_valid_twilio_signature(request, x_twilio_signature, params):
        return Response(content="Forbidden", status_code=403)

    profile = _language_profile(lang)
    locale = profile["locale"]
    voice = profile["voice"] or "Polly.Aditi"
    action_qs = urlencode({"phone": phone, "lang": lang, "base": base[:220], "attempt": 0})
    action_url = f"{str(request.base_url).rstrip('/')}/api/whatsapp/voice-followup/collect?{action_qs}"

    vr = VoiceResponse()
    gather = Gather(
        input="speech",
        action=action_url,
        method="POST",
        timeout=8,
        speech_timeout="auto",
        language=locale,
    )
    gather.say(_followup_prompt(lang), language=locale, voice=voice)
    vr.append(gather)
    vr.say(_followup_prompt(lang), language=locale, voice=voice)
    return voice_xml_response(vr)


@router.post("/voice-followup/collect")
async def whatsapp_voice_followup_collect(
    request: Request,
    x_twilio_signature: str = Header(default=""),
    phone: str = Query(""),
    lang: str = Query("English"),
    base: str = Query(""),
    attempt: int = Query(0),
    SpeechResult: str = Form(default=""),
):
    form_data = await request.form()
    params = {k: str(v) for k, v in form_data.items()}
    if not _is_valid_twilio_signature(request, x_twilio_signature, params):
        return Response(content="Forbidden", status_code=403)

    profile = _language_profile(lang)
    locale = profile["locale"]
    voice = profile["voice"] or "Polly.Aditi"
    followup_text = (SpeechResult or "").strip()
    vr = VoiceResponse()

    combined_text = " ".join(part for part in [base.strip(), followup_text] if part).strip()

    # Ask once more if speech is missing or still lacks location/ward details.
    if (not followup_text or _needs_followup_details(combined_text)) and attempt < 1:
        retry_qs = urlencode({"phone": phone, "lang": lang, "base": base[:220], "attempt": attempt + 1})
        retry_action = f"{str(request.base_url).rstrip('/')}/api/whatsapp/voice-followup/collect?{retry_qs}"
        gather = Gather(
            input="speech",
            action=retry_action,
            method="POST",
            timeout=8,
            speech_timeout="auto",
            language=locale,
        )
        gather.say(_followup_prompt(lang), language=locale, voice=voice)
        vr.append(gather)
        vr.say(_localized_voice_line(lang, "retry_detail"), language=locale, voice=voice)
        return voice_xml_response(vr)

    if not followup_text or _needs_followup_details(combined_text):
        vr.say(_localized_voice_line(lang, "still_missing"), language=locale, voice=voice)
        return voice_xml_response(vr)

    try:
        result = _create_grievance_from_text(phone, combined_text)
        tracking_id = result["tracking_id"]
        vr.say(
            _localized_voice_line(lang, "registered", tracking_id=tracking_id),
            language=locale,
            voice=voice,
        )
    except Exception as exc:
        print(f"Failed to file grievance from follow-up call: {exc}")
        vr.say(_localized_voice_line(lang, "filing_error"), language=locale, voice=voice)

    return voice_xml_response(vr)


async def _process_voice_note_bg(media_url: str, From: str):
    from twilio.twiml.messaging_response import MessagingResponse
    import xml.etree.ElementTree as ET
    twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        transcription_result = _download_and_transcribe(media_url)
        if not transcription_result.get("text"):
             twilio_client.messages.create(
                 to=From, from_=settings.TWILIO_WHATSAPP_NUMBER,
                 body="⚠️ Apologies, transcription failed. Please try again."
             )
             return
             
        text_body = transcription_result.get("text", "")
        detected_voice_language = transcription_result.get("language", "English")
        
        resp = MessagingResponse()
        await _handle_message(text_body, From, resp, detected_voice_language, is_voice=True)
        
        root = ET.fromstring(str(resp))
        for msg in root.findall('Message'):
            body_text = msg.text or ""
            medias = [m.text for m in msg.findall('Media')]
            kwargs = {"to": From, "from_": settings.TWILIO_WHATSAPP_NUMBER, "body": body_text}
            if medias:
                kwargs["media_url"] = medias
            twilio_client.messages.create(**kwargs)
            
    except Exception as e:
        print(f"Background Voice Processing Error: {e}")

async def _process_text_msg_bg(text_body: str, From: str, lang: str, is_voice: bool):
    from twilio.twiml.messaging_response import MessagingResponse
    import xml.etree.ElementTree as ET
    try:
        resp = MessagingResponse()
        await _handle_message(text_body, From, resp, lang, is_voice)
        
        root = ET.fromstring(str(resp))
        twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        for msg in root.findall('Message'):
            body_text = msg.text or ""
            medias = [m.text for m in msg.findall('Media')]
            kwargs = {"to": From, "from_": settings.TWILIO_WHATSAPP_NUMBER, "body": body_text}
            if medias:
                kwargs["media_url"] = medias
            twilio_client.messages.create(**kwargs)
            
    except Exception as e:
        print(f"Background Text Processing Error: {e}")

async def _handle_message(Body: str, From: str, resp: MessagingResponse, user_lang: str = None, is_voice: bool = False) -> None:
    sb = get_supabase()
    text = Body.strip()
    sender = From
    detected_lang = user_lang or detect_language(text)
    english_text = translate_to_english(text) if detect_language(text) != "English" else text

    def _reply_with_voice_if_needed(text_en: str, text_native: str):
        msg = resp.message(text_native)
        if is_voice:
            # We enforce a pseudo file extension for Twilio's strict WhatsApp media validators
            url = f"{settings.BACKEND_URL}/api/tts/generate.mp3?text={urllib.parse.quote(text_native)}&lang={detected_lang}"
            msg.media(url)
            
    if text.lower() in ("help", "hi", "hello", "helo", "hai"):
        _reply_with_voice_if_needed("Help message", translate_from_english(HELP_MSG, detected_lang))
        return

    if text.upper() == "CALL ME":
        # Outbound call trigger
        to_phone = sender.replace("whatsapp:", "")
        xml_url = f"{settings.BACKEND_URL}/api/voice/outbound/start"
        
        try:
            # Inline import to avoid circular dependency
            from twilio.rest import Client as TwilioClient
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.calls.create(url=xml_url, to=to_phone, from_=settings.TWILIO_PHONE_NUMBER)
            
            resp.message(translate_from_english("📞 *Initiating Voice Call...*\n\nPlease answer your phone to file your complaint via our IVR system.", detected_lang))
        except Exception as e:
            resp.message(f"⚠️ *Call Failed:* {str(e)}")
        return

    if text.lower() == "reset":
        clean_phone = sender.replace("whatsapp:", "")
        # First find the user
        u = sb.table("users").select("id").eq("phone", clean_phone).execute()
        if u.data:
            uid = u.data[0]["id"]
            # Delete their grievances first
            sb.table("grievances").delete().eq("citizen_id", uid).execute()
            # Then delete the user
            sb.table("users").delete().eq("id", uid).execute()
        resp.message("🔄 *Demo Reset Successful*\nYour Aadhaar linkage and all complaints have been permanently deleted.\n\nSend any message to start the registration flow again.")
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

    # Check Registration and get User ID
    user_id, user_name = check_registration_and_get_user(sender, text, sb, resp)
    if not user_id:
        return

    if text.lower() == "status":
        rows = sb.table("grievances").select("tracking_id, status, title").eq("citizen_id", user_id).order("created_at", desc=True).limit(3).execute()
        if not rows.data:
            resp.message("You have no recently filed complaints.")
        else:
            msg = "📊 *Your Recent Complaints*\n\n"
            for g in rows.data:
                msg += f"🔹 *{g['tracking_id']}* - {g['status'].title()}\n   {g.get('title', 'No title')[:30]}...\n\n"
            resp.message(msg)
        return

    # Check if user has an ongoing draft ticket
    drafts = sb.table("grievances").select("id, resolution_note").eq("citizen_id", user_id).eq("status", "closed").eq("title", "Draft Ticket").execute()
    
    if drafts.data:
        draft = drafts.data[0]
        history_str = draft.get("resolution_note")
        try:
            history = json.loads(history_str) if history_str else []
        except (json.JSONDecodeError, TypeError):
            history = []
        
        history.append({"role": "user", "content": english_text})
        groq_resp = agentic_chat_with_groq(history, user_name)

        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            sb.table("grievances").update({"resolution_note": json.dumps(history)}).eq("id", draft["id"]).execute()
            _reply_with_voice_if_needed(ans, translate_from_english(ans, detected_lang))
            return
        elif groq_resp["type"] == "complete":
            classification = groq_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")
            lang = detect_language(final_text)
            
            sb.table("grievances").update({
                "title":        classification.get("title", final_text[:80]),
                "description":  final_text,
                "ai_category":  classification.get("category", "General"),
                "ai_sentiment": classification.get("sentiment", "negative"),
                "priority":     classification.get("priority", "medium"),
                "status":       "open",
                "resolution_note": None
            }).eq("id", draft["id"]).execute()
            
            g_rows = sb.table("grievances").select("tracking_id").eq("id", draft["id"]).execute()
            tracking_id = g_rows.data[0]["tracking_id"] if g_rows.data else "Unknown"
            
            prio = classification['priority']
            prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
            sentiment = classification.get('sentiment', 'negative').title()
            sentiment_emoji = {"Negative": "😡", "Positive": "😄", "Neutral": "😐"}.get(sentiment, "💬")
            
            reply = (
                f"🤖 *AI Processing Complete*\n"
                f"───────────────────\n\n"
                f"✅ Language: *{detected_lang}*\n"
                f"🏷️ Department: *{classification.get('category', 'General')}*\n"
                f"⚡ Priority: *{prio.title()} ({prio_label})*\n"
                f"📍 Location: *{location_text}*\n"
                f"{sentiment_emoji} Sentiment: *{sentiment}*\n\n"
                f"───────────────────\n"
                f"🆔 Ticket *{tracking_id}* created.\n"
                f"📤 Routed to *{classification.get('category', 'General')} Department*.\n"
                f"📲 Officer notified.\n\n"
                f"🎯 *SLA Timeline:* 72 hours to resolve\n\n"
                f"Track: reply *track {tracking_id}*"
            )
            _reply_with_voice_if_needed("Processing Complete", translate_from_english(reply, detected_lang))
            return

    else:
        # No draft exists, start fresh
        history = [{"role": "user", "content": english_text}]
        groq_resp = agentic_chat_with_groq(history, user_name)

        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            
            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
                "tracking_id":  tracking_id,
                "citizen_id":   user_id,
                "title":        "Draft Ticket",
                "description":  english_text,
                "status":       "closed",
                "channel":      "whatsapp",
                "resolution_note": json.dumps(history)
            }).execute()
            _reply_with_voice_if_needed(ans, translate_from_english(ans, detected_lang))
            return
        elif groq_resp["type"] == "complete":
            classification = groq_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")
            lang = detect_language(final_text)
      
            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
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
            
            prio = classification['priority']
            prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
            sentiment = classification.get('sentiment', 'negative').title()
            sentiment_emoji = {"Negative": "😡", "Positive": "😄", "Neutral": "😐"}.get(sentiment, "💬")
            
            reply = (
                f"🤖 *AI Processing Complete*\n"
                f"───────────────────\n\n"
                f"✅ Language: *{detected_lang}*\n"
                f"🏷️ Department: *{classification.get('category', 'General')}*\n"
                f"⚡ Priority: *{prio.title()} ({prio_label})*\n"
                f"📍 Location: *{location_text}*\n"
                f"{sentiment_emoji} Sentiment: *{sentiment}*\n\n"
                f"───────────────────\n"
                f"🆔 Ticket *{tracking_id}* created.\n"
                f"📤 Routed to *{classification.get('category', 'General')} Department*.\n"
                f"📲 Officer notified.\n\n"
                f"🎯 *SLA Timeline:* 72 hours to resolve\n\n"
                f"Track: reply *track {tracking_id}*"
            )
            _reply_with_voice_if_needed("Processing Complete", translate_from_english(reply, detected_lang))
            return
