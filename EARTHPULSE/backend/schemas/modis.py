"""
EARTHPULSE - MODIS Thermal Anomaly Pydantic Schemas
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field


class ModisDetection(BaseModel):
    latitude: float
    longitude: float
    brightness: Optional[float] = Field(None, description="Brightness temperature (Kelvin) in Ch 21/22")
    scan: Optional[float] = Field(None, description="Pixel scan size (km)")
    track: Optional[float] = Field(None, description="Pixel track size (km)")
    acq_date: str = Field(..., description="Acquisition date (YYYY-MM-DD)")
    acq_time: str = Field(..., description="Acquisition time UTC (HHMM)")
    satellite: str = Field(..., description="Satellite identifier ('Terra' or 'Aqua')")
    instrument: str = Field("MODIS", description="Instrument name")
    confidence: Optional[int] = Field(None, description="Detection confidence (0-100%)")
    version: Optional[Union[str, float]] = Field(None, description="Collection version (e.g. 6.1NRT)")
    bright_t31: Optional[float] = Field(None, description="Channel 31 brightness temperature (Kelvin)")
    frp: Optional[float] = Field(None, description="Fire Radiative Power (MW)")
    daynight: Optional[str] = Field(None, description="Observation timing ('D'=Day, 'N'=Night)")
    type: Optional[int] = Field(None, description="Inferred source code (0=presumed veg, 1=volcano, 2=other static land, 3=offshore)")
    country: Optional[str] = Field(None, description="Source country name")
    year: Optional[int] = Field(None, description="Observation year")


class ModisPaginatedDetections(BaseModel):
    items: List[ModisDetection]
    total: int
    offset: int = 0
    limit: int = 100
    page: Optional[int] = None
    page_size: Optional[int] = None
    total_pages: Optional[int] = None
    country: Optional[str] = None
    year: Optional[int] = None


class ModisAnalysisRequest(BaseModel):
    country: Optional[str] = Field(None, description="Country name (e.g. 'Singapore', 'Brazil')")
    year: Optional[int] = Field(None, description="Observation year (2024 or 2025)")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    satellite: Optional[str] = Field(None, description="'Terra' or 'Aqua'")
    daynight: Optional[str] = Field(None, description="'D' or 'N'")
    min_confidence: Optional[int] = Field(None, ge=0, le=100)
    min_frp: Optional[float] = Field(None, ge=0.0)
    include_clustering: bool = Field(True, description="Whether to execute spatial clustering")
    eps_km: float = Field(15.0, description="DBSCAN cluster search radius in km")
    min_samples: int = Field(3, description="Minimum points required to form a cluster")


class ModisHotspotCluster(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lon: float
    detection_count: int
    total_frp_mw: float
    max_frp_mw: float
    mean_brightness_k: float
    first_observed: str
    latest_observed: str
    persistence_days: int
    dominant_type: int
    is_high_frp: bool


class ModisCountrySummary(BaseModel):
    country: str
    years_available: List[int]
    total_detections: int
    date_range: List[str]
    max_frp_mw: Optional[float] = None
    mean_frp_mw: Optional[float] = None


class ModisSummaryResponse(BaseModel):
    total_countries_indexed: int
    distinct_countries: Optional[int] = None
    available_years: List[int]
    total_files_discovered: int
    total_files: Optional[int] = None
    files_2024: Optional[int] = None
    files_2025: Optional[int] = None
    sample_countries: List[str]
    notes: List[str] = []


class ModisAnalysisResponse(BaseModel):
    status: str
    filters_applied: Dict[str, Any]
    total_detections: int
    geographic_analysis: Dict[str, Any]
    temporal_analysis: Dict[str, Any]
    thermal_analysis: Dict[str, Any]
    satellite_comparison: Dict[str, Any]
    hotspot_clusters: List[ModisHotspotCluster]
    scientific_cautions: List[str]
    report: Optional[str] = None
