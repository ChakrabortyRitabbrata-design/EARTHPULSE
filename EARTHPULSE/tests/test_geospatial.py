"""
Unit tests for geospatial foundation utilities
"""
import pytest
from shapely.geometry import Polygon
from backend.geospatial import (
    reproject_coordinates,
    compute_normalized_spectral_index,
    detect_polygon_area_change,
    export_glaciers_to_geojson
)
import numpy as np


def test_reproject_coordinates():
    x, y = reproject_coordinates(0.0, 0.0, "EPSG:4326", "EPSG:3857")
    assert round(x, 1) == 0.0
    assert round(y, 1) == 0.0


def test_compute_normalized_spectral_index():
    b1 = np.array([[0.8, 0.6], [0.4, 0.2]])
    b2 = np.array([[0.2, 0.2], [0.2, 0.2]])
    idx = compute_normalized_spectral_index(b1, b2)
    assert idx.shape == (2, 2)
    assert round(float(idx[0, 0]), 2) == 0.6  # (0.8 - 0.2) / (0.8 + 0.2) = 0.6


def test_detect_polygon_area_change():
    p1 = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])  # 100
    p2 = Polygon([(0, 0), (5, 0), (5, 10), (0, 10)])    # 50
    diff = detect_polygon_area_change(p1, p2)
    assert diff["status"] == "computed"
    assert diff["initial_area"] == 100.0
    assert diff["latest_area"] == 50.0
    assert diff["net_area_change"] == -50.0
    assert diff["percentage_change"] == -50.0


def test_export_glaciers_to_geojson():
    glaciers = [
        {"id": 1, "short_name": "G1", "country": "CH", "latitude": 46.5, "longitude": 8.5},
        {"id": 2, "short_name": "G2", "country": "US", "latitude": None, "longitude": None},  # should be excluded from features
    ]
    gj = export_glaciers_to_geojson(glaciers)
    assert gj["type"] == "FeatureCollection"
    assert len(gj["features"]) == 1
    feat = gj["features"][0]
    assert feat["geometry"]["coordinates"] == [8.5, 46.5]
    assert feat["properties"]["short_name"] == "G1"
