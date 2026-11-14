"""
EARTHPULSE - LangGraph Workflow Nodes
"""
import re
from typing import Dict, Any, List, Optional
import pandas as pd

from backend.agent.state import GlacierAgentState
from backend.core.config import settings
from backend.core.logging_config import logger
from backend.tools.retrieve_satellite_data import (
    get_glaciers_metadata,
    get_glacier_state,
    get_front_variation,
    get_mass_balance,
    get_glacier_events,
)
from backend.tools.analyze_changes import (
    validate_dataset_records,
    analyze_glacier_state,
    analyze_front_variation,
    analyze_mass_balance,
    analyze_glacier_events,
    compare_glaciers_mass_balance,
)
from backend.tools.generate_report import generate_ai_report


# Common country names to ISO mapping for query parsing
COUNTRY_NAME_TO_ISO = {
    "switzerland": "CH", "swiss": "CH",
    "united states": "US", "usa": "US", "america": "US",
    "norway": "NO", "norwegian": "NO",
    "austria": "AT", "austrian": "AT",
    "france": "FR", "french": "FR",
    "italy": "IT", "italian": "IT",
    "canada": "CA", "canadian": "CA",
    "nepal": "NP", "nepalese": "NP",
    "india": "IN", "indian": "IN",
    "chile": "CL", "chilean": "CL",
    "argentina": "AR", "argentine": "AR",
    "greenland": "GL", "iceland": "IS",
    "sweden": "SE", "russia": "RU",
    "pakistan": "PK", "peru": "PE",
    "new zealand": "NZ"
}


# ---------------------------------------------------------------------------
# Node 1: Query Understanding
# ---------------------------------------------------------------------------
def query_understanding_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Parses query intent, entities (country, glacier), and timeframes."""
    query = (state.get("query") or "").lower().strip()
    warnings = list(state.get("warnings", []))

    country = state.get("country")
    glacier_name = state.get("glacier_name")
    glacier_id = state.get("glacier_id")
    start_date = state.get("start_date") or settings.DEFAULT_START_DATE
    end_date = state.get("end_date") or settings.DEFAULT_END_DATE

    # Infer country if not explicitly passed
    if not country:
        for cname, code in COUNTRY_NAME_TO_ISO.items():
            if re.search(r'\b' + re.escape(cname) + r'\b', query):
                country = code
                break

    # Infer intent
    intent = "general"
    if any(k in query for k in ["mass balance", "mass-balance", "balance", "accumulation", "ablation", "ela", "aar"]):
        intent = "mass_balance"
    elif any(k in query for k in ["front", "retreat", "advance", "terminus", "length change", "fluctuation"]):
        intent = "front_variation"
    elif any(k in query for k in ["area", "size", "shrink", "extent", "elevation"]):
        intent = "area_change"
    elif any(k in query for k in ["event", "surge", "calving", "flood", "avalanche", "hazard"]):
        intent = "events"
    elif any(k in query for k in ["compare", "largest", "most", "ranking", "top", "countries"]):
        intent = "comparison"

    # Extract years if present in query (e.g. 2020 to 2024)
    year_matches = re.findall(r'\b(19\d{2}|20\d{2})\b', query)
    if len(year_matches) >= 2:
        start_date = f"{year_matches[0]}-01-01"
        end_date = f"{year_matches[1]}-12-31"
    elif len(year_matches) == 1:
        start_date = f"{year_matches[0]}-01-01"

    return {
        "intent": intent,
        "country": country,
        "glacier_name": glacier_name,
        "glacier_id": glacier_id,
        "start_date": start_date,
        "end_date": end_date,
        "warnings": warnings,
        "status": "query_understood"
    }


# ---------------------------------------------------------------------------
# Node 2: Input Validation
# ---------------------------------------------------------------------------
def input_validation_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Validates date parameters, country code formats, and bounds."""
    start_date = state.get("start_date")
    end_date = state.get("end_date")
    warnings = list(state.get("warnings", []))

    try:
        if start_date and end_date:
            d_start = pd.to_datetime(start_date)
            d_end = pd.to_datetime(end_date)
            if d_start > d_end:
                return {
                    "status": "validation_error",
                    "error": f"Invalid date range: start_date ({start_date}) is after end_date ({end_date})."
                }

        country = state.get("country")
        if country and len(country.strip()) != 2:
            warnings.append(f"Country filter '{country}' should be a 2-letter ISO code.")

        return {
            "status": "input_validated",
            "warnings": warnings
        }
    except Exception as e:
        return {
            "status": "validation_error",
            "error": f"Date validation error: {str(e)}"
        }


