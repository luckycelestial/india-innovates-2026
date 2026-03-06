import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, List
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


# ── Smart Schedule Manager ──────────────────────────────────────

class ScheduleCreate(BaseModel):
    title: str
    description: str = ""
    event_date: str  # YYYY-MM-DD
    event_time: str = ""  # HH:MM
    location: str = ""
    event_type: str = "meeting"


@router.post("/schedule")
async def create_schedule(
    data: ScheduleCreate,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    """Create a schedule item and generate AI preparation brief."""
    brief_prompt = (
        f"You are NayakAI. Generate a short preparation brief (3-4 bullet points) for this event:\n"
        f"Title: {data.title}\nDescription: {data.description}\nType: {data.event_type}\n"
        f"Location: {data.location}\nDate: {data.event_date}\n\n"
        "Include: key talking points, relevant data to review, and potential questions to expect."
    )
    try:
        ai_brief = await _ask_groq(brief_prompt, max_tokens=300)
    except Exception:
        ai_brief = "AI brief unavailable."

    insert_data = {
        "user_id": current["sub"],
        "title": data.title,
        "description": data.description,
        "event_date": data.event_date,
        "location": data.location,
        "event_type": data.event_type,
        "ai_brief": ai_brief,
    }
    if data.event_time:
        insert_data["event_time"] = data.event_time

    result = sb.table("schedules").insert(insert_data).execute()
    return result.data[0] if result.data else {"ok": True}


@router.get("/schedule")
def list_schedule(
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    """List upcoming schedule items for the current user."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = (
        sb.table("schedules")
        .select("*")
        .eq("user_id", current["sub"])
        .gte("event_date", today)
        .order("event_date", desc=False)
        .limit(20)
        .execute()
    )
    return result.data or []


@router.put("/schedule/{schedule_id}/complete")
def complete_schedule(
    schedule_id: str,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    sb.table("schedules").update({"is_completed": True}).eq("id", schedule_id).eq("user_id", current["sub"]).execute()
    return {"ok": True}


# ── Real-Time Action Alerts ─────────────────────────────────────

@router.post("/action-alerts")
async def action_alerts(
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    """Get escalated/critical complaints with AI-drafted action responses."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(hours=72)).isoformat()

    escalated = (
        sb.table("grievances")
        .select("id, tracking_id, title, description, ai_category, priority, status, created_at")
        .eq("status", "escalated")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    critical = (
        sb.table("grievances")
        .select("id, tracking_id, title, description, ai_category, priority, status, created_at")
        .eq("priority", "critical")
        .neq("status", "resolved")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    seen = set()
    alerts_items = []
    for g in (escalated.data or []) + (critical.data or []):
        if g["id"] in seen:
            continue
        seen.add(g["id"])

        try:
            prompt = (
                "You are NayakAI. Draft a brief action response (3 sentences max) for this escalated grievance:\n"
                f"Title: {g['title']}\nDescription: {g.get('description', '')[:300]}\n"
                f"Category: {g.get('ai_category', 'General')}\nPriority: {g.get('priority', 'high')}\n\n"
                "Suggest: immediate action, who to notify, and timeline."
            )
            draft = await _ask_groq(prompt, max_tokens=200)
        except Exception:
            draft = "Review this escalated complaint and take immediate action."

        alerts_items.append({
            "id": g["id"],
            "tracking_id": g.get("tracking_id"),
            "title": g["title"],
            "category": g.get("ai_category", "General"),
            "priority": g.get("priority"),
            "created_at": g.get("created_at"),
            "ai_draft_response": draft,
        })

    return alerts_items[:8]


# ── Meeting Summarizer ──────────────────────────────────────────

class MeetingSummaryRequest(BaseModel):
    notes: str
    meeting_type: str = "general"


@router.post("/meeting-summary")
async def meeting_summary(data: MeetingSummaryRequest):
    """Summarize meeting notes into key decisions and action items."""
    if not data.notes.strip():
        raise HTTPException(status_code=400, detail="Meeting notes are empty")

    prompt = (
        "You are NayakAI. Summarize these meeting notes for an Indian government official.\n"
        "Format your response EXACTLY as:\n\n"
        "MEETING SUMMARY:\n[2-3 sentence overview]\n\n"
        "KEY DECISIONS:\n* [decision 1]\n* [decision 2]\n* [decision 3]\n\n"
        "ACTION ITEMS:\n1. [action] — Owner: [who] — Deadline: [when]\n"
        "2. [action] — Owner: [who] — Deadline: [when]\n"
        "3. [action] — Owner: [who] — Deadline: [when]\n\n"
        "FOLLOW-UP REQUIRED:\n* [item]\n\n"
        f"Meeting Type: {data.meeting_type}\n"
        f"Notes:\n{data.notes[:6000]}"
    )
    result = await _ask_groq(prompt, max_tokens=800)
    return {"summary": result, "meeting_type": data.meeting_type}


# ── Development Report Card ─────────────────────────────────────

class ReportCardRequest(BaseModel):
    constituency: str = ""
    period: str = "month"  # month | week


@router.post("/report-card")
async def report_card(
    data: ReportCardRequest,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    """Generate 'What I Did This Month' development report card."""
    now = datetime.now(timezone.utc)
    days = 30 if data.period == "month" else 7
    cutoff = (now - timedelta(days=days)).isoformat()

    resolved_res = (
        sb.table("grievances")
        .select("id, title, ai_category, priority, resolved_at, created_at")
        .eq("status", "resolved")
        .gte("updated_at", cutoff)
        .execute()
    )
    total_res = (
        sb.table("grievances")
        .select("id, ai_category, status, priority")
        .gte("created_at", cutoff)
        .execute()
    )

    resolved = resolved_res.data or []
    total = total_res.data or []
    new_count = len(total)
    resolved_count = len(resolved)

    cat_resolved: dict[str, int] = {}
    for r in resolved:
        cat = r.get("ai_category") or "General"
        cat_resolved[cat] = cat_resolved.get(cat, 0) + 1
    top_resolved = sorted(cat_resolved.items(), key=lambda x: x[1], reverse=True)[:5]

    stats_text = (
        f"Period: Last {days} days\n"
        f"New grievances filed: {new_count}\n"
        f"Grievances resolved: {resolved_count}\n"
        f"Resolution rate: {round(resolved_count / new_count * 100) if new_count else 0}%\n"
        f"Top categories resolved: {', '.join(f'{c}({n})' for c, n in top_resolved)}\n"
    )

    prompt = (
        "You are NayakAI. Write a professional development report card for an Indian elected leader.\n"
        "This is a 'What I Did This Month' report for their constituency.\n"
        "Format as a brief, impressive but honest newsletter-style summary (200 words max).\n"
        "Include: achievements, areas of focus, and commitment statement.\n\n"
        f"Constituency: {data.constituency or 'General'}\n{stats_text}"
    )
    try:
        narrative = await _ask_groq(prompt, max_tokens=400)
    except Exception:
        narrative = f"This {data.period}, {resolved_count} grievances were resolved out of {new_count} new complaints."

    return {
        "period": data.period,
        "days": days,
        "new_grievances": new_count,
        "resolved_count": resolved_count,
        "resolution_rate": round(resolved_count / new_count * 100) if new_count else 0,
        "top_categories": [{"category": c, "count": n} for c, n in top_resolved],
        "narrative": narrative,
    }