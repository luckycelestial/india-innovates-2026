import os
from dotenv import load_dotenv
import requests

load_dotenv(".env")

url = os.getenv("SUPABASE_URL") + "/rest/v1/users?select=email,aadhaar_number,role,name"
key = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

res = requests.get(url, headers=headers)
for u in res.json():
    print(u["role"], u["name"], u["email"], u["aadhaar_number"])
