import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from groq import AsyncGroq

from app.config import settings
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()
_groq = AsyncGroq(api_key=settings.GROQ_API_KEY)


class AssistRequest(BaseModel):
    text: str
    mode: str = "summarize"


class MorningBriefRequest(BaseModel):
    constituency: Optional[str] = ""
    date: Optional[str] = ""


class AskRequest(BaseModel):
    question: str
    constituency: str = ""
    language: str = "en"


async def _ask_groq(prompt: str, max_tokens: int = 800) -> str:
    response = await _groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.4,
    )
    return response.choices[0].message.content or ""


def _count_categories(rows: list) -> list:
    counts: dict[str, int] = {}
    for r in rows:
        cat = r.get("ai_category") or r.get("category") or "General"
        counts[cat] = counts.get(cat, 0) + 1
    sorted_cats = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [{"category": cat, "count": cnt} for cat, cnt in sorted_cats[:5]]


@router.post("/morning-brief")
async def morning_brief(
    data: MorningBriefRequest = None,
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    if data is None:
        data = MorningBriefRequest()
    now = datetime.now(timezone.utc)
    cutoff_72h = (now - timedelta(hours=72)).isoformat()
    yesterday_start = (now - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    yesterday_end = (now - timedelta(days=1)).replace(
        hour=23, minute=59, second=59, microsecond=0
    ).isoformat()

    open_res = (
        sb.table("grievances")
        .select("id, ai_category, priority, created_at, status")
        .neq("status", "resolved")
        .execute()
    )
    open_rows = open_res.data or []

    sla_violations = sum(
        1 for r in open_rows
        if r.get("created_at", "") < cutoff_72h
    )
    critical_open = sum(1 for r in open_rows if r.get("priority") == "critical")
    top_cats = _count_categories(open_rows)
    top_issues = [f"{c['category']} ({c['count']} open)" for c in top_cats]

    try:
        resolved_res = (
            sb.table("grievances")
            .select("id")
            .eq("status", "resolved")
            .gte("updated_at", yesterday_start)
            .lte("updated_at", yesterday_end)
            .execute()
        )
        resolved_yesterday = len(resolved_res.data or [])
    except Exception:
        resolved_yesterday = 0

    high_count = sum(1 for r in open_rows if r.get("priority") in ("critical", "high"))
    total = len(open_rows) or 1
    sentiment_score = round(1.0 - (high_count / total), 2)

    brief_prompt = (
        "You are NayakAI, an AI assistant for Indian elected leaders.\n"
        "Generate a concise morning governance brief (3-4 sentences, plain English) based on:\n"
        f"- Total open grievances: {len(open_rows)}\n"
        f"- SLA violations (unresolved >72h): {sla_violations}\n"
        f"- Critical priority issues: {critical_open}\n"
        f"- Resolved yesterday: {resolved_yesterday}\n"
        f"- Top issues: {', '.join(top_issues[:3]) if top_issues else 'No major issues'}\n\n"
        "Be direct, factual, action-oriented. Start with 'Good morning.' No bullet points."
    )
    try:
        summary = await _ask_groq(brief_prompt, max_tokens=200)
    except Exception:
        summary = (
            f"Good morning. There are {len(open_rows)} open grievances today, "
            f"with {sla_violations} SLA violations requiring immediate attention."
        )

    return {
        "date": now.strftime("%B %d, %Y"),
        "total_open": len(open_rows),
        "sla_violations": sla_violations,
        "resolved_yesterday": resolved_yesterday,
        "critical_open": critical_open,
        "sentiment_score": sentiment_score,
        "top_issues": top_issues,
        "summary": summary,
    }


@router.post("/assist")
async def assist(data: AssistRequest):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Text input is empty")

    mode = data.mode.lower()

    if mode == "summarize":
        prompt = (
            "You are an AI assistant for Indian elected leaders.\n"
            "Summarize the following text in this exact format:\n\n"
            "KEY POINTS:\n* [point 1]\n* [point 2]\n* [point 3]\n* [point 4]\n* [point 5]\n\n"
            "RECOMMENDED ACTIONS:\n1. [action 1]\n2. [action 2]\n3. [action 3]\n\n"
            f"Text:\n{data.text[:8000]}"
        )
        result = await _ask_groq(prompt, max_tokens=600)

    elif mode == "speech":
        prompt = (
            "Write a compelling 5-minute speech for an Indian elected leader.\n"
            "The speech should be warm, patriotic, appropriate for Indian political context.\n"
            "Start with a proper salutation. End with Jai Hind.\n\n"
            f"Context / topic:\n{data.text[:3000]}"
        )
        result = await _ask_groq(prompt, max_tokens=1000)

    elif mode == "letter":
        prompt = (
            "Write a formal Indian government letter based on the following context.\n"
            "Follow Government of India letter format: Subject, Reference, Salutation, "
            "2-3 body paragraphs, formal closing (Yours faithfully).\n\n"
            f"Context:\n{data.text[:3000]}"
        )
        result = await _ask_groq(prompt, max_tokens=800)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown mode '{mode}'. Use: summarize, speech, or letter."
        )

    return {"result": result, "mode": mode}


@router.post("/ask")
async def ask_nayakai(data: AskRequest):
    lang_map = {
        "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
        "kn": "Kannada", "ml": "Malayalam", "en": "English",
    }
    lang_name = lang_map.get(data.language, "English")
    system = (
        "You are NayakAI, an expert AI assistant embedded in PRAJA, India's AI-powered "
        "citizen grievance and constituency intelligence platform. You help citizens, officers, "
        "and elected leaders understand governance, policy, and complaint resolution in India. "
        f"Respond in {lang_name}. Be concise, factual, and helpful."
    )
    user_msg = data.question
    if data.constituency:
        user_msg = f"[Constituency: {data.constituency}]\n{user_msg}"
    response = await _groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=600,
        temperature=0.5,
    )
    return {"answer": response.choices[0].message.content, "language": data.language}


# Legacy individual endpoints

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


@router.post("/summarize")
async def summarize_document(data: SummarizeRequest):
    r = await assist(AssistRequest(text=data.text, mode="summarize"))
    return {"summary": r["result"]}


@router.post("/speech")
async def draft_speech(data: SpeechRequest):
    lang_note = "in Hindi" if data.language.lower() == "hindi" else "in English"
    points = "\n".join(f"- {p}" for p in data.key_points)
    text = f"Event: {data.event_type}\nLanguage: {lang_note}\nDuration: {data.duration_min} min\nKey points:\n{points}"
    r = await assist(AssistRequest(text=text, mode="speech"))
    return {"speech": r["result"]}


@router.post("/letter")
async def draft_letter(data: LetterRequest):
    text = f"Issue: {data.issue_type}\nContext: {data.context}\nRecipient: {data.recipient}\nSender: {data.sender_title}"
    r = await assist(AssistRequest(text=text, mode="letter"))
    return {"letter": r["result"]}