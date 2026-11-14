"""
EARTHPULSE - Geospatial Change Detection (Vector & Raster)
"""
from typing import Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union


def detect_polygon_area_change(
    polygon_t1: Polygon,
    polygon_t2: Polygon,
    crs_meters: bool = False
) -> Dict[str, Any]:
    """
    Computes spatial geometric difference and retreat/advance zones between
    two multi-temporal boundary outlines (e.g., glacier 1990 vs 2020).
    """
    if not polygon_t1.is_valid:
        polygon_t1 = polygon_t1.buffer(0)
    if not polygon_t2.is_valid:
        polygon_t2 = polygon_t2.buffer(0)

    area_t1 = float(polygon_t1.area)
    area_t2 = float(polygon_t2.area)
    net_area_change = area_t2 - area_t1

    pct_change = None
    if area_t1 != 0:
        pct_change = round((net_area_change / area_t1) * 100.0, 3)

    # Loss zone (present in T1 but missing in T2)
    loss_zone = polygon_t1.difference(polygon_t2)
    loss_area = float(loss_zone.area)

    # Gain zone (present in T2 but not in T1)
    gain_zone = polygon_t2.difference(polygon_t1)
    gain_area = float(gain_zone.area)

    return {
        "status": "computed",
        "initial_area": round(area_t1, 3),
        "latest_area": round(area_t2, 3),
        "net_area_change": round(net_area_change, 3),
        "percentage_change": pct_change,
        "loss_area": round(loss_area, 3),
        "gain_area": round(gain_area, 3),
        "unit": "square_meters" if crs_meters else "square_degrees"
    }


def detect_raster_elevation_change(
    dem_t1: np.ndarray,
    dem_t2: np.ndarray,
    cell_size_m: float = 30.0,
    nodata_value: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes geodetic elevation change (dh) and estimated volume change (dV = sum(dh) * cell_area)
    from two aligned DEM grids.
    """
    if dem_t1.shape != dem_t2.shape:
        return {"status": "error", "error": "DEM grids have mismatched dimensions."}

    mask = np.ones(dem_t1.shape, dtype=bool)
    if nodata_value is not None:
        mask = mask & (dem_t1 != nodata_value) & (dem_t2 != nodata_value)

    mask = mask & np.isfinite(dem_t1) & np.isfinite(dem_t2)
    if not np.any(mask):
        return {"status": "insufficient_valid_pixels"}

    dh = dem_t2[mask] - dem_t1[mask]
    mean_dh = float(np.mean(dh))
    std_dh = float(np.std(dh))
    pixel_area = cell_size_m * cell_size_m
    total_volume_change_m3 = float(np.sum(dh) * pixel_area)

    return {
        "status": "computed",
        "valid_pixel_count": int(np.sum(mask)),
        "mean_elevation_change_m": round(mean_dh, 3),
        "std_elevation_change_m": round(std_dh, 3),
        "min_elevation_change_m": round(float(np.min(dh)), 3),
        "max_elevation_change_m": round(float(np.max(dh)), 3),
        "estimated_volume_change_m3": round(total_volume_change_m3, 1)
    }
