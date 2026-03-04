with open("C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py", "r", encoding="utf-8") as f:
    text = f.read()

# find "JSON FORMAT:" and manually replace { } with {{ }} until "Rules for Classification:"
import re
start = text.find("JSON FORMAT:")
end = text.find("Rules for Classification:")

sub_text = text[start:end]
sub_text = sub_text.replace("{", "{{").replace("}", "}}")
# but wait! we already made data: {{ earlier! Let's just replace all { and } to be safe 
# and then un-double any quadruples? Better to just hardcode exactly:

text = text[:start] + """JSON FORMAT:
  {{
    "status": "complete",
    "data": {{
      "category": "<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>",
      "priority": "<low|medium|high|critical>",
      "title": "<accurate 5-8 word English title capturing the true meaning>",
      "sentiment": "<negative|neutral|positive>",
      "location": "<Extracted location>",
      "clean_description": "<Include FULL details of issue, name, and location. Formatting Rules: 1. If English: return ONLY the English text. 2. If ANY other language: return exactly '[Native Script] (English: [Translation])'. 3. Correct any phonetic typos.>"
    }}
  }}

  """ + text[end:]

with open("C:/Users/Pavithran/India Innovates/praja/backend/app/routes/whatsapp.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Done")
