import requests

# 1. Login to get token
login_data = {
    "aadhaar_number": "111122223333",
    "password": "Demo"
}
res = requests.post("https://prajavox-backend.vercel.app/api/auth/login", json=login_data)
if res.status_code != 200:
    print("Login failed:", res.status_code, res.text)
    exit(1)

token = res.json()["access_token"]
print("Got token.")

# 2. Fetch tickets
headers = {"Authorization": f"Bearer {token}"}
res2 = requests.get("https://prajavox-backend.vercel.app/api/officers/tickets?limit=100", headers=headers)
print("Tickets status:", res2.status_code)
if res2.status_code == 200:
    data2 = res2.json()
    print("Tickets count:", len(data2))
else:
    print("Tickets error:", res2.text)

# 3. Fetch performance
res3 = requests.get("https://prajavox-backend.vercel.app/api/officers/performance", headers=headers)
print("Performance status:", res3.status_code)
if res3.status_code == 200:
    data3 = res3.json()
    print("Performance total grievances:", data3.get("total_grievances"))
else:
    print("Performance error:", res3.text)

# 4. Fetch my complaints
res4 = requests.get("https://prajavox-backend.vercel.app/api/grievances/", headers=headers)
print("My Complaints status:", res4.status_code)
if res4.status_code == 200:
    data4 = res4.json()
    print("My complaints count:", len(data4))
else:
    print("My complaints error:", res4.text)

