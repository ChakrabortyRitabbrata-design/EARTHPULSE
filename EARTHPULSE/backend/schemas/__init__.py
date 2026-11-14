"""
EARTHPULSE Schemas
"""
from backend.schemas.glacier import GlacierSummary, GlacierDetail, PaginatedGlaciers
from backend.schemas.analysis import AgentQueryRequest, AgentAnalysisResponse, MetricChange, GlacierAnalysisItem
from backend.schemas.quality import OverallQualityReport, DatasetQualityStats
from backend.schemas.modis import (
    ModisDetection,
    ModisPaginatedDetections,
    ModisAnalysisRequest,
    ModisHotspotCluster,
    ModisSummaryResponse,
    ModisAnalysisResponse,
)

__all__ = [
    "GlacierSummary",
    "GlacierDetail",
    "PaginatedGlaciers",
    "AgentQueryRequest",
    "AgentAnalysisResponse",
    "MetricChange",
    "GlacierAnalysisItem",
    "OverallQualityReport",
    "DatasetQualityStats",
    "ModisDetection",
    "ModisPaginatedDetections",
    "ModisAnalysisRequest",
    "ModisHotspotCluster",
    "ModisSummaryResponse",
    "ModisAnalysisResponse",
]
