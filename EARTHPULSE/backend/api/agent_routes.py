"""
EARTHPULSE - AI Agent & Glacier Registry API Routes
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.agent.workflow import run_glacier_agent
from backend.schemas.analysis import AgentQueryRequest, AgentAnalysisResponse
from backend.schemas.glacier import PaginatedGlaciers, GlacierDetail
from backend.tools.retrieve_satellite_data import get_glaciers_metadata, get_glacier_by_id, get_regional_glacier_stats

router = APIRouter(prefix="/api/v1", tags=["Agent & Glaciers"])


@router.post("/agent/analyze", response_model=AgentAnalysisResponse)
def analyze_glaciers(request: AgentQueryRequest):
    """
    Submits a natural language query or targeted glacier analysis task
    to the LangGraph Agent pipeline.
    """
    res = run_glacier_agent(
        query=request.query,
        country=request.country,
        glacier_id=request.glacier_id,
        glacier_name=request.glacier_name,
        start_date=request.start_date,
        end_date=request.end_date
    )
    return res


@router.get("/glaciers", response_model=PaginatedGlaciers)
def list_glaciers(
    country: Optional[str] = Query(None, description="2-letter ISO country code (e.g. 'CH')"),
    query: Optional[str] = Query(None, description="Search query by glacier name"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Lists glaciers from the global WGMS registry with optional filtering and pagination."""
    res = get_glaciers_metadata(country=country, query=query, limit=limit, offset=offset)
    return res


@router.get("/glaciers/regional-stats")
def get_glaciers_regional_stats(
    country: Optional[str] = Query(None, description="2-letter ISO country code (e.g. 'CH', 'NO')")
):
    """Returns regional mass balance deficit rates, terminus retreat distributions, and benchmark glaciers."""
    return get_regional_glacier_stats(country=country)


@router.get("/glaciers/{glacier_id}", response_model=GlacierDetail)
def get_glacier_detail(glacier_id: int):
    """Retrieves full metadata and observation summary for a specific glacier ID."""
    glacier = get_glacier_by_id(glacier_id)
    if not glacier:
        raise HTTPException(status_code=404, detail=f"Glacier with ID {glacier_id} not found.")
    return glacier
