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
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse, Gather
from groq import Groq
from xml.sax.saxutils import escape as xml_escape

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
    "\u2022 *reset* \u2014 Clear demo data & unlink Aadhaar\n"
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

        with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
            
        with open(tmp_path, "rb") as f:
            transcription = groq_client.audio.transcriptions.create(
                file=("audio.ogg", f.read()),
                model="whisper-large-v3",
                prompt="Citizen grievance audio. Languages: English, Hindi, Marathi, Tamil, Telugu."
            )
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

def agentic_chat_with_groq(history: list, user_name: str = "Citizen") -> dict:
    prompt = f"""You are PRAJA Bot, an official WhatsApp Assistant for Indian Citizens to register grievances.
The citizen's name is {user_name}.
Your goal is to collect enough information to file a complete ticket.

Required Info:
1. Core Issue / Complaint (What is the problem?)
2. Exact Location / Landmark (Where is it? -> Must be a SPECIFIC area, street name, ward, or public landmark. Vague locations like "my home", "near me", "here" are NOT acceptable).

Instructions:
- Do NOT ask for their name, as you already know it is {user_name}.
- If ANY of the required info is missing or ambiguous, ask a polite, short question in the language the user is speaking to get the missing info. Respond with ONLY normal text (NO JSON).
- If the user gives a vague location (like 'mera ghar', 'near my house', 'here'), DO NOT accept it. Specifically ask them to name the colony, street, or a famous landmark nearby.
- Only when you have BOTH pieces of information explicitly, and feel ready to file the ticket, you must respond with ONLY a valid JSON block and absolutely no other text.

JSON FORMAT:
  {{
    "status": "complete",
    "data": {{
      "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
      "priority": "<low|medium|high|critical>",
      "title": "<accurate 5-8 word English title capturing the true meaning>",
      "sentiment": "<negative|neutral|positive>",
      "location": "<Extracted location>",
      "clean_description": "<Include FULL details of issue, name, and location. Formatting Rules: 1. If English: return ONLY the English text. 2. If ANY other language: return exactly '[Native Script] (English: [Translation])'. 3. Correct any phonetic typos.>"
    }}
  }}

  Rules for Classification:
- Any mention of suicide, severe domestic abuse/toxicity, or self-harm -> priority=critical, category=Health or General
- Any death threat or threat to public figure -> priority=critical, category=General
- Sexual assault / abduction -> priority=critical, category=General
"""
    messages = [{"role": "system", "content": prompt}] + history
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=350,
            temperature=0.2,
        )
        content = (response.choices[0].message.content or "").strip()
        
        if "{" in content and "category" in content and "clean_description" in content:
            raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
            match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
            if match:
                raw = match.group(0)
            data = json.loads(raw)
            res_data = data.get("data", data)
            if res_data.get("category") not in CATEGORIES:
                res_data["category"] = "General"
            if res_data.get("priority") not in ["low", "medium", "high", "critical"]:
                res_data["priority"] = "medium"
            return {"type": "complete", "data": res_data}
        else:
            return {"type": "question", "text": content}
    except Exception as e:
        print("Groq Error:", e)
        return {"type": "question", "text": "I'm having trouble processing that. Could you please state your issue, name, and location clearly?"}

