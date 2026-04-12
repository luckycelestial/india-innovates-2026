
import re
with open('praja/backend/app/routes/whatsapp.py', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'if received_voice_note:.*?is_voice=False\)'
replacement = '''if received_voice_note:
            resp.message(\u0022\\\\u23f3 I\\'m transcribing your voice note... Please wait a moment.\u0022)
        else:
            resp.message(\u0022\\\\u23f3 Processing your text message... Please wait.\u0022)
            
        payload_state = {
            \u0022text_body\u0022: text_body,
            \u0022detected_lang\u0022: detected_voice_language,
            \u0022is_voice\u0022: \u00221\u0022 if received_voice_note else \u00220\u0022,
            \u0022From\u0022: From,
        }
        qs = urlencode(payload_state)
        # Force HTTPS for Vercel and Twilio signature compatibility
        public_base_url = settings.BACKEND_URL.rstrip(\u0022/\u0022) if settings.BACKEND_URL else str(request.base_url).replace(\u0022http://\u0022, \u0022https://\u0022).rstrip(\u0022/\u0022)
        redirect_url = f\u0022{public_base_url}/api/whatsapp/process-step-2?{qs}\u0022
        resp.redirect(redirect_url, method=\u0022POST\u0022)
        return xml_response(resp)'''

if re.search(pattern, text, flags=re.DOTALL):
    text = re.sub(pattern, replacement, text, count=1, flags=re.DOTALL)
    print('Pattern found and replaced.')
else:
    print('Pattern not found!')

with open('praja/backend/app/routes/whatsapp.py', 'w', encoding='utf-8') as f:
    f.write(text)

