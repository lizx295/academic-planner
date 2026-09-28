"""Schemas Pydantic para la API (v1).

Modelan los mismos campos que usa la app web para que un futuro endpoint
de sincronización pueda mapear sin fricción.
"""

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field


class HealthOut(BaseModel):
    status: str
    app: str
    version: str
    environment: str


class SemesterIn(BaseModel):
    label: str
    starts_at: date
    ends_at: date
    is_active: bool = False


class SemesterOut(SemesterIn):
    id: str


class ProfileOut(BaseModel):
    name: str = ""
    university: str = ""
    program: str = ""
    student_id: str = ""
    avatar_color: str = "indigo"


class SnapshotIn(BaseModel):
    profile: ProfileOut = Field(default_factory=ProfileOut)
    active_semester_id: str = ""
    semesters: list[SemesterOut] = []
    professors: list[dict] = []
    classrooms: list[dict] = []
    courses: list[dict] = []
    schedules: list[dict] = []
    attendance: list[dict] = []
    tasks: list[dict] = []
    assessments: list[dict] = []
    grades: list[dict] = []
    materials: list[dict] = []
    notion_workspaces: list[dict] = []
    personal_events: list[dict] = []


class SnapshotOut(SnapshotIn):
    id: str
    created_at: datetime
    schema_version: str = "1"