"""
EARTHPULSE - KML/KMZ Retrieval Tool
"""
from pathlib import Path
from typing import Optional, Dict, Any, Union
import geopandas as gpd
from backend.core.logging_config import logger


def load_kml_or_kmz(file_path: Union[str, Path]) -> Optional[gpd.GeoDataFrame]:
    """
    Reads a KML or KMZ boundary file and returns a GeoPandas GeoDataFrame in EPSG:4326.
    """
    path = Path(file_path)
    if not path.exists():
        logger.error(f"KML/KMZ file does not exist: {path}")
        return None

    try:
        # Enable KML driver in fiona / pyogrio if available
        gdf = gpd.read_file(path)
        if gdf.crs is None:
            gdf = gdf.set_crs(epsg=4326)
        elif gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        return gdf
    except Exception as e:
        logger.error(f"Failed to read KML/KMZ {path}: {e}")
        return None
