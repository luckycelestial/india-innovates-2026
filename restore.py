import re, sys

with open('old_ai.py', 'r', encoding='utf-8') as f:
    text = f.read()
    
idx = text.find('def classify_with_groq(')
if idx != -1:
    with open('praja/backend/app/utils/ai.py', 'a', encoding='utf-8') as dest:
        dest.write('\n\n')
        dest.write(text[idx:])
    print('Restored from utf-8')
else:
    # try utf-16
    with open('old_ai.py', 'r', encoding='utf-16le') as f:
        text = f.read()
    idx = text.find('def classify_with_groq(')
    if idx != -1:
        with open('praja/backend/app/utils/ai.py', 'a', encoding='utf-8') as dest:
            dest.write('\n\n')
            dest.write(text[idx:])
        print('Restored from utf-16')
