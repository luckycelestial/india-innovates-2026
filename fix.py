import re
with open('C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'if received_voice_note:.*?_handle_message\(text_body, From, resp, detected_voice_language, is_voice=False\)'

new_code = '''# Bypass 15s Twilio / 10s Vercel limits via Twilio\\'s HTTP <Redirect>
        if received_voice_note:
            resp.message(u"\\u23f3 I\\'m transcribing your voice note... Please wait a moment.")
        else:
            resp.message(u"\\u23f3 Processing your message... Please wait.")

        payload_state = {
            "text_body": text_body,
            "detected_lang": detected_voice_language,
            "is_voice": "1" if received_voice_note else "0",
            "From": From,
        }
        qs = urlencode(payload_state)
        public_base_url = settings.BACKEND_URL.rstrip("/") if settings.BACKEND_URL else str(request.base_url).replace("http://", "https://").rstrip("/")
        redirect_url = f"{public_base_url}/api/whatsapp/process-step-2?{qs}"
        resp.redirect(redirect_url, method="POST")
        return xml_response(resp)'''

c = re.sub(pattern, new_code, c, flags=re.DOTALL)
with open('C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py', 'w', encoding='utf-8') as f:
    f.write(c)
