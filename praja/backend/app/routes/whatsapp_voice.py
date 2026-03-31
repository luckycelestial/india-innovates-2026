"""
WhatsApp Bot — Voice reply & followup routes (extracted from whatsapp.py)
"""
from urllib.parse import urlencode
from xml.sax.saxutils import escape as xml_escape

from fastapi import APIRouter, Form, Request, Header, Query
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Gather

from app.config import settings
from app.routes.whatsapp_helpers import (
    TwilioClient,
    is_valid_twilio_signature,
    voice_xml_response,
    needs_followup_details,
    followup_prompt,
    create_grievance_from_text,
)

router = APIRouter()


# ── Voice reply localization ──────────────────────────────────

def _language_profile(language_name: str) -> dict:
    profiles = {
        "Hindi":     {"locale": "hi-IN", "voice": "Polly.Aditi"},
        "English":   {"locale": "en-IN", "voice": "Polly.Aditi"},
        "Tamil":     {"locale": "ta-IN", "voice": ""},
        "Telugu":    {"locale": "te-IN", "voice": ""},
        "Kannada":   {"locale": "kn-IN", "voice": ""},
        "Malayalam": {"locale": "ml-IN", "voice": ""},
        "Bengali":   {"locale": "bn-IN", "voice": ""},
    }
    return profiles.get(language_name, profiles["English"])


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


# ── Outbound voice call ──────────────────────────────────────

def trigger_voice_reply_call(
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
        f'<Say{voice_attr} language="{locale}">'
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


# ── Voice followup routes ────────────────────────────────────

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
    if not is_valid_twilio_signature(request, x_twilio_signature, params):
        return Response(content="Forbidden", status_code=403)

    profile = _language_profile(lang)
    locale = profile["locale"]
    voice = profile["voice"] or "Polly.Aditi"
    action_qs = urlencode({"phone": phone, "lang": lang, "base": base[:220], "attempt": 0})
    action_url = f"{str(request.base_url).rstrip('/')}/api/whatsapp/voice-followup/collect?{action_qs}"

    vr = VoiceResponse()
    gather = Gather(
        input="speech",
        action=action_url, method="POST",
        timeout=8, speech_timeout="auto", language=locale,
    )
    gather.say(followup_prompt(lang), language=locale, voice=voice)
    vr.append(gather)
    vr.say(followup_prompt(lang), language=locale, voice=voice)
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
    if not is_valid_twilio_signature(request, x_twilio_signature, params):
        return Response(content="Forbidden", status_code=403)

    profile = _language_profile(lang)
    locale = profile["locale"]
    voice = profile["voice"] or "Polly.Aditi"
    followup_text = (SpeechResult or "").strip()
    vr = VoiceResponse()

    combined_text = " ".join(part for part in [base.strip(), followup_text] if part).strip()

    if (not followup_text or needs_followup_details(combined_text)) and attempt < 1:
        retry_qs = urlencode({"phone": phone, "lang": lang, "base": base[:220], "attempt": attempt + 1})
        retry_action = f"{str(request.base_url).rstrip('/')}/api/whatsapp/voice-followup/collect?{retry_qs}"
        gather = Gather(
            input="speech",
            action=retry_action, method="POST",
            timeout=8, speech_timeout="auto", language=locale,
        )
        gather.say(followup_prompt(lang), language=locale, voice=voice)
        vr.append(gather)
        vr.say(_localized_voice_line(lang, "retry_detail"), language=locale, voice=voice)
        return voice_xml_response(vr)

    if not followup_text or needs_followup_details(combined_text):
        vr.say(_localized_voice_line(lang, "still_missing"), language=locale, voice=voice)
        return voice_xml_response(vr)

    try:
        result = create_grievance_from_text(phone, combined_text)
        tracking_id = result["tracking_id"]
        vr.say(
            _localized_voice_line(lang, "registered", tracking_id=tracking_id),
            language=locale, voice=voice,
        )
    except Exception as exc:
        print(f"Failed to file grievance from follow-up call: {exc}")
        vr.say(_localized_voice_line(lang, "filing_error"), language=locale, voice=voice)

    return voice_xml_response(vr)
