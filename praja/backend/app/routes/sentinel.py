from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from typing import Any
from collections import defaultdict
from app.db.database import get_supabase
from app.utils.jwt import get_current_user

router = APIRouter()


@router.get("/summary")
def sentinel_summary(
    current: dict = Depends(get_current_user),
    sb: Any = Depends(get_supabase),
):
    scores = sb.table("ward_sentiment_scores").select("*").order("score", desc=True).limit(10).execute()
    grievances = sb.table("grievances").select("ai_category").eq("status", "open").execute()
    category_counts: dict[str, int] = {}
    for g in grievances.data:
        cat = g.get("ai_category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    return {
        "top_wards":        scores.data,
        "category_breakdown": category_counts,
        "total_open":       len(grievances.data),
    }


@router.get("/wards")
def ward_scores(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    result = sb.table("ward_sentiment_scores").select("*, wards(name, constituency)").execute()
    return result.data


@router.get("/heatmap")
def heatmap_data(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    result = sb.table("grievances").select("location, status, ai_category, created_at").execute()
    return result.data


@router.get("/alerts")
def get_alerts(
    sb: Any = Depends(get_supabase),
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


# ── Topic Clustering ────────────────────────────────────────────
@router.get("/topics")
def topic_clusters(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Group open grievances by AI category for topic cluster visualization."""
    res = sb.table("grievances").select("ai_category, ai_sentiment, priority").neq("status", "resolved").execute()
    rows = res.data or []

    clusters: dict[str, dict] = {}
    for r in rows:
        cat = r.get("ai_category") or "General"
        if cat not in clusters:
            clusters[cat] = {"count": 0, "critical": 0, "negative": 0}
        clusters[cat]["count"] += 1
        if r.get("priority") == "critical":
            clusters[cat]["critical"] += 1
        if r.get("ai_sentiment") in ("negative", "very_negative"):
            clusters[cat]["negative"] += 1

    topics = sorted(
        [{"topic": k, **v} for k, v in clusters.items()],
        key=lambda x: x["count"], reverse=True,
    )
    return topics


# ── 7-Day Trend Data ────────────────────────────────────────────
@router.get("/trends")
def trends_7day(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Daily grievance counts for last 7 days, broken by category."""
    now = datetime.now(timezone.utc)
    seven_ago = (now - timedelta(days=7)).isoformat()

    res = (
        sb.table("grievances")
        .select("ai_category, created_at, status")
        .gte("created_at", seven_ago)
        .execute()
    )
    rows = res.data or []

    daily: dict[str, dict] = {}
    for i in range(7):
        day = (now - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        daily[day] = {"date": day, "total": 0, "resolved": 0}

    for r in rows:
        day = r["created_at"][:10]
        if day in daily:
            daily[day]["total"] += 1
            if r.get("status") == "resolved":
                daily[day]["resolved"] += 1

    return list(daily.values())


# ── Constituency Comparison ─────────────────────────────────────
@router.get("/comparison")
def constituency_comparison(
    sb: Any = Depends(get_supabase),
    current: dict = Depends(get_current_user),
):
    """Compare grievance stats across categories — resolution rate, avg sentiment."""
    res = sb.table("grievances").select("ai_category, priority, status, ai_sentiment").execute()
    rows = res.data or []

    cat_stats: dict[str, dict] = {}
    for r in rows:
        cat = r.get("ai_category") or "General"
        if cat not in cat_stats:
            cat_stats[cat] = {"total": 0, "resolved": 0, "critical": 0, "negative": 0}
        cat_stats[cat]["total"] += 1
        if r.get("status") == "resolved":
            cat_stats[cat]["resolved"] += 1
        if r.get("priority") == "critical":
            cat_stats[cat]["critical"] += 1
        if r.get("ai_sentiment") in ("negative", "very_negative"):
            cat_stats[cat]["negative"] += 1

    comparison = []
    for cat, stats in cat_stats.items():
        resolution_rate = round(stats["resolved"] / stats["total"] * 100) if stats["total"] else 0
        satisfaction = round((1 - stats["negative"] / stats["total"]) * 100) if stats["total"] else 100
        comparison.append({
            "category": cat,
            "total": stats["total"],
            "resolved": stats["resolved"],
            "resolution_rate": resolution_rate,
            "satisfaction_score": satisfaction,
            "critical_count": stats["critical"],
        })
    comparison.sort(key=lambda x: x["total"], reverse=True)
    return comparison
