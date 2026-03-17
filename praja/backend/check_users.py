import os
from dotenv import load_dotenv
import requests

load_dotenv(".env")

url = os.getenv("SUPABASE_URL") + "/rest/v1/users?select=*"
key = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

res = requests.get(url, headers=headers)
data = res.json()
print("Total users:", len(data))
if len(data) > 0:
    print("Users sample:", data)
