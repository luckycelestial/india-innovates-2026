import httpx
r1 = httpx.post('https://prajavox-backend.vercel.app/api/whatsapp/webhook', data={'From': 'whatsapp:+1234567890', 'Body': '', 'NumMedia': '1', 'MediaUrl0': 'https://demo.twilio.com/docs/classic.mp3', 'MediaContentType0': 'audio/mp3'})
print('Step 1 output:', r1.text)
