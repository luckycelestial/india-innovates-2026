import re
import json
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from supabase._sync.client import SyncClient as Client
from deep_translator import GoogleTranslator
from groq import Groq
from app.config import settings
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()
_groq = Groq(api_key=settings.GROQ_API_KEY)

CATEGORIES = ["Water Supply", "Roads", "Electricity", "Sanitation",
              "Drainage", "Parks", "Health", "Education", "General"]


def _classify(title: str, desc: str) -> dict:
    prompt = f"""You are a classifier for Indian citizen grievances. Inputs may be in English, Tamil, Telugu, Hindi, Marathi, or Tanglish (Indian language written in English letters). Understand the ACTUAL meaning before classifying.

CRITICAL RULES:
- Any mention of suicide, self-harm, or killing oneself → priority=critical, category=Health
- Any death threat or threat to a public figure → priority=critical, category=General
- Any sexual assault or abduction → priority=critical, category=General
- Otherwise: water/drainage issues=Water Supply, road/pothole=Roads, power cut=Electricity, garbage/sewage=Sanitation, hospital/disease=Health, school=Education

Respond with ONLY valid JSON, no explanation:
{{"category":"<Water Supply|Roads|Electricity|Sanitation|Drainage|Parks|Health|Education|General>","priority":"<low|medium|high|critical>","sentiment":"<negative|neutral|positive>"}}

Complaint title: {title}
Complaint description: {desc[:400]}"""
    try:
        r = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80, temperature=0.1,
        )
        raw = re.sub(r"```.*?```", "", (r.choices[0].message.content or ""), flags=re.DOTALL).strip()
        data = json.loads(raw)
        if data.get("category") not in CATEGORIES:
            data["category"] = "General"
        if data.get("priority") not in ["low", "medium", "high", "critical"]:
            data["priority"] = "medium"
        return data
    except Exception:
        return {"category": "General", "priority": "medium", "sentiment": "negative"}


def _gen_tracking_id() -> str:
    return f"PRJ-{datetime.now(timezone.utc).strftime('%y%m%d')}-{secrets.token_hex(3).upper()}"


class GrievanceCreate(BaseModel):
    title: str
    description: str


@router.post("/submit", status_code=201)
@router.post("/", status_code=201)
def create_grievance(
    body: GrievanceCreate,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    cls = _classify(body.title, body.description)
    row = sb.table("grievances").insert({
        "tracking_id":  _gen_tracking_id(),
        "citizen_id":   current["sub"],
        "title":        body.title,
        "description":  body.description,
        "ai_category":  cls["category"],
        "ai_sentiment": cls.get("sentiment", "negative"),
        "priority":     cls["priority"],
        "status":       "open",
        "channel":      "web",
    }).execute()
    g = row.data[0]
    return {**g, "tracking_id": g["tracking_id"], "priority": g["priority"]}


@router.get("/")
def list_grievances(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("grievances").select("*").order("created_at", desc=True)
    if current["role"] == "citizen":
        q = q.eq("citizen_id", current["sub"])
    if status:
        q = q.eq("status", status)
    result = q.range(skip, skip + limit - 1).execute()
    return result.data


@router.get("/{grievance_id}")
def get_grievance(
    grievance_id: str,
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    row = sb.table("grievances").select("*").eq("id", grievance_id).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Not found")
    return row.data[0]


@router.put("/{grievance_id}/status")
def update_status(
    grievance_id: str,
    status: str,
    notes: str = "",
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")
    sb.table("grievances").update({"status": status}).eq("id", grievance_id).execute()
    try:
        sb.table("ticket_logs").insert({
            "grievance_id": grievance_id,
            "officer_id":   current["sub"],
            "action":       f"status_changed_to_{status}",
            "notes":        notes,
        }).execute()
    except Exception:
        pass
    return {"ok": True}
