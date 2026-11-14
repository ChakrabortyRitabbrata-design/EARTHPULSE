"""
Unit tests for WGMS glacier dataset retrieval
"""
import pytest
from backend.tools.retrieve_satellite_data import (
    get_glaciers_metadata,
    get_glacier_by_id,
    get_glacier_state,
    get_front_variation,
    get_mass_balance,
    get_glacier_events,
    get_agencies,
    get_wgms_quality_stats,
)


def test_get_glaciers_metadata():
    res = get_glaciers_metadata(limit=10)
    assert res["total"] > 100000
    assert len(res["items"]) == 10
    first = res["items"][0]
    assert "id" in first
    assert "country" in first


def test_get_glaciers_country_filter():
    res = get_glaciers_metadata(country="CH", limit=5)
    assert res["total"] > 1000
    for g in res["items"]:
        assert g["country"] == "CH"


def test_get_glacier_by_id():
    # Lookup first glacier
    all_g = get_glaciers_metadata(limit=1)
    gid = all_g["items"][0]["id"]
    detail = get_glacier_by_id(gid)
    assert detail is not None
    assert detail["id"] == gid
    assert "observation_summary" in detail


def test_get_mass_balance_date_filtering():
    res = get_mass_balance(start_date="2022-01-01", end_date="2024-12-31", limit=20)
    assert res["total"] > 0
    for r in res["records"]:
        assert 2022 <= r["year"] <= 2024


def test_get_front_variation_filtering():
    res = get_front_variation(start_date="2020-01-01", end_date="2024-12-31", limit=10)
    assert res["total"] > 0
    assert len(res["records"]) <= 10


def test_get_glacier_events():
    res = get_glacier_events(limit=5)
    assert res["total"] > 0
    assert len(res["records"]) <= 5


def test_wgms_quality_stats():
    stats = get_wgms_quality_stats()
    assert "glacier.csv" in stats
    assert "mass_balance.csv" in stats
    assert stats["glacier.csv"]["total_records"] > 200000
