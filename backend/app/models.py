"""Modelos SQLAlchemy.

Reflejan el dominio de la app (semestres, materias, horarios, asistencia,
tareas, evaluaciones, calificaciones, materiales, workspaces y eventos
personales). Los `id` son cadenas (uuid4) para mantener compatibilidad
con el formato de ids que genera la app web.
"""

from datetime import date, datetime, time
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def gen_id() -> str:
    return str(uuid4())


class Semester(Base):
    __tablename__ = "semesters"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    label: Mapped[str] = mapped_column(String(80))
    starts_at: Mapped[date] = mapped_column(Date)
    ends_at: Mapped[date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    courses: Mapped[list["Course"]] = relationship(back_populates="semester")


class Professor(Base):
    __tablename__ = "professors"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), default="")
    title: Mapped[str] = mapped_column(String(40), default="")


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String(80))
    building: Mapped[str] = mapped_column(String(80), default="")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    semester_id: Mapped[str] = mapped_column(ForeignKey("semesters.id"))
    code: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(140))
    professor_id: Mapped[str] = mapped_column(String(40), default="")
    classroom_id: Mapped[str] = mapped_column(String(40), default="")
    color: Mapped[str] = mapped_column(String(20), default="indigo")
    credits: Mapped[int] = mapped_column(Integer, default=5)
    notion_url: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)

    semester: Mapped[Semester] = relationship(back_populates="courses")
    schedules: Mapped[list["CourseSchedule"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )


class CourseSchedule(Base):
    __tablename__ = "course_schedules"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    weekday: Mapped[int] = mapped_column(Integer)  # 1=lunes ... 0=domingo
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    course: Mapped[Course] = relationship(back_populates="schedules")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    schedule_id: Mapped[str] = mapped_column(String(40))
    date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    response_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    due_date: Mapped[date] = mapped_column(Date)
    due_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    status: Mapped[str] = mapped_column(String(14), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(20), default="exam")
    date: Mapped[date] = mapped_column(Date)
    time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=20.0)
    status: Mapped[str] = mapped_column(String(16), default="upcoming")


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE")
    )
    course_id: Mapped[str] = mapped_column(String(40))
    score: Mapped[float] = mapped_column(Float)
    note: Mapped[str] = mapped_column(Text, default="")


class AppNotification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    kind: Mapped[str] = mapped_column(String(24), default="system")
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    ref_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)


class NotionWorkspace(Base):
    __tablename__ = "notion_workspaces"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[str] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(200))
    page_url: Mapped[str] = mapped_column(String(400))
    integration: Mapped[str] = mapped_column(String(12), default="manual")
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(12), default="pdf")
    url: Mapped[str] = mapped_column(String(400))


class PersonalEvent(Base):
    __tablename__ = "personal_events"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=gen_id)
    title: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)