"""
EARTHPULSE - Monitoring & Data Quality API Routes
"""
from fastapi import APIRouter
from backend.core.config import settings
from backend.tools.retrieve_satellite_data import get_wgms_quality_stats
from backend.schemas.quality import OverallQualityReport, DatasetQualityStats

router = APIRouter(tags=["Monitoring & Quality"])


@router.get("/health")
@router.get("/api/health")
@router.get("/api/v1/health")
def health_check():
    """Returns system status, active environment, and data readiness."""
    data_dir_exists = settings.DATA_DIR.exists()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "data_directory_configured": str(settings.DATA_DIR),
        "data_directory_exists": data_dir_exists,
        "llm_model": settings.get_clean_gemini_model(),
        "llm_configured": bool(settings.get_clean_google_api_key()),
    }


@router.get("/api/v1/data/quality")
def data_quality_summary():
    """Returns comprehensive empirical data quality and coverage stats across WGMS datasets."""
    stats = get_wgms_quality_stats()
    return {
        "dataset_directory": str(settings.DATA_DIR),
        "total_datasets_monitored": len(stats),
        "datasets": stats,
        "notes": [
            "WGMS datasets contain historical observations through late 2024.",
            "2025 observations are pending international compilation and verification.",
            "Missing values are preserved as gaps rather than zero-filled."
        ]
    }
