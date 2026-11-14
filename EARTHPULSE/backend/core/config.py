"""
EARTHPULSE - Core Configuration
"""
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # App
    APP_NAME: str = "EARTHPULSE"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Gemini / LLM
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Datasets
    DATA_DIR: Path = PROJECT_ROOT / "data" / "raw" / "glacier_data" / "data"
    MODIS_DATA_DIR: Path = PROJECT_ROOT / "data" / "raw" / "thermal_anomaly"
    VECTOR_STORE_DIR: Path = PROJECT_ROOT / "data" / "vector_store"

    @property
    def resolved_modis_data_dir(self) -> Path:
        """Returns the active MODIS thermal anomaly dataset directory."""
        return self.MODIS_DATA_DIR

    # Default Observation Period
    DEFAULT_START_DATE: str = "2022-01-01"
    DEFAULT_END_DATE: str = "2025-12-31"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_clean_gemini_model(self) -> str:
        """Returns a standardized model identifier for langchain-google-genai."""
        model = (self.GEMINI_MODEL or "").strip().strip('"').strip("'")
        if not model:
            return "gemini-3.6-flash"
        # Standardize spaces to dashes and lowercase (e.g. 'Gemini 3.6 Flash' -> 'gemini-3.6-flash')
        clean = model.lower().replace(" ", "-")
        return clean

    def get_clean_google_api_key(self) -> Optional[str]:
        if not self.GOOGLE_API_KEY:
            return None
        return self.GOOGLE_API_KEY.strip().strip('"').strip("'")


settings = Settings()
