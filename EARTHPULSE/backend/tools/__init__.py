"""
EARTHPULSE Tools Package
"""
from backend.tools.retrieve_satellite_data import (
    get_glaciers_metadata,
    get_glacier_by_id,
    get_glacier_state,
    get_state_bands,
    get_front_variation,
    get_mass_balance,
    get_mass_balance_bands,
    get_mass_balance_points,
    get_glacier_events,
    get_glacier_changes,
    get_change_bands,
    get_agencies,
    get_investigators,
    get_wgms_quality_stats,
)
from backend.tools.analyze_changes import (
    validate_dataset_records,
    calculate_metric_change,
    analyze_front_variation,
    analyze_mass_balance,
    analyze_glacier_state,
    analyze_glacier_events,
    compare_glaciers_mass_balance,
)
from backend.tools.generate_report import (
    generate_ai_report,
    generate_deterministic_report,
    generate_ai_modis_report,
    generate_deterministic_modis_report,
)
from backend.tools.retrieve_kml import load_kml_or_kmz
from backend.tools.retrieve_modis_data import (
    discover_modis_inventory,
    get_available_countries,
    get_modis_inventory_summary,
    get_modis_detections,
    load_modis_dataframe,
)
from backend.tools.validate_modis_data import validate_modis_records
from backend.tools.analyze_modis import (
    analyze_modis_data,
    identify_hotspot_clusters,
    compute_geographic_analysis,
    compute_temporal_analysis,
    compute_thermal_analysis,
    compute_satellite_comparison,
    MODIS_SCIENTIFIC_CAUTIONS,
)

__all__ = [
    "get_glaciers_metadata",
    "get_glacier_by_id",
    "get_glacier_state",
    "get_state_bands",
    "get_front_variation",
    "get_mass_balance",
    "get_mass_balance_bands",
    "get_mass_balance_points",
    "get_glacier_events",
    "get_glacier_changes",
    "get_change_bands",
    "get_agencies",
    "get_investigators",
    "get_wgms_quality_stats",
    "validate_dataset_records",
    "calculate_metric_change",
    "analyze_front_variation",
    "analyze_mass_balance",
    "analyze_glacier_state",
    "analyze_glacier_events",
    "compare_glaciers_mass_balance",
    "generate_ai_report",
    "generate_deterministic_report",
    "generate_ai_modis_report",
    "generate_deterministic_modis_report",
    "load_kml_or_kmz",
    "discover_modis_inventory",
    "get_available_countries",
    "get_modis_inventory_summary",
    "get_modis_detections",
    "load_modis_dataframe",
    "validate_modis_records",
    "analyze_modis_data",
    "identify_hotspot_clusters",
    "compute_geographic_analysis",
    "compute_temporal_analysis",
    "compute_thermal_analysis",
    "compute_satellite_comparison",
    "MODIS_SCIENTIFIC_CAUTIONS",
]
