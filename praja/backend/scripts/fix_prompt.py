with open("C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py", "r", encoding="utf-8") as f:
    text = f.read()

import re
text = re.sub(r'{\n    "status"', r'{{\n    "status"', text)
text = re.sub(r'"data": {\n', r'"data": {{\n', text)
text = re.sub(r'  }\n  }', r'  }}\n  }}', text)

with open("C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Done")
