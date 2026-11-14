"""
Unit tests for LangGraph glacier intelligence agent
"""
import pytest
from unittest.mock import patch
from backend.agent.workflow import run_glacier_agent


def test_agent_invalid_dates():
    res = run_glacier_agent(
        query="Analyse changes",
        start_date="2025-01-01",
        end_date="2020-01-01"
    )
    assert res["status"] == "error"
    assert "Invalid date range" in res["report"]


def test_agent_deterministic_run(monkeypatch):
    # Ensure deterministic execution without requiring external LLM network call
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    res = run_glacier_agent(
        query="Analyse front variation in Switzerland between 2022 and 2024",
        country="CH",
        start_date="2022-01-01",
        end_date="2024-12-31"
    )
    assert res["status"] == "success"
    assert res["glaciers_analyzed"] > 0
    assert "front_variation" in res["analysis_results"]
    assert "Executive Summary" in res["report"]
