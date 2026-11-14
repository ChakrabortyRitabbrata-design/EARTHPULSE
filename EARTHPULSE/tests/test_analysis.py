"""
Unit tests for numerical analysis and validation
"""
import pytest
import pandas as pd
from backend.tools.analyze_changes import (
    calculate_metric_change,
    analyze_front_variation,
    analyze_mass_balance,
    analyze_glacier_state,
    validate_dataset_records,
)


def test_calculate_metric_change_insufficient():
    df = pd.DataFrame([{"date": "2022-01-01", "area": 1000}])
    res = calculate_metric_change(df, "area")
    assert res["status"] == "insufficient_observations"


def test_calculate_metric_change_valid():
    df = pd.DataFrame([
        {"date": "2020-01-01", "area": 1000.0},
        {"date": "2022-01-01", "area": 800.0}
    ])
    res = calculate_metric_change(df, "area", unit="m²")
    assert res["status"] == "calculated"
    assert res["initial_value"] == 1000.0
    assert res["latest_value"] == 800.0
    assert res["absolute_change"] == -200.0
    assert res["percentage_change"] == -20.0


def test_analyze_front_variation():
    records = [
        {"glacier_id": 1, "end_date": "2021-01-01", "length_change": -15.5},
        {"glacier_id": 1, "end_date": "2022-01-01", "length_change": -10.0},
        {"glacier_id": 1, "end_date": "2023-01-01", "length_change": 5.0},
    ]
    res = analyze_front_variation(records)
    assert res["status"] == "calculated"
    assert res["cumulative_length_change_m"] == -20.5
    assert res["dynamic_state"] == "RETREAT"
    assert res["retreat_observations"] == 2
    assert res["advance_observations"] == 1


def test_analyze_mass_balance():
    records = [
        {"glacier_id": 1, "year": 2021, "annual_balance": -500},
        {"glacier_id": 1, "year": 2022, "annual_balance": -800},
        {"glacier_id": 1, "year": 2023, "annual_balance": 100},
    ]
    res = analyze_mass_balance(records)
    assert res["status"] == "calculated"
    assert res["cumulative_mass_balance_mm_we"] == -1200.0
    assert res["cumulative_mass_balance_m_we"] == -1.2
    assert res["balance_regime"] == "LOSS"
    assert res["negative_balance_years"] == 2
    assert res["positive_balance_years"] == 1


def test_validate_dataset_records():
    records = [
        {"id": 1, "date": "2022-01-01"},
        {"id": 1, "date": "2022-01-01"},  # duplicate
        {"id": 2, "date": "invalid-date"},
    ]
    val = validate_dataset_records(records, date_col="date")
    assert len(val["issues"]) >= 2
    assert len(val["cleaned_df"]) == 2  # duplicate retained in cleaned or deduplicated, invalid date dropped
