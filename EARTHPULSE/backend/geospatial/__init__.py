"""
EARTHPULSE Geospatial Package
"""
from backend.geospatial.kml_parser import parse_kml_or_kmz
from backend.geospatial.geojson_exporter import export_glaciers_to_geojson, save_geojson_to_file
from backend.geospatial.raster_processor import (
    inspect_raster_metadata,
    reproject_coordinates,
    compute_normalized_spectral_index,
)
from backend.geospatial.change_detection import (
    detect_polygon_area_change,
    detect_raster_elevation_change,
)
from backend.geospatial.modis_processor import (
    modis_detections_to_geodataframe,
    modis_detections_to_geojson,
    modis_hotspots_to_geojson,
    filter_modis_by_bbox,
)

__all__ = [
    "parse_kml_or_kmz",
    "export_glaciers_to_geojson",
    "save_geojson_to_file",
    "inspect_raster_metadata",
    "reproject_coordinates",
    "compute_normalized_spectral_index",
    "detect_polygon_area_change",
    "detect_raster_elevation_change",
    "modis_detections_to_geodataframe",
    "modis_detections_to_geojson",
    "modis_hotspots_to_geojson",
    "filter_modis_by_bbox",
]
