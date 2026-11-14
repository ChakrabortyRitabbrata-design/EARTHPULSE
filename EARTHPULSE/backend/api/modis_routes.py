"""
EARTHPULSE - MODIS Thermal Anomaly API Routes
"""
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException

from backend.schemas.modis import (
    ModisPaginatedDetections,
    ModisAnalysisRequest,
    ModisAnalysisResponse,
    ModisSummaryResponse,
    ModisHotspotCluster,
)
from backend.tools.retrieve_modis_data import (
    get_modis_detections,
    get_modis_inventory_summary,
    load_modis_dataframe,
    get_available_countries,
)
from backend.tools.analyze_modis import (
    analyze_modis_data,
    identify_hotspot_clusters,
)
from backend.geospatial.modis_processor import (
    modis_detections_to_geojson,
    modis_hotspots_to_geojson,
)

router = APIRouter(prefix="/api/v1/modis", tags=["Global Fire & Thermal Anomaly Monitoring"])


@router.get("/summary", response_model=ModisSummaryResponse)
def get_modis_summary():
    """Returns overview of discovered MODIS observation files, coverage, and years."""
    summary = get_modis_inventory_summary()
    return summary


@router.get("/countries")
def list_modis_countries():
    """Lists all available country names with archived MODIS observations."""
    countries = get_available_countries()
    return {"countries": countries, "total": len(countries)}


@router.get("/detections", response_model=ModisPaginatedDetections)
def list_modis_detections(
    country: Optional[str] = Query(None, description="Country name (e.g. 'Singapore', 'Australia')"),
    year: Optional[int] = Query(None, description="Year (2024 or 2025)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    satellite: Optional[str] = Query(None, description="'Terra' or 'Aqua'"),
    daynight: Optional[str] = Query(None, description="'D'=Day or 'N'=Night"),
    min_confidence: Optional[int] = Query(None, ge=0, le=100),
    min_frp: Optional[float] = Query(None, ge=0.0),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Retrieves filtered and paginated MODIS active fire / thermal anomaly detections.
    """
    eff_limit = page_size if page_size is not None else limit
    eff_offset = ((page - 1) * eff_limit) if page is not None else offset

    res = get_modis_detections(
        country=country,
        year=year,
        start_date=start_date,
        end_date=end_date,
        satellite=satellite,
        daynight=daynight,
        min_confidence=min_confidence,
        min_frp=min_frp,
        limit=eff_limit,
        offset=eff_offset
    )

    tot = res.get("total", 0)
    calc_page = (eff_offset // eff_limit) + 1 if eff_limit > 0 else 1
    total_pages = (tot + eff_limit - 1) // eff_limit if eff_limit > 0 else 1

    return {
        "items": res.get("items", []),
        "total": tot,
        "offset": eff_offset,
        "limit": eff_limit,
        "page": calc_page,
        "page_size": eff_limit,
        "total_pages": total_pages,
        "country": country,
        "year": year
    }


@router.post("/analyze", response_model=ModisAnalysisResponse)
def run_modis_analysis(request: ModisAnalysisRequest):
    """
    Executes multi-dimensional geographic, temporal, thermal, and hotspot clustering
    analysis for specified country and date bounds.
    """
    df = load_modis_dataframe(
        country=request.country,
        year=request.year,
        start_date=request.start_date,
        end_date=request.end_date
    )

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No MODIS observations found for country='{request.country}' in specified window."
        )

    # Optional secondary filters
    if request.satellite:
        sat_clean = request.satellite.strip().capitalize()
        df = df[df["satellite"].str.capitalize().str.contains(sat_clean, na=False)]

    if request.daynight:
        df = df[df["daynight"] == request.daynight.strip().upper()]

    if request.min_confidence is not None:
        df = df[df["confidence"] >= request.min_confidence]

    if request.min_frp is not None:
        df = df[df["frp"] >= request.min_frp]

    if df.empty:
        raise HTTPException(status_code=404, detail="No observations match the applied secondary filters.")

    filters_applied = request.model_dump()
    analysis = analyze_modis_data(
        df,
        include_clustering=request.include_clustering,
        eps_km=request.eps_km,
        min_samples=request.min_samples,
        filters_applied=filters_applied
    )

    return analysis


@router.get("/hotspots")
def get_modis_hotspots(
    country: Optional[str] = Query(None, description="Target country"),
    year: Optional[int] = Query(None, description="2024 or 2025"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    eps_km: float = Query(15.0, description="DBSCAN search radius in km"),
    min_samples: int = Query(3, description="Minimum points required per cluster"),
    min_frp: Optional[float] = Query(None, description="Minimum FRP threshold in MW")
):
    """
    Computes spatial hotspot clusters via DBSCAN and returns them as a GeoJSON FeatureCollection
    ready for map visualisation.
    """
    df = load_modis_dataframe(country=country, year=year, start_date=start_date, end_date=end_date)
    if df.empty:
        return {"type": "FeatureCollection", "features": [], "properties": {"total_clusters": 0}}

    clusters = identify_hotspot_clusters(df, eps_km=eps_km, min_samples=min_samples, min_frp=min_frp)
    return modis_hotspots_to_geojson(clusters)


@router.get("/geojson")
def get_modis_geojson(
    country: Optional[str] = Query(None, description="Target country"),
    year: Optional[int] = Query(None, description="2024 or 2025"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    max_features: int = Query(2000, ge=1, le=10000)
):
    """
    Returns RFC 7946 compliant GeoJSON FeatureCollection of detection points
    for AtlasX globe integration.
    """
    df = load_modis_dataframe(country=country, year=year, start_date=start_date, end_date=end_date)
    return modis_detections_to_geojson(df, max_features=max_features)
