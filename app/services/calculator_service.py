import json
import os
from typing import Dict, List, Optional
from pathlib import Path
from random import randint
from app.models.calculator import (
    CalculatorRequest,
    CalculatorResponse,
    CalculationDetail,
    AdditionalOption,
)


class CalculatorService:
    """Сервис для расчета стоимости строительства"""

    def __init__(self):
        # Загрузка базовых цен на материалы из JSON-файла
        # (В реальном проекте можно использовать базу данных)
        self.materials_data_path = (
            Path(__file__).parent.parent / "static" / "data" / "materials.json"
        )
        self.materials_data = self._load_materials_data()

    def _load_materials_data(self) -> Dict:
        """Загрузка данных о материалах и ценах"""
        # Создаем директорию для данных, если она не существует
        data_dir = Path(__file__).parent.parent / "static" / "data"
        os.makedirs(data_dir, exist_ok=True)

        # Проверяем, существует ли файл с данными, иначе создаем шаблон
        if not self.materials_data_path.exists():
            default_data = {
                "foundation": {
                    "strip": {
                        "name": "Ленточный фундамент",
                        "price_per_sqm": 5000,
                        "unit": "м²",
                    },
                    "pile": {
                        "name": "Свайный фундамент",
                        "price_per_sqm": 4000,
                        "unit": "м²",
                    },
                    "slab": {
                        "name": "Плитный фундамент",
                        "price_per_sqm": 6000,
                        "unit": "м²",
                    },
                    "column": {
                        "name": "Столбчатый фундамент",
                        "price_per_sqm": 3500,
                        "unit": "м²",
                    },
                },
                "walls": {
                    "brick": {"name": "Кирпич", "price_per_sqm": 8000, "unit": "м²"},
                    "wood": {"name": "Дерево", "price_per_sqm": 6000, "unit": "м²"},
                    "block": {"name": "Блоки", "price_per_sqm": 5000, "unit": "м²"},
                    "concrete": {
                        "name": "Монолитный бетон",
                        "price_per_sqm": 7000,
                        "unit": "м²",
                    },
                    "panel": {"name": "Панели", "price_per_sqm": 4500, "unit": "м²"},
                },
                "roof": {
                    "metal": {
                        "name": "Металлочерепица",
                        "price_per_sqm": 2000,
                        "unit": "м²",
                    },
                    "tile": {
                        "name": "Керамическая черепица",
                        "price_per_sqm": 3500,
                        "unit": "м²",
                    },
                    "shingle": {
                        "name": "Гибкая черепица",
                        "price_per_sqm": 1800,
                        "unit": "м²",
                    },
                    "slate": {"name": "Шифер", "price_per_sqm": 1200, "unit": "м²"},
                    "flat": {
                        "name": "Плоская кровля",
                        "price_per_sqm": 2500,
                        "unit": "м²",
                    },
                },
                "options": {
                    "garage": {"name": "Гараж", "price": 350000, "unit": "шт"},
                    "basement": {"name": "Подвал", "price_per_sqm": 7000, "unit": "м²"},
                    "terrace": {"name": "Терраса", "price_per_sqm": 5000, "unit": "м²"},
                    "balcony": {"name": "Балкон", "price_per_sqm": 15000, "unit": "м²"},
                    "warm_floor": {
                        "name": "Теплый пол",
                        "price_per_sqm": 2000,
                        "unit": "м²",
                    },
                    "smart_home": {"name": "Умный дом", "price": 250000, "unit": "шт"},
                },
                "work": {
                    "base_rate": 5000,  # Базовая ставка работы за м²
                    "floor_coefficient": {"1": 1.0, "2": 1.2, "3": 1.5},
                },
            }

            # Записываем шаблон в файл
            with open(self.materials_data_path, "w", encoding="utf-8") as f:
                json.dump(default_data, f, ensure_ascii=False, indent=4)

            return default_data

        # Загружаем данные из существующего файла
        try:
            with open(self.materials_data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Ошибка при загрузке данных о материалах: {e}")
            return {}

    async def calculate(self, request: CalculatorRequest) -> CalculatorResponse:
        """
        Расчет стоимости строительства на основе входных данных
        """
        # Расчет стоимости фундамента
        foundation_price = self._calculate_foundation_price(request)

        # Расчет стоимости стен
        walls_price = self._calculate_walls_price(request)

        # Расчет стоимости перекрытий
        floor_price = self._calculate_floor_price(request)

        # Расчет стоимости кровли
        roof_price = self._calculate_roof_price(request)

        # Расчет стоимости дополнительных опций
        options_price, options_details = self._calculate_options_price(request)

        # Расчет стоимости работ
        work_price = self._calculate_work_price(request)

        # Расчет общей стоимости
        total_price = (
            foundation_price
            + walls_price
            + floor_price
            + roof_price
            + options_price
            + work_price
        )

        # Расчет стоимости за м²
        price_per_sqm = total_price / request.area

        # Расчет примерного времени строительства в днях
        estimated_time = int(request.area * 0.5 * request.floors)

        # Проверяем наличие дополнительных опций безопасным способом
        if request.additional_options and AdditionalOption.BASEMENT in request.additional_options:
            estimated_time += 30

        # Формирование детализации расчетов
        breakdown = [
            CalculationDetail(
                category="Фундамент",
                price=foundation_price,
                details=[
                    {
                        "name": self.materials_data["foundation"][
                            request.foundation_type.value
                        ]["name"],
                        "area": request.area,
                        "price_per_sqm": self.materials_data["foundation"][
                            request.foundation_type.value
                        ]["price_per_sqm"],
                    }
                ],
            ),
            CalculationDetail(
                category="Стены",
                price=walls_price,
                details=[
                    {
                        "name": self.materials_data["walls"][
                            request.wall_material.value
                        ]["name"],
                        "area": self._calculate_walls_area(request),
                        "price_per_sqm": self.materials_data["walls"][
                            request.wall_material.value
                        ]["price_per_sqm"],
                    }
                ],
            ),
            CalculationDetail(
                category="Перекрытия",
                price=floor_price,
                details=(
                    [
                        {
                            "name": self.materials_data["floors"][
                                request.floor_type.value
                            ]["name"],
                            "area": request.area * (request.floors - 1),
                            "price_per_sqm": self.materials_data["floors"][
                                request.floor_type.value
                            ]["price_per_sqm"],
                            "calculation_details": request.floor_calculation_details or {},
                        }
                    ]
                    if request.floor_type and request.floors > 1
                    else []
                ),
            ),
            CalculationDetail(
                category="Кровля",
                price=roof_price,
                details=[
                    {
                        "name": self.materials_data["roof"][request.roof_type.value][
                            "name"
                        ],
                        "area": self._calculate_roof_area(request),
                        "price_per_sqm": self.materials_data["roof"][
                            request.roof_type.value
                        ]["price_per_sqm"],
                    }
                ],
            ),
            CalculationDetail(
                category="Дополнительные опции",
                price=options_price,
                details=options_details,
            ),
            CalculationDetail(
                category="Работы",
                price=work_price,
                details=[
                    {
                        "name": "Строительные работы",
                        "base_rate": self.materials_data["work"]["base_rate"],
                        "floor_coefficient": self.materials_data["work"][
                            "floor_coefficient"
                        ][str(request.floors)],
                    }
                ],
            ),
        ]

        # Формирование ответа
        return CalculatorResponse(
            total_price=total_price,
            area=request.area,
            price_per_sqm=price_per_sqm,
            breakdown=breakdown,
            estimated_time=estimated_time,
        )

    def _calculate_foundation_price(self, request: CalculatorRequest) -> float:
        """Расчет стоимости фундамента"""
        foundation_data = self.materials_data["foundation"][
            request.foundation_type.value
        ]
        return foundation_data["price_per_sqm"] * request.area

    def _calculate_walls_area(self, request: CalculatorRequest) -> float:
        """Расчет площади стен"""
        # Упрощенная формула: периметр дома * высота этажа * количество этажей
        perimeter = 4 * (request.area**0.5)  # Упрощенно считаем дом квадратным
        height_per_floor = 3.0  # Средняя высота этажа 3 метра
        return perimeter * height_per_floor * request.floors

    def _calculate_walls_price(self, request: CalculatorRequest) -> float:
        """Расчет стоимости стен"""
        walls_data = self.materials_data["walls"][request.wall_material.value]
        walls_area = self._calculate_walls_area(request)
        return walls_data["price_per_sqm"] * walls_area

    def _calculate_roof_area(self, request: CalculatorRequest) -> float:
        """Расчет площади кровли"""
        # Упрощенная формула: площадь дома * коэффициент для типа кровли
        roof_coefficient = 1.3  # Для скатной кровли
        if request.roof_type.value == "flat":
            roof_coefficient = 1.1  # Для плоской кровли

        return request.area * roof_coefficient

    def _calculate_roof_price(self, request: CalculatorRequest) -> float:
        """Расчет стоимости кровли"""
        roof_data = self.materials_data["roof"][request.roof_type.value]
        roof_area = self._calculate_roof_area(request)
        return roof_data["price_per_sqm"] * roof_area

    def _calculate_floor_price(self, request: CalculatorRequest) -> float:
        """Расчет стоимости межэтажных перекрытий"""
        if not request.floor_type or request.floors <= 1:
            return 0.0

        floor_type = request.floor_type.value
        floor_data = self.materials_data["floors"][floor_type]
        total_price = 0.0

        # Площадь перекрытий (количество этажей - 1)
        floor_area = request.area * (request.floors - 1)

        if floor_type == "concrete":
            # Расчет для монолитных перекрытий
            thickness = (
                float(request.floor_params.get("concrete-floor-thickness", 180)) / 1000
            )  # перевод в метры
            concrete_type = f"concrete_{int(thickness * 1000)}"
            concrete_material = floor_data["materials"][concrete_type]

            # Объем бетона
            concrete_volume = floor_area * thickness
            concrete_cost = concrete_volume * concrete_material["price"]

            # Расход арматуры: ~100 кг на кубометр бетона
            rebar_weight = concrete_volume * 0.1  # тонны
            rebar_cost = rebar_weight * 1000 * floor_data["materials"]["rebar"]["price"]

            # Стоимость опалубки
            formwork_cost = floor_area * floor_data["materials"]["formwork"]["price"]

            total_price = concrete_cost + rebar_cost + formwork_cost

            # Добавим детали расчета в запрос для последующего использования
            if not hasattr(request, "floor_calculation_details"):
                request.floor_calculation_details = {}

            request.floor_calculation_details = {
                "type": "concrete",
                "area": floor_area,
                "thickness": thickness,
                "concrete_volume": concrete_volume,
                "concrete_cost": concrete_cost,
                "rebar_weight": rebar_weight,
                "rebar_cost": rebar_cost,
                "formwork_cost": formwork_cost,
            }

        elif floor_type == "slab":
            # Расчет для сборных железобетонных плит
            slab_type = request.floor_params.get("slab-floor-type", "ПК 60-12-8")
            slab_key = "slab_" + slab_type.split()[1].replace("-", "_")
            slab_material = floor_data["materials"][slab_key]

            # Получаем размеры из значения типа плиты
            if slab_type == "ПК 60-12-8":
                slab_length = 6.0
                slab_width = 1.2
            else:  # "ПК 48-12-8"
                slab_length = 4.8
                slab_width = 1.2

            # Площадь одной плиты
            slab_area = slab_length * slab_width

            # Расчет количества плит
            num_slabs = int(floor_area / slab_area) + 1
            slab_cost = num_slabs * slab_material["price"]

            # Расчет стоимости раствора
            mortar_volume = floor_area * 0.05  # примерный расход раствора
            mortar_cost = mortar_volume * floor_data["materials"]["mortar"]["price"]

            total_price = slab_cost + mortar_cost

            # Добавим детали расчета в запрос для последующего использования
            if not hasattr(request, "floor_calculation_details"):
                request.floor_calculation_details = {}

            request.floor_calculation_details = {
                "type": "slab",
                "area": floor_area,
                "slab_type": slab_type,
                "slab_dimensions": f"{slab_length}×{slab_width} м",
                "num_slabs": num_slabs,
                "slab_cost": slab_cost,
                "mortar_volume": mortar_volume,
                "mortar_cost": mortar_cost,
            }

        return total_price

    def _calculate_options_price(self, request: CalculatorRequest) -> tuple:
        """Расчет стоимости дополнительных опций"""
        # Если дополнительных опций нет, сразу возвращаем 0 и пустой список
        if not request.additional_options:
            return 0, []

        total_options_price = 0
        options_details = []

        for option in request.additional_options:
            option_data = self.materials_data["options"][option.value]
            option_price = 0

            # Расчет стоимости в зависимости от типа опции
            if "price_per_sqm" in option_data:
                if option.value == "basement":
                    option_price = option_data["price_per_sqm"] * request.area
                elif option.value == "terrace":
                    option_price = option_data["price_per_sqm"] * (
                        request.area * 0.2
                    )  # Терраса ~20% от площади дома
                elif option.value == "balcony":
                    option_price = option_data["price_per_sqm"] * (
                        request.area * 0.1 * request.floors
                    )  # Балкон ~10% от площади этажа
                elif option.value == "warm_floor":
                    option_price = option_data["price_per_sqm"] * request.area
            else:
                option_price = option_data["price"]

            options_details.append({"name": option_data["name"], "price": option_price})

            total_options_price += option_price

        return total_options_price, options_details

    def _calculate_work_price(self, request: CalculatorRequest) -> float:
        """Расчет стоимости работ"""
        base_rate = self.materials_data["work"]["base_rate"]
        floor_coefficient = self.materials_data["work"]["floor_coefficient"][
            str(request.floors)
        ]

        return base_rate * request.area * floor_coefficient
