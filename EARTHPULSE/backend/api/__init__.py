"""
EARTHPULSE API Routers Package
"""
from backend.api.monitoring_routes import router as monitoring_router
from backend.api.agent_routes import router as agent_router
from backend.api.geospatial_routes import router as geospatial_router

__all__ = [
    "monitoring_router",
    "agent_router",
    "geospatial_router",
]
