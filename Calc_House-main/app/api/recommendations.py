from fastapi import APIRouter, HTTPException

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import RecommendationRequest, RecommendationResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

# [остальной код остается без изменений]
