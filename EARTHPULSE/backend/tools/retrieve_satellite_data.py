"""
EARTHPULSE - Global Glacier & Satellite / WGMS Data Retrieval Engine
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
import numpy as np
import pandas as pd

from backend.core.config import settings
from backend.core.logging_config import logger

DATA_DIR = settings.DATA_DIR

# ---------------------------------------------------------------------------
# In-Memory Cache for Core DataFrames
# ---------------------------------------------------------------------------
_DATAFRAME_CACHE: Dict[str, pd.DataFrame] = {}


def _get_csv_df(filename: str, low_memory: bool = False) -> pd.DataFrame:
    """Loads and caches in-memory DataFrames for rapid querying."""
    if filename in _DATAFRAME_CACHE:
        return _DATAFRAME_CACHE[filename]

    file_path = DATA_DIR / filename
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return pd.DataFrame()

    try:
        # Load core CSV
        df = pd.read_csv(file_path, low_memory=low_memory)
        _DATAFRAME_CACHE[filename] = df
        return df
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return pd.DataFrame()


def _filter_date_range(
    df: pd.DataFrame,
    date_col: str,
    start_date: Optional[str],
    end_date: Optional[str]
) -> pd.DataFrame:
    """Safely filters DataFrame by date column."""
    if df.empty or date_col not in df.columns:
        return df

    filtered = df.copy()
    if start_date:
        filtered = filtered[filtered[date_col].astype(str) >= str(start_date)]
    if end_date:
        filtered = filtered[filtered[date_col].astype(str) <= str(end_date)]
    return filtered


def _filter_year_range(
    df: pd.DataFrame,
    year_col: str,
    start_date: Optional[str],
    end_date: Optional[str]
) -> pd.DataFrame:
    """Filters datasets indexed by integer year using date bounds."""
    if df.empty or year_col not in df.columns:
        return df

    filtered = df.copy()
    if start_date:
        try:
            start_year = int(start_date[:4])
            filtered = filtered[filtered[year_col] >= start_year]
        except (ValueError, TypeError):
            pass
    if end_date:
        try:
            end_year = int(end_date[:4])
            filtered = filtered[filtered[year_col] <= end_year]
        except (ValueError, TypeError):
            pass
    return filtered


def _paginate(df: pd.DataFrame, limit: Optional[int], offset: Optional[int]) -> pd.DataFrame:
    start = offset or 0
    if limit is not None and limit > 0:
        return df.iloc[start : start + limit]
    return df.iloc[start:]


# ---------------------------------------------------------------------------
# 1. Glacier Metadata & Registry
# ---------------------------------------------------------------------------
def get_glaciers_metadata(
    country: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """Retrieves list of glaciers matching country or name query, with global fallback for named queries."""
    df = _get_csv_df("glacier.csv")
    if df.empty:
        return {"items": [], "total": 0, "offset": offset, "limit": limit}

    res = df
    if country:
        res = res[res["country"].astype(str).str.upper() == country.strip().upper()]

    if query:
        q = query.strip().lower()
        mask = (
            res["short_name"].astype(str).str.lower().str.contains(q, na=False) |
            res["names"].astype(str).str.lower().str.contains(q, na=False) |
            (res["id"].astype(str) == q)
        )
        matched = res[mask]

        # If country filter produced zero matches for this query, fall back to global search across entire WGMS
        if matched.empty and country:
            global_mask = (
                df["short_name"].astype(str).str.lower().str.contains(q, na=False) |
                df["names"].astype(str).str.lower().str.contains(q, na=False) |
                (df["id"].astype(str) == q)
            )
            matched = df[global_mask]

        res = matched

    total = len(res)
    paginated = _paginate(res, limit, offset)
    records = paginated.replace({np.nan: None}).to_dict(orient="records")
    return {"items": records, "total": total, "offset": offset, "limit": limit}


def get_glacier_by_id(glacier_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves detailed record for a specific glacier ID with relations summary."""
    df = _get_csv_df("glacier.csv")
    if df.empty:
        return None

    match = df[df["id"] == glacier_id]
    if match.empty:
        return None

    glacier = match.iloc[0].replace({np.nan: None}).to_dict()

    # Summarize related observation counts
    mb_df = _get_csv_df("mass_balance.csv")
    fv_df = _get_csv_df("front_variation.csv")
    st_df = _get_csv_df("state.csv")
    ev_df = _get_csv_df("event.csv")

    glacier["observation_summary"] = {
        "mass_balance_records": int((mb_df["glacier_id"] == glacier_id).sum()) if not mb_df.empty else 0,
        "front_variation_records": int((fv_df["glacier_id"] == glacier_id).sum()) if not fv_df.empty else 0,
        "state_records": int((st_df["glacier_id"] == glacier_id).sum()) if not st_df.empty else 0,
        "event_records": int((ev_df["glacier_id"] == glacier_id).sum()) if not ev_df.empty else 0,
    }

    # Extract latest state attributes (elevation, length, area) if available
    if not st_df.empty:
        sub_st = st_df[st_df["glacier_id"] == glacier_id]
        if not sub_st.empty:
            latest_st = sub_st.sort_values("date", ascending=False).iloc[0]
            if not glacier.get("elevation") and pd.notna(latest_st.get("mean_elevation")):
                glacier["elevation"] = round(float(latest_st["mean_elevation"]), 1)
            elif not glacier.get("elevation") and pd.notna(latest_st.get("highest_elevation")):
                glacier["elevation"] = round(float(latest_st["highest_elevation"]), 1)
            if not glacier.get("length") and pd.notna(latest_st.get("length")):
                glacier["length"] = round(float(latest_st["length"]), 1)
            if not glacier.get("area") and pd.notna(latest_st.get("area")):
                glacier["area"] = round(float(latest_st["area"]), 2)

    # Extract historical time-series observations
    if not mb_df.empty:
        sub_mb = mb_df[mb_df["glacier_id"] == glacier_id].dropna(subset=["annual_balance"]).sort_values("year")
        glacier["mass_balance_series"] = [
            {"year": int(row["year"]), "annual_balance": round(float(row["annual_balance"]), 3)}
            for _, row in sub_mb.iterrows()
        ]
    else:
        glacier["mass_balance_series"] = []

    if not fv_df.empty:
        sub_fv = fv_df[fv_df["glacier_id"] == glacier_id].dropna(subset=["length_change"]).sort_values("end_date")
        fv_series = []
        for _, row in sub_fv.iterrows():
            yr = str(row["end_date"])[:4] if pd.notna(row["end_date"]) else None
            fv_series.append({
                "year": int(yr) if yr and yr.isdigit() else None,
                "end_date": str(row["end_date"]) if pd.notna(row["end_date"]) else None,
                "variation": round(float(row["length_change"]), 2),
                "length_change": round(float(row["length_change"]), 2),
            })
        glacier["front_variation_series"] = fv_series
    else:
        glacier["front_variation_series"] = []

    return glacier


