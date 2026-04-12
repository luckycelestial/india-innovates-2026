"""
WhatsApp Bot via Twilio Sandbox — Core webhook and message routing.
Voice-reply routes live in whatsapp_voice.py; shared helpers in whatsapp_helpers.py.
"""
import re
import json
import secrets
import logging
import urllib.parse
from urllib.parse import urlencode
from datetime import datetime, timezone

from fastapi import APIRouter, Form, Request, Header, Query
from fastapi.responses import Response
from twilio.twiml.messaging_response import MessagingResponse
import xml.etree.ElementTree as ET

from app.config import settings
from app.db.database import get_supabase
from app.utils.ai import detect_language, agentic_chat_with_gemini, translate_to_english, translate_from_english

# Import helpers
from app.routes.whatsapp_helpers import (
    TwilioClient,
    download_and_transcribe,
    get_or_create_user,
    check_registration_and_get_user,
    priority_emoji,
    xml_response,
    is_valid_twilio_signature,
)

# Import voice sub-router (mounted in main.py)
from app.routes.whatsapp_voice import router as voice_router, trigger_voice_reply_call

logger = logging.getLogger(__name__)
router = APIRouter()

HELP_MSG = (
    "\U0001f44b *Welcome to PRAJA!*\n\n"
    "Send me your complaint in any language and I'll file it immediately.\n\n"
    "Commands:\n"
    "\u2022 *track <id>* \u2014 Check status of a complaint\n"
    "\u2022 *status* \u2014 See your last 3 complaints\n"
    "\u2022 *reset* \u2014 Clear demo data & unlink Aadhaar\n"
    "\u2022 *help* \u2014 Show this message"
)


# ── Main webhook ──────────────────────────────────────────────

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
        if not is_valid_twilio_signature(request, x_twilio_signature, params):
            logger.warning("Rejected non-Twilio webhook call: invalid signature")
            return Response(content="Forbidden", status_code=403)

        text_body = Body.strip()

        # If user sent a voice note, transcribe it
        if NumMedia > 0 and MediaUrl0:
            if "audio" in MediaContentType0 or "video" in MediaContentType0:
                received_voice_note = True
                transcription_result = download_and_transcribe(MediaUrl0)
                if transcription_result.get("text"):
                    text_body = transcription_result["text"]
                    detected_voice_language = transcription_result.get("language", "English")
                else:
                    resp.message("⚠️ Apologies, transcription failed. Please try again.")
                    return xml_response(resp)

        if not text_body:
            resp.message("⚠️ It seems you sent an empty message I couldn't process. Please send a text or voice note.")
            return xml_response(resp)

        if received_voice_note:
            # Bypass 15s Twilio / 10s Vercel limits via Twilio's HTTP <Redirect>
            # Use a friendly processing message only for voice
            resp.message("\u23f3 I'm transcribing your voice note... Please wait a moment.")
            payload_state = {
                "text_body": text_body,
                "detected_lang": detected_voice_language,
                "is_voice": "1",                "From": From,            }
            qs = urlencode(payload_state)
            # Force HTTPS for Vercel and Twilio signature compatibility
            public_base_url = settings.BACKEND_URL.rstrip("/") if settings.BACKEND_URL else str(request.base_url).replace("http://", "https://").rstrip("/")
            redirect_url = f"{public_base_url}/api/whatsapp/process-step-2?{qs}"
            resp.redirect(redirect_url, method="POST")
            return xml_response(resp)

        # TEXT messages: process directly (usually takes < 5s)
        await _handle_message(text_body, From, resp, detected_voice_language, is_voice=False)

    except Exception as exc:
        logger.exception("WhatsApp webhook error")
        resp.message(
            f"⚠️ PRAJA encountered an error parsing your message.\n"
            f"Error ref: {type(exc).__name__}"
        )
    return xml_response(resp)


