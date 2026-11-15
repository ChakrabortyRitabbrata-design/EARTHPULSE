"""
Glacier Pydantic Schemas
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class GlacierSummary(BaseModel):
    id: int
    short_name: Optional[str] = None
    names: Optional[str] = None
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gtng_region: Optional[str] = None
    glims_id: Optional[str] = None
    rgi60_ids: Optional[str] = None


class GlacierDetail(GlacierSummary):
    elevation: Optional[float] = None
    length: Optional[float] = None
    area: Optional[float] = None
    wgi_id: Optional[str] = None
    parent_glacier_id: Optional[float] = None
    references: Optional[str] = None
    remarks: Optional[str] = None
    observation_summary: Optional[dict[str, Any]] = None
    mass_balance_series: Optional[List[dict[str, Any]]] = None
    front_variation_series: Optional[List[dict[str, Any]]] = None


class PaginatedGlaciers(BaseModel):
    items: List[GlacierSummary]
    total: int
    offset: int
    limit: int
