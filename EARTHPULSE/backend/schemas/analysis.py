"""
Analysis & Agent Schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query or analysis objective")
    country: Optional[str] = Field(None, description="2-letter ISO country code (e.g., 'CH', 'US', 'NO')")
    glacier_id: Optional[int] = Field(None, description="WGMS glacier ID")
    glacier_name: Optional[str] = Field(None, description="Glacier name filter")
    start_date: Optional[str] = Field("2022-01-01", description="Observation start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field("2025-12-31", description="Observation end date (YYYY-MM-DD)")


class MetricChange(BaseModel):
    status: str
    initial_date: Optional[str] = None
    latest_date: Optional[str] = None
    initial_value: Optional[float] = None
    latest_value: Optional[float] = None
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None
    unit: str = ""
    observation_count: int = 0


class GlacierAnalysisItem(BaseModel):
    glacier_id: int
    glacier_name: Optional[str] = None
    country: str
    area_analysis: Optional[MetricChange] = None
    length_analysis: Optional[MetricChange] = None
    front_variation: Optional[MetricChange] = None
    mass_balance_summary: Optional[Dict[str, Any]] = None
    events_summary: Optional[List[Dict[str, Any]]] = None


class AgentAnalysisResponse(BaseModel):
    query: str
    status: str
    observation_period: Dict[str, Optional[str]]
    datasets_used: List[str]
    glaciers_analyzed: int
    data_quality: Dict[str, Any]
    analysis_results: Dict[str, Any]
    report: str
    warnings: List[str] = []
