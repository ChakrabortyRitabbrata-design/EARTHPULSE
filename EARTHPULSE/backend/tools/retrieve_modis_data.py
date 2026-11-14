"""
EARTHPULSE - MODIS Thermal Anomaly Data Ingestion & Retrieval Engine
"""
import glob
import os
import re
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import numpy as np
import pandas as pd

from backend.core.config import settings
from backend.core.logging_config import logger

# ---------------------------------------------------------------------------
# Global Discovery & Cache
# ---------------------------------------------------------------------------
_MODIS_INVENTORY: Optional[Dict[str, Any]] = None
_DATAFRAME_CACHE: Dict[Tuple[str, Optional[int]], pd.DataFrame] = {}
_MAX_CACHE_ENTRIES = 50


def get_modis_base_dirs() -> List[Path]:
    """Finds the root directories containing 2024 and 2025 MODIS data."""
    base = getattr(settings, "resolved_modis_data_dir", settings.MODIS_DATA_DIR)
    dirs = []
    # Support both direct year folders and nested modis/<year> folders
    for d in [
        base / "modis_2024_all_countries" / "modis" / "2024",
        base / "modis_2025_all_countries" / "modis" / "2025",
        base / "modis_2024_all_countries",
        base / "modis_2025_all_countries",
    ]:
        if d.exists():
            dirs.append(d)
    return dirs


