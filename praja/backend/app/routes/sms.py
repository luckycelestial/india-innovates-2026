from fastapi import APIRouter, Request, Form
from fastapi.responses import JSONResponse, Response
from typing import Optional
import json, re, secrets
from datetime import datetime, timezone

from twilio.twiml.messaging_response import MessagingResponse

from app.db.database import get_supabase
from app.routes.whatsapp_helpers import get_or_create_user
classify_with_groq
from app.config import settings

router = APIRouter()

try:
    from twilio.rest import Client as TwilioClient
except Exception:
    TwilioClient = None


def send_sms_via_twilio(to_phone: str, body: str) -> dict:
    """Send outbound SMS from our Canadian Twilio number."""
    if not TwilioClient:
        return {"ok": False, "reason": "twilio not available"}
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {"ok": False, "reason": "twilio keys missing"}
    client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    from_number = settings.TWILIO_PHONE_NUMBER  # +14508055861
    try:
        msg = client.messages.create(body=body, from_=from_number, to=to_phone)
        return {"ok": True, "sid": msg.sid}
    except Exception as e:
        return {"ok": False, "reason": str(e)}


@router.post("/inbound")
async def sms_inbound(request: Request):
    """Twilio SMS inbound webhook — handles complaints, track, status commands."""
    sb = get_supabase()
    content_type = request.headers.get("content-type", "")
    payload = {}
    try:
        if "application/json" in content_type:
            payload = await request.json()
        else:
            form = await request.form()
            payload = dict(form)
    except Exception:
        payload = {}

    sender = payload.get("From") or payload.get("from") or ""
    text = (payload.get("Body") or payload.get("message") or payload.get("text") or "").strip()

    if not sender or not text:
        return Response(content="<Response/>", media_type="text/xml")

    # Normalize phone
    phone = str(sender)
    if not phone.startswith("+"):
        phone = "+" + phone.lstrip("0")

    def sms_reply(msg: str) -> Response:
        r = MessagingResponse()
        r.message(msg)
        return Response(content=str(r), media_type="text/xml; charset=utf-8")

    # ── TRACK command ── track PRJ-260305-ABCDEF
    track_match = re.match(r"^track\s+(\S+)", text, re.IGNORECASE)
    if track_match:
        ticket_id = track_match.group(1).strip()
        if ticket_id.startswith("PRJ-"):
            rows = sb.table("grievances").select("*").eq("tracking_id", ticket_id).execute()
        else:
            rows = sb.table("grievances").select("*").eq("id", ticket_id).execute()
        if not rows.data:
            return sms_reply(f"No complaint found with ID {ticket_id}.\nSend STATUS to see your complaints.")
        g = rows.data[0]
        return sms_reply(
            f"PRAJA Ticket Status\n"
            f"ID: {g['tracking_id']}\n"
            f"Dept: {g.get('ai_category', 'General')}\n"
            f"Status: {g['status'].replace('_',' ').title()}\n"
            f"Priority: {g['priority'].title()}"
            + (f"\nResolution: {g['resolution_note']}" if g.get('resolution_note') else "")
        )

    # ── STATUS command ──
    if text.lower() == "status":
        try:
            user_id = get_or_create_user(phone, sb)
            rows = (
                sb.table("grievances")
                .select("tracking_id,ai_category,status,priority")
                .eq("citizen_id", user_id)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            if not rows.data:
                return sms_reply("No complaints yet. Text us your issue to file one.")
            lines = ["Your recent complaints:"]
            for g in rows.data:
                lines.append(f"- {g['tracking_id']} | {g.get('ai_category','General')} | {g['status'].title()}")
            lines.append("Reply: track <ticket_id> for details.")
            return sms_reply("\n".join(lines))
        except Exception:
            return sms_reply("Could not fetch your complaints. Please try again.")

    # ── FILE COMPLAINT ── (any other text)
    try:
        user_id = get_or_create_user(phone, sb)
    except Exception:
        try:
            user = sb.table("users").insert({
                "name": f"SMS User {phone[-4:]}",
                "email": f"sms_{phone.replace('+','')}@praja.local",
                "phone": phone,
                "role": "citizen",
            }).execute()
            user_id = user.data[0]["id"]
        except Exception:
            return sms_reply("Error creating account. Please try again.")

    classification = classify_with_groq(text)
    tracking_id = f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"

    try:
        sb.table("grievances").insert({
            "tracking_id":  tracking_id,
            "citizen_id":   user_id,
            "title":        classification.get("title", text[:80]),
            "description":  text,
            "ai_category":  classification.get("category", "General"),
            "ai_sentiment": classification.get("sentiment", "negative"),
            "priority":     classification.get("priority", "medium"),
            "status":       "open",
            "channel":      "sms",
        }).execute()
    except Exception:
        return sms_reply("Failed to file complaint. Please try again.")

    category = classification.get("category", "General")
    priority = classification.get("priority", "medium")
    prio_label = {"low": "P3", "medium": "P2", "high": "P1", "critical": "P0"}.get(priority, "P2")

    return sms_reply(
        f"PRAJA - Complaint Filed\n"
        f"Ticket: {tracking_id}\n"
        f"Dept: {category}\n"
        f"Priority: {priority.upper()} ({prio_label})\n"
        f"SLA: 72 hours\n"
        f"Reply 'track {tracking_id}' to check status."
    )
