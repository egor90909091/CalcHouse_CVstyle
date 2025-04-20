from fastapi import APIRouter, Depends, HTTPException

from app.models.calculator import (
    CalculatorInput,
    CalculationResult,
    RecommendationRequest,
    RecommendationResponse,
    MaterialsCalculatorInput,
    MaterialsCalculationResult,
)
from app.services.calculator_service import CalculatorService
from app.services.ai_service import AIService
from app.services.materials_service import MaterialsService
from app.api.recommendations import get_recommendations as ai_recommendations_endpoint

router = APIRouter(prefix="/api")

# Создание экземпляров сервисов
calculator_service = CalculatorService()
ai_service = AIService()
materials_service = MaterialsService()


@router.post("/calculate", response_model=CalculationResult)
async def calculate(data: CalculatorInput):
    """
    Расчет стоимости строительства на основе входных данных
    """
    try:
        result = await calculator_service.calculate(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при расчете: {str(e)}")


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Получение рекомендаций по оптимизации проекта
    """
    try:
        # Используем функцию из модуля рекомендаций
        return await ai_recommendations_endpoint(request)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Ошибка при получении рекомендаций: {str(e)}"
        )


@router.post("/calculate-materials", response_model=MaterialsCalculationResult)
async def calculate_materials(data: MaterialsCalculatorInput):
    """
    Расчет необходимых строительных материалов на основе входных данных
    """
    try:
        result = await materials_service.calculate_materials(data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Ошибка при расчете материалов: {str(e)}"
        )
