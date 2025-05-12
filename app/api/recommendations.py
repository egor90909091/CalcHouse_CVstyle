from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
import logging
from uuid import uuid4

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import RecommendationRequest, RecommendationResponse
from app.services.ai_service import AIService
from app.services.session_service import get_session_service, SessionService

router = APIRouter()
# Создаем экземпляр AIService, но не запускаем worker автоматически
ai_service = AIService()

logger = logging.getLogger(__name__)


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    session_service: SessionService = Depends(get_session_service),
):
    """
    Получение ИИ-рекомендаций по строительству на основе параметров
    """
    try:
        # Получаем или создаем идентификатор сессии пользователя
        session_id = session_service.get_or_create_session_id(http_request)

        # Генерируем уникальный идентификатор запроса
        request_id = str(uuid4())

        # Логирование запроса
        logger.info(
            f"Получен запрос [{request_id}] на рекомендации для пользователя {session_id}, "
            f"дом площадью {request.calculator_data.area} м²"
        )

        # Получаем рекомендации
        response = await ai_service.get_recommendations(request)

        # Логируем полученные рекомендации для отладки
        logger.info(
            f"Для запроса [{request_id}] подготовлено {len(response.recommendations)} рекомендаций, "
            f"общая длина: {sum(len(r.description or '') for r in response.recommendations)} символов"
        )

        # Добавляем задачу для асинхронного сохранения истории запросов пользователя
        background_tasks.add_task(
            session_service.save_request_history,
            session_id,
            request_id,
            request,
            response,
        )

        return response
    except Exception as e:
        logger.error(f"Ошибка при получении рекомендаций: {str(e)}")
        logger.exception(e)
        raise HTTPException(
            status_code=500, detail=f"Ошибка при получении ИИ-рекомендаций: {str(e)}"
        )
