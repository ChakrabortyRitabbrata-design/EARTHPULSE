"""
Data Quality Schemas
"""
from typing import Dict, Any, List
from pydantic import BaseModel


class DatasetQualityStats(BaseModel):
    dataset_name: str
    total_records: int
    date_coverage_min: str = "N/A"
    date_coverage_max: str = "N/A"
    records_in_default_period_2022_2025: int = 0
    missing_critical_fields: Dict[str, int] = {}
    duplicate_records: int = 0


class OverallQualityReport(BaseModel):
    timestamp: str
    dataset_directory: str
    datasets: Dict[str, DatasetQualityStats]
    notes: List[str] = []
