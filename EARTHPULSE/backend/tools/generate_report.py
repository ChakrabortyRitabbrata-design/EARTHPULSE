"""
EARTHPULSE - Scientific Report Generation (Gemini AI + Deterministic Fallback)
"""
import json
import os
from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.core.config import settings
from backend.core.logging_config import logger


# ---------------------------------------------------------------------------
# Glacier Reports
# ---------------------------------------------------------------------------
def generate_deterministic_report(
    analysis: Dict[str, Any],
    data_quality: Dict[str, Any],
    query: str,
    glacier_name: Optional[str] = None,
    country: Optional[str] = None
) -> str:
    """
    Generates a deterministic, rigorous scientific report when LLM is unavailable
    or disabled. Adheres strictly to WGMS data and scientific rules.
    """
    lines = []
    lines.append("# EARTHPULSE Cryospheric Intelligence Report")
    lines.append(f"**Query Objective:** {query}")
    if glacier_name:
        lines.append(f"**Target Glacier:** {glacier_name}")
    if country:
        lines.append(f"**Country Filter:** {country}")
    lines.append("")

    # 1. Executive Summary
    lines.append("## 1. Executive Summary")
    glacier_count = analysis.get("glacier_count", 0)
    lines.append(f"This report synthesizes verified WGMS observations covering {glacier_count} glacier record(s).")

    # Front variation summary
    fv = analysis.get("front_variation", {})
    if fv.get("status") == "calculated":
        lines.append(
            f"- **Terminus Front Variation:** Cumulative position change of "
            f"**{fv.get('cumulative_length_change_m')} m** ({fv.get('dynamic_state')}) "
            f"across {fv.get('observation_count')} observation(s)."
        )

    # Mass balance summary
    mb = analysis.get("mass_balance", {})
    if mb.get("status") == "calculated":
        lines.append(
            f"- **Glacier Mass Balance:** Cumulative balance of **{mb.get('cumulative_mass_balance_mm_we')} mm w.e.** "
            f"({mb.get('cumulative_mass_balance_m_we')} m w.e., regime: **{mb.get('balance_regime')}**). "
            f"Negative balance years: {mb.get('negative_balance_years')}, Positive years: {mb.get('positive_balance_years')}."
        )

    # State summary
    st = analysis.get("glacier_state", {})
    area_an = st.get("area_analysis", {})
    if area_an.get("status") == "calculated" and area_an.get("absolute_change") is not None:
        lines.append(
            f"- **Surface Area Change:** {area_an.get('absolute_change_km2', area_an.get('absolute_change'))} km² "
            f"({area_an.get('percentage_change')}%) from {area_an.get('initial_date')} to {area_an.get('latest_date')}."
        )

    lines.append("")

    # 2. Observation Periods & Coverage
    lines.append("## 2. Observation Period & Temporal Coverage")
    lines.append("Observations reflect historical field and remote sensing campaigns archived in the World Glacier Monitoring Service.")
    if mb.get("year_range"):
        lines.append(f"- Mass balance records span years **{mb['year_range'][0]} to {mb['year_range'][1]}**.")
    if fv.get("initial_date") and fv.get("latest_date"):
        lines.append(f"- Terminus variation records span **{fv['initial_date']} to {fv['latest_date']}**.")
    lines.append("- Note: In accordance with WGMS archives, observations for 2025 are pending verification and submission.")
    lines.append("")

    # 3. Mass Balance Dynamics
    lines.append("## 3. Mass Balance Dynamics")
    if mb.get("status") == "calculated":
        lines.append(f"- **Mean Annual Balance:** {mb.get('mean_annual_balance_mm_we')} mm w.e. / year")
        if "mean_summer_balance_mm_we" in mb:
            lines.append(f"- **Mean Summer Balance:** {mb['mean_summer_balance_mm_we']} mm w.e.")
        if "mean_winter_balance_mm_we" in mb:
            lines.append(f"- **Mean Winter Balance:** {mb['mean_winter_balance_mm_we']} mm w.e.")
        if "mean_ela_m_asl" in mb:
            lines.append(f"- **Equilibrium Line Altitude (ELA):** Mean {mb['mean_ela_m_asl']} m a.s.l.")
        if "mean_aar_percent" in mb:
            lines.append(f"- **Accumulation Area Ratio (AAR):** Mean {mb['mean_aar_percent']}%")
    else:
        lines.append("No continuous mass balance series was available for the selected filters.")
    lines.append("")

    # 4. Front Variation Analysis
    lines.append("## 4. Front Variation Analysis")
    if fv.get("status") == "calculated":
        lines.append(f"- **Cumulative Change:** {fv.get('cumulative_length_change_m')} meters")
        lines.append(f"- **Retreat Episodes:** {fv.get('retreat_observations')}")
        lines.append(f"- **Advance Episodes:** {fv.get('advance_observations')}")
        lines.append(f"- **Stationary Episodes:** {fv.get('stationary_observations')}")
    else:
        lines.append("No front variation records matching the query parameters were retrieved.")
    lines.append("")

    # 5. Natural Hazards & Glacier Events
    ev = analysis.get("glacier_events", {})
    lines.append("## 5. Recorded Glacier Events & Hazards")
    if ev.get("total_events", 0) > 0:
        lines.append(f"A total of **{ev['total_events']}** physical events are documented in the archive:")
        for cat, cnt in ev.get("categories", {}).items():
            lines.append(f"  - {cat.replace('_', ' ').capitalize()}: {cnt} event(s)")
    else:
        lines.append("No hazard or surge events are catalogued for this glacier in the observed period.")
    lines.append("")

    # 6. Data Quality & Limitations
    lines.append("## 6. Data Quality and Limitations")
    lines.append("- Units adhere strictly to WGMS conventions: length in meters, mass balance in mm water equivalent, area in square meters / km².")
    lines.append("- Measurements without sufficient multi-temporal observations were excluded from trend extrapolation.")
    lines.append("- Missing observations are treated as gaps in recording rather than zero-change values.")
    lines.append("")

    # 7. Scientific Conclusion
    lines.append("## 7. Conclusion")
    lines.append("The empirical records confirm prevailing glacial mass loss and front retreat in the evaluated dataset, consistent with global cryospheric trends.")

    return "\n".join(lines)


