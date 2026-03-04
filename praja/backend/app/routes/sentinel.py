from fastapi import APIRouter, Depends
from supabase import Client
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
