"""
EARTHPULSE - Glacier Validation & Numerical Analysis Engine
"""
from typing import Optional, List, Dict, Any, Union
import numpy as np
import pandas as pd

from backend.core.logging_config import logger


# ---------------------------------------------------------------------------
# 1. Validation Utilities
# ---------------------------------------------------------------------------
def validate_dataset_records(
    records: List[Dict[str, Any]],
    required_cols: Optional[List[str]] = None,
    date_col: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validates a list of observation records for missing values, invalid dates,
    duplicates, and identifier integrity.
    """
    if not records:
        return {
            "is_valid": False,
            "record_count": 0,
            "issues": ["No records supplied."],
            "cleaned_df": pd.DataFrame()
        }

    df = pd.DataFrame(records)
    issues = []

    # Check duplicates
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        issues.append(f"Found {dup_count} duplicate records.")

    # Check required columns
    if required_cols:
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            issues.append(f"Missing required columns: {missing_cols}")

    # Validate dates
    if date_col and date_col in df.columns:
        parsed_dates = pd.to_datetime(df[date_col], errors="coerce")
        invalid_dates_count = int(parsed_dates.isna().sum())
        if invalid_dates_count > 0:
            issues.append(f"Found {invalid_dates_count} invalid or unparseable dates in '{date_col}'.")
        df["_parsed_date"] = parsed_dates
        df = df.dropna(subset=["_parsed_date"]).sort_values("_parsed_date")

    # Check identifiers
    if "glacier_id" in df.columns:
        null_ids = int(df["glacier_id"].isna().sum())
        if null_ids > 0:
            issues.append(f"Found {null_ids} records with null glacier_id.")
        df = df.dropna(subset=["glacier_id"])

    return {
        "is_valid": len(df) > 0,
        "record_count": len(df),
        "issues": issues,
        "cleaned_df": df
    }


# ---------------------------------------------------------------------------
# 2. Metric Time-Series Change Analysis
# ---------------------------------------------------------------------------
def calculate_metric_change(
    df: pd.DataFrame,
    value_col: str,
    date_col: str = "date",
    unit: str = ""
) -> Dict[str, Any]:
    """
    Calculates deterministic initial-to-latest difference, percentage change,
    and annualized rate for any numeric variable. Never treats NaN as zero.
    """
    if df.empty or value_col not in df.columns or date_col not in df.columns:
        return {
            "status": "missing_column",
            "observation_count": 0,
            "unit": unit
        }

    # Extract valid numerical observations
    valid = df[[date_col, value_col]].copy()
    valid[value_col] = pd.to_numeric(valid[value_col], errors="coerce")
    valid = valid.dropna(subset=[value_col]).sort_values(date_col)

    obs_count = len(valid)
    if obs_count < 2:
        val = float(valid.iloc[0][value_col]) if obs_count == 1 else None
        dt = str(valid.iloc[0][date_col]) if obs_count == 1 else None
        return {
            "status": "insufficient_observations" if obs_count < 2 else "single_observation",
            "observation_count": obs_count,
            "initial_date": dt,
            "latest_date": dt,
            "initial_value": val,
            "latest_value": val,
            "absolute_change": None,
            "percentage_change": None,
            "unit": unit
        }

    first_row = valid.iloc[0]
    last_row = valid.iloc[-1]

    initial_val = float(first_row[value_col])
    latest_val = float(last_row[value_col])
    abs_change = latest_val - initial_val

    pct_change = None
    if initial_val != 0:
        pct_change = round((abs_change / abs(initial_val)) * 100, 3)

    # Annual rate calculation if dates are parseable
    annual_rate = None
    try:
        d0 = pd.to_datetime(first_row[date_col])
        d1 = pd.to_datetime(last_row[date_col])
        years = (d1 - d0).days / 365.25
        if years >= 0.5:
            annual_rate = round(abs_change / years, 4)
    except Exception:
        pass

    return {
        "status": "calculated",
        "observation_count": obs_count,
        "initial_date": str(first_row[date_col]),
        "latest_date": str(last_row[date_col]),
        "initial_value": round(initial_val, 3),
        "latest_value": round(latest_val, 3),
        "absolute_change": round(abs_change, 3),
        "percentage_change": pct_change,
        "annual_rate": annual_rate,
        "unit": unit
    }


# ---------------------------------------------------------------------------
# 3. Front Variation (Advance & Retreat) Analysis
# ---------------------------------------------------------------------------
def analyze_front_variation(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes cumulative terminus position change (m), rate of advance/retreat,
    and classifies the dominant dynamic behavior.
    """
    val = validate_dataset_records(records, date_col="end_date")
    df = val["cleaned_df"]
    if df.empty or "length_change" not in df.columns:
        return {"status": "no_data", "observation_count": 0}

    df["length_change"] = pd.to_numeric(df["length_change"], errors="coerce")
    valid = df.dropna(subset=["length_change"]).sort_values("end_date")

    if valid.empty:
        return {"status": "insufficient_observations", "observation_count": 0}

    total_change_m = float(valid["length_change"].sum())
    retreat_count = int((valid["length_change"] < 0).sum())
    advance_count = int((valid["length_change"] > 0).sum())
    stationary_count = int((valid["length_change"] == 0).sum())

    first_date = str(valid.iloc[0]["end_date"])
    latest_date = str(valid.iloc[-1]["end_date"])

    # Classification
    if total_change_m < -5:
        dynamic = "RETREAT"
    elif total_change_m > 5:
        dynamic = "ADVANCE"
    else:
        dynamic = "STATIONARY"

    return {
        "status": "calculated",
        "observation_count": len(valid),
        "initial_date": first_date,
        "latest_date": latest_date,
        "cumulative_length_change_m": round(total_change_m, 2),
        "retreat_observations": retreat_count,
        "advance_observations": advance_count,
        "stationary_observations": stationary_count,
        "dynamic_state": dynamic,
        "unit": "meters"
    }


# ---------------------------------------------------------------------------
# 4. Mass Balance Analysis
# ---------------------------------------------------------------------------
def analyze_mass_balance(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes cumulative mass balance (mm w.e.), mean annual balance,
    seasonal balances (winter/summer), ELA and AAR trends.
    """
    val = validate_dataset_records(records, required_cols=["year"])
    df = val["cleaned_df"]
    if df.empty or "year" not in df.columns:
        return {"status": "no_data", "observation_count": 0}

    df["annual_balance"] = pd.to_numeric(df.get("annual_balance"), errors="coerce")
    valid_annual = df.dropna(subset=["annual_balance"]).sort_values("year")

    if valid_annual.empty:
        return {"status": "insufficient_observations", "observation_count": 0}

    cum_mb = float(valid_annual["annual_balance"].sum())
    mean_annual = float(valid_annual["annual_balance"].mean())
    negative_years = int((valid_annual["annual_balance"] < 0).sum())
    positive_years = int((valid_annual["annual_balance"] > 0).sum())

    res = {
        "status": "calculated",
        "observation_count": len(valid_annual),
        "year_range": [int(valid_annual["year"].min()), int(valid_annual["year"].max())],
        "cumulative_mass_balance_mm_we": round(cum_mb, 1),
        "cumulative_mass_balance_m_we": round(cum_mb / 1000.0, 3),
        "mean_annual_balance_mm_we": round(mean_annual, 1),
        "negative_balance_years": negative_years,
        "positive_balance_years": positive_years,
        "balance_regime": "LOSS" if cum_mb < 0 else ("GAIN" if cum_mb > 0 else "BALANCED"),
        "unit": "mm w.e."
    }

    # Seasonal: Summer & Winter Balance
    if "summer_balance" in df.columns:
        s_vals = pd.to_numeric(df["summer_balance"], errors="coerce").dropna()
        if not s_vals.empty:
            res["mean_summer_balance_mm_we"] = round(float(s_vals.mean()), 1)

    if "winter_balance" in df.columns:
        w_vals = pd.to_numeric(df["winter_balance"], errors="coerce").dropna()
        if not w_vals.empty:
            res["mean_winter_balance_mm_we"] = round(float(w_vals.mean()), 1)

    # ELA (Equilibrium Line Altitude in m a.s.l.)
    if "ela" in df.columns:
        ela_vals = pd.to_numeric(df["ela"], errors="coerce").dropna()
        if not ela_vals.empty:
            res["mean_ela_m_asl"] = round(float(ela_vals.mean()), 1)
            res["min_ela_m_asl"] = round(float(ela_vals.min()), 1)
            res["max_ela_m_asl"] = round(float(ela_vals.max()), 1)

    # AAR (Accumulation Area Ratio in %)
    if "aar" in df.columns:
        aar_vals = pd.to_numeric(df["aar"], errors="coerce").dropna()
        if not aar_vals.empty:
            res["mean_aar_percent"] = round(float(aar_vals.mean()), 1)

    return res


# ---------------------------------------------------------------------------
# 5. Glacier State Changes (Area, Length, Elevation)
# ---------------------------------------------------------------------------
def analyze_glacier_state(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes area and length changes from state.csv."""
    val = validate_dataset_records(records, date_col="date")
    df = val["cleaned_df"]
    if df.empty:
        return {"status": "no_data", "observation_count": 0}

    area_change = calculate_metric_change(df, "area", date_col="date", unit="m²")
    length_change = calculate_metric_change(df, "length", date_col="date", unit="m")

    # Add km² helper for area if calculated
    if area_change.get("status") == "calculated" and area_change.get("absolute_change") is not None:
        area_change["absolute_change_km2"] = round(area_change["absolute_change"] / 1e6, 4)
        area_change["initial_value_km2"] = round(area_change["initial_value"] / 1e6, 4)
        area_change["latest_value_km2"] = round(area_change["latest_value"] / 1e6, 4)

    return {
        "status": "calculated",
        "observation_count": len(df),
        "area_analysis": area_change,
        "length_analysis": length_change
    }


# ---------------------------------------------------------------------------
# 6. Glacier Events Summary
# ---------------------------------------------------------------------------
def analyze_glacier_events(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tallies and categorizes natural hazard events (surges, avalanches, floods, etc.)."""
    if not records:
        return {"total_events": 0, "categories": {}}

    df = pd.DataFrame(records)
    event_types = ["surge", "calving", "flood", "avalanche", "rockfall", "debris_flow", "earthquake", "volcanic_eruption", "other"]
    categories = {}

    for et in event_types:
        if et in df.columns:
            count = int((df[et].astype(str).str.lower().isin(["1", "true", "yes", "y", "t"])).sum())
            if count > 0:
                categories[et] = count

    return {
        "total_events": len(df),
        "categories": categories,
        "event_dates": sorted([str(d) for d in df["date"].dropna().unique()]) if "date" in df.columns else []
    }


# ---------------------------------------------------------------------------
# 7. Global Cross-Comparison (by Country / Regional Ranking)
# ---------------------------------------------------------------------------
def compare_glaciers_mass_balance(
    records: List[Dict[str, Any]],
    top_n: int = 10
) -> Dict[str, Any]:
    """Ranks glaciers by most negative cumulative or mean mass balance."""
    if not records:
        return {"rankings": []}

    df = pd.DataFrame(records)
    df["annual_balance"] = pd.to_numeric(df.get("annual_balance"), errors="coerce")
    valid = df.dropna(subset=["annual_balance", "glacier_id"])

    if valid.empty:
        return {"rankings": []}

    grouped = valid.groupby(["glacier_id", "country"], as_index=False).agg(
        glacier_name=("glacier_name", "first"),
        mean_balance=("annual_balance", "mean"),
        cumulative_balance=("annual_balance", "sum"),
        observations=("annual_balance", "count"),
        min_year=("year", "min"),
        max_year=("year", "max")
    )

    # Sort by lowest balance (most severe loss)
    sorted_df = grouped.sort_values("cumulative_balance", ascending=True).head(top_n)
    rankings = sorted_df.replace({np.nan: None}).to_dict(orient="records")

    for r in rankings:
        r["mean_balance"] = round(r["mean_balance"], 1)
        r["cumulative_balance"] = round(r["cumulative_balance"], 1)

    return {"rankings": rankings, "total_glaciers_evaluated": len(grouped)}
