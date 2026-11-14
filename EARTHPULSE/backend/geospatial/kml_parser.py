"""
EARTHPULSE - Geospatial KML/KMZ Parser
"""
import zipfile
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
import geopandas as gpd
from shapely.geometry import shape, Point, Polygon
import xml.etree.ElementTree as ET

from backend.core.logging_config import logger


def parse_kml_or_kmz(file_path: Union[str, Path]) -> Optional[gpd.GeoDataFrame]:
    """
    Parses a KML or KMZ boundary file into a GeoPandas GeoDataFrame with CRS EPSG:4326.
    """
    p = Path(file_path)
    if not p.exists():
        logger.warning(f"File not found: {p}")
        return None

    # Handle KMZ by extracting doc.kml if needed
    if p.suffix.lower() == ".kmz":
        try:
            with zipfile.ZipFile(p, "r") as z:
                kml_names = [n for n in z.namelist() if n.lower().endswith(".kml")]
                if not kml_names:
                    return None
                kml_content = z.read(kml_names[0])
                # Parse XML directly
                return parse_kml_string(kml_content.decode("utf-8", errors="ignore"))
        except Exception as e:
            logger.error(f"Error extracting KMZ {p}: {e}")
            return None

    try:
        gdf = gpd.read_file(p)
        if gdf.crs is None:
            gdf = gdf.set_crs(epsg=4326)
        elif gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        return gdf
    except Exception as e:
        logger.error(f"Direct geopandas read failed for {p}: {e}; trying XML fallback")
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                return parse_kml_string(f.read())
        except Exception as e2:
            logger.error(f"XML parse failed: {e2}")
            return None


def parse_kml_string(kml_str: str) -> Optional[gpd.GeoDataFrame]:
    """Fallback XML parser for simple KML coordinate strings."""
    try:
        # Strip namespaces for simple parsing
        xml_clean = ET.fromstring(kml_str)
        features = []
        for placemark in xml_clean.iter():
            if placemark.tag.endswith("Placemark"):
                name = None
                coords_str = None
                for child in placemark.iter():
                    if child.tag.endswith("name"):
                        name = child.text
                    elif child.tag.endswith("coordinates"):
                        coords_str = child.text

                if coords_str:
                    coords = []
                    for token in coords_str.strip().split():
                        parts = token.split(",")
                        if len(parts) >= 2:
                            coords.append((float(parts[0]), float(parts[1])))

                    if len(coords) == 1:
                        geom = Point(coords[0])
                    elif len(coords) >= 3:
                        geom = Polygon(coords)
                    else:
                        continue

                    features.append({"name": name or "Unnamed", "geometry": geom})

        if not features:
            return None

        return gpd.GeoDataFrame(features, crs="EPSG:4326")
    except Exception as e:
        logger.error(f"parse_kml_string error: {e}")
        return None