@router.api_route("/process-step-2", methods=["GET", "POST"])
async def whatsapp_process_step_2(
    request: Request,
    x_twilio_signature: str = Header(default=""),
    text_body: str = Query(""),
    detected_lang: str = Query("English"),
    is_voice: str = Query("0")
):
    resp = MessagingResponse()
    try:
        try:
            form_data = await request.form()
        except:
            form_data = {}
        params = {k: str(v) for k, v in form_data.items()}
        
        From = form_data.get("From") or request.query_params.get("From")
        if not From:
            From = "whatsapp:+1234567890" # Fallback if totally lost
            logger.warning("Twilio Redirect entirely lost the 'From' field!")

        # Bypass signature check for redirect due to query param mangling on Vercel
        # if not is_valid_twilio_signature(request, x_twilio_signature, params):
        #     return Response(content="Forbidden", status_code=403)

        try:
            await _handle_message(text_body, From, resp, detected_lang, is_voice == "1")
        except Exception as handler_err:
            logger.error("Error in handle_message: %s", handler_err)
            if settings.TWILIO_ACCOUNT_SID:
                TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).messages.create(
                    to=From, from_=settings.TWILIO_WHATSAPP_NUMBER,
                    body=f"⚠️ [DEBUG] Internal error inside handle_message: {handler_err}"
                )
            raise handler_err

    except Exception as exc:
        logger.exception("WhatsApp process-step-2 error")
        resp.message(
            f"⚠️ PRAJA encountered an error computing your response.\n"
            f"Please try again or send *help* for commands.\n"
            f"Error ref: {type(exc).__name__}"
        )
    return xml_response(resp)


# ── Background processing ────────────────────────────────────

async def _process_voice_note_bg(media_url: str, From: str):
    twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    try:
        transcription_result = download_and_transcribe(media_url)
        if not transcription_result.get("text"):
            twilio_client.messages.create(
                to=From, from_=settings.TWILIO_WHATSAPP_NUMBER,
                body="⚠️ Apologies, transcription failed. Please try again."
            )
            return

        text_body = transcription_result["text"]
        detected_voice_language = transcription_result.get("language", "English")

        resp = MessagingResponse()
        await _handle_message(text_body, From, resp, detected_voice_language, is_voice=True)

        root = ET.fromstring(str(resp))
        for msg in root.findall("Message"):
            body_text = msg.text or ""
            medias = [m.text for m in msg.findall("Media")]
            kwargs = {"to": From, "from_": settings.TWILIO_WHATSAPP_NUMBER, "body": body_text}
            if medias:
                kwargs["media_url"] = medias
            twilio_client.messages.create(**kwargs)

    except Exception as e:
        logger.error("Background Voice Processing Error: %s", e)


async def _process_text_msg_bg(text_body: str, From: str, lang: str, is_voice: bool):
    try:
        resp = MessagingResponse()
        await _handle_message(text_body, From, resp, lang, is_voice)

        root = ET.fromstring(str(resp))
        twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        for msg in root.findall("Message"):
            body_text = msg.text or ""
            medias = [m.text for m in msg.findall("Media")]
            kwargs = {"to": From, "from_": settings.TWILIO_WHATSAPP_NUMBER, "body": body_text}
            if medias:
                kwargs["media_url"] = medias
            twilio_client.messages.create(**kwargs)

    except Exception as e:
        logger.error("Background Text Processing Error: %s", e)


# ── Core message handler ─────────────────────────────────────

