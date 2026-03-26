import requests
import json
import base64

def p():
    # To properly test, let's encode the screenshot the user actually showed. But I don't have the file.
    # Instead, let's hit the actual API with a dummy image (base64 of 1x1 pixel) and "large pothole"
    # Wait, the user showed a certificate from "EduPyramids".
    pass

url = "https://prajavox-backend.vercel.app/api/grievances/verify-photo"
data = {
    "title": "large pothole",
    "description": "large pothole",
    "photo_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABQABA+OoyQAAAABJRU5ErkJggg=="
}
r = requests.post(url, json=data)
print(r.text)
