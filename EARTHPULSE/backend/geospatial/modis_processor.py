"""
EARTHPULSE - Geospatial MODIS Processor & AtlasX GeoJSON Generator
"""
from typing import Dict, Any, List, Optional, Union
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

from backend.tools.analyze_modis import identify_hotspot_clusters


def modis_detections_to_geodataframe(df: Union[pd.DataFrame, List[Dict[str, Any]]]) -> gpd.GeoDataFrame:
    """Converts a MODIS DataFrame or record list into a GeoPandas GeoDataFrame with EPSG:4326 CRS."""
    if isinstance(df, list):
        if not df:
            return gpd.GeoDataFrame(columns=["geometry"], crs="EPSG:4326")
        df = pd.DataFrame(df)

    if df.empty or "latitude" not in df.columns or "longitude" not in df.columns:
        return gpd.GeoDataFrame(columns=["geometry"], crs="EPSG:4326")

    valid = df.dropna(subset=["latitude", "longitude"]).copy()
    valid["latitude"] = pd.to_numeric(valid["latitude"], errors="coerce")
    valid["longitude"] = pd.to_numeric(valid["longitude"], errors="coerce")

    # Filter standard WGS84 bounds
    valid = valid[
        (valid["latitude"] >= -90.0) & (valid["latitude"] <= 90.0) &
        (valid["longitude"] >= -180.0) & (valid["longitude"] <= 180.0)
    ]

    geometry = [Point(xy) for xy in zip(valid["longitude"], valid["latitude"])]
    return gpd.GeoDataFrame(valid, geometry=geometry, crs="EPSG:4326")


def modis_detections_to_geojson(
    df: Union[pd.DataFrame, List[Dict[str, Any]]],
    max_features: int = 5000
) -> Dict[str, Any]:
    """
    Transforms MODIS detections into an RFC 7946 GeoJSON FeatureCollection
    formatted specifically for AtlasX 3D globe point layers.
    """
    if isinstance(df, list):
        if not df:
            return {"type": "FeatureCollection", "features": [], "properties": {"total_features": 0}}
        df = pd.DataFrame(df)

    if df.empty:
        return {"type": "FeatureCollection", "features": [], "properties": {"total_features": 0}}

    gdf = modis_detections_to_geodataframe(df)
    if len(gdf) > max_features:
        gdf = gdf.iloc[:max_features]

    features = []
    for _, row in gdf.iterrows():
        lat_val = float(row["latitude"])
        lon_val = float(row["longitude"])
        props = {
            "latitude": lat_val,
            "longitude": lon_val,
            "brightness": float(row["brightness"]) if pd.notna(row.get("brightness")) else None,
            "bright_t31": float(row["bright_t31"]) if pd.notna(row.get("bright_t31")) else None,
            "frp": float(row["frp"]) if pd.notna(row.get("frp")) else None,
            "confidence": int(row["confidence"]) if pd.notna(row.get("confidence")) else None,
            "acq_date": str(row.get("acq_date")),
            "acq_time": str(row.get("acq_time")),
            "satellite": str(row.get("satellite")),
            "daynight": str(row.get("daynight")),
            "type": int(row["type"]) if pd.notna(row.get("type")) else None,
            "country": str(row.get("country")),
            "year": int(row["year"]) if pd.notna(row.get("year")) else None,
            "scan_km": float(row["scan"]) if pd.notna(row.get("scan")) else 1.0,
            "track_km": float(row["track"]) if pd.notna(row.get("track")) else 1.0,
        }

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon_val, lat_val]
            },
            "properties": props
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "total_features": len(features),
            "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
            "layer_type": "modis_thermal_anomalies"
        }
    }


def modis_hotspots_to_geojson(hotspot_clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Transforms DBSCAN hotspot cluster summaries into GeoJSON FeatureCollection
    representing concentrated thermal centres for AtlasX heatmap/bubble rendering.
    """
    features = []
    for c in hotspot_clusters:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [c["centroid_lon"], c["centroid_lat"]]
            },
            "properties": {
                "cluster_id": c["cluster_id"],
                "detection_count": c["detection_count"],
                "total_frp_mw": c["total_frp_mw"],
                "max_frp_mw": c["max_frp_mw"],
                "mean_brightness_k": c["mean_brightness_k"],
                "first_observed": c["first_observed"],
                "latest_observed": c["latest_observed"],
                "persistence_days": c["persistence_days"],
                "dominant_type": c["dominant_type"],
                "is_high_frp": c["is_high_frp"]
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "total_clusters": len(features),
            "layer_type": "modis_hotspot_clusters"
        }
    }


def filter_modis_by_bbox(
    data: Union[pd.DataFrame, Dict[str, Any]],
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float
) -> Union[pd.DataFrame, Dict[str, Any]]:
    """Filters detection DataFrame or GeoJSON FeatureCollection to a spatial bounding box."""
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        filtered_features = []
        for feat in data.get("features", []):
            coords = feat.get("geometry", {}).get("coordinates", [])
            if len(coords) >= 2:
                lon, lat = coords[0], coords[1]
                if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                    filtered_features.append(feat)
        return {
            "type": "FeatureCollection",
            "features": filtered_features,
            "properties": {
                **data.get("properties", {}),
                "total_features": len(filtered_features)
            }
        }

    if isinstance(data, pd.DataFrame):
        if data.empty or "latitude" not in data.columns or "longitude" not in data.columns:
            return data
        return data[
            (data["latitude"] >= min_lat) & (data["latitude"] <= max_lat) &
            (data["longitude"] >= min_lon) & (data["longitude"] <= max_lon)
        ]
    return data
