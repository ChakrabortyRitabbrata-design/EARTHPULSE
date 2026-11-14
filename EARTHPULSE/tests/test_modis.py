"""
EARTHPULSE - MODIS Thermal Anomaly Pipeline Test Suite
Tests inventory discovery, retrieval, validation, analysis, clustering,
GeoJSON conversion, agent integration, and FastAPI endpoints.
"""
import pytest
from fastapi.testclient import TestClient
import pandas as pd

from backend.main import app
from backend.tools.retrieve_modis_data import (
    discover_modis_inventory,
    get_available_countries,
    get_modis_inventory_summary,
    get_modis_detections,
    load_modis_dataframe,
)
from backend.tools.validate_modis_data import validate_modis_records
from backend.tools.analyze_modis import (
    analyze_modis_data,
    identify_hotspot_clusters,
)
from backend.geospatial.modis_processor import (
    modis_detections_to_geojson,
    modis_hotspots_to_geojson,
    filter_modis_by_bbox,
)
from backend.agent.graph import glacier_agent


client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Inventory & Discovery Tests
# ---------------------------------------------------------------------------
def test_modis_inventory_discovery():
    """Verifies that MODIS CSV files from both 2024 and 2025 are indexed."""
    inventory = discover_modis_inventory()
    assert isinstance(inventory, dict)
    assert inventory["total_files"] >= 400, "Expected at least 400 MODIS CSV files indexed."
    assert 2024 in inventory["files_by_year"] and 2025 in inventory["files_by_year"]
    assert len(inventory["countries"]) >= 200

    countries = get_available_countries()
    assert "Singapore" in countries, "Singapore should be indexed in available countries."


def test_modis_inventory_summary():
    """Checks the overview statistics of available MODIS data."""
    summary = get_modis_inventory_summary()
    assert summary["total_files"] >= 400
    assert summary["total_countries_indexed"] >= 200
    assert 2024 in summary["available_years"]
    assert 2025 in summary["available_years"]
    assert len(summary["notes"]) >= 2


# ---------------------------------------------------------------------------
# 2. Data Retrieval & Filtering Tests
# ---------------------------------------------------------------------------
def test_retrieve_singapore_detections():
    """Tests retrieval for Singapore with pagination and standardization."""
    res_2025 = get_modis_detections(country="Singapore", year=2025)
    assert res_2025["country"] == "Singapore"
    assert res_2025["total"] >= 2
    assert len(res_2025["items"]) >= 2
    assert len(res_2025["records"]) >= 2

    # Check standardized attributes
    first = res_2025["items"][0]
    for key in ["latitude", "longitude", "brightness", "confidence", "frp", "satellite", "type"]:
        assert key in first, f"Missing key {key} in detection record."

    assert first["country"] == "Singapore"
    assert first["year"] == 2025


def test_retrieve_with_filters():
    """Tests filtering by satellite."""
    res = get_modis_detections(country="Singapore", year=2025, satellite="Aqua")
    assert isinstance(res["items"], list)
    for rec in res["items"]:
        assert rec["satellite"] == "Aqua"


# ---------------------------------------------------------------------------
# 3. Data Validation Tests
# ---------------------------------------------------------------------------
def test_validate_modis_data_clean_and_corrupt():
    """Tests data validation logic with both genuine and synthetic anomaly records."""
    res = get_modis_detections(country="Singapore", year=2025)
    records = list(res["items"])

    # Inject an intentionally corrupt record
    corrupt_record = {
        "latitude": 95.0,  # Invalid latitude > 90
        "longitude": 103.8,
        "brightness": -10.0,  # Negative Kelvin
        "confidence": 150,  # Invalid confidence > 100
        "frp": -5.0,  # Negative FRP
        "acq_date": "invalid-date",
        "satellite": "UnknownSat",
        "type": 99  # Unexpected classification
    }
    records.append(corrupt_record)

    validation_res = validate_modis_records(records)
    summary = validation_res["summary"]
    issues = validation_res["quality_issues"]

    assert summary["total_records"] == len(records)
    assert summary["invalid_coordinates"] >= 1
    assert summary["invalid_brightness"] >= 1
    assert summary["invalid_frp"] >= 1
    assert summary["invalid_confidence"] >= 1
    assert summary["invalid_dates"] >= 1
    assert summary["unexpected_types"] >= 1
    assert len(issues) > 0


# ---------------------------------------------------------------------------
# 4. Statistical Analysis Tests
# ---------------------------------------------------------------------------
def test_modis_analysis_pipeline():
    """Tests multi-dimensional analysis on Singapore dataset."""
    df = load_modis_dataframe(country="Singapore")
    assert not df.empty, "Singapore DataFrame should not be empty."

    analysis = analyze_modis_data(df, include_clustering=False)
    assert analysis["status"] == "success"
    assert analysis["total_detections"] == len(df)

    # Geographic
    geo = analysis["geographic_analysis"]
    assert "bounding_box" in geo
    assert "spatial_center" in geo

    # Temporal
    temp = analysis["temporal_analysis"]
    assert "yearly_counts" in temp
    assert "day_night_breakdown" in temp

    # Thermal
    therm = analysis["thermal_analysis"]
    assert "brightness_stats" in therm
    assert "frp_stats" in therm
    assert "confidence_stats" in therm
    assert "inferred_source_types" in therm

    # Cautions
    assert len(analysis["scientific_cautions"]) >= 3


