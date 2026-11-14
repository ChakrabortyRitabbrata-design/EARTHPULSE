"""
API Integration tests using FastAPI TestClient
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    assert data["data_directory_exists"] is True


def test_list_glaciers_endpoint():
    r = client.get("/api/v1/glaciers?limit=5")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] > 100000
    assert len(data["items"]) == 5


def test_get_glacier_detail_endpoint():
    # First get an existing ID
    r = client.get("/api/v1/glaciers?country=CH&limit=1")
    gid = r.json()["items"][0]["id"]

    r_det = client.get(f"/api/v1/glaciers/{gid}")
    assert r_det.status_code == 200
    assert r_det.json()["id"] == gid
    assert "observation_summary" in r_det.json()


def test_glacier_detail_not_found():
    r = client.get("/api/v1/glaciers/999999999")
    assert r.status_code == 404


def test_geospatial_glaciers_endpoint():
    r = client.get("/api/v1/geospatial/glaciers?country=CH&limit=10")
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0


def test_data_quality_endpoint():
    r = client.get("/api/v1/data/quality")
    assert r.status_code == 200
    data = r.json()
    assert data["total_datasets_monitored"] > 0
    assert "glacier.csv" in data["datasets"]
