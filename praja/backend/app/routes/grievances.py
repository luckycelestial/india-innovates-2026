import re
import json
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Any
from groq import Groq
from app.config import settings
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()
_groq = Groq(api_key=settings.GROQ_API_KEY)

CATEGORIES = ["Water Supply", "Roads", "Electricity", "Sanitation",
              "Drainage", "Parks", "Health", "Education", "General"]

SLA_HOURS = {"critical": 24, "high": 72, "medium": 168, "low": 720}  # 1d / 3d / 7d / 30d


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
    photo_url: Optional[str] = None


@router.post("/submit", status_code=201)
@router.post("/", status_code=201)
def create_grievance(
    body: GrievanceCreate,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    try:
        cls = _classify(body.title, body.description)
        now = datetime.now(timezone.utc)
        hours = SLA_HOURS.get(cls["priority"], 168)
        sla_deadline = (now + timedelta(hours=hours)).isoformat()
        insert_data = {
            "tracking_id":  _gen_tracking_id(),
            "citizen_id":   current["sub"],
            "title":        body.title,
            "description":  body.description,
            "ai_category":  cls["category"],
            "ai_sentiment": cls.get("sentiment", "negative"),
            "priority":     cls["priority"],
            "status":       "open",
            "channel":      "web",
            "sla_deadline":  sla_deadline,
        }
        if body.photo_url:
            insert_data["photo_url"] = body.photo_url
        row = sb.table("grievances").insert(insert_data).execute()
        g = row.data[0]
        return {**g, "tracking_id": g["tracking_id"], "priority": g["priority"]}
    except Exception as e:
        print(f"Error creating grievance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit complaint. Please try again.")


@router.get("/")
def list_grievances(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    q = sb.table("grievances").select("*").order("created_at", desc=True)
    if current["role"] == "citizen":
        q = q.eq("citizen_id", current["sub"])
    if status:
        q = q.eq("status", status)
    result = q.range(skip, skip + limit - 1).execute()
    return result.data


# ── Beneficiary Scheme Linkage (MUST be before /{grievance_id}) ─
@router.get("/schemes")
def get_matching_schemes(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Return all active government schemes, plus match to citizen's recent grievance categories."""
    schemes_res = sb.table("schemes").select("*").eq("is_active", True).execute()
    all_schemes = schemes_res.data or []

    grievances_res = (
        sb.table("grievances")
        .select("ai_category")
        .eq("citizen_id", current["sub"])
        .execute()
    )
    citizen_cats = set()
    for g in (grievances_res.data or []):
        cat = (g.get("ai_category") or "").lower()
        citizen_cats.add(cat)

    CATEGORY_TO_SCHEME = {
        "water supply": ["water", "sanitation"],
        "sanitation": ["sanitation", "health"],
        "health": ["health"],
        "roads": ["technology"],
        "electricity": ["energy"],
        "education": ["education"],
        "housing": ["housing"],
        "agriculture": ["agriculture"],
    }

    matched = []
    for scheme in all_schemes:
        is_match = False
        for cat in citizen_cats:
            mapped = CATEGORY_TO_SCHEME.get(cat, [])
            if scheme.get("category") in mapped:
                is_match = True
                break
        matched.append({**scheme, "is_matched": is_match})

    matched.sort(key=lambda x: (not x["is_matched"], x["name"]))
    return matched


@router.get("/{grievance_id}")
def get_grievance(
    grievance_id: str,
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
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
    sb: Any = Depends(get_supabase),
):
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")
    sb.table("grievances").update({"status": status}).eq("id", grievance_id).execute()
    try:
        sb.table("ticket_logs").insert({
            "grievance_id": grievance_id,
            "actor_id":   current["sub"],
            "action":       f"status_changed_to_{status}",
            "note":        notes,
        }).execute()
    except Exception:
        pass
    return {"ok": True}


# ── Auto-Escalation Engine ──────────────────────────────────────
@router.post("/check-escalation")
def check_escalation(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Auto-escalate grievances that have breached SLA deadlines.
    Level 0→1 at SLA breach, 1→2 at 2× SLA, 2→3 at 3× SLA."""
    if current["role"] == "citizen":
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc)
    open_res = (
        sb.table("grievances")
        .select("id, tracking_id, title, priority, status, sla_deadline, escalation_level, created_at")
        .neq("status", "resolved")
        .neq("status", "closed")
        .execute()
    )
    escalated = []
    for g in (open_res.data or []):
        sla_str = g.get("sla_deadline")
        if not sla_str:
            continue
        sla_dt = datetime.fromisoformat(sla_str.replace("Z", "+00:00"))
        current_level = g.get("escalation_level") or 0
        hours_past_sla = (now - sla_dt).total_seconds() / 3600
        new_level = current_level
        if hours_past_sla > 0 and current_level == 0:
            new_level = 1
        elif hours_past_sla > 48 and current_level == 1:
            new_level = 2
        elif hours_past_sla > 120 and current_level == 2:
            new_level = 3

        if new_level > current_level:
            new_status = "escalated" if g["status"] != "escalated" else g["status"]
            sb.table("grievances").update({
                "escalation_level": new_level,
                "status": new_status,
                "escalated_at": now.isoformat(),
            }).eq("id", g["id"]).execute()
            try:
                sb.table("ticket_logs").insert({
                    "grievance_id": g["id"],
                    "action": f"auto_escalated_level_{new_level}",
                    "note": f"Auto-escalated: SLA breached by {round(hours_past_sla)}h. Level {current_level}→{new_level}.",
                }).execute()
            except Exception:
                pass
            escalated.append({
                "id": g["id"],
                "tracking_id": g.get("tracking_id"),
                "title": g["title"],
                "old_level": current_level,
                "new_level": new_level,
                "hours_past_sla": round(hours_past_sla),
            })
    return {"escalated_count": len(escalated), "escalated": escalated}
