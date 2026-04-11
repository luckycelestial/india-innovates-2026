"""
WhatsApp Bot — Helper utilities (extracted from whatsapp.py)
"""
import os
import re
import json
import secrets
import tempfile
import logging
from datetime import datetime, timezone

import httpx
from fastapi.responses import Response
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse
import google.generativeai as genai

from app.config import settings
from app.db.database import get_supabase
from app.utils.ai import CATEGORIES, detect_language, classify_with_gemini, configure_gemini

try:
    from twilio.rest import Client as TwilioClient
except Exception:
    TwilioClient = None

try:
    from twilio.request_validator import RequestValidator
except Exception:
    RequestValidator = None

logger = logging.getLogger(__name__)


# ── Response helpers ──────────────────────────────────────────

def priority_emoji(p: str) -> str:
    return {"critical": "\U0001f534", "high": "\U0001f7e0", "medium": "\U0001f7e1", "low": "\U0001f7e2"}.get(p, "\U0001f7e1")


def xml_response(resp: MessagingResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


def voice_xml_response(resp: VoiceResponse) -> Response:
    return Response(content=str(resp), media_type="text/xml; charset=utf-8")


# ── Twilio validation ────────────────────────────────────────

def is_valid_twilio_signature(request, signature: str, params: dict) -> bool:
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


# ── User management ──────────────────────────────────────────

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
        fake_aadhar = "XXXXXXXX" + str(secrets.randbelow(9000) + 1000)
        fake_name = "Rahul Sharma"
        fake_address = "MG Road, Ward 4"
        sb.table("users").insert({
            "name":           fake_name,
            "email":          f"wa_{clean_phone.replace('+', '')}@praja.local",
            "phone":          clean_phone,
            "role":           "citizen",
            "password_hash":  "dummy_hash_no_login_needed",
            "aadhaar_number": fake_aadhar,
        }).execute()

        resp.message(
            f"✅ *Successfully Registered!*\n\n"
            f"👤 Name: {fake_name}\n"
            f"🏠 Address: {fake_address}\n"
            f"🪪 Aadhaar: XXXX XXXX {fake_aadhar[-4:]}\n\n"
            f"You can now describe your problem. Please include what the issue is and the exact location."
        )
        return None, None

    toy_aadhar = "XXXX XXXX " + str(secrets.randbelow(9000) + 1000)
    resp.message(
        f"👋 Welcome to PRAJA!\n\n"
        f"To ensure accountability, please link your Aadhaar.\n"
        f"Linked aadhaar : {toy_aadhar}\n\n"
        f"Reply *YES* to register with PRAJA on this number. Only then you can file a complaint."
    )
    return None, None


# ── Transcription ─────────────────────────────────────────────

def download_and_transcribe(media_url: str) -> dict:
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

            if not configure_gemini():
                return {"text": "", "language": "English"}

            # Use Gemini to transcribe the audio file
            audio_file = genai.upload_file(path=tmp_path)
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content([
                    "Please accurately transcribe this audio recording in its original language.", 
                    audio_file
                ])
                transcription_text = response.text
            finally:
                genai.delete_file(audio_file.name)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

        native_text = transcription_text
        if not native_text:
            return {"text": "", "language": "English"}

        # Bhashini translation
        bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        lang = detect_language(native_text)
        bhashini_lang_mapping = {
            "Hindi": "hi", "Tamil": "ta", "Telugu": "te", "Kannada": "kn",
            "Malayalam": "ml", "Bengali": "bn", "English": "en",
        }
        source_lang = bhashini_lang_mapping.get(lang, "hi")

        if source_lang == "en":
            return {"text": native_text, "language": lang}

        payload = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source_lang, "targetLanguage": "en"},
                    "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4",
                },
            }],
            "inputData": {"input": [{"source": native_text}]},
        }
        headers = {"Content-Type": "application/json", "Authorization": settings.BHASHINI_API_KEY}

        with httpx.Client(timeout=15) as client:
            res = client.post(bhashini_url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                translated_text = data["pipelineResponse"][0]["output"][0]["target"]
                if translated_text:
                    return {"text": translated_text, "language": lang}

        return {"text": native_text, "language": lang}

    except Exception as e:
        logger.error("Transcription/Translation error: %s", e)
        return {"text": "", "language": "English"}


# ── Complaint helpers ─────────────────────────────────────────

def needs_followup_details(text: str) -> bool:
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


def followup_prompt(language_name: str) -> str:
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


def create_grievance_from_text(phone_number: str, complaint_text: str) -> dict:
    sb = get_supabase()
    user_id = get_or_create_user(phone_number, sb)
    classification = classify_with_gemini(complaint_text)
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
