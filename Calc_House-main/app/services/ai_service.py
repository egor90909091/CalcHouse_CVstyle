import json
import os
import logging
from typing import Dict, List, Optional
from pathlib import Path
import requests
from dotenv import load_dotenv
from app.models.calculator import (
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

        # Создаем сессию requests с настройками таймаута
        self.session = requests.Session()
        self.session.timeout = (5, 30)  # (connect timeout, read timeout)

        # Проверка наличия API ключа при инициализации
        if not DEEPSEEK_API_KEY:
            logger.warning(
                "API ключ DeepSeek не найден в .env файле. Будут использованы заглушки."
            )
        else:
            logger.info("Сервис AI инициализирован с DeepSeek API")

    def __del__(self):
        """Деструктор для корректного закрытия сессии при завершении работы сервиса."""
        try:
            if hasattr(self, "session") and self.session:
                self.session.close()
                logger.debug("Сессия AIService закрыта")
        except Exception as e:
            logger.error(f"Ошибка при закрытии сессии AIService: {str(e)}")

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
        Получение рекомендаций от DeepSeek API
        """
        try:
            if not DEEPSEEK_API_KEY:
                logger.warning(
                    "API ключ DeepSeek не найден, используем заглушки рекомендаций"
                )
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            }

            # Создаем промпт для DeepSeek
            prompt = self._create_recommendation_prompt(request, optimization_focus)

            # Параметры запроса
            payload = {
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "max_tokens": 2500,
            }

            try:
                # Выполняем запрос к DeepSeek API
                logger.info(f"Отправка запроса к DeepSeek API...")
                response = self.session.post(
                    DEEPSEEK_API_URL, json=payload, headers=headers
                )
                response.raise_for_status()  # Проверка на ошибки HTTP

            except requests.exceptions.RequestException as e:
                logger.error(f"Ошибка запроса к DeepSeek API: {str(e)}")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP ошибка при запросе к DeepSeek API: {str(e)}")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            except Exception as e:
                logger.error(f"Неизвестная ошибка при запросе к DeepSeek API: {str(e)}")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            # Получаем и обрабатываем ответ
            response_data = response.json()

            # Проверка на наличие необходимых данных в ответе
            if "choices" not in response_data or not response_data["choices"]:
                logger.error("Некорректный ответ от DeepSeek API")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            ai_response = response_data["choices"][0]["message"]["content"]
            logger.info(f"Получен ответ от DeepSeek API: {ai_response[:100]}...")

            # Извлекаем JSON из ответа
            json_start = ai_response.find("{")
            json_end = ai_response.rfind("}") + 1
            if json_start == -1 or json_end == 0:
                logger.error(f"JSON не найден в ответе: {ai_response[:200]}...")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            json_data = ai_response[json_start:json_end]
            try:
                ai_response_data = json.loads(json_data)
            except json.JSONDecodeError:
                logger.error(f"Не удалось распарсить JSON ответа")
                return await self._get_fallback_recommendations(
                    request, optimization_focus
                )

            # Преобразуем ответ в структурированные рекомендации
            recommendations = self._parse_ai_response(ai_response)

            # Формируем сводку рекомендаций
            summary = self._generate_summary(recommendations, ai_response_data)

            # Возвращаем структурированный ответ с рекомендациями
            return RecommendationResponse(
                recommendations=recommendations,
                summary=summary,
            )

        except Exception as e:
            logger.error(f"Ошибка при получении рекомендаций: {str(e)}")
            # В случае любой ошибки возвращаем заглушки
            return await self._get_fallback_recommendations(request, optimization_focus)

    def _create_recommendation_prompt(
        self, request: RecommendationRequest, optimization_focus: Optional[str]
    ) -> str:
        """
        Создание промпта для запроса к DeepSeek API
        """
        # Базовая информация о доме
        calculator_data = request.calculator_data

        # Определение приоритета
        priority = request.priority or "общие рекомендации"
        if optimization_focus:
            if optimization_focus == "cost":
                priority = "экономия"
            elif optimization_focus == "quality":
                priority = "качество"
            elif optimization_focus == "speed":
                priority = "скорость"

        # Получаем информацию о дополнительных опциях
        additional_options = calculator_data.additional_options or []
        additional_options_str = (
            ", ".join([opt.value for opt in additional_options])
            if additional_options
            else "нет"
        )

        # Преобразование значения в человекочитаемый формат
        foundation_type_display = {
            "strip": "ленточный фундамент",
            "pile": "свайный фундамент",
            "slab": "плитный фундамент",
            "column": "столбчатый фундамент",
        }.get(
            calculator_data.foundation_type.value, calculator_data.foundation_type.value
        )

        wall_material_display = {
            "brick": "кирпич",
            "wood": "дерево",
            "block": "блоки",
            "concrete": "монолитный бетон",
            "panel": "панели",
        }.get(calculator_data.wall_material.value, calculator_data.wall_material.value)

        roof_type_display = {
            "metal": "металлочерепица",
            "tile": "керамическая черепица",
            "shingle": "гибкая черепица",
            "slate": "шифер",
            "flat": "плоская кровля",
        }.get(calculator_data.roof_type.value, calculator_data.roof_type.value)

        prompt = f"""
        Создайте ЧЕТЫРЕ подробные строительные рекомендации (400-500 символов каждая) по:
        1. Общие рекомендации для дома {calculator_data.area}м² из {wall_material_display}, {calculator_data.floors} этаж(а/ей)
        2. Рекомендация по {foundation_type_display}у
        3. Рекомендация по стенам из {wall_material_display}а
        4. Рекомендация по кровле типа {roof_type_display}
        
        Приоритет заказчика: {priority}.
        
        Формат строго JSON:
        {{
          "summary": "Краткое резюме всех рекомендаций",
          "recommendations": [
            {{
              "category": "Общие",
              "title": "Заголовок общей рекомендации",
              "description": "Описание 400-500 символов",
              "impact": "Польза от рекомендации"
            }},
            {{
              "category": "Фундамент",
              "title": "Заголовок фундамента",
              "description": "Описание 400-500 символов",
              "impact": "Польза от рекомендации"
            }},
            {{
              "category": "Стены",
              "title": "Заголовок стен",
              "description": "Описание 400-500 символов",
              "impact": "Польза от рекомендации"
            }},
            {{
              "category": "Крыша",
              "title": "Заголовок крыши",
              "description": "Описание 400-500 символов",
              "impact": "Польза от рекомендации"
            }}
          ]
        }}
        
        ТОЛЬКО JSON, БЕЗ ПОЯСНЕНИЙ.
        """

        return prompt

    def _parse_ai_response(self, response_text: str) -> List[Recommendation]:
        """
        Парсинг ответа от DeepSeek API
        """
        try:
            logger.info(f"Начат парсинг ответа AI длиной {len(response_text)} символов")

            # Извлекаем JSON из ответа (может быть окружен дополнительным текстом)
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.error(f"JSON не найден в ответе: {response_text[:200]}...")
                raise ValueError("JSON не найден в ответе")

            json_data = response_text[json_start:json_end]
            logger.debug(f"Извлеченные JSON данные: {json_data[:200]}...")

            try:
                ai_response_data = json.loads(json_data)
                logger.info(f"Успешно десериализован ответ AI")
            except json.JSONDecodeError as e:
                logger.error(
                    f"Ошибка парсинга JSON: {e}. Содержимое: {json_data[:200]}..."
                )
                raise ValueError(f"Ошибка парсинга JSON: {e}")

            # Создаем список рекомендаций из полученного ответа
            recommendations = []

            # Проверяем наличие нового формата ответа
            if "recommendations" in ai_response_data and isinstance(
                ai_response_data["recommendations"], list
            ):
                # Обрабатываем новый формат с множественными рекомендациями
                for rec_data in ai_response_data["recommendations"]:
                    recommendations.append(
                        Recommendation(
                            title=rec_data.get("title", "Рекомендация"),
                            description=rec_data.get("description", ""),
                            impact=rec_data.get("impact", ""),
                            estimated_savings=None,
                        )
                    )
                    logger.debug(f"Добавлена рекомендация: {rec_data.get('title')}")
            # Проверяем наличие старого формата с одним лайфхаком
            elif "lifehack" in ai_response_data:
                recommendations.append(
                    Recommendation(
                        title="Лайфхак дня",
                        description=ai_response_data.get("lifehack", ""),
                        impact="",
                        estimated_savings=None,
                    )
                )
                logger.debug(
                    f"Добавлен лайфхак: {ai_response_data.get('lifehack')[:50]}..."
                )
            else:
                logger.error(
                    "Поля 'recommendations' или 'lifehack' не найдены в ответе"
                )
                # Добавляем базовую рекомендацию на случай ошибки
                recommendations.append(
                    Recommendation(
                        title="Рекомендация",
                        description="Используйте современные строительные материалы и технологии, они могут значительно сократить затраты на строительство и эксплуатацию дома.",
                        impact="Повышение эффективности и снижение затрат",
                        estimated_savings=None,
                    )
                )

            logger.info(
                f"Успешно создано {len(recommendations)} рекомендаций из ответа AI"
            )
            return recommendations

        except Exception as e:
            logger.exception(f"Ошибка при парсинге ответа от AI: {e}")
            # В случае ошибки возвращаем базовую рекомендацию
            return [
                Recommendation(
                    title="Рекомендация",
                    description="Для получения наилучших результатов при строительстве, фотографируйте каждый этап работы. Это поможет отследить скрытые коммуникации и избежать проблем при последующих ремонтах.",
                    impact="Повышение контроля качества",
                    estimated_savings=None,
                )
            ]

    def _generate_summary(
        self,
        recommendations: List[Recommendation],
        ai_response_data: Optional[Dict] = None,
    ) -> str:
        """
        Генерация краткого резюме на основе рекомендаций или использование готового summary из ответа DeepSeek
        """
        # Если есть готовое summary в ответе AI, используем его
        if ai_response_data and "summary" in ai_response_data:
            return ai_response_data.get("summary")

        # Иначе генерируем резюме на основе рекомендаций
        if not recommendations:
            return "Рекомендации не найдены."

        # Группируем рекомендации по категориям, если есть достаточно данных
        categories = {}
        for rec in recommendations:
            # Попытка извлечь категорию из заголовка, если она не указана явно
            title = rec.title.lower()
            if "фундамент" in title:
                category = "фундамент"
            elif "стен" in title:
                category = "стены"
            elif "крыш" in title:
                category = "крыша"
            else:
                category = "общее"

            if category not in categories:
                categories[category] = 0
            categories[category] += 1

        # Составляем резюме на основе категорий
        if len(categories) > 1:
            category_summary = ", ".join(
                [f"{count} по {cat}" for cat, count in categories.items()]
            )
            return f"Предоставлено {len(recommendations)} рекомендаций: {category_summary}. Рекомендации учитывают выбранные параметры строительства и направлены на оптимизацию процесса и повышение качества строительства."
        else:
            return f"Предоставлено {len(recommendations)} практических рекомендаций для оптимизации строительства."

    async def _get_fallback_recommendations(
        self, request: RecommendationRequest, optimization_focus: Optional[str]
    ) -> RecommendationResponse:
        """
        Получение заглушек лайфхаков из локального файла или предопределенного списка
        """
        try:
            logger.info("Подготовка заглушки лайфхака")

            # Предопределенные лайфхаки для разных типов домов
            fallback_lifehacks = {
                "general": [
                    "Используйте магниты, приклеенные к внутренней стороне вентиляционных решеток, чтобы собирать металлическую пыль и улучшить качество воздуха в доме. Это особенно полезно для новостроек, где металлическая пыль от систем вентиляции является распространенной проблемой. Позаботьтесь о здоровье жильцов и продлите срок службы систем вентиляции с минимальными затратами.",
                    "При прокладке труб отопления, сделайте фото с привязкой к ориентирам (двери, окна) перед закрытием стен. Сохраните эти фото в облаке с метками комнат - это сэкономит кучу времени при будущих ремонтах и поможет избежать случайного повреждения труб. Создайте отдельную цифровую папку для каждой комнаты и шкафы в ней для каждого типа коммуникаций.",
                    "Добавьте цветную эпоксидную смолу в затирку для плитки в ванной - это не только выглядит эффектно, но и создает водонепроницаемую поверхность, предотвращая рост плесени. Секрет строителей, о котором редко говорят. Выбирайте эпоксидную смолу с бактерицидными добавками для дополнительной защиты от микроорганизмов в помещениях с повышенной влажностью.",
                ],
                "foundation": {
                    "strip": "Перед заливкой ленточного фундамента разместите пластиковые трубы для будущей прокладки коммуникаций. Это избавит от необходимости сверлить фундамент позже и сохранит его целостность. Маленький шаг, экономящий большие деньги и нервы. Разработайте детальную схему расположения этих технологических отверстий и сохраните её вместе с проектной документацией дома для будущих владельцев или подрядчиков.",
                    "pile": "При установке свайного фундамента используйте трубы разного диаметра с просверленными отверстиями в шахматном порядке - так вы создадите систему пассивной вентиляции подпола, которая будет автоматически регулировать влажность и предотвращать появление плесени. Такая естественная циркуляция воздуха значительно увеличит долговечность деревянных конструкций и создаст более здоровый микроклимат в доме.",
                    "slab": "Заложите теплый контур из труб в плитный фундамент, даже если не планируете теплые полы сейчас. Это будет вашим «запасным аэродромом» для модернизации отопления в будущем, причем без разрушения конструкций. Расположите трубы с учетом возможной перепланировки помещений и обязательно сделайте точную схему их расположения с привязкой к постоянным ориентирам.",
                    "column": "При строительстве столбчатого фундамента добавьте металлические трубки рядом с каждым столбом, соединенные между собой. Это создаст необходимую вентиляцию под домом и позволит снизить уровень радона в помещениях до 85% без дополнительных затрат. Кроме того, такая система будет отводить избыточную влагу из-под дома, что существенно продлит срок службы всей конструкции.",
                },
                "walls": {
                    "brick": "При кладке кирпичных стен используйте ледяные кубики для очистки излишков раствора, а не мокрую губку. Они растворяют только свежий раствор, не повреждая затвердевший, и дают идеально чистый кирпич без традиционных белесых разводов. Подготовьте кубики заранее в специальных формах и храните их в термосумке рядом с местом работы для удобства.",
                    "wood": "Перед сборкой деревянных стен обработайте торцы бревен или бруса горячей смесью пчелиного воска и льняного масла (7:3). Это создаст невидимый водоотталкивающий барьер на самых уязвимых участках дерева, продлевая срок службы стен без химических пропиток. Наносите смесь при температуре около 70°C для лучшего проникновения в древесину и используйте натуральную кисть с жесткой щетиной.",
                    "block": "При кладке блоков используйте самодельный шаблон из двух деревянных планок для быстрой и ровной кладки. Одна планка должна быть равна длине блока, другая - высоте. Это помогает выдерживать толщину швов и экономит до 15% раствора. Зафиксируйте планки вместе под прямым углом и используйте их как направляющие при нанесении раствора, добиваясь идеально ровных и одинаковых швов.",
                    "concrete": "Добавляйте кофейный жмых в бетон для стен (около 3% от объема цемента) - это улучшает теплоизоляционные свойства, работает как натуральный пеногаситель и придает бетону интересную текстуру. Метод от финских архитекторов, известный мало кому. Кроме того, органические кислоты кофе взаимодействуют с цементом, ускоряя процесс гидратации и повышая прочность материала на ранних стадиях застывания.",
                    "panel": "Перед установкой панелей наклейте на внутренние стыки фольгированную ленту с отражающей стороной внутрь. Это создаст воздушную прослойку с эффектом термоса на стыках - самом холодном месте в панельном доме, сократив теплопотери до 30%. Используйте ленту высокого качества с клеящим составом на основе акрила для максимальной долговечности даже при температурных перепадах.",
                },
                "roof": {
                    "metal": "При монтаже металлической кровли нанесите слой автомобильного антигравия под коньковые и ендовные элементы. Это устраняет вибрацию и стук металла во время дождя, создавая тихий и комфортный дом даже при сильных осадках. Используйте антигравийное покрытие на водной основе, а не на битумной, чтобы избежать коррозии в местах контакта с металлом кровли.",
                    "tile": "Перед укладкой черепицы обработайте её пчелиным воском с добавлением льняного масла - такая крыша будет отталкивать мох и лишайники десятилетиями, сохраняя первоначальный вид без регулярной обработки химическими средствами. Наносите состав на полностью просушенную черепицу в сухую погоду и дайте ей полностью впитаться в течение нескольких дней перед монтажом.",
                    "shingle": "При монтаже гибкой черепицы добавьте между слоями основания и черепицы отрезки медной проволоки, выступающие на 2-3 см по краям. Дождевая вода, стекая по меди, создаст естественную защиту от мха и лишайников на всей поверхности крыши. Для максимальной эффективности используйте проволоку из чистой меди без покрытия и размещайте её по всему периметру крыши и вдоль ендов.",
                    "slate": "Перед монтажом шифера окуните края листов в жидкий прозрачный силикон. После высыхания это предотвратит раскол краёв при сильном ветре и в 3 раза продлит срок службы покрытия. Старый приём профессиональных кровельщиков. Обрабатывайте также все отверстия для крепежа, чтобы предотвратить попадание воды и разрушение шифера при циклах замерзания-оттаивания.",
                    "flat": "На плоской кровле разместите сетку из тонких медных проводов поверх гидроизоляции. В течение года на поверхности образуется тончайший слой оксида меди, препятствующий появлению корней растений и проникновению их через мембрану. Это решение стоит дешевле специальных противокорневых добавок и работает более эффективно в долгосрочной перспективе.",
                },
                "floors": {
                    "1": "В одноэтажном доме установите на крыше солнечный коллектор для нагрева воды и соедините его с теплым полом через рекуператор. Это даст вам практически бесплатное отопление весной и осенью, когда солнечно, но еще прохладно. Дополните систему автоматикой с погодозависимым управлением для оптимального использования солнечной энергии и экономии на отоплении до 40% в переходные сезоны.",
                    "2": "В двухэтажном доме проложите дополнительный воздуховод от кухонной вытяжки к подвальному помещению через теплообменник. Теплый воздух с кухни будет подогревать холодный подвал, предотвращая образование конденсата и экономя на отоплении. Установите фильтры с активированным углем для очистки воздуха от запахов и регулируемые заслонки для контроля потока в зависимости от сезона.",
                    "3": "В трехэтажном доме устройте центральный световой колодец с зеркальными стенами от крыши до первого этажа. Он не только обеспечит естественное освещение центральных комнат, но и создаст естественную вентиляцию за счет разницы температур. Дополните систему автоматическими заслонками в верхней части для регулирования воздушного потока и защиты от осадков.",
                },
            }

            # Определяем, какой лайфхак показать
            lifehack = ""
            foundation_type = request.calculator_data.foundation_type.value
            wall_material = request.calculator_data.wall_material.value
            roof_type = request.calculator_data.roof_type.value
            floors = str(request.calculator_data.floors)

            # Попробуем найти лайфхак по типу стен
            if wall_material in fallback_lifehacks.get("walls", {}):
                lifehack = fallback_lifehacks["walls"][wall_material]
            # Если не найден, попробуем по типу фундамента
            elif foundation_type in fallback_lifehacks.get("foundation", {}):
                lifehack = fallback_lifehacks["foundation"][foundation_type]
            # Если не найден, попробуем по типу крыши
            elif roof_type in fallback_lifehacks.get("roof", {}):
                lifehack = fallback_lifehacks["roof"][roof_type]
            # Если не найден, попробуем по количеству этажей
            elif floors in fallback_lifehacks.get("floors", {}):
                lifehack = fallback_lifehacks["floors"][floors]
            # Если ничего не подошло, берем случайный общий лайфхак
            else:
                import random

                lifehack = random.choice(fallback_lifehacks["general"])

            # Создаем рекомендацию с лайфхаком
            recommendation = Recommendation(
                title="Лайфхак дня",
                description=lifehack,
                impact="",
                estimated_savings=None,
            )

            logger.info(f"Подготовлен лайфхак: {lifehack[:50]}...")

            return RecommendationResponse(
                recommendations=[recommendation],
                summary="Лайфхак для вашего строительства",
            )

        except Exception as e:
            logger.exception(f"Ошибка при получении лайфхака: {e}")
            return RecommendationResponse(
                recommendations=[
                    Recommendation(
                        title="Лайфхак дня",
                        description="Сделайте фотографии каждого этапа строительства перед закрытием стен и полов. Это бесценная информация при последующих ремонтах, когда нужно найти скрытые коммуникации.",
                        impact="",
                        estimated_savings=None,
                    )
                ],
                summary="Полезный совет для строительства",
            )
