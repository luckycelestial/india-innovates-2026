
import re
with open('praja/backend/app/routes/whatsapp.py', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'def _reply_with_voice_if_needed\(text_en: str, text_native: str\):.*?msg\.media\(url\)'

replacement = '''def _reply_with_voice_if_needed(text_en: str, text_native: str):
        msg = resp.message(text_native)
        # Voice replies disabled per user request (always output text)'''

if re.search(pattern, text, flags=re.DOTALL):
    text = re.sub(pattern, replacement, text, count=1, flags=re.DOTALL)
    print('Voice reply logic removed.')
else:
    print('Pattern not found!')

with open('praja/backend/app/routes/whatsapp.py', 'w', encoding='utf-8') as f:
    f.write(text)

