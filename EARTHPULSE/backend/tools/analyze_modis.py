"""
EARTHPULSE - MODIS Thermal Anomaly Statistical & Hotspot Analysis Engine
"""
from typing import Dict, Any, List, Optional, Union
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

from backend.core.logging_config import logger


# ---------------------------------------------------------------------------
# Scientific Caution Disclaimers
# ---------------------------------------------------------------------------
MODIS_SCIENTIFIC_CAUTIONS = [
    "MODIS thermal anomaly detections represent 1 km pixel footprints with elevated radiance, NOT confirmed individual wildfires.",
    "Multiple detections over consecutive days or orbits often observe the same sustained thermal source.",
    "Thermal anomalies encompass biomass burning, agricultural clearing, industrial gas flares, and active volcanic activity.",
    "Cloud cover, heavy smoke, and orbital revisit gaps affect detection completeness and temporal continuity.",
    "Detection counts must not be equated directly with fire incident frequency or total burned area."
]


# ---------------------------------------------------------------------------
# A. Geographic Analysis
# ---------------------------------------------------------------------------
def compute_geographic_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Computes spatial distributions and bounding metrics."""
    if df.empty:
        return {"total_detections": 0}

    lat = df["latitude"].dropna()
    lon = df["longitude"].dropna()

    country_counts = df["country"].value_counts().to_dict() if "country" in df.columns else {}

    return {
        "total_detections": len(df),
        "countries_observed": list(country_counts.keys()),
        "detections_by_country": country_counts,
        "bounding_box": {
            "min_latitude": round(float(lat.min()), 4) if not lat.empty else None,
            "max_latitude": round(float(lat.max()), 4) if not lat.empty else None,
            "min_longitude": round(float(lon.min()), 4) if not lon.empty else None,
            "max_longitude": round(float(lon.max()), 4) if not lon.empty else None,
        },
        "spatial_center": {
            "mean_latitude": round(float(lat.mean()), 4) if not lat.empty else None,
            "mean_longitude": round(float(lon.mean()), 4) if not lon.empty else None,
            "std_latitude": round(float(lat.std()), 4) if len(lat) > 1 else 0.0,
            "std_longitude": round(float(lon.std()), 4) if len(lon) > 1 else 0.0,
        }
    }


# ---------------------------------------------------------------------------
# B. Temporal Analysis
# ---------------------------------------------------------------------------
def compute_temporal_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Computes daily, monthly, yearly, and day/night temporal patterns."""
    if df.empty or "acq_date" not in df.columns:
        return {}

    date_series = pd.to_datetime(df["acq_date"], errors="coerce")
    valid_dates = df.loc[date_series.notna()].copy()
    valid_dates["_dt"] = date_series.dropna()
    valid_dates["_month"] = valid_dates["_dt"].dt.strftime("%Y-%m")
    valid_dates["_year"] = valid_dates["_dt"].dt.year

    monthly_counts = valid_dates["_month"].value_counts().sort_index().to_dict()
    yearly_counts = valid_dates["_year"].value_counts().sort_index().to_dict()

    # Yearly comparison if both 2024 and 2025 exist
    comparison = {}
    if 2024 in yearly_counts and 2025 in yearly_counts:
        c24 = yearly_counts[2024]
        c25 = yearly_counts[2025]
        diff = c25 - c24
        pct = round((diff / c24) * 100.0, 2) if c24 > 0 else None
        comparison = {
            "count_2024": c24,
            "count_2025": c25,
            "absolute_difference": diff,
            "percentage_change": pct
        }

    # Day vs Night distribution
    dn_counts = df["daynight"].value_counts().to_dict() if "daynight" in df.columns else {}
    day_count = dn_counts.get("D", 0)
    night_count = dn_counts.get("N", 0)
    dn_ratio = round(day_count / night_count, 2) if night_count > 0 else None

    # Top peak days
    daily_counts = df["acq_date"].value_counts().head(5).to_dict()

    return {
        "yearly_counts": yearly_counts,
        "yearly_comparison": comparison,
        "monthly_counts": monthly_counts,
        "peak_activity_days": daily_counts,
        "day_night_breakdown": {
            "day_detections": int(day_count),
            "night_detections": int(night_count),
            "day_to_night_ratio": dn_ratio
        }
    }


