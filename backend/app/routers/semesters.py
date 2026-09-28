"""Endpoints base del catálogo de semestres."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Semester
from ..schemas import SemesterIn, SemesterOut

router = APIRouter()


@router.get("/semesters", response_model=list[SemesterOut])
def list_semesters(db: Session = Depends(get_db)) -> list[Semester]:
    return list(db.scalars(select(Semester).order_by(Semester.starts_at)))


@router.post("/semesters", response_model=SemesterOut, status_code=201)
def create_semester(payload: SemesterIn, db: Session = Depends(get_db)) -> Semester:
    semester = Semester(**payload.model_dump())
    if payload.is_active:
        active = db.scalars(select(Semester).where(Semester.is_active.is_(True)))
        for row in active:
            row.is_active = False
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


@router.get("/semesters/{semester_id}", response_model=SemesterOut)
def get_semester(semester_id: str, db: Session = Depends(get_db)) -> Semester:
    semester = db.get(Semester, semester_id)
    if semester is None:
        raise HTTPException(status_code=404, detail="Semestre no encontrado")
    return semester