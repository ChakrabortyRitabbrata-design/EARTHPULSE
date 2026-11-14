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
    """Retrieves list of glaciers matching country or name query."""
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
            res["names"].astype(str).str.lower().str.contains(q, na=False)
        )
        res = res[mask]

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
