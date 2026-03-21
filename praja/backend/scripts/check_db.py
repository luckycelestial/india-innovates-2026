import os
from dotenv import load_dotenv
import requests

load_dotenv(".env")

url = os.getenv("SUPABASE_URL") + "/rest/v1/grievances?select=*"
key = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

res = requests.get(url, headers=headers)
data = res.json()
print("Total grievances:", len(data))
if len(data) > 0:
    print("Sample:", data[0])