async def _handle_message(Body: str, From: str, resp: MessagingResponse, user_lang: str = None, is_voice: bool = False) -> None:
    sb = get_supabase()
    text = Body.strip()
    sender = From
    detected_lang = user_lang or detect_language(text)
    english_text = translate_to_english(text) if detect_language(text) != "English" else text

    def _reply_with_voice_if_needed(text_en: str, text_native: str):
        msg = resp.message(text_native)
        # Only attach voice reply if Bhashini API key is present, otherwise Twilio silently drops the message
        # when it fails to fetch the media URL with a 200 OK status.
        if is_voice and settings.BHASHINI_API_KEY:
            url = f"{settings.BACKEND_URL}/api/tts/generate.mp3?text={urllib.parse.quote(text_native)}&lang={detected_lang}"
            msg.media(url)

    if text.lower() in ("help", "hi", "hello", "helo", "hai"):
        _reply_with_voice_if_needed("Help message", translate_from_english(HELP_MSG, detected_lang))
        return

    if text.upper() == "CALL ME":
        to_phone = sender.replace("whatsapp:", "")
        xml_url = f"{settings.BACKEND_URL}/api/voice/outbound/start"
        try:
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.calls.create(url=xml_url, to=to_phone, from_=settings.TWILIO_PHONE_NUMBER)
            resp.message(translate_from_english("📞 *Initiating Voice Call...*\n\nPlease answer your phone to file your complaint via our IVR system.", detected_lang))
        except Exception as e:
            resp.message(f"⚠️ *Call Failed:* {str(e)}")
        return

    if text.lower() == "reset":
        clean_phone = sender.replace("whatsapp:", "")
        u = sb.table("users").select("id").eq("phone", clean_phone).execute()
        if u.data:
            uid = u.data[0]["id"]
            sb.table("grievances").delete().eq("citizen_id", uid).execute()
            sb.table("users").delete().eq("id", uid).execute()
        resp.message("🔄 *Demo Reset Successful*\nYour Aadhaar linkage and all complaints have been permanently deleted.\n\nSend any message to start the registration flow again.")
        return

    track_match = re.match(r"^track\s+(\S+)", text, re.IGNORECASE)
    if track_match:
        ticket_id = track_match.group(1).strip()
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

    # Check Registration
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

    # Check for ongoing draft ticket
    drafts = sb.table("grievances").select("id, resolution_note").eq("citizen_id", user_id).eq("status", "closed").eq("title", "Draft Ticket").execute()

    if drafts.data:
        draft = drafts.data[0]
        history_str = draft.get("resolution_note")
        try:
            history = json.loads(history_str) if history_str else []
        except (json.JSONDecodeError, TypeError):
            history = []

        history.append({"role": "user", "content": english_text})
        ai_resp = agentic_chat_with_gemini(history, user_name)

        if ai_resp["type"] == "question":
            ans = ai_resp["text"]
            history.append({"role": "assistant", "content": ans})
            sb.table("grievances").update({"resolution_note": json.dumps(history)}).eq("id", draft["id"]).execute()
            _reply_with_voice_if_needed(ans, translate_from_english(ans, detected_lang))
            return
        elif ai_resp["type"] == "complete":
            classification = ai_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")

            sb.table("grievances").update({
                "title":        classification.get("title", final_text[:80]),
                "description":  final_text,
                "ai_category":  classification.get("category", "General"),
                "ai_sentiment": classification.get("sentiment", "negative"),
                "priority":     classification.get("priority", "medium"),
                "status":       "open",
                "resolution_note": None,
            }).eq("id", draft["id"]).execute()

            g_rows = sb.table("grievances").select("tracking_id").eq("id", draft["id"]).execute()
            tracking_id = g_rows.data[0]["tracking_id"] if g_rows.data else "Unknown"
            _reply_ai_confirmation(resp, _reply_with_voice_if_needed, classification, detected_lang, location_text, tracking_id)
            return

    else:
        # No draft exists — start fresh
        history = [{"role": "user", "content": english_text}]
        ai_resp = agentic_chat_with_gemini(history, user_name)

        if ai_resp["type"] == "question":
            ans = ai_resp["text"]
            history.append({"role": "assistant", "content": ans})

            tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"
            sb.table("grievances").insert({
                "tracking_id":    tracking_id,
                "citizen_id":     user_id,
                "title":          "Draft Ticket",
                "description":    english_text,
                "status":         "closed",
                "channel":        "whatsapp",
                "resolution_note": json.dumps(history),
            }).execute()
            _reply_with_voice_if_needed(ans, translate_from_english(ans, detected_lang))
            return
        elif ai_resp["type"] == "complete":
            classification = ai_resp["data"]
            final_text = classification.get("clean_description", text)
            location_text = classification.get("location", "Not specified")

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
            _reply_ai_confirmation(resp, _reply_with_voice_if_needed, classification, detected_lang, location_text, tracking_id)
            return


def _reply_ai_confirmation(resp, reply_fn, classification, detected_lang, location_text, tracking_id):
    """Build and send the AI confirmation reply (shared by draft-complete and fresh-complete flows)."""
    prio = classification["priority"]
    prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(prio, "P2")
    sentiment = classification.get("sentiment", "negative").title()
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
    reply_fn("Processing Complete", translate_from_english(reply, detected_lang))
