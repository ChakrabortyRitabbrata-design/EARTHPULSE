"""
EARTHPULSE - Geospatial Raster Processing Engine (Rasterio, PyProj, Shapely)
"""
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, Union
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from pyproj import Transformer
from shapely.geometry import box, mapping

from backend.core.logging_config import logger


def inspect_raster_metadata(raster_path: Union[str, Path]) -> Optional[Dict[str, Any]]:
    """
    Inspects and extracts core geospatial metadata from any GeoTIFF / raster file.
    Never fabricates values; reads directly from GDAL/Rasterio driver.
    """
    p = Path(raster_path)
    if not p.exists():
        logger.warning(f"Raster file not found: {p}")
        return None

    try:
        with rasterio.open(p) as src:
            bounds = src.bounds
            crs_str = src.crs.to_string() if src.crs else None
            meta = {
                "file_name": p.name,
                "driver": src.driver,
                "width": src.width,
                "height": src.height,
                "count": src.count,
                "dtypes": [str(d) for d in src.dtypes],
                "crs": crs_str,
                "transform": [round(val, 6) for val in src.transform],
                "resolution": (round(src.res[0], 4), round(src.res[1], 4)),
                "bounds": {
                    "left": bounds.left,
                    "bottom": bounds.bottom,
                    "right": bounds.right,
                    "top": bounds.top
                },
                "nodata": src.nodata
            }
            return meta
    except Exception as e:
        logger.error(f"Error inspecting raster {p}: {e}")
        return None


def reproject_coordinates(
    x: float,
    y: float,
    src_crs: str = "EPSG:4326",
    dst_crs: str = "EPSG:3857"
) -> Tuple[float, float]:
    """Transforms point coordinates between any two spatial reference systems."""
    transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)
    out_x, out_y = transformer.transform(x, y)
    return out_x, out_y


def compute_normalized_spectral_index(
    band_primary: np.ndarray,
    band_secondary: np.ndarray,
    nodata_mask: Optional[np.ndarray] = None
) -> np.ndarray:
    """
    Computes generalized normalized index: (Primary - Secondary) / (Primary + Secondary).
    Applies for NDVI (NIR, Red) or NDWI (Green, NIR) or NDSI (Green, SWIR).
    """
    p = band_primary.astype(np.float32)
    s = band_secondary.astype(np.float32)

    denominator = p + s
    # Avoid zero division
    with np.errstate(divide="ignore", invalid="ignore"):
        index = np.where(denominator != 0, (p - s) / denominator, np.nan)

    if nodata_mask is not None:
        index[nodata_mask] = np.nan

    return np.clip(index, -1.0, 1.0)
