"""
EARTHPULSE - GeoJSON Exporter & Spatial Format Converter
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import geopandas as gpd
from shapely.geometry import Point, mapping


def export_glaciers_to_geojson(
    glaciers: List[Dict[str, Any]],
    include_summary: bool = True
) -> Dict[str, Any]:
    """
    Converts a list of glacier records into an RFC 7946 compliant GeoJSON FeatureCollection.
    Glaciers missing valid coordinates are safely omitted from geometry.
    """
    features = []
    for g in glaciers:
        lat = g.get("latitude")
        lon = g.get("longitude")

        if lat is None or lon is None:
            continue

        try:
            flat = float(lat)
            flon = float(lon)
            # WGS84 boundary checks
            if not (-90.0 <= flat <= 90.0 and -180.0 <= flon <= 180.0):
                continue
        except (ValueError, TypeError):
            continue

        props = {
            "id": g.get("id"),
            "short_name": g.get("short_name"),
            "names": g.get("names"),
            "country": g.get("country"),
            "gtng_region": g.get("gtng_region"),
            "glims_id": g.get("glims_id"),
            "rgi60_ids": g.get("rgi60_ids"),
        }

        if include_summary and "observation_summary" in g:
            props["observation_summary"] = g["observation_summary"]

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [flon, flat]  # GeoJSON spec: [lon, lat]
            },
            "properties": props
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "total_features": len(features),
            "crs": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    }


def save_geojson_to_file(geojson_dict: Dict[str, Any], output_path: Union[str, Path]) -> bool:
    """Serializes a GeoJSON dictionary to disk."""
    try:
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(geojson_dict, f, indent=2)
        return True
    except Exception:
        return False
