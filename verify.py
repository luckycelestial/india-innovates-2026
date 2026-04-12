import httpx
import json
import base64
import urllib.parse
payload_state = {
    "From": "whatsapp:+14155552671",
    "text_body": "This is a test complain about garbage dump near the main street",
    "detected_lang": "en",
    "is_voice": "0"
}
state_str = json.dumps(payload_state)
state_b64 = base64.b64encode(state_str.encode("utf-8")).decode("utf-8")
body = f"State={urllib.parse.quote(state_b64)}"

headers = {"Content-Type": "application/x-www-form-urlencoded"}
res = httpx.post("https://prajavox-backend.vercel.app/api/whatsapp/process-step-2", data=body, headers=headers)
print(res.text)