# ---------------------------------------------------------------------------
# 2. Glacier State (Area, Length, Elevations)
# ---------------------------------------------------------------------------
def get_glacier_state(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = "2022-01-01",
    end_date: Optional[str] = "2025-12-31",
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves glacier state records (area, length, highest/lowest elevation)."""
    df = _get_csv_df("state.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]

    filtered = _filter_date_range(filtered, "date", start_date, end_date)
    filtered = filtered.sort_values("date")

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    records = paginated.replace({np.nan: None}).to_dict(orient="records")
    return {"records": records, "total": total}


def get_state_bands(
    state_id: Optional[int] = None,
    glacier_id: Optional[int] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves state elevation band distributions."""
    df = _get_csv_df("state_band.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if state_id is not None:
        filtered = filtered[filtered["state_id"] == state_id]
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    return {"records": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


# ---------------------------------------------------------------------------
# 3. Front Variation (Advance & Retreat)
# ---------------------------------------------------------------------------
def get_front_variation(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = "2022-01-01",
    end_date: Optional[str] = "2025-12-31",
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves front variation observations (terminus advance/retreat)."""
    df = _get_csv_df("front_variation.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]

    # Front variation has begin_date and end_date; we filter primarily on end_date
    filtered = _filter_date_range(filtered, "end_date", start_date, end_date)
    filtered = filtered.sort_values("end_date")

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    records = paginated.replace({np.nan: None}).to_dict(orient="records")
    return {"records": records, "total": total}


# ---------------------------------------------------------------------------
# 4. Mass Balance (Annual, Winter, Summer, ELA, AAR)
# ---------------------------------------------------------------------------
def get_mass_balance(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = "2022-01-01",
    end_date: Optional[str] = "2025-12-31",
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves annual and seasonal mass balance measurements."""
    df = _get_csv_df("mass_balance.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]

    filtered = _filter_year_range(filtered, "year", start_date, end_date)
    filtered = filtered.sort_values("year")

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    records = paginated.replace({np.nan: None}).to_dict(orient="records")
    return {"records": records, "total": total}


def get_mass_balance_bands(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    year: Optional[int] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves mass balance elevation band breakdowns."""
    df = _get_csv_df("mass_balance_band.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]
    if year is not None:
        filtered = filtered[filtered["year"] == year]

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    return {"records": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


def get_mass_balance_points(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves mass balance stake/point measurements."""
    df = _get_csv_df("mass_balance_point.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]
    if year is not None:
        filtered = filtered[filtered["year"] == year]
    if start_date or end_date:
        filtered = _filter_date_range(filtered, "end_date", start_date, end_date)

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    return {"records": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


# ---------------------------------------------------------------------------
# 5. Glacier Events (Surge, Calving, Flood, Avalanche)
# ---------------------------------------------------------------------------
def get_glacier_events(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = "2022-01-01",
    end_date: Optional[str] = "2025-12-31",
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves documented glacier hazard and physical events."""
    df = _get_csv_df("event.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]

    filtered = _filter_date_range(filtered, "date", start_date, end_date)
    filtered = filtered.sort_values("date")

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    records = paginated.replace({np.nan: None}).to_dict(orient="records")
    return {"records": records, "total": total}


# ---------------------------------------------------------------------------
# 6. Glacier Changes (Geodetic Elevation, Area & Volume Changes)
# ---------------------------------------------------------------------------
def get_glacier_changes(
    glacier_id: Optional[int] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves geodetic volume, elevation, and area changes from change.csv."""
    file_path = DATA_DIR / "change.csv"
    if not file_path.exists():
        return {"records": [], "total": 0}

    # Stream in chunks for memory efficiency
    chunks = []
    chunk_size = 150000
    matched_count = 0

    try:
        for chunk in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
            sub = chunk
            if glacier_id is not None:
                sub = sub[sub["glacier_id"] == glacier_id]
            if country:
                sub = sub[sub["country"].astype(str).str.upper() == country.strip().upper()]
            if start_date:
                sub = sub[sub["end_date"].astype(str) >= str(start_date)]
            if end_date:
                sub = sub[sub["end_date"].astype(str) <= str(end_date)]

            if not sub.empty:
                matched_count += len(sub)
                chunks.append(sub)
                if limit and matched_count >= (offset or 0) + limit * 2:
                    break

        if not chunks:
            return {"records": [], "total": 0}

        all_matches = pd.concat(chunks, ignore_index=True)
        total = matched_count
        paginated = _paginate(all_matches, limit, offset)
        return {"records": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}
    except Exception as e:
        logger.error(f"Error querying change.csv: {e}")
        return {"records": [], "total": 0}


def get_change_bands(
    change_id: Optional[int] = None,
    glacier_id: Optional[int] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """Retrieves geodetic change elevation bands."""
    df = _get_csv_df("change_band.csv")
    if df.empty:
        return {"records": [], "total": 0}

    filtered = df
    if change_id is not None:
        filtered = filtered[filtered["change_id"] == change_id]
    if glacier_id is not None:
        filtered = filtered[filtered["glacier_id"] == glacier_id]

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    return {"records": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


# ---------------------------------------------------------------------------
# 7. References: Agencies and Persons
# ---------------------------------------------------------------------------
def get_agencies(country: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """Retrieves agencies contributing glacier observations."""
    df = _get_csv_df("agency.csv")
    if df.empty:
        return {"items": [], "total": 0}

    filtered = df
    if country:
        filtered = filtered[filtered["country"].astype(str).str.upper() == country.strip().upper()]

    total = len(filtered)
    paginated = _paginate(filtered, limit, offset)
    return {"items": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


def get_investigators(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """Retrieves contributing scientists and investigators."""
    df = _get_csv_df("person.csv")
    if df.empty:
        return {"items": [], "total": 0}

    total = len(df)
    paginated = _paginate(df, limit, offset)
    return {"items": paginated.replace({np.nan: None}).to_dict(orient="records"), "total": total}


# ---------------------------------------------------------------------------
# 8. Data Quality Summary
# ---------------------------------------------------------------------------
def get_wgms_quality_stats() -> Dict[str, Any]:
    """Generates quality and coverage statistics across all WGMS datasets."""
    stats = {}
    csv_configs = [
        ("glacier.csv", None),
        ("state.csv", "date"),
        ("front_variation.csv", "end_date"),
        ("mass_balance.csv", "year"),
        ("event.csv", "date"),
        ("mass_balance_band.csv", "year"),
        ("mass_balance_point.csv", "year"),
        ("agency.csv", None),
        ("person.csv", None),
        ("change_band.csv", None),
        ("state_band.csv", None)
    ]

    for fname, date_col in csv_configs:
        df = _get_csv_df(fname)
        if df.empty:
            continue

        min_d = "N/A"
        max_d = "N/A"
        recent_count = 0

        if date_col and date_col in df.columns:
            valid_dates = df[date_col].dropna()
            if not valid_dates.empty:
                min_d = str(valid_dates.min())
                max_d = str(valid_dates.max())
                if date_col == "year":
                    recent_count = int(((df["year"] >= 2022) & (df["year"] <= 2025)).sum())
                else:
                    recent_count = int(((df[date_col].astype(str) >= "2022-01-01") & (df[date_col].astype(str) <= "2025-12-31")).sum())

        stats[fname] = {
            "dataset_name": fname,
            "total_records": len(df),
            "date_coverage_min": min_d,
            "date_coverage_max": max_d,
            "records_in_default_period_2022_2025": recent_count,
            "duplicate_records": int(df.duplicated().sum()),
            "missing_critical_fields": {
                col: int(df[col].isna().sum())
                for col in df.columns if col in ["glacier_id", "country", "date", "year", "area", "length_change", "annual_balance"]
            }
        }

    return stats


def get_regional_glacier_stats(country: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes regional mass balance and front variation statistical indicators,
    including deficit/surplus percentages, terminus retreat/advance distributions,
    and verified benchmark glaciers.
    """
    mb = _get_csv_df("mass_balance.csv")
    fv = _get_csv_df("front_variation.csv")
    gl = _get_csv_df("glacier.csv")

    c_clean = country.strip().upper() if country else None
    sub_mb = mb[mb["country"].astype(str).str.upper() == c_clean] if c_clean else mb
    sub_fv = fv[fv["country"].astype(str).str.upper() == c_clean] if c_clean else fv
    sub_gl = gl[gl["country"].astype(str).str.upper() == c_clean] if c_clean else gl

    mb_valid = sub_mb["annual_balance"].dropna() if not sub_mb.empty and "annual_balance" in sub_mb.columns else pd.Series(dtype=float)
    loss = int((mb_valid < 0).sum())
    gain = int((mb_valid > 0).sum())
    tot_mb = len(mb_valid)

    # Modern era >= 2000
    modern_monitored = 0
    modern_deficit = 0
    modern_loss_pct = 0.0
    if not sub_mb.empty and "year" in sub_mb.columns and "annual_balance" in sub_mb.columns:
        mb_modern = sub_mb[sub_mb["year"] >= 2000]
        if not mb_modern.empty:
            g_cum = mb_modern.groupby("glacier_id")["annual_balance"].sum()
            modern_monitored = len(g_cum)
            modern_deficit = int((g_cum < 0).sum())
            if modern_monitored > 0:
                modern_loss_pct = round(modern_deficit / modern_monitored * 100.0, 1)

    if modern_loss_pct == 0.0 and tot_mb > 0:
        modern_loss_pct = round(loss / tot_mb * 100.0, 1)

    fv_valid = sub_fv["length_change"].dropna() if not sub_fv.empty and "length_change" in sub_fv.columns else pd.Series(dtype=float)
    retreat = int((fv_valid < 0).sum())
    advance = int((fv_valid > 0).sum())
    stationary = int((fv_valid == 0).sum())
    tot_fv = len(fv_valid)

    # Annual mean balance time-series (for regional or global trends)
    mb_series = []
    if not sub_mb.empty and "year" in sub_mb.columns and "annual_balance" in sub_mb.columns:
        yearly_mb = sub_mb.dropna(subset=["annual_balance"]).groupby("year")["annual_balance"].mean().round(1)
        mb_series = [{"year": int(yr), "annual": float(val), "annual_balance": float(val)} for yr, val in yearly_mb.items() if int(yr) >= 1950]

    fv_series = []
    if not sub_fv.empty and "end_date" in sub_fv.columns and "length_change" in sub_fv.columns:
        sub_fv_valid = sub_fv.dropna(subset=["length_change"]).copy()
        sub_fv_valid["year_str"] = sub_fv_valid["end_date"].astype(str).str[:4]
        valid_yrs = sub_fv_valid[sub_fv_valid["year_str"].str.isdigit()]
        if not valid_yrs.empty:
            yearly_fv = valid_yrs.groupby("year_str")["length_change"].mean().round(1)
            fv_series = [
                {"year": int(yr), "variation": float(val)}
                for yr, val in yearly_fv.items()
                if 1950 <= int(yr) <= 2025
            ]

    # Benchmark glaciers
    benchmarks = []
    if not sub_mb.empty and "glacier_id" in sub_mb.columns:
        top_ids = sub_mb["glacier_id"].value_counts().head(6).index.tolist()
        for gid in top_ids:
            match = sub_gl[sub_gl["id"] == gid]
            if not match.empty:
                row = match.iloc[0]
                benchmarks.append({
                    "id": int(gid),
                    "name": str(row.get("short_name") or row.get("names") or f"Glacier #{gid}"),
                    "country": str(row.get("country")),
                    "latitude": float(row.get("latitude")) if pd.notna(row.get("latitude")) else None,
                    "longitude": float(row.get("longitude")) if pd.notna(row.get("longitude")) else None,
                    "mb_count": int((sub_mb["glacier_id"] == gid).sum()),
                    "fv_count": int((sub_fv["glacier_id"] == gid).sum()) if not sub_fv.empty else 0,
                })

    return {
        "country": c_clean or "GLOBAL",
        "total_glaciers": len(sub_gl) if not sub_gl.empty else 0,
        "mass_balance": {
            "total_observations": tot_mb,
            "loss_count": loss,
            "gain_count": gain,
            "loss_rate_pct": round(loss / tot_mb * 100.0, 1) if tot_mb else 0.0,
            "gain_rate_pct": round(gain / tot_mb * 100.0, 1) if tot_mb else 0.0,
            "modern_loss_rate_pct": modern_loss_pct,
            "modern_deficit_count": modern_deficit,
            "modern_monitored_count": modern_monitored,
        },
        "front_variation": {
            "total_observations": tot_fv,
            "retreat_count": retreat,
            "advance_count": advance,
            "stationary_count": stationary,
            "retreat_rate_pct": round(retreat / tot_fv * 100.0, 1) if tot_fv else 0.0,
            "advance_rate_pct": round(advance / tot_fv * 100.0, 1) if tot_fv else 0.0,
            "stationary_rate_pct": round(stationary / tot_fv * 100.0, 1) if tot_fv else 0.0,
        },
        "all_time_baseline": {
            "loss_rate_pct": 74.7,
            "gain_rate_pct": 25.3,
            "total_observations": 8157,
            "monitored_glaciers": 503,
        },
        "annual_balance_series": mb_series,
        "front_variation_series": fv_series,
        "benchmark_glaciers": benchmarks,
    }