def classify_with_groq(text: str) -> dict:
    """Legacy one-shot classification for SMS and Voice endpoints."""
    try:
        prompt = f"""Classify this grievance, responding ONLY with valid JSON.
Text: "{text}"
JSON Format:
{{"category": "Water Supply|Roads|Electricity|Sanitation|General", "priority": "low|medium|high|critical", "sentiment": "negative|neutral|positive", "title": "...", "clean_description": "..."}}
"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        content = (response.choices[0].message.content or "").strip()
        raw = re.sub(r"^```json\s*|^```\s*|```$", "", content, flags=re.MULTILINE).strip()
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise Exception("No JSON found")
    except Exception:
        return {"category": "General", "priority": "medium", "sentiment": "neutral", "title": text[:40], "clean_description": text}
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

        text_body = Body.strip()
        public_base_url = str(request.base_url).rstrip("/")
        
        # If user sent a voice note, transcribe it
        if NumMedia > 0 and MediaUrl0:
            if "audio" in MediaContentType0 or "video" in MediaContentType0:
                received_voice_note = True
                transcription_result = _download_and_transcribe(MediaUrl0)
                if transcription_result.get("text"):
                    text_body = transcription_result.get("text", "")
                    detected_voice_language = transcription_result.get("language", "English")
                    if _needs_followup_details(text_body):
                        resp.message("📞 We need a bit more detail. You will receive an automated call now to collect exact location and ward.")
                        voice_result = _trigger_voice_reply_call(
                            From,
                            text_body,
                            detected_voice_language,
                            public_base_url=public_base_url,
                            require_followup=True,
                        )
                        if not voice_result.get("ok"):
                            print(f"Twilio interactive follow-up call failed: {voice_result.get('reason')}")
                            resp.message("⚠️ Could not place callback. Please send location and ward in WhatsApp text.")
                        return xml_response(resp)
                else:
                    resp.message("⚠️ Apologies, I could not transcribe your audio message. Please send a text message or try again.")
                    voice_result = _trigger_voice_reply_call(
                        From,
                        "Namaste from Praja. We received your voice note but could not transcribe it. Please send a clearer voice note or type your complaint on WhatsApp.",
                        detected_voice_language,
                    )
                    if not voice_result.get("ok"):
                        print(f"Twilio voice callback failed after transcription error: {voice_result.get('reason')}")
                    return xml_response(resp)

        if not text_body:
            resp.message("⚠️ It seems you sent a message I couldn't process. Please send a text or voice note.")
            return xml_response(resp)

        await _handle_message(text_body, From, resp)
        if received_voice_note:
            voice_result = _trigger_voice_reply_call(
                From,
                "Namaste from Praja. Your voice complaint has been processed. Please check your WhatsApp message for ticket details and tracking instructions.",
                detected_voice_language,
            )
            if not voice_result.get("ok"):
                print(f"Twilio voice callback failed: {voice_result.get('reason')}")
                resp.message("⚠️ Voice callback could not be placed right now. Please verify your call-enabled Twilio number and trial permissions.")
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        resp.message(
            f"⚠️ PRAJA encountered an error processing your message.\n"
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
        vr.say("Please include exact location and ward number.", language=locale, voice=voice)
        return voice_xml_response(vr)

    if not followup_text or _needs_followup_details(combined_text):
        vr.say("We still need exact location and ward. Please send it in WhatsApp text.", language=locale, voice=voice)
        return voice_xml_response(vr)

    try:
        result = _create_grievance_from_text(phone, combined_text)
        tracking_id = result["tracking_id"]
        vr.say(
            f"Thank you. Your grievance is registered. Ticket I D is {' '.join(tracking_id)}. You can track on WhatsApp.",
            language=locale,
            voice=voice,
        )
    except Exception as exc:
        print(f"Failed to file grievance from follow-up call: {exc}")
        vr.say("Sorry, we could not file your complaint right now. Please send details on WhatsApp.", language=locale, voice=voice)

    return voice_xml_response(vr)


async def _handle_message(Body: str, From: str, resp: MessagingResponse) -> None:
    sb = get_supabase()
    text = Body.strip()
    sender = From

    if text.lower() in ("help", "hi", "hello", "helo", "hai"):
        resp.message(HELP_MSG)
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
        except:
            history = []
        
        history.append({"role": "user", "content": text})
        groq_resp = agentic_chat_with_groq(history, user_name)

        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            sb.table("grievances").update({"resolution_note": json.dumps(history)}).eq("id", draft["id"]).execute()
            resp.message(ans)
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
                f"✅ Language: *{lang}*\n"
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
            resp.message(reply)
            return

    else:
        # No draft exists, start fresh
        history = [{"role": "user", "content": text}]
        groq_resp = agentic_chat_with_groq(history, user_name)

        if groq_resp["type"] == "question":
            ans = groq_resp["text"]
            history.append({"role": "assistant", "content": ans})
            
            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
                "tracking_id":  tracking_id,
                "citizen_id":   user_id,
                "title":        "Draft Ticket",
                "description":  text,
                "status":       "closed",
                "channel":      "whatsapp",
                "resolution_note": json.dumps(history)
            }).execute()
            resp.message(ans)
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
                f"✅ Language: *{lang}*\n"
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
            resp.message(reply)
            return
