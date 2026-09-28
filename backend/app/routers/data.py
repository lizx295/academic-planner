"""Respaldos (snapshots).

Permite subir y descargar un respaldo completo del planificador en JSON.
Las tablas se crean al arrancar (ver main.py) cuando el entorno es
development; en producción se prefiere Alembic.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.orm import Session

from ..database import Base, get_db
from ..schemas import SnapshotIn, SnapshotOut

router = APIRouter()


class SnapshotRow(Base):
    __tablename__ = "data_snapshots"

    id: Column[str] = Column(String(40), primary_key=True)
    created_at: Column[datetime] = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    schema_version: Column[str] = Column(String(8), default="1")
    payload: Column[str] = Column(Text)


@router.post("/data/snapshot", response_model=SnapshotOut, status_code=201)
def save_snapshot(payload: SnapshotIn, db: Session = Depends(get_db)) -> SnapshotOut:
    row = SnapshotRow(
        id=str(uuid.uuid4()),
        schema_version="1",
        payload=json.dumps(payload.model_dump(), default=str),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SnapshotOut(
        id=row.id,
        created_at=row.created_at,
        schema_version=row.schema_version,
        **json.loads(row.payload),
    )


@router.get("/data/snapshots/latest", response_model=SnapshotOut)
def latest_snapshot(db: Session = Depends(get_db)) -> SnapshotOut:
    row = db.query(SnapshotRow).order_by(SnapshotRow.created_at.desc()).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Aún no hay respaldos")
    return SnapshotOut(
        id=row.id,
        created_at=row.created_at,
        schema_version=row.schema_version,
        **json.loads(row.payload),
    )