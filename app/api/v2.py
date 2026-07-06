"""
API v2 — калькулятор на основе рисования плана дома.

Эндпоинты:
  POST /api/v2/geometry/compute    — геометрия (периметр, площади, кровля)
  POST /api/v2/materials/calculate — полная смета материалов от геометрии
  GET  /api/v2/materials           — каталог материалов (legacy-совместимый)
"""

import json
import os
from typing import Dict

from fastapi import APIRouter, HTTPException
from pathlib import Path

from app.models.project import Project, GeometryResult, MaterialsResult
from app.services.geometry_service import compute_geometry
from app.services.materials_service_v2 import MaterialsServiceV2

router = APIRouter()


@router.post("/geometry/compute", response_model=GeometryResult)
async def geometry_compute(project: Project) -> GeometryResult:
    """
    Вычислить геометрию проекта: периметр, площадь застройки,
    метрики каждой стены (с вычетом проёмов), длину фундамента,
    геометрию кровли и перекрытий.
    """
    try:
        return compute_geometry(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/materials/calculate", response_model=MaterialsResult)
async def materials_calculate(project: Project) -> MaterialsResult:
    """
    Полный расчёт материалов от точной геометрии проекта.
    Возвращает спецификацию по разделам (фундамент, стены, перекрытия,
    кровля) с количествами, ценами и итоговой сметой.
    """
    try:
        svc = MaterialsServiceV2()
        return svc.calculate(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materials")
async def materials_catalog() -> Dict:
    """Каталог материалов и цен."""
    path = Path(__file__).resolve().parent.parent / "static" / "data" / "materials.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Каталог материалов не найден")
    with open(path, encoding="utf-8") as f:
        return json.load(f)
