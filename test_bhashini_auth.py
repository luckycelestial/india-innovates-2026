import requests

url = "https://meity-auth.bhashini.gov.in/auth/v1.1.0/application/secret"

headers = {
    "UserID": "3525fb7c1a-29ba-42b2-8608-e8ed98540f12",
    "ulcaApiKey": "VWunAyj_NMzI490Y9GHMvn3MX2k5i6njN7O8EWpddnvBv8zyj_kviEid9rKhB-iA"
}

try:
    response = requests.post(url, headers=headers)
    print(response.status_code)
    print(response.text)
except Exception as e:
    print(str(e))
