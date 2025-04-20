import asyncio
import os
import sys

# Добавляем текущую директорию в путь, чтобы модули находились
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import AIService
from app.models.calculator import (
    RecommendationRequest,
    CalculatorInput,
    FoundationType,
    WallMaterial,
    RoofType,
)


async def main():
    print("Инициализация AI сервиса...")
    service = AIService()

    # Создаем тестовый запрос
    request = RecommendationRequest(
        calculator_data=CalculatorInput(
            area=150.0,
            foundation_type=FoundationType.STRIP,
            wall_material=WallMaterial.BRICK,
            floors=2,
            roof_type=RoofType.METAL,
            additional_options=[],
        ),
        budget=3000000.0,
        priority="cost",
    )

    print("Запрос рекомендаций...")
    response = await service.get_recommendations(request)

    print("\nПолучены рекомендации:")
    print(f"Сводка: {response.summary}")
    print("\nДетальные рекомендации:")

    for i, rec in enumerate(response.recommendations, 1):
        print(f"\n{i}. {rec.title}")
        print(f"   Описание: {rec.description}")
        print(f"   Эффект: {rec.impact}")
        if rec.estimated_savings is not None:
            print(f"   Ориентировочная экономия: {rec.estimated_savings}%")


if __name__ == "__main__":
    asyncio.run(main())
