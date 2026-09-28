"""Conexión a la base de datos (SQLAlchemy 2.x, estilo moderno).

Se usa `sessionmaker` y un `SessionLocal` por request. PostgreSQL es el
motor objetivo (ver docker-compose.yml); SQLite puede usarse para pruebas
cambiando `AP_DATABASE_URL`.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Base declarativa común para todos los modelos."""


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI que entrega una sesión y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()