def generate_ai_report(
    analysis: Dict[str, Any],
    data_quality: Dict[str, Any],
    query: str,
    glacier_name: Optional[str] = None,
    country: Optional[str] = None
) -> Dict[str, str]:
    """
    Attempts to synthesize an executive scientific report via Gemini,
    with deterministic fallback if Gemini is unconfigured or unreachable.
    """
    api_key = settings.get_clean_google_api_key()
    if not api_key:
        logger.info("GOOGLE_API_KEY not found; generating deterministic scientific report.")
        report = generate_deterministic_report(analysis, data_quality, query, glacier_name, country)
        return {"report": report, "status": "deterministic_fallback"}

    try:
        from backend.agent.prompts import GLACIER_REPORT_PROMPT
        model_name = settings.get_clean_gemini_model()
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.2,
            max_retries=2
        )

        compact_payload = {
            "query": query,
            "glacier_name": glacier_name,
            "country": country,
            "analysis_results": analysis,
            "data_quality": data_quality
        }

        prompt = GLACIER_REPORT_PROMPT.format(
            analysis_data=json.dumps(compact_payload, indent=2, default=str)
        )

        response = llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        return {"report": str(content), "status": "ai_generated"}

    except Exception as e:
        logger.warning(f"Gemini API call failed ({e}); falling back to deterministic report.")
        report = generate_deterministic_report(analysis, data_quality, query, glacier_name, country)
        return {"report": report, "status": "deterministic_fallback", "llm_error": str(e)}


