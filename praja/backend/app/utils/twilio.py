from twilio.rest import Client as TwilioClient
from app.config import settings

def make_outbound_call(to_phone: str, xml_url: str):
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {"ok": False, "reason": "Twilio keys missing"}
    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # Use Canadian number for voice
        from_number = settings.TWILIO_PHONE_NUMBER
        call = client.calls.create(url=xml_url, to=to_phone, from_=from_number)
        return {"ok": True, "sid": call.sid}
    except Exception as e:
        return {"ok": False, "reason": str(e)}

def send_sms(to_phone: str, body: str):
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {"ok": False, "reason": "Twilio keys missing"}
    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        from_number = settings.TWILIO_PHONE_NUMBER
        msg = client.messages.create(body=body, from_=from_number, to=to_phone)
        return {"ok": True, "sid": msg.sid}
    except Exception as e:
        return {"ok": False, "reason": str(e)}
