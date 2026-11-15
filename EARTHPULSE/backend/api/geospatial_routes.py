"""
EARTHPULSE - Geospatial Data Routes
"""
from typing import Optional
from fastapi import APIRouter, Query
from backend.tools.retrieve_satellite_data import get_glaciers_metadata
from backend.geospatial.geojson_exporter import export_glaciers_to_geojson

router = APIRouter(prefix="/api/v1/geospatial", tags=["Geospatial"])


@router.get("/glaciers")
def get_glaciers_geojson(
    country: Optional[str] = Query(None, description="2-letter ISO country code"),
    query: Optional[str] = Query(None, description="Glacier name or search query"),
    limit: int = Query(200, ge=1, le=2000),
    offset: int = Query(0, ge=0)
):
    """
    Returns an RFC 7946 compliant GeoJSON FeatureCollection of glaciers
    with coordinates and observation summaries.
    """
    meta = get_glaciers_metadata(country=country, query=query, limit=limit, offset=offset)
    geojson_data = export_glaciers_to_geojson(meta["items"], include_summary=True)
    return geojson_data
