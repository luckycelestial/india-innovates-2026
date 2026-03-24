import requests
import json

url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

payload = {
    "pipelineTasks": [
        {
            "taskType": "translation",
            "config": {
                "language": {
                    "sourceLanguage": "hi",
                    "targetLanguage": "en"
                },
                "serviceId": 'ai4bharat/indictrans-v2-all-gpu--t4'
            }
        }
    ],
    "inputData": {
        "input": [{"source": "मेरा नाम भारत है"}]
    }
}
headers = {
    'Authorization': 'VWunAyj_NMzI490Y9GHMvn3MX2k5i6njN7O8EWpddnvBv8zyj_kviEid9rKhB-iA',
    'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

print(response.text)