def discover_modis_inventory(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Scans the repository to identify all available MODIS country datasets
    across 2024 and 2025. Does not load the full data into memory.
    """
    global _MODIS_INVENTORY
    if _MODIS_INVENTORY is not None and not force_refresh:
        return _MODIS_INVENTORY

    inventory: Dict[str, Any] = {
        "countries": {},
        "files_by_year": {2024: [], 2025: []},
        "all_files": [],
        "total_files": 0
    }

    base_dir = getattr(settings, "resolved_modis_data_dir", settings.MODIS_DATA_DIR)
    if not base_dir.exists():
        logger.warning(f"MODIS data directory not found: {base_dir}")
        _MODIS_INVENTORY = inventory
        return inventory

    csv_paths = glob.glob(str(base_dir / "**" / "modis_*.csv"), recursive=True)

    for p_str in csv_paths:
        p = Path(p_str)
        m = re.match(r"modis_(\d{4})_(.+)\.csv", p.name, re.IGNORECASE)
        if not m:
            continue

        year = int(m.group(1))
        country_slug = m.group(2)
        country_display = country_slug.replace("_", " ").strip()
        country_key = country_display.lower()

        if country_key not in inventory["countries"]:
            inventory["countries"][country_key] = {
                "display_name": country_display,
                "years": {},
                "files": []
            }

        inventory["countries"][country_key]["years"][year] = str(p)
        inventory["countries"][country_key]["files"].append(str(p))

        if year in inventory["files_by_year"]:
            inventory["files_by_year"][year].append(str(p))

        inventory["all_files"].append(str(p))

    inventory["total_files"] = len(inventory["all_files"])
    logger.info(f"Discovered {inventory['total_files']} MODIS datasets across {len(inventory['countries'])} countries.")
    _MODIS_INVENTORY = inventory
    return inventory


def get_available_countries() -> List[str]:
    """Returns alphabetical list of all discovered country names."""
    inv = discover_modis_inventory()
    return sorted([entry["display_name"] for entry in inv["countries"].values()])


def get_modis_inventory_summary() -> Dict[str, Any]:
    """Returns overview statistics of discovered files and coverage."""
    inv = discover_modis_inventory()
    sample_countries = sorted([e["display_name"] for e in inv["countries"].values()])[:15]
    return {
        "total_countries_indexed": len(inv["countries"]),
        "distinct_countries": len(inv["countries"]),
        "available_years": [2024, 2025],
        "years": [2024, 2025],
        "total_files_discovered": inv["total_files"],
        "total_files": inv["total_files"],
        "files_2024": len(inv["files_by_year"].get(2024, [])),
        "files_2025": len(inv["files_by_year"].get(2025, [])),
        "sample_countries": sample_countries,
        "notes": [
            "Data corresponds to NASA FIRMS MODIS Active Fire / Thermal Anomaly observations (C6.1).",
            "Detections include biomass burning, volcanic activity, and industrial thermal sources."
        ]
    }


# ---------------------------------------------------------------------------
# Targeted Loading & In-Memory Caching
# ---------------------------------------------------------------------------
def _load_single_csv(file_path: str, country_name: str, year: int) -> pd.DataFrame:
    """Reads a single country CSV and standardizes fields without discarding data."""
    try:
        df = pd.read_csv(file_path, low_memory=False)
        if df.empty:
            return df

        # Add tracking metadata
        df["country"] = country_name
        df["year"] = year
        df["source_file"] = Path(file_path).name

        # Standardize coordinates
        df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
        df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

        # Standardize thermal metrics
        df["brightness"] = pd.to_numeric(df.get("brightness"), errors="coerce")
        df["bright_t31"] = pd.to_numeric(df.get("bright_t31"), errors="coerce")
        df["frp"] = pd.to_numeric(df.get("frp"), errors="coerce")
        df["confidence"] = pd.to_numeric(df.get("confidence"), errors="coerce")

        # Standardize dates and times
        df["acq_date"] = df["acq_date"].astype(str).str.strip()
        # Ensure acq_time is a 4-character string (HHMM)
        df["acq_time"] = df["acq_time"].astype(str).str.replace(".0", "", regex=False).str.zfill(4)

        # Standardize string fields
        df["satellite"] = df["satellite"].astype(str).str.strip()
        df["daynight"] = df["daynight"].astype(str).str.strip().str.upper()

        if "version" in df.columns:
            df["version"] = df["version"].astype(str).str.strip()

        if "type" in df.columns:
            df["type"] = pd.to_numeric(df["type"], errors="coerce")

        return df
    except Exception as e:
        logger.error(f"Error loading MODIS CSV {file_path}: {e}")
        return pd.DataFrame()


def load_modis_dataframe(
    country: Optional[str] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> pd.DataFrame:
    """
    Retrieves and filters MODIS observations efficiently using memory caching.
    Loads ONLY the relevant country files rather than the entire 650 MB archive.
    """
    inv = discover_modis_inventory()
    target_files: List[Tuple[str, str, int]] = []

    if country:
        c_norm = country.replace("_", " ").strip().lower()
        # Direct match or partial match
        matched_entry = inv["countries"].get(c_norm)
        if not matched_entry:
            # Try fuzzy/substring match
            for k, entry in inv["countries"].items():
                if c_norm in k or k in c_norm:
                    matched_entry = entry
                    break

        if matched_entry:
            c_name = matched_entry["display_name"]
            for yr, p in matched_entry["years"].items():
                if year is None or yr == year:
                    target_files.append((p, c_name, yr))
    else:
        # If no country specified, fetch files matching the requested year(s)
        # Note: to prevent memory explosion, limit full global scan to sample or chunk
        for yr in [2024, 2025]:
            if year is None or yr == year:
                for p in inv["files_by_year"].get(yr, []):
                    bn = Path(p).name
                    m = re.match(r"modis_\d{4}_(.+)\.csv", bn)
                    c_name = m.group(1).replace("_", " ") if m else "Unknown"
                    target_files.append((p, c_name, yr))

    if not target_files:
        return pd.DataFrame()

    frames = []
    for f_path, c_name, yr in target_files:
        cache_key = (c_name.lower(), yr)
        if cache_key in _DATAFRAME_CACHE:
            df = _DATAFRAME_CACHE[cache_key]
        else:
            df = _load_single_csv(f_path, c_name, yr)
            if len(_DATAFRAME_CACHE) < _MAX_CACHE_ENTRIES:
                _DATAFRAME_CACHE[cache_key] = df
        if not df.empty:
            frames.append(df)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)

    # Apply date filters
    if start_date:
        combined = combined[combined["acq_date"] >= str(start_date)]
    if end_date:
        combined = combined[combined["acq_date"] <= str(end_date)]

    return combined


def get_modis_detections(
    country: Optional[str] = None,
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    satellite: Optional[str] = None,
    daynight: Optional[str] = None,
    min_confidence: Optional[int] = None,
    min_frp: Optional[float] = None,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Main paginated query function for MODIS detections with comprehensive filtering.
    """
    df = load_modis_dataframe(country=country, year=year, start_date=start_date, end_date=end_date)
    if df.empty:
        return {"items": [], "total": 0, "offset": offset, "limit": limit, "country": country, "year": year}

    filtered = df

    if satellite:
        sat_clean = satellite.strip().capitalize()
        filtered = filtered[filtered["satellite"].str.capitalize().str.contains(sat_clean, na=False)]

    if daynight:
        dn_clean = daynight.strip().upper()
        filtered = filtered[filtered["daynight"] == dn_clean]

    if min_confidence is not None:
        filtered = filtered[filtered["confidence"] >= min_confidence]

    if min_frp is not None:
        filtered = filtered[filtered["frp"] >= min_frp]

    total = len(filtered)
    # Sort chronologically
    filtered = filtered.sort_values(["acq_date", "acq_time"], ascending=[False, False])

    paginated = filtered.iloc[offset : offset + limit]
    records = paginated.replace({np.nan: None}).to_dict(orient="records")

    return {
        "items": records,
        "records": records,
        "total": total,
        "total_records": total,
        "offset": offset,
        "limit": limit,
        "country": country,
        "year": year
    }
