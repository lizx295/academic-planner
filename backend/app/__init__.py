"""Academic Planner API.

API de respaldo/sincronización para el planificador académico local.
Se sirve para conectar la app (Next.js) con una base PostgreSQL cuando se
usa Docker. Esta primera versión expone endpoints de salud y de "snapshot"
para respaldar los datos; la sincronización completa de materias, tareas,
asistencias y calificaciones llega en una versión futura.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import data, health, semesters

app = FastAPI(
    title="Academic Planner API",
    version="0.1.0",
    description="API local del planificador académico (v1: respaldo y catálogos).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["salud"])
app.include_router(semesters.router, prefix="/api", tags=["semestres"])
app.include_router(data.router, prefix="/api", tags=["datos"])