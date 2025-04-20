from fastapi import APIRouter, HTTPException

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import RecommendationRequest, RecommendationResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Получение ИИ-рекомендаций по строительству на основе параметров
    """
    try:
        # Вызываем сервис для получения рекомендаций
        result = await ai_service.get_recommendations(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Ошибка при получении ИИ-рекомендаций: {str(e)}"
        )
