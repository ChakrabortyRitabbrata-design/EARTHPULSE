"""
EARTHPULSE - Backend Application Entrypoint
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.logging_config import logger
from backend.api.monitoring_routes import router as monitoring_router
from backend.api.agent_routes import router as agent_router
from backend.api.geospatial_routes import router as geospatial_router

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered Earth Observation and Cryospheric Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for AtlasX frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(monitoring_router)
app.include_router(agent_router)
app.include_router(geospatial_router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "description": "EARTHPULSE Cryospheric Intelligence API is operational.",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.APP_DEBUG)
