import os
from groq import Groq

# Load .env
from dotenv import load_dotenv
load_dotenv("praja/backend/.env")

client = Groq()

prompt = "What is in this image?"
url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABQABA+OoyQAAAABJRU5ErkJggg=="

try:
    r = client.chat.completions.create(
        model="llama-3.2-90b-vision-preview",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": url}}
            ]
        }],
        max_tokens=150,
        temperature=0.1
    )
    print(r.choices[0].message.content)
except Exception as e:
    print("Error:", str(e))