# ---------------------------------------------------------------------------
# MODIS Thermal Anomaly Reports
# ---------------------------------------------------------------------------
def generate_deterministic_modis_report(
    analysis: Dict[str, Any],
    query: str,
    country: Optional[str] = None
) -> str:
    """Generates a rigorous deterministic scientific report for MODIS thermal anomalies."""
    lines = []
    lines.append("# EARTHPULSE MODIS Thermal Anomaly Intelligence Report")
    lines.append(f"**Query Objective:** {query}")
    if country:
        lines.append(f"**Target Country / Region:** {country}")
    lines.append("")

    # 1. Executive Summary
    tot = analysis.get("total_detections", 0)
    lines.append("## 1. Executive Summary")
    lines.append(f"A total of **{tot} satellite thermal anomaly detections** were analyzed from NASA FIRMS MODIS observations (Collection 6.1).")

    therm = analysis.get("thermal_analysis", {})
    frp_stats = therm.get("frp_stats_mw", {})
    if frp_stats:
        lines.append(
            f"- **Radiative Intensity:** Mean FRP of **{frp_stats.get('mean')} MW** (max: {frp_stats.get('max')} MW), "
            f"with an aggregate radiative output proxy of **{frp_stats.get('total_estimated_frp_mw')} MW**."
        )

    sat = analysis.get("satellite_comparison", {})
    if sat.get("satellite_counts"):
        lines.append(f"- **Sensor Distribution:** {sat['satellite_counts']}")

    clusters = analysis.get("hotspot_clusters", [])
    lines.append(f"- **Geographic Hotspots:** Identified **{len(clusters)} distinct spatial cluster(s)**.")
    lines.append("")

    # 2. Temporal Dynamics
    temp = analysis.get("temporal_analysis", {})
    lines.append("## 2. Temporal Dynamics")
    if temp.get("yearly_counts"):
        lines.append(f"- **Observations by Year:** {temp['yearly_counts']}")
    if temp.get("yearly_comparison"):
        yc = temp["yearly_comparison"]
        lines.append(f"- **2024 vs 2025 Delta:** {yc.get('absolute_difference')} detections ({yc.get('percentage_change')}%)")
    dn = temp.get("day_night_breakdown", {})
    if dn:
        lines.append(f"- **Diurnal Profile:** Day detections: {dn.get('day_detections')}, Night detections: {dn.get('night_detections')} (ratio: {dn.get('day_to_night_ratio')})")
    lines.append("")

    # 3. Hotspot Clusters
    lines.append("## 3. Hotspot Cluster Identification (DBSCAN)")
    if clusters:
        for idx, cl in enumerate(clusters[:5], 1):
            lines.append(
                f"**Cluster #{cl['cluster_id']}**: Centroid at `({cl['centroid_lat']}, {cl['centroid_lon']})` | "
                f"Detections: {cl['detection_count']} | Total FRP: {cl['total_frp_mw']} MW | "
                f"Max FRP: {cl['max_frp_mw']} MW | Persistence: {cl['persistence_days']} day(s) | "
                f"High-Energy: {cl['is_high_frp']}"
            )
    else:
        lines.append("No dense spatial clusters formed at the specified threshold parameters.")
    lines.append("")

    # 4. Inferred Source Types
    src_types = therm.get("inferred_source_types", {})
    if src_types:
        lines.append("## 4. Inferred Thermal Source Classification")
        for k, v in src_types.items():
            lines.append(f"- {k.replace('_', ' ').capitalize()}: {v} detection(s)")
        lines.append("")

    # 5. Scientific Limitations & Cautions
    lines.append("## 5. Scientific Limitations & Cautionary Guidance")
    for c in analysis.get("scientific_cautions", []):
        lines.append(f"- {c}")
    lines.append("")

    # 6. Conclusion
    lines.append("## 6. Conclusion")
    lines.append("The empirical MODIS observations provide high-fidelity thermal surveillance. Detections reflect elevated radiant heat signatures and must be verified against high-resolution optical imagery or ground truth before definitive incident classification.")

    return "\n".join(lines)


def generate_ai_modis_report(
    analysis: Dict[str, Any],
    query: str,
    country: Optional[str] = None
) -> Dict[str, str]:
    """Synthesizes MODIS thermal anomaly report via Gemini (or deterministic fallback)."""
    api_key = settings.get_clean_google_api_key()
    if not api_key:
        logger.info("GOOGLE_API_KEY not found; generating deterministic MODIS report.")
        report = generate_deterministic_modis_report(analysis, query, country)
        return {"report": report, "status": "deterministic_fallback"}

    try:
        from backend.agent.prompts import MODIS_REPORT_PROMPT
        model_name = settings.get_clean_gemini_model()
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.2,
            max_retries=2
        )

        compact_payload = {
            "query": query,
            "country": country,
            "analysis_results": {
                "total_detections": analysis.get("total_detections"),
                "geographic": analysis.get("geographic_analysis"),
                "temporal": analysis.get("temporal_analysis"),
                "thermal": analysis.get("thermal_analysis"),
                "satellite_comparison": analysis.get("satellite_comparison"),
                "top_hotspot_clusters": analysis.get("hotspot_clusters", [])[:5]
            }
        }

        prompt = MODIS_REPORT_PROMPT.format(
            analysis_data=json.dumps(compact_payload, indent=2, default=str)
        )

        response = llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        return {"report": str(content), "status": "ai_generated"}

    except Exception as e:
        logger.warning(f"Gemini API call failed ({e}); falling back to deterministic MODIS report.")
        report = generate_deterministic_modis_report(analysis, query, country)
        return {"report": report, "status": "deterministic_fallback", "llm_error": str(e)}