# ---------------------------------------------------------------------------
# 5. Hotspot Clustering Tests (DBSCAN)
# ---------------------------------------------------------------------------
def test_hotspot_clustering_synthetic():
    """Tests DBSCAN spatial clustering with synthetic co-located detections."""
    synthetic_records = [
        {"latitude": 1.3001, "longitude": 103.8001, "brightness": 320.0, "frp": 25.0, "acq_date": "2025-01-01", "type": 2},
        {"latitude": 1.3002, "longitude": 103.8003, "brightness": 325.0, "frp": 30.0, "acq_date": "2025-01-02", "type": 2},
        {"latitude": 1.3005, "longitude": 103.8002, "brightness": 315.0, "frp": 20.0, "acq_date": "2025-01-03", "type": 2},
        {"latitude": 1.3003, "longitude": 103.8004, "brightness": 330.0, "frp": 40.0, "acq_date": "2025-01-04", "type": 2},
        # Outlier far away
        {"latitude": 10.000, "longitude": 80.0000, "brightness": 310.0, "frp": 10.0, "acq_date": "2025-01-01", "type": 0},
    ]
    df_syn = pd.DataFrame(synthetic_records)
    clusters = identify_hotspot_clusters(df_syn, eps_km=10.0, min_samples=3)

    assert len(clusters) == 1, "Expected exactly 1 dense cluster from synthetic data."
    cluster = clusters[0]
    assert cluster["detection_count"] == 4
    assert cluster["total_frp_mw"] == pytest.approx(115.0, abs=0.1)
    assert cluster["persistence_days"] >= 3
    assert cluster["dominant_type"] == 2


# ---------------------------------------------------------------------------
# 6. GeoJSON Generation Tests
# ---------------------------------------------------------------------------
def test_modis_geojson_conversion():
    """Tests converting MODIS detections to GeoJSON FeatureCollections."""
    res = get_modis_detections(country="Singapore", year=2025)
    records = res["items"]

    geojson = modis_detections_to_geojson(records)
    assert geojson["type"] == "FeatureCollection"
    assert "features" in geojson
    assert len(geojson["features"]) == len(records)

    first_feat = geojson["features"][0]
    assert first_feat["geometry"]["type"] == "Point"
    assert len(first_feat["geometry"]["coordinates"]) == 2
    # Longitude first, latitude second in GeoJSON standard
    assert first_feat["geometry"]["coordinates"][0] == first_feat["properties"]["longitude"]
    assert first_feat["geometry"]["coordinates"][1] == first_feat["properties"]["latitude"]


def test_modis_geojson_bbox_filtering():
    """Tests spatial bounding box filtering."""
    res = get_modis_detections(country="Singapore", year=2025)
    records = res["items"]
    geojson = modis_detections_to_geojson(records)

    # Filter with tight bounding box containing Singapore
    filtered = filter_modis_by_bbox(geojson, min_lon=103.0, min_lat=1.0, max_lon=104.5, max_lat=2.0)
    assert len(filtered["features"]) > 0

    # Filter with bounding box far away
    empty_filtered = filter_modis_by_bbox(geojson, min_lon=-50.0, min_lat=-50.0, max_lon=-40.0, max_lat=-40.0)
    assert len(empty_filtered["features"]) == 0


# ---------------------------------------------------------------------------
# 7. FastAPI Endpoint Integration Tests
# ---------------------------------------------------------------------------
def test_api_modis_summary():
    response = client.get("/api/v1/modis/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_countries_indexed" in data
    assert "available_years" in data
    assert 2024 in data["available_years"]
    assert 2025 in data["available_years"]


def test_api_modis_countries():
    response = client.get("/api/v1/modis/countries")
    assert response.status_code == 200
    data = response.json()
    assert "countries" in data
    assert "Singapore" in data["countries"]


def test_api_modis_detections():
    response = client.get("/api/v1/modis/detections?country=Singapore&year=2025&page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["country"] == "Singapore"
    assert data["year"] == 2025
    assert "items" in data
    assert len(data["items"]) >= 2


def test_api_modis_analyze_endpoint():
    payload = {
        "country": "Singapore",
        "year": 2025,
        "include_clustering": False
    }
    response = client.post("/api/v1/modis/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_detections"] >= 2
    assert "geographic_analysis" in data
    assert "thermal_analysis" in data
    assert "scientific_cautions" in data


def test_api_modis_geojson_endpoint():
    response = client.get("/api/v1/modis/geojson?country=Singapore&year=2025")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 2


# ---------------------------------------------------------------------------
# 8. LangGraph Agent Integration Test
# ---------------------------------------------------------------------------
def test_modis_agent_routing_and_execution():
    """Verifies that queries mentioning MODIS/thermal anomalies route correctly through the agent."""
    query = "Analyze MODIS thermal anomaly detections in Singapore for 2025"
    initial_state = {
        "query": query,
        "country": "Singapore",
        "modis_year": 2025,
        "warnings": []
    }
    result = glacier_agent.invoke(initial_state)
    assert result["status"] == "completed"
    resp = result["structured_response"]
    assert resp["domain"] == "modis"
    assert resp["status"] == "success"
    assert "modis" in resp["datasets_used"]
    assert "modis_analysis" in resp["analysis_results"]
    assert len(resp["report"]) > 0
    assert "MODIS" in resp["report"]
