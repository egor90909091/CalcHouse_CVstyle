from fastapi import APIRouter, HTTPException
import logging
from app.models.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        answer = await ai_service.chat(request)
        return ChatResponse(answer=answer)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Ошибка в chat endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка общения с DeepSeek: {e}",
        )