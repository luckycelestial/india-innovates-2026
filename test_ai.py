import sys
import json
sys.path.insert(0, "C:/Users/Pavithran/India Innovates/praja/backend")
from app.utils.ai import agentic_chat_with_groq

history = [{"role": "user", "content": "This is a test complain about garbage dump near the main street"}]
res = agentic_chat_with_groq(history=history)
print(json.dumps(res, indent=2))