# ---------------------------------------------------------------------------
# Node 3: Dataset Selection
# ---------------------------------------------------------------------------
def dataset_selection_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Selects only the relevant WGMS datasets required to answer the query."""
    intent = state.get("intent", "general")

    if intent == "mass_balance":
        datasets = ["mass_balance", "glacier"]
    elif intent == "front_variation":
        datasets = ["front_variation", "glacier"]
    elif intent == "area_change":
        datasets = ["state", "glacier"]
    elif intent == "events":
        datasets = ["event", "glacier"]
    elif intent == "comparison":
        datasets = ["mass_balance", "front_variation", "glacier"]
    else:  # "general"
        datasets = ["mass_balance", "front_variation", "state", "event", "glacier"]

    return {
        "selected_datasets": datasets,
        "status": "datasets_selected"
    }


# ---------------------------------------------------------------------------
# Node 4: Data Retrieval
# ---------------------------------------------------------------------------
def data_retrieval_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Executes deterministic retrieval for the selected datasets."""
    datasets = state.get("selected_datasets", [])
    country = state.get("country")
    glacier_id = state.get("glacier_id")
    glacier_name = state.get("glacier_name")
    start_date = state.get("start_date")
    end_date = state.get("end_date")

    retrieved = {}
    glacier_ids_matched = []

    # If glacier_name is provided, lookup matching glacier_ids first
    if glacier_name and not glacier_id:
        meta = get_glaciers_metadata(country=country, query=glacier_name, limit=5)
        if meta["items"]:
            glacier_id = meta["items"][0]["id"]
            glacier_ids_matched = [g["id"] for g in meta["items"]]

    # 1. Glaciers
    if "glacier" in datasets:
        limit = 50 if not glacier_id else 5
        g_res = get_glaciers_metadata(country=country, query=glacier_name, limit=limit)
        retrieved["glacier"] = g_res["items"]

    # 2. Mass Balance
    if "mass_balance" in datasets:
        mb_res = get_mass_balance(
            glacier_id=glacier_id,
            country=country,
            start_date=start_date,
            end_date=end_date,
            limit=200
        )
        retrieved["mass_balance"] = mb_res["records"]

    # 3. Front Variation
    if "front_variation" in datasets:
        fv_res = get_front_variation(
            glacier_id=glacier_id,
            country=country,
            start_date=start_date,
            end_date=end_date,
            limit=200
        )
        retrieved["front_variation"] = fv_res["records"]

    # 4. State
    if "state" in datasets:
        st_res = get_glacier_state(
            glacier_id=glacier_id,
            country=country,
            start_date=start_date,
            end_date=end_date,
            limit=100
        )
        retrieved["state"] = st_res["records"]

    # 5. Events
    if "event" in datasets:
        ev_res = get_glacier_events(
            glacier_id=glacier_id,
            country=country,
            start_date=start_date,
            end_date=end_date,
            limit=50
        )
        retrieved["event"] = ev_res["records"]

    total_records = sum(len(v) for v in retrieved.values())
    return {
        "retrieved_data": retrieved,
        "glacier_id": glacier_id,
        "status": "data_retrieved" if total_records > 0 else "no_data"
    }


# ---------------------------------------------------------------------------
# Node 5: Data Validation
# ---------------------------------------------------------------------------
def data_validation_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Validates data completeness and identifies missingness."""
    retrieved = state.get("retrieved_data", {})
    quality_report = {}
    warnings = list(state.get("warnings", []))

    for name, records in retrieved.items():
        val = validate_dataset_records(records)
        quality_report[name] = {
            "record_count": val["record_count"],
            "issues": val["issues"]
        }
        if val["issues"]:
            warnings.extend([f"[{name}] {iss}" for iss in val["issues"][:2]])

    return {
        "data_quality": quality_report,
        "warnings": warnings,
        "status": "data_validated"
    }


# ---------------------------------------------------------------------------
# Node 6: Analysis Tool Selection
# ---------------------------------------------------------------------------
def analysis_tool_selection_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Selects numerical analysis routines corresponding to available data."""
    retrieved = state.get("retrieved_data", {})
    tools = []

    if retrieved.get("mass_balance"):
        tools.append("analyze_mass_balance")
        tools.append("compare_glaciers_mass_balance")

    if retrieved.get("front_variation"):
        tools.append("analyze_front_variation")

    if retrieved.get("state"):
        tools.append("analyze_glacier_state")

    if retrieved.get("event"):
        tools.append("analyze_glacier_events")

    return {
        "analysis_tools": tools,
        "status": "tools_selected"
    }


