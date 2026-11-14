"""
EARTHPULSE - MODIS Thermal Anomaly Data Validation Engine
"""
import re
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd


def validate_modis_records(data: Union[pd.DataFrame, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Evaluates MODIS active fire / thermal anomaly detections against
    NASA FIRMS standard quality rules and flags discrepancies.
    Does not silently drop questionable records.
    """
    if isinstance(data, list):
        if not data:
            return {
                "total_records": 0,
                "valid_records": 0,
                "issues_summary": {"empty": "No records supplied."},
                "quality_score_percent": 100.0,
                "flagged_records_count": 0
            }
        df = pd.DataFrame(data)
    else:
        df = data.copy()

    total = len(df)
    if total == 0:
        return {
            "total_records": 0,
            "valid_records": 0,
            "issues_summary": {},
            "quality_score_percent": 100.0,
            "flagged_records_count": 0
        }

    issues_by_row: List[List[str]] = [[] for _ in range(total)]

    # 1. Coordinate Validation
    lat = pd.to_numeric(df.get("latitude"), errors="coerce")
    lon = pd.to_numeric(df.get("longitude"), errors="coerce")
    invalid_coords = (lat.isna()) | (lon.isna()) | (lat < -90.0) | (lat > 90.0) | (lon < -180.0) | (lon > 180.0)

    for idx in np.where(invalid_coords)[0]:
        issues_by_row[idx].append("invalid_coordinates")

    # 2. Missing Brightness
    br = pd.to_numeric(df.get("brightness"), errors="coerce")
    missing_brightness = (br.isna()) | (br <= 0.0)
    for idx in np.where(missing_brightness)[0]:
        issues_by_row[idx].append("missing_brightness")

    # 3. Missing FRP
    frp = pd.to_numeric(df.get("frp"), errors="coerce")
    missing_frp = (frp.isna()) | (frp < 0.0)
    for idx in np.where(missing_frp)[0]:
        issues_by_row[idx].append("missing_or_negative_frp")

    # 4. Dates & Times
    dates = pd.to_datetime(df.get("acq_date"), errors="coerce")
    invalid_dates = dates.isna()
    for idx in np.where(invalid_dates)[0]:
        issues_by_row[idx].append("invalid_acq_date")

    time_series = df.get("acq_time").astype(str).str.zfill(4)
    invalid_times = ~time_series.str.match(r"^([01]\d|2[0-3])[0-5]\d$")
    for idx in np.where(invalid_times)[0]:
        issues_by_row[idx].append("invalid_acq_time")

    # 5. Duplicate Detections
    dup_cols = [c for c in ["latitude", "longitude", "acq_date", "acq_time", "satellite"] if c in df.columns]
    if len(dup_cols) >= 3:
        duplicates = df.duplicated(subset=dup_cols, keep=False)
        for idx in np.where(duplicates)[0]:
            issues_by_row[idx].append("duplicate_detection")
    else:
        duplicates = pd.Series([False] * total)

    # 6. Confidence Validation
    conf = pd.to_numeric(df.get("confidence"), errors="coerce")
    invalid_conf = (conf < 0) | (conf > 100)
    for idx in np.where(invalid_conf)[0]:
        issues_by_row[idx].append("invalid_confidence_range")

    # 7. Satellite Identity
    sat = df.get("satellite").astype(str).str.strip().str.capitalize()
    missing_sat = (sat.isna()) | (~sat.isin(["Terra", "Aqua"]))
    for idx in np.where(missing_sat)[0]:
        issues_by_row[idx].append("unrecognized_satellite")

    # 8. Classification Type
    if "type" in df.columns:
        tp = pd.to_numeric(df["type"], errors="coerce")
        unexpected_type = (~tp.isna()) & (~tp.isin([0, 1, 2, 3]))
        for idx in np.where(unexpected_type)[0]:
            issues_by_row[idx].append("unexpected_type_code")

    # Summarize metrics
    flagged_mask = [len(iss) > 0 for iss in issues_by_row]
    flagged_count = sum(flagged_mask)
    clean_count = total - flagged_count

    score = round((clean_count / total) * 100.0, 2) if total > 0 else 100.0

    issues_summary = {
        "invalid_coordinates": int(invalid_coords.sum()),
        "invalid_brightness": int(missing_brightness.sum()),
        "missing_brightness": int(missing_brightness.sum()),
        "invalid_frp": int(missing_frp.sum()),
        "missing_or_negative_frp": int(missing_frp.sum()),
        "invalid_dates": int(invalid_dates.sum()),
        "invalid_acq_date": int(invalid_dates.sum()),
        "invalid_acq_time": int(invalid_times.sum()),
        "duplicate_detections": int(duplicates.sum()),
        "invalid_confidence": int(invalid_conf.sum()),
        "unrecognized_satellite": int(missing_sat.sum()),
        "unexpected_types": int(unexpected_type.sum()) if "type" in df.columns else 0,
        "unexpected_type_code": int(unexpected_type.sum()) if "type" in df.columns else 0
    }

    quality_issues = [f"{k}: {v} records flagged" for k, v in issues_summary.items() if v > 0]

    summary_obj = {
        "total_records": total,
        "valid_records": clean_count,
        "flagged_records_count": flagged_count,
        "quality_score_percent": score,
        **issues_summary
    }

    return {
        "summary": summary_obj,
        "total_records": total,
        "valid_records": clean_count,
        "flagged_records_count": flagged_count,
        "quality_score_percent": score,
        "issues_summary": issues_summary,
        "quality_issues": quality_issues,
        "temporal_range": {
            "min_date": str(df["acq_date"].min()) if not df.empty and "acq_date" in df.columns else None,
            "max_date": str(df["acq_date"].max()) if not df.empty and "acq_date" in df.columns else None
        }
    }
