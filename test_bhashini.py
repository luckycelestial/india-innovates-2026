import requests
import base64

key = "VWunAyj_NMzI490Y9GHMvn3MX2k5i6njN7O8EWpddnvBv8zyj_kviEid9rKhB-iA"
bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

payload = {
    "pipelineTasks": [
        {
            "taskType": "asr",
            "config": {
                "language": {"sourceLanguage": "hi"},
                "audioFormat": "webm"
            }
        }
    ],
    "inputData": {
        "audio": [{"audioContent": "UklGRiQAAABXRUJNNmTrAAAAAAA="}]
    }
}

headers = {
    "Content-Type": "application/json",
    "Authorization": key
}

res = requests.post(bhashini_url, json=payload, headers=headers)
print("STATUS:", res.status_code)
print("RESPONSE:", res.text)