# ---------------------------------------------------------------------------
# Node 7: Python Numerical Analysis
# ---------------------------------------------------------------------------
def python_numerical_analysis_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Executes deterministic numerical analysis using Pandas."""
    retrieved = state.get("retrieved_data", {})
    tools = state.get("analysis_tools", [])
    results: Dict[str, Any] = {}

    if "analyze_mass_balance" in tools and retrieved.get("mass_balance"):
        results["mass_balance"] = analyze_mass_balance(retrieved["mass_balance"])

    if "compare_glaciers_mass_balance" in tools and retrieved.get("mass_balance"):
        results["mass_balance_rankings"] = compare_glaciers_mass_balance(retrieved["mass_balance"], top_n=5)

    if "analyze_front_variation" in tools and retrieved.get("front_variation"):
        results["front_variation"] = analyze_front_variation(retrieved["front_variation"])

    if "analyze_glacier_state" in tools and retrieved.get("state"):
        results["glacier_state"] = analyze_glacier_state(retrieved["state"])

    if "analyze_glacier_events" in tools and retrieved.get("event"):
        results["glacier_events"] = analyze_glacier_events(retrieved["event"])

    results["glacier_count"] = len(retrieved.get("glacier", []))

    return {
        "analysis_results": results,
        "status": "analysis_completed"
    }


# ---------------------------------------------------------------------------
# Node 8: Result Validation
# ---------------------------------------------------------------------------
def result_validation_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Validates calculation results against scientific plausibility checks."""
    results = state.get("analysis_results", {})
    warnings = list(state.get("warnings", []))

    # Plausibility check: ELA should be reasonable
    mb = results.get("mass_balance", {})
    if mb.get("mean_ela_m_asl") and (mb["mean_ela_m_asl"] < 0 or mb["mean_ela_m_asl"] > 8848):
        warnings.append(f"Anomalous ELA altitude detected: {mb['mean_ela_m_asl']} m a.s.l.")

    return {
        "warnings": warnings,
        "status": "results_validated"
    }


# ---------------------------------------------------------------------------
# Node 9: AI Report Generation
# ---------------------------------------------------------------------------
def ai_report_generation_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Synthesizes executive scientific report with Gemini (or deterministic fallback)."""
    analysis = state.get("analysis_results", {})
    data_quality = state.get("data_quality", {})
    query = state.get("query", "")
    glacier_name = state.get("glacier_name")
    country = state.get("country")

    report_result = generate_ai_report(
        analysis=analysis,
        data_quality=data_quality,
        query=query,
        glacier_name=glacier_name,
        country=country
    )

    return {
        "report": report_result["report"],
        "status": "report_generated"
    }


# ---------------------------------------------------------------------------
# Node 10: Structured Response
# ---------------------------------------------------------------------------
def structured_response_node(state: GlacierAgentState) -> Dict[str, Any]:
    """Formats final JSON payload adhering to AgentAnalysisResponse schema."""
    error = state.get("error")
    if error:
        return {
            "structured_response": {
                "query": state.get("query", ""),
                "status": "error",
                "observation_period": {"start": state.get("start_date"), "end": state.get("end_date")},
                "datasets_used": state.get("selected_datasets", []),
                "glaciers_analyzed": 0,
                "data_quality": {},
                "analysis_results": {},
                "report": f"Analysis halted due to error: {error}",
                "warnings": state.get("warnings", [])
            },
            "status": "failed"
        }

    analysis = state.get("analysis_results", {})
    glaciers_count = analysis.get("glacier_count", 0)

    structured = {
        "query": state.get("query", ""),
        "status": "success",
        "observation_period": {
            "start": state.get("start_date"),
            "end": state.get("end_date")
        },
        "datasets_used": state.get("selected_datasets", []),
        "glaciers_analyzed": glaciers_count,
        "data_quality": state.get("data_quality", {}),
        "analysis_results": analysis,
        "report": state.get("report", ""),
        "warnings": state.get("warnings", [])
    }

    return {
        "structured_response": structured,
        "status": "completed"
    }
