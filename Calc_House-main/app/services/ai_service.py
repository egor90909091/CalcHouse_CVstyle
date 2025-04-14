import json
import os
import logging
from typing import Dict, List, Optional
from pathlib import Path
import requests
from dotenv import load_dotenv
from ..models.calculator import (
    RecommendationRequest,
    RecommendationResponse,
    Recommendation,
)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения из .env файла
load_dotenv()

# Инициализация параметров DeepSeek API
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


class AIService:
    """Сервис для работы с ИИ-рекомендациями через DeepSeek API"""

    def __init__(self):
        # Путь к файлу с заглушками рекомендаций (на случай отсутствия API ключа)
        self.fallback_data_path = (
            Path(__file__).parent.parent
            / "static"
            / "data"
            / "recommendations_fallback.json"
        )
        self.ensure_fallback_data()

        # Проверка наличия API ключа при инициализации
        if not DEEPSEEK_API_KEY:
            logger.warning(
                "API ключ DeepSeek не найден в .env файле. Будут использованы заглушки."
            )
        else:
            logger.info("Сервис AI инициализирован с DeepSeek API")

    def ensure_fallback_data(self):
        """Создание файла с заглушками рекомендаций"""
        data_dir = Path(__file__).parent.parent / "static" / "data"
        os.makedirs(data_dir, exist_ok=True)

        if not self.fallback_data_path.exists():
            fallback_data = {
                "general": [
                    {
                        "title": "Оптимизация планировки",
                        "description": "Рассмотрите более компактную планировку для снижения затрат на материалы и отопление.",
                        "impact": "Снижение стоимости строительства на 5-10%",
                        "estimated_savings": 7.5,
                    },
                    {
                        "title": "Энергоэффективность",
                        "description": "Инвестируйте в качественную теплоизоляцию стен, пола и кровли.",
                        "impact": "Снижение затрат на отопление на 20-30% ежегодно",
                        "estimated_savings": 0,
                    },
                    {
                        "title": "Сезонность строительства",
                        "description": "Планируйте основные работы на весну-лето для ускорения строительства.",
                        "impact": "Сокращение сроков строительства на 15-20%",
                        "estimated_savings": 0,
                    },
                ],
                "foundation": {
                    "strip": [
                        {
                            "title": "Оптимизация ленточного фундамента",
                            "description": "Используйте технологию несъемной опалубки для ленточного фундамента.",
                            "impact": "Ускорение строительства на 20%, экономия на трудозатратах",
                            "estimated_savings": 10,
                        }
                    ],
                    "pile": [
                        {
                            "title": "Выбор свай",
                            "description": "Рассмотрите использование винтовых свай вместо буронабивных для легких конструкций.",
                            "impact": "Экономия до 15% на работах по установке фундамента",
                            "estimated_savings": 15,
                        }
                    ],
                    "slab": [
                        {
                            "title": "Оптимизация плитного фундамента",
                            "description": "Используйте монолитную плиту с утепленной шведской плитой (УШП) для повышения энергоэффективности.",
                            "impact": "Экономия на отоплении до 15% ежегодно",
                            "estimated_savings": 0,
                        }
                    ],
                    "column": [
                        {
                            "title": "Усиление столбчатого фундамента",
                            "description": "Для повышения устойчивости используйте армирование и ростверк.",
                            "impact": "Повышение надежности конструкции",
                            "estimated_savings": 0,
                        }
                    ],
                },
                "walls": {
                    "brick": [
                        {
                            "title": "Выбор кирпича",
                            "description": "Рассмотрите поризованные керамические блоки вместо обычного кирпича.",
                            "impact": "Снижение затрат на теплоизоляцию до 20%",
                            "estimated_savings": 20,
                        }
                    ],
                    "wood": [
                        {
                            "title": "Оптимизация деревянных стен",
                            "description": "Используйте клееный брус вместо обычного для снижения теплопотерь и усадки.",
                            "impact": "Снижение затрат на отделку и утепление до 15%",
                            "estimated_savings": 15,
                        }
                    ],
                    "block": [
                        {
                            "title": "Выбор блоков",
                            "description": "Рассмотрите газобетонные блоки для лучшей теплоизоляции и легкости монтажа.",
                            "impact": "Ускорение строительства на 15-20%, экономия на утеплении",
                            "estimated_savings": 15,
                        }
                    ],
                    "concrete": [
                        {
                            "title": "Монолитные стены",
                            "description": "Используйте несъемную опалубку для ускорения процесса.",
                            "impact": "Ускорение строительства на 25-30%",
                            "estimated_savings": 0,
                        }
                    ],
                    "panel": [
                        {
                            "title": "Оптимизация панельного строительства",
                            "description": "Заказывайте панели с предустановленной электропроводкой и утеплителем.",
                            "impact": "Сокращение сроков строительства на 30-40%",
                            "estimated_savings": 0,
                        }
                    ],
                },
                "roof": {
                    "metal": [
                        {
                            "title": "Металлочерепица",
                            "description": "Выбирайте металлочерепицу с толщиной стали не менее 0.5 мм для долговечности.",
                            "impact": "Увеличение срока службы кровли",
                            "estimated_savings": 0,
                        }
                    ],
                    "tile": [
                        {
                            "title": "Керамическая черепица",
                            "description": "Убедитесь, что стропильная система рассчитана на повышенную нагрузку от керамической черепицы.",
                            "impact": "Предотвращение проблем с конструкцией крыши",
                            "estimated_savings": 0,
                        }
                    ],
                    "shingle": [
                        {
                            "title": "Гибкая черепица",
                            "description": "Используйте качественную подкровельную гидроизоляцию для предотвращения протечек.",
                            "impact": "Снижение рисков повреждения внутренней отделки",
                            "estimated_savings": 0,
                        }
                    ],
                    "slate": [
                        {
                            "title": "Шифер",
                            "description": "Рассмотрите современные материалы вместо асбестосодержащего шифера.",
                            "impact": "Улучшение экологичности и долговечности",
                            "estimated_savings": 0,
                        }
                    ],
                    "flat": [
                        {
                            "title": "Плоская кровля",
                            "description": "Используйте качественную гидроизоляцию и продумайте систему водоотведения.",
                            "impact": "Предотвращение протечек и увеличение срока службы",
                            "estimated_savings": 0,
                        }
                    ],
                },
                "floors": {
                    "1": [
                        {
                            "title": "Одноэтажный дом",
                            "description": "Рассмотрите возможность увеличения площади за счет чердачного пространства.",
                            "impact": "Увеличение полезной площади при минимальных затратах",
                            "estimated_savings": 15,
                        }
                    ],
                    "2": [
                        {
                            "title": "Двухэтажный дом",
                            "description": "Оптимизируйте расположение лестницы для экономии пространства.",
                            "impact": "Увеличение полезной площади на 5-7%",
                            "estimated_savings": 0,
                        }
                    ],
                    "3": [
                        {
                            "title": "Трехэтажный дом",
                            "description": "Уделите особое внимание фундаменту и несущим конструкциям.",
                            "impact": "Предотвращение проблем с несущей способностью",
                            "estimated_savings": 0,
                        }
                    ],
                },
            }

            with open(self.fallback_data_path, "w", encoding="utf-8") as f:
                json.dump(fallback_data, f, ensure_ascii=False, indent=4)

    async def get_recommendations(
        self, request: RecommendationRequest, optimization_focus: Optional[str] = None
    ) -> RecommendationResponse:
        """
        Получение ИИ-рекомендаций на основе данных калькулятора через DeepSeek API.

        Args:
            request: Данные запроса с параметрами калькулятора
            optimization_focus: Фокус оптимизации (cost, quality, speed)

        Returns:
            RecommendationResponse: Объект с рекомендациями
        """
        try:
            # Проверяем наличие API ключа
            if not DEEPSEEK_API_KEY:
                logger.warning("API ключ отсутствует. Используем заглушки.")
                # Если ключа нет, используем заглушки
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            # Формируем запрос к API DeepSeek
            prompt = self._create_recommendation_prompt(request, optimization_focus)
            logger.info(f"Сформирован промпт для запроса: {prompt[:100]}...")

            # Подготовка данных для запроса
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            }

            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "Вы - эксперт по строительству домов, который дает оптимальные рекомендации по строительству на основе введенных параметров.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 1500,
            }

            logger.info("Отправка запроса к DeepSeek API...")

            # Отправляем запрос к API DeepSeek
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=headers,
                json=payload,
                timeout=30,  # Устанавливаем таймаут
            )

            # Проверяем статус ответа
            if response.status_code != 200:
                logger.error(
                    f"Ошибка API DeepSeek: статус {response.status_code}, ответ: {response.text}"
                )
                raise Exception(f"Ошибка API: {response.status_code} - {response.text}")

            # Парсим ответ
            response_data = response.json()
            logger.info(f"Получен ответ от API: {str(response_data)[:100]}...")

            # Обрабатываем ответ от API
            if "choices" in response_data and len(response_data["choices"]) > 0:
                content = response_data["choices"][0]["message"]["content"]
                ai_recommendations = self._parse_ai_response(content)
                logger.info(f"Получено {len(ai_recommendations)} рекомендаций")
            else:
                logger.error(f"Неожиданный формат ответа: {response_data}")
                raise ValueError("Неожиданный формат ответа от DeepSeek API")

            # Формируем ответ
            return RecommendationResponse(
                recommendations=ai_recommendations,
                summary=self._generate_summary(ai_recommendations),
            )

        except Exception as e:
            logger.exception(f"Ошибка при получении ИИ-рекомендаций: {str(e)}")
            # В случае ошибки используем заглушки
            return await self._get_fallback_recommendations(request, optimization_focus)

    def _create_recommendation_prompt(
        self, request: RecommendationRequest, optimization_focus: Optional[str]
    ) -> str:
        """
        Создание промпта для запроса к DeepSeek API
        """
        # Базовая информация о доме
        calculator_data = request.calculator_data

        priority = request.priority or "общие рекомендации"
        if optimization_focus:
            if optimization_focus == "cost":
                priority = "экономия"
            elif optimization_focus == "quality":
                priority = "качество"
            elif optimization_focus == "speed":
                priority = "скорость"

        prompt = f"""
        Дайте 3-5 практических рекомендаций по строительству дома со следующими параметрами:
        
        - Площадь: {calculator_data.area} м²
        - Фундамент: {calculator_data.foundation_type.value}
        - Материал стен: {calculator_data.wall_material.value}
        - Количество этажей: {calculator_data.floors}
        - Тип кровли: {calculator_data.roof_type.value}
        - Дополнительные опции: {', '.join([opt.value for opt in calculator_data.additional_options]) if calculator_data.additional_options else 'нет'}
        
        Приоритет заказчика: {priority}
        
        {f'Бюджет: {request.budget} рублей' if request.budget else ''}
        
        Для каждой рекомендации укажите:
        1. Заголовок (краткое описание рекомендации)
        2. Подробное описание (что конкретно делать)
        3. Ожидаемый эффект от внедрения рекомендации
        4. Примерный процент экономии (если применимо)
        
        Все рекомендации должны быть конкретными, практичными и применимыми именно к этому типу дома.
        Дайте ответ в формате JSON со следующей структурой:
        [
            {
                "title": "Заголовок рекомендации",
                "description": "Подробное описание",
                "impact": "Ожидаемый эффект",
                "estimated_savings": процент_экономии (число или null, если неприменимо)
            },
            ...
        ]
        """

        return prompt

    def _parse_ai_response(self, response_text: str) -> List[Recommendation]:
        """
        Парсинг ответа от DeepSeek API
        """
        try:
            logger.info(f"Начат парсинг ответа AI длиной {len(response_text)} символов")

            # Извлекаем JSON из ответа (может быть окружен дополнительным текстом)
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1

            if json_start == -1 or json_end == 0:
                logger.error(f"JSON не найден в ответе: {response_text[:200]}...")
                raise ValueError("JSON не найден в ответе")

            json_data = response_text[json_start:json_end]
            logger.debug(f"Извлеченные JSON данные: {json_data[:200]}...")

            try:
                recommendations_data = json.loads(json_data)
                logger.info(
                    f"Успешно десериализовано {len(recommendations_data)} рекомендаций"
                )
            except json.JSONDecodeError as e:
                logger.error(
                    f"Ошибка парсинга JSON: {e}. Содержимое: {json_data[:200]}..."
                )
                raise ValueError(f"Ошибка парсинга JSON: {e}")

            # Преобразуем данные в список объектов Recommendation
            recommendations = []
            for i, rec_data in enumerate(recommendations_data):
                try:
                    recommendations.append(
                        Recommendation(
                            title=rec_data.get("title", "Рекомендация"),
                            description=rec_data.get("description", ""),
                            impact=rec_data.get("impact", ""),
                            estimated_savings=rec_data.get("estimated_savings"),
                        )
                    )
                    logger.debug(
                        f"Добавлена рекомендация {i+1}: {rec_data.get('title')}"
                    )
                except Exception as e:
                    logger.error(f"Ошибка обработки рекомендации {i}: {e}")

            logger.info(
                f"Успешно создано {len(recommendations)} объектов Recommendation"
            )
            return recommendations

        except Exception as e:
            logger.exception(f"Ошибка при парсинге ответа от AI: {e}")
            # В случае ошибки возвращаем базовую рекомендацию
            return [
                Recommendation(
                    title="Общая рекомендация",
                    description="Для получения детальных рекомендаций обратитесь к профессиональному архитектору или строителю.",
                    impact="Профессиональная консультация поможет оптимизировать проект",
                    estimated_savings=None,
                )
            ]

    def _generate_summary(self, recommendations: List[Recommendation]) -> str:
        """
        Генерация краткого резюме на основе рекомендаций
        """
        if not recommendations:
            logger.warning("Нет рекомендаций для генерации резюме")
            return "Нет доступных рекомендаций."

        total_savings = 0
        savings_count = 0

        for rec in recommendations:
            if rec.estimated_savings:
                total_savings += rec.estimated_savings
                savings_count += 1

        avg_savings = total_savings / savings_count if savings_count > 0 else 0
        logger.info(f"Среднее значение экономии: {avg_savings:.1f}%")

        summary = f"Предложено {len(recommendations)} рекомендаций"

        if avg_savings > 0:
            summary += f", которые могут помочь сэкономить в среднем около {avg_savings:.1f}% бюджета"

        logger.info(f"Сгенерировано резюме: {summary}")
        return summary + "."

    async def _get_fallback_recommendations(
        self, request: RecommendationRequest, optimization_focus: Optional[str]
    ) -> RecommendationResponse:
        """
        Получение заглушек рекомендаций из локального файла
        """
        try:
            logger.info(f"Загрузка заглушек рекомендаций из {self.fallback_data_path}")

            if not self.fallback_data_path.exists():
                logger.error(
                    f"Файл заглушек рекомендаций не найден: {self.fallback_data_path}"
                )
                # Создаем заглушки заново если файл не найден
                self.ensure_fallback_data()

            with open(self.fallback_data_path, "r", encoding="utf-8") as f:
                fallback_data = json.load(f)

            logger.info(f"Заглушки загружены успешно")
            recommendations = []

            # Добавляем общие рекомендации
            if "general" in fallback_data:
                logger.info(f"Добавление общих рекомендаций")
                for rec_data in fallback_data.get("general", [])[:2]:
                    recommendations.append(
                        Recommendation(
                            title=rec_data.get("title", ""),
                            description=rec_data.get("description", ""),
                            impact=rec_data.get("impact", ""),
                            estimated_savings=rec_data.get("estimated_savings"),
                        )
                    )

            # Добавляем рекомендации по фундаменту
            foundation_type = request.calculator_data.foundation_type.value
            if foundation_type in fallback_data.get("foundation", {}):
                logger.info(
                    f"Добавление рекомендаций по фундаменту типа '{foundation_type}'"
                )
                for rec_data in fallback_data["foundation"][foundation_type]:
                    recommendations.append(
                        Recommendation(
                            title=rec_data.get("title", ""),
                            description=rec_data.get("description", ""),
                            impact=rec_data.get("impact", ""),
                            estimated_savings=rec_data.get("estimated_savings"),
                        )
                    )

            # Добавляем рекомендации по стенам
            wall_material = request.calculator_data.wall_material.value
            if wall_material in fallback_data.get("walls", {}):
                logger.info(
                    f"Добавление рекомендаций по стенам из материала '{wall_material}'"
                )
                for rec_data in fallback_data["walls"][wall_material]:
                    recommendations.append(
                        Recommendation(
                            title=rec_data.get("title", ""),
                            description=rec_data.get("description", ""),
                            impact=rec_data.get("impact", ""),
                            estimated_savings=rec_data.get("estimated_savings"),
                        )
                    )

            # Ограничиваем количество рекомендаций
            recommendations = recommendations[:5]
            logger.info(f"Выбрано {len(recommendations)} рекомендаций из заглушек")

            return RecommendationResponse(
                recommendations=recommendations,
                summary=self._generate_summary(recommendations),
            )

        except Exception as e:
            logger.exception(f"Ошибка при получении заглушек рекомендаций: {e}")
            return RecommendationResponse(
                recommendations=[
                    Recommendation(
                        title="Базовая рекомендация",
                        description="Проконсультируйтесь с профессионалами для оптимизации вашего проекта.",
                        impact="Профессиональный подход к строительству",
                        estimated_savings=None,
                    )
                ],
                summary="Рекомендуется профессиональная консультация.",
            )
