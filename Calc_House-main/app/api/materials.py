from fastapi import APIRouter, HTTPException
from typing import List

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import (
    MaterialPrice,
    WallMaterial,
    FoundationType,
    RoofType,
    MaterialsCalculatorInput,
    MaterialsCalculationResult,
)
from app.services.materials_service import MaterialsService

router = APIRouter()
materials_service = MaterialsService()

# [остальной код остается без изменений]
