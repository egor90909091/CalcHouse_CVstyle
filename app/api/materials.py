from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

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


@router.get("/materials", response_model=List[MaterialPrice])
async def get_all_materials(
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """Получение списка всех материалов с ценами"""
    materials = await service.get_all_materials()
    return materials


@router.get("/materials/{category}", response_model=List[MaterialPrice])
async def get_materials_by_category(
    category: str,
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """Получение списка материалов по категории"""
    if category not in ["foundation", "walls", "roof", "options"]:
        raise HTTPException(
            status_code=400, detail=f"Неизвестная категория: {category}"
        )
    materials = await service.get_materials_by_category(category)
    return materials


@router.get("/materials/details/{category}/{type}")
async def get_material_details(
    category: str,
    type: str,
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """Получение детальных данных о составе материалов"""
    try:
        data = await service._load_materials_data()

        if category not in data:
            raise HTTPException(
                status_code=404, detail=f"Категория {category} не найдена"
            )

        if type not in data[category]:
            raise HTTPException(
                status_code=404, detail=f"Тип {type} не найден в категории {category}"
            )

        # Возвращаем детальную информацию, включая подматериалы
        return data[category][type]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update-prices")
async def update_prices(
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """Обновление цен на материалы"""
    result = await service.update_prices()
    return result