# ---------------------------------------------------------------------------
# C. Thermal Analysis
# ---------------------------------------------------------------------------
def compute_thermal_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Computes brightness temperature, FRP distribution, and high-energy hotspots."""
    if df.empty:
        return {}

    frp_s = pd.to_numeric(df.get("frp"), errors="coerce").dropna()
    br_s = pd.to_numeric(df.get("brightness"), errors="coerce").dropna()
    t31_s = pd.to_numeric(df.get("bright_t31"), errors="coerce").dropna()
    conf_s = pd.to_numeric(df.get("confidence"), errors="coerce").dropna()

    thermal: Dict[str, Any] = {}

    if not frp_s.empty:
        thermal["frp_stats_mw"] = {
            "mean": round(float(frp_s.mean()), 2),
            "median": round(float(frp_s.median()), 2),
            "min": round(float(frp_s.min()), 2),
            "max": round(float(frp_s.max()), 2),
            "total_estimated_frp_mw": round(float(frp_s.sum()), 2),
            "std": round(float(frp_s.std()), 2) if len(frp_s) > 1 else 0.0,
            "percentile_90": round(float(np.percentile(frp_s, 90)), 2),
            "percentile_95": round(float(np.percentile(frp_s, 95)), 2),
            "high_frp_detections_gt_100mw": int((frp_s >= 100.0).sum())
        }

    if not br_s.empty:
        thermal["brightness_ch21_kelvin"] = {
            "mean": round(float(br_s.mean()), 2),
            "min": round(float(br_s.min()), 2),
            "max": round(float(br_s.max()), 2),
            "std": round(float(br_s.std()), 2) if len(br_s) > 1 else 0.0
        }

    if not t31_s.empty:
        thermal["brightness_t31_kelvin"] = {
            "mean": round(float(t31_s.mean()), 2),
            "min": round(float(t31_s.min()), 2),
            "max": round(float(t31_s.max()), 2)
        }

    if not conf_s.empty:
        thermal["confidence_distribution"] = {
            "mean_confidence": round(float(conf_s.mean()), 1),
            "low_confidence_lt_30": int((conf_s < 30).sum()),
            "nominal_confidence_30_80": int(((conf_s >= 30) & (conf_s <= 80)).sum()),
            "high_confidence_gt_80": int((conf_s > 80).sum())
        }

    # Classification breakdown based on NASA FIRMS standard C6.1 type definitions
    if "type" in df.columns:
        type_labels = {
            0: "presumed_vegetation_fire",
            1: "active_volcano",
            2: "other_static_land_source",
            3: "offshore"
        }
        type_counts = {}
        for code, count in df["type"].value_counts().items():
            try:
                code_int = int(code)
                lbl = type_labels.get(code_int, f"type_{code_int}")
                type_counts[lbl] = int(count)
            except (ValueError, TypeError):
                pass
        thermal["inferred_source_types"] = type_counts

    # Aliases for compatibility
    thermal["brightness_stats"] = thermal.get("brightness_ch21_kelvin", {})
    thermal["frp_stats"] = thermal.get("frp_stats_mw", {})
    thermal["confidence_stats"] = thermal.get("confidence_distribution", {})

    return thermal


# ---------------------------------------------------------------------------
# D. Satellite Comparison
# ---------------------------------------------------------------------------
def compute_satellite_comparison(df: pd.DataFrame) -> Dict[str, Any]:
    """Compares Aqua (afternoon orbit) vs Terra (morning orbit) observation metrics."""
    if df.empty or "satellite" not in df.columns:
        return {}

    sat_counts = df["satellite"].str.capitalize().value_counts().to_dict()
    total = len(df)

    by_sat = {}
    for sat, cnt in sat_counts.items():
        sub = df[df["satellite"].str.capitalize() == sat]
        sub_frp = pd.to_numeric(sub.get("frp"), errors="coerce").dropna()
        sub_br = pd.to_numeric(sub.get("brightness"), errors="coerce").dropna()

        by_sat[sat] = {
            "detection_count": int(cnt),
            "percentage_of_total": round((cnt / total) * 100.0, 1),
            "mean_frp_mw": round(float(sub_frp.mean()), 2) if not sub_frp.empty else None,
            "max_frp_mw": round(float(sub_frp.max()), 2) if not sub_frp.empty else None,
            "mean_brightness_k": round(float(sub_br.mean()), 2) if not sub_br.empty else None
        }

    return {
        "satellite_counts": sat_counts,
        "satellite_details": by_sat
    }


# ---------------------------------------------------------------------------
# E. Hotspot Clustering (DBSCAN)
# ---------------------------------------------------------------------------
def identify_hotspot_clusters(
    df: pd.DataFrame,
    eps_km: float = 15.0,
    min_samples: int = 3,
    min_frp: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Identifies persistent and intense thermal hotspot clusters using
    Haversine-based DBSCAN clustering.
    """
    if df.empty or len(df) < min_samples:
        return []

    valid = df.dropna(subset=["latitude", "longitude"]).copy()
    if min_frp is not None:
        valid = valid[valid["frp"] >= min_frp]

    if len(valid) < min_samples:
        return []

    coords = valid[["latitude", "longitude"]].values
    # Convert degrees to radians for Haversine metric
    coords_rad = np.radians(coords)
    # Earth radius ~6371 km
    eps_rad = eps_km / 6371.0

    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine")
    labels = db.fit_predict(coords_rad)
    valid["cluster_id"] = labels

    clusters = []
    unique_labels = [lbl for lbl in set(labels) if lbl != -1]

    for cl_id in sorted(unique_labels):
        c_df = valid[valid["cluster_id"] == cl_id]
        c_frp = pd.to_numeric(c_df.get("frp"), errors="coerce").dropna()
        c_br = pd.to_numeric(c_df.get("brightness"), errors="coerce").dropna()

        dates = pd.to_datetime(c_df["acq_date"], errors="coerce").dropna()
        first_d = str(dates.min().strftime("%Y-%m-%d")) if not dates.empty else "N/A"
        latest_d = str(dates.max().strftime("%Y-%m-%d")) if not dates.empty else "N/A"
        persistence = int((dates.max() - dates.min()).days + 1) if not dates.empty else 1

        tot_frp = round(float(c_frp.sum()), 2) if not c_frp.empty else 0.0
        max_frp = round(float(c_frp.max()), 2) if not c_frp.empty else 0.0

        dominant_type = int(c_df["type"].mode().iloc[0]) if "type" in c_df.columns and not c_df["type"].dropna().empty else 0

        clusters.append({
            "cluster_id": int(cl_id),
            "centroid_lat": round(float(c_df["latitude"].mean()), 4),
            "centroid_lon": round(float(c_df["longitude"].mean()), 4),
            "detection_count": len(c_df),
            "total_frp_mw": tot_frp,
            "max_frp_mw": max_frp,
            "mean_brightness_k": round(float(c_br.mean()), 2) if not c_br.empty else 0.0,
            "first_observed": first_d,
            "latest_observed": latest_d,
            "persistence_days": persistence,
            "dominant_type": dominant_type,
            "is_high_frp": bool(max_frp >= 100.0 or tot_frp >= 200.0)
        })

    # Sort clusters by highest total FRP
    clusters.sort(key=lambda x: x["total_frp_mw"], reverse=True)
    return clusters


# ---------------------------------------------------------------------------
# Comprehensive Master Analysis Pipeline
# ---------------------------------------------------------------------------
def analyze_modis_data(
    df: pd.DataFrame,
    include_clustering: bool = True,
    eps_km: float = 15.0,
    min_samples: int = 3,
    filters_applied: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes full multi-dimensional MODIS analysis pipeline:
    geographic, temporal, thermal, satellite comparison, and clustering.
    """
    geo_res = compute_geographic_analysis(df)
    temp_res = compute_temporal_analysis(df)
    therm_res = compute_thermal_analysis(df)
    sat_res = compute_satellite_comparison(df)

    hotspots = []
    if include_clustering and len(df) >= min_samples:
        hotspots = identify_hotspot_clusters(df, eps_km=eps_km, min_samples=min_samples)

    return {
        "status": "success",
        "filters_applied": filters_applied or {},
        "total_detections": len(df),
        "geographic_analysis": geo_res,
        "temporal_analysis": temp_res,
        "thermal_analysis": therm_res,
        "satellite_comparison": sat_res,
        "hotspot_clusters": hotspots,
        "scientific_cautions": MODIS_SCIENTIFIC_CAUTIONS
    }
