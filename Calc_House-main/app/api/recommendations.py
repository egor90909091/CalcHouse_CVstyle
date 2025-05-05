from fastapi import APIRouter, HTTPException
import logging

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import RecommendationRequest, RecommendationResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

logger = logging.getLogger(__name__)


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Получение ИИ-рекомендаций по строительству на основе параметров
    """
    try:
        # Логирование запроса
        logger.info(
            f"Получен запрос на рекомендации для дома площадью {request.calculator_data.area} м²"
        )

        # Получаем рекомендации
        response = await ai_service.get_recommendations(request)

        # Логируем полученные рекомендации для отладки
        logger.info(
            f"Подготовлено {len(response.recommendations)} рекомендаций, общая длина: {sum(len(r.description or '') for r in response.recommendations)} символов"
        )
        for i, rec in enumerate(response.recommendations):
            logger.info(
                f"Рекомендация {i+1}: Категория: {getattr(rec, 'category', 'Нет категории')}, Заголовок: {rec.title}, Длина описания: {len(rec.description or '')}"
            )

        return response
    except Exception as e:
        logger.error(f"Ошибка при получении рекомендаций: {str(e)}")
        logger.exception(e)
        raise HTTPException(
            status_code=500, detail=f"Ошибка при получении ИИ-рекомендаций: {str(e)}"
        )
