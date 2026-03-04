from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from supabase._sync.client import SyncClient as Client
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


@router.get("/summary")
def sentinel_summary(
    current: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    scores = sb.table("ward_sentiment_scores").select("*").order("score", desc=True).limit(10).execute()
    grievances = sb.table("grievances").select("category").eq("status", "open").execute()
    category_counts: dict[str, int] = {}
    for g in grievances.data:
        cat = g.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    return {
        "top_wards":        scores.data,
        "category_breakdown": category_counts,
        "total_open":       len(grievances.data),
    }


@router.get("/wards")
def ward_scores(
    sb: Client = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    result = sb.table("ward_sentiment_scores").select("*, wards(name, constituency)").execute()
    return result.data


@router.get("/heatmap")
def heatmap_data(
    sb: Client = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    result = sb.table("grievances").select("location, status, category, created_at").execute()
    return result.data


@router.get("/alerts")
def get_alerts(
    sb: Client = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    cutoff_72h = (now - timedelta(hours=72)).isoformat()

    # Critical open tickets
    critical_res = (
        sb.table("grievances")
        .select("id, tracking_id, title, ai_category, priority, status, created_at")
        .eq("priority", "critical")
        .neq("status", "resolved")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    # SLA breached tickets (open > 72h)
    sla_res = (
        sb.table("grievances")
        .select("id, tracking_id, title, ai_category, priority, status, created_at")
        .neq("status", "resolved")
        .lt("created_at", cutoff_72h)
        .order("created_at", desc=False)
        .limit(5)
        .execute()
    )

    # Escalated tickets
    escalated_res = (
        sb.table("grievances")
        .select("id, tracking_id, title, ai_category, priority, status, created_at")
        .eq("status", "escalated")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    alerts = []

    for g in (critical_res.data or []):
        alerts.append({
            "id": g["id"],
            "title": f"Critical: {g['title']}",
            "description": f"Tracking ID {g.get('tracking_id', '')} — {g.get('ai_category', 'General')} — awaiting resolution.",
            "severity": "critical",
            "type": "critical_grievance",
        })

    for g in (sla_res.data or []):
        hours_open = round((now - datetime.fromisoformat(g["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600)
        alerts.append({
            "id": g["id"],
            "title": f"SLA Breach: {g['title']}",
            "description": f"Open for {hours_open}h — {g.get('ai_category', 'General')}. Immediate action required.",
            "severity": "high",
            "type": "sla_breach",
        })

    for g in (escalated_res.data or []):
        alerts.append({
            "id": g["id"],
            "title": f"Escalated: {g['title']}",
            "description": f"Ticket {g.get('tracking_id', '')} has been escalated — {g.get('ai_category', 'General')}.",
            "severity": "high",
            "type": "escalated",
        })

    # Deduplicate by id
    seen = set()
    unique_alerts = []
    for a in alerts:
        if a["id"] not in seen:
            seen.add(a["id"])
            unique_alerts.append(a)

    return unique_alerts
