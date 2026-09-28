# -*- coding: utf-8 -*-
"""Endpoints de salud y catálogos base."""

from fastapi import APIRouter

from ..config import settings
from ..schemas import HealthOut

router = APIRouter()


@router.get("/health", response_model=HealthOut, tags=["salud"])
def health() -> HealthOut:
    return HealthOut(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )