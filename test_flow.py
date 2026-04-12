import httpx
resp = httpx.post(
    "https://prajavox-backend.vercel.app/api/whatsapp/webhook",
    data={"From": "whatsapp:+1234567890", "Body": "Test complaint about broken street light", "NumMedia": "0"}
)
print("--- WEBHOOK ---")
print(resp.status_code)
print(resp.text)
