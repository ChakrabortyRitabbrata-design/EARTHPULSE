"""
EARTHPULSE - Agent Workflow Runner
"""
from typing import Dict, Any, Optional
from backend.agent.graph import glacier_agent
from backend.agent.state import GlacierAgentState
from backend.core.logging_config import logger


def run_glacier_agent(
    query: str,
    country: Optional[str] = None,
    glacier_id: Optional[int] = None,
    glacier_name: Optional[str] = None,
    start_date: Optional[str] = "2022-01-01",
    end_date: Optional[str] = "2025-12-31"
) -> Dict[str, Any]:
    """
    Executes the compiled LangGraph agent workflow for cryospheric analysis.
    Guarantees deterministic execution and returns structured JSON output.
    """
    initial_state: GlacierAgentState = {
        "query": query,
        "country": country,
        "glacier_id": glacier_id,
        "glacier_name": glacier_name,
        "start_date": start_date,
        "end_date": end_date,
        "warnings": []
    }

    try:
        final_state = glacier_agent.invoke(initial_state)
        structured = final_state.get("structured_response")
        if structured:
            return structured
        return {
            "query": query,
            "status": "partial",
            "report": final_state.get("report", ""),
            "analysis_results": final_state.get("analysis_results", {}),
            "warnings": final_state.get("warnings", [])
        }
    except Exception as e:
        logger.error(f"Error executing glacier agent workflow: {e}", exc_info=True)
        return {
            "query": query,
            "status": "error",
            "observation_period": {"start": start_date, "end": end_date},
            "datasets_used": [],
            "glaciers_analyzed": 0,
            "data_quality": {},
            "analysis_results": {},
            "report": f"Workflow failed: {str(e)}",
            "warnings": [str(e)]
        }
