from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import AsyncGroq

from app.config import settings


router = APIRouter()
client = AsyncGroq(api_key=settings.GROQ_API_KEY)


# ── Schemas ───────────────────────────────────────────────────────────────────────────────
class SummarizeRequest(BaseModel):
    text: str


class SpeechRequest(BaseModel):
    event_type: str
    key_points: list[str]
    language: str = "english"
    duration_min: int = 5


class LetterRequest(BaseModel):
    issue_type: str
    context: str
    recipient: str
    sender_title: str


class AskRequest(BaseModel):
    question: str
    constituency: str = ""
    language: str = "en"


class MorningBriefRequest(BaseModel):
    constituency: str
    date: str


# ── Routes ────────────────────────────────────────────────────────────────────────────

@router.post("/summarize")
async def summarize_document(data: SummarizeRequest):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    prompt = f"""You are an AI assistant for Indian elected leaders.
Summarize the following government document in exactly this format:

SUMMARY:
\u2022 [bullet 1]
\u2022 [bullet 2]
\u2022 [bullet 3]
\u2022 [bullet 4]
\u2022 [bullet 5]

RECOMMENDED ACTIONS:
1. [action 1]
2. [action 2]
3. [action 3]

Document:
{data.text[:8000]}
"""
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
    )
    return {"summary": response.choices[0].message.content}


@router.post("/speech")
async def draft_speech(data: SpeechRequest):
    lang_instruction = "in Hindi" if data.language.lower() == "hindi" else "in English"
    points = "\n".join(f"- {p}" for p in data.key_points)
    prompt = f"""Write a compelling {data.duration_min}-minute speech for an Indian elected leader.
Event type: {data.event_type}
Language: {lang_instruction}
Key points to cover:
{points}

The speech should be warm, respectful, patriotic and appropriate for an Indian political context.
Start with a proper salutation. End with a call to action."""
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
    )
    return {"speech": response.choices[0].message.content}


@router.post("/letter")
async def draft_letter(data: LetterRequest):
    prompt = f"""Write a formal Indian government letter regarding: {data.issue_type}
Context: {data.context}
Recipient: {data.recipient}
Sender: {data.sender_title}

Follow proper Government of India letter format with subject line, salutation, body paragraphs,
and formal closing. Keep it professional and action-oriented."""
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    return {"letter": response.choices[0].message.content}


@router.post("/ask")
async def ask_nayakai(data: AskRequest):
    lang_map = {"hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam", "en": "English"}
    lang_name = lang_map.get(data.language, "English")
    system = (
        "You are NayakAI, an expert AI assistant embedded in PRAJA \u2014 India's AI-powered "
        "citizen grievance and constituency intelligence platform. You help citizens, officers, "
        "and elected leaders understand governance, policy, and complaint resolution in India. "
        f"Respond in {lang_name}. Be concise, factual, and helpful."
    )
    user_msg = data.question
    if data.constituency:
        user_msg = f"[Constituency: {data.constituency}]\n{user_msg}"
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=600,
    )
    return {"answer": response.choices[0].message.content, "language": data.language}


@router.post("/morning-brief")
async def morning_brief(data: MorningBriefRequest):
    return {
        "date": data.date,
        "constituency": data.constituency,
        "top_issues": [
            {"rank": 1, "department": "Water Supply", "count": 34, "priority": "critical"},
            {"rank": 2, "department": "Roads",        "count": 21, "priority": "high"},
            {"rank": 3, "department": "Electricity",  "count": 18, "priority": "high"},
            {"rank": 4, "department": "Sanitation",   "count": 12, "priority": "medium"},
            {"rank": 5, "department": "Health",       "count": 9,  "priority": "medium"},
        ],
        "sla_violations": 7,
        "resolved_yesterday": 15,
        "heatmap_alert": "Ward 12 mood dropped to CRITICAL \u2014 45 new water complaints overnight",
        "sentiment_score": 0.41,
    }
