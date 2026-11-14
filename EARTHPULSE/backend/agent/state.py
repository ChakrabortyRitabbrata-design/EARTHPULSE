"""
EARTHPULSE - LangGraph Agent State Definition
"""
from typing import TypedDict, Optional, List, Dict, Any


class GlacierAgentState(TypedDict, total=False):
    # User Input & Routing
    query: str
    domain: Optional[str]  # "glacier", "modis", or "combined"
    intent: Optional[str]
    glacier_name: Optional[str]
    glacier_id: Optional[int]
    country: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]

    # MODIS Specific Parameters
    modis_year: Optional[int]
    satellite: Optional[str]

    # Pipeline Processing Metadata
    selected_datasets: List[str]
    retrieved_data: Dict[str, Any]
    data_quality: Dict[str, Any]
    analysis_tools: List[str]
    analysis_results: Dict[str, Any]
    report: Optional[str]
    status: str
    error: Optional[str]
    warnings: List[str]

    # Final Structured Output
    structured_response: Optional[Dict[str, Any]]
