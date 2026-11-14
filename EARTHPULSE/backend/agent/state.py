"""
EARTHPULSE - LangGraph Agent State Definition
"""
from typing import TypedDict, Optional, List, Dict, Any


class GlacierAgentState(TypedDict, total=False):
    # User Input
    query: str
    glacier_name: Optional[str]
    glacier_id: Optional[int]
    country: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]

    # Pipeline Metadata
    intent: Optional[str]
    selected_datasets: List[str]
    retrieved_data: Dict[str, List[Dict[str, Any]]]
    data_quality: Dict[str, Any]
    analysis_tools: List[str]
    analysis_results: Dict[str, Any]
    report: Optional[str]
    status: str
    error: Optional[str]
    warnings: List[str]

    # Final Structured Output
    structured_response: Optional[Dict[str, Any]]
