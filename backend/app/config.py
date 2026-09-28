"""Configuración de la API.

Las variables se leen desde el entorno (o un archivo `.env` junto a la
raíz del backend). `DATABASE_URL` apunta a PostgreSQL por defecto porque
la app se diseñó para correr con Docker Compose.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="AP_")

    app_name: str = "Académico API"
    app_version: str = "0.1.0"
    environment: str = "development"

    database_url: str = (
        "postgresql+psycopg://planner:planner@localhost:5432/academic_planner"
    )

    # Orígenes permitidos para CORS (la app Next se sirve en :3000).
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()