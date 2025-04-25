import json
import os
import random
import math
from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path
import aiohttp
from app.models.calculator import (
    MaterialPrice,
    MaterialsCalculatorInput,
    MaterialsCalculationResult,
    MaterialsResult,
    MaterialItem,
    FoundationType,
    WallMaterial,
    RoofType,
    RoofConstruction,
)


class MaterialsService:
    """Сервис для работы с материалами"""

    def __init__(self):
        self.materials_data_path = (
            Path(__file__).parent.parent / "static" / "data" / "materials.json"
        )
        self.data_dir = Path(__file__).parent.parent / "static" / "data"
        os.makedirs(self.data_dir, exist_ok=True)

    async def get_all_materials(self) -> List[MaterialPrice]:
        """Получение списка всех материалов с ценами"""
        materials = []

        try:
            data = await self._load_materials_data()

            # Добавляем материалы фундамента
            for key, value in data.get("foundation", {}).items():
                materials.append(
                    MaterialPrice(
                        name=value["name"],
                        unit=value["unit"],
                        price=value["price_per_sqm"],
                        description=f"Материал для фундамента",
                    )
                )

            # Добавляем материалы стен
            for key, value in data.get("walls", {}).items():
                materials.append(
                    MaterialPrice(
                        name=value["name"],
                        unit=value["unit"],
                        price=value["price_per_sqm"],
                        description=f"Материал для стен",
                    )
                )

            # Добавляем материалы кровли
            for key, value in data.get("roof", {}).items():
                materials.append(
                    MaterialPrice(
                        name=value["name"],
                        unit=value["unit"],
                        price=value["price_per_sqm"],
                        description=f"Материал для кровли",
                    )
                )

            # Добавляем дополнительные опции
            for key, value in data.get("options", {}).items():
                price = value.get("price_per_sqm", value.get("price", 0))
                materials.append(
                    MaterialPrice(
                        name=value["name"],
                        unit=value["unit"],
                        price=price,
                        description=f"Дополнительная опция",
                    )
                )

            return materials

        except Exception as e:
            print(f"Ошибка при получении материалов: {e}")
            return []

    async def get_materials_by_category(self, category: str) -> List[MaterialPrice]:
        """Получение списка материалов по категории"""
        try:
            data = await self._load_materials_data()

            if category == "walls":
                category_data = data.get("walls", {})
            elif category == "foundation":
                category_data = data.get("foundation", {})
            elif category == "roof":
                category_data = data.get("roof", {})
            elif category == "options":
                category_data = data.get("options", {})
            else:
                return []

            materials = []
            for key, value in category_data.items():
                price = value.get("price_per_sqm", value.get("price", 0))
                materials.append(
                    MaterialPrice(
                        name=value["name"],
                        unit=value["unit"],
                        price=price,
                        description=f"Материал категории {category}",
                    )
                )

            return materials

        except Exception as e:
            print(f"Ошибка при получении материалов категории {category}: {e}")
            return []

    async def update_prices(self) -> Dict:
        """
        Обновление цен на материалы
        В реальном проекте здесь будет запрос к API поставщиков или парсинг сайтов.
        Для демонстрации реализуем случайное изменение цен.
        """
        try:
            data = await self._load_materials_data()
            updated_count = 0

            # Обновляем цены на фундамент
            for key in data.get("foundation", {}):
                data["foundation"][key]["price_per_sqm"] = self._adjust_price(
                    data["foundation"][key]["price_per_sqm"]
                )
                updated_count += 1

            # Обновляем цены на стены
            for key in data.get("walls", {}):
                data["walls"][key]["price_per_sqm"] = self._adjust_price(
                    data["walls"][key]["price_per_sqm"]
                )
                updated_count += 1

            # Обновляем цены на кровлю
            for key in data.get("roof", {}):
                data["roof"][key]["price_per_sqm"] = self._adjust_price(
                    data["roof"][key]["price_per_sqm"]
                )
                updated_count += 1

            # Обновляем цены на дополнительные опции
            for key in data.get("options", {}):
                if "price_per_sqm" in data["options"][key]:
                    data["options"][key]["price_per_sqm"] = self._adjust_price(
                        data["options"][key]["price_per_sqm"]
                    )
                elif "price" in data["options"][key]:
                    data["options"][key]["price"] = self._adjust_price(
                        data["options"][key]["price"]
                    )
                updated_count += 1

            # Сохраняем обновленные данные
            with open(self.materials_data_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

            return {"status": "success", "updated": updated_count}

        except Exception as e:
            print(f"Ошибка при обновлении цен: {e}")
            return {"status": "error", "message": str(e), "updated": 0}

    async def _load_materials_data(self) -> Dict:
        """Загрузка данных о материалах"""
        try:
            if not self.materials_data_path.exists():
                # Если файл не существует, создадим базовую структуру
                return {}

            with open(self.materials_data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Ошибка при загрузке данных о материалах: {e}")
            return {}

    def _adjust_price(self, current_price: float) -> float:
        """
        Симуляция изменения цены на рынке.
        Случайное изменение в диапазоне +/- 5%
        """
        change_percent = (random.random() - 0.5) * 10  # От -5% до +5%
        new_price = current_price * (1 + change_percent / 100)
        return round(new_price, 2)

    async def get_external_prices(self) -> Dict:
        """
        Получение цен из внешнего API (заглушка)
        В реальном проекте здесь будет запрос к API поставщиков
        """
        try:
            # Здесь должен быть запрос к API поставщиков
            # Для демонстрации просто возвращаем заглушку

            # Пример запроса с использованием aiohttp:
            # async with aiohttp.ClientSession() as session:
            #     async with session.get("https://api.provider.com/materials/prices") as response:
            #         if response.status == 200:
            #             return await response.json()

            return {
                "status": "success",
                "message": "Внешнее API недоступно, используются локальные данные",
                "data": {},
            }
        except Exception as e:
            print(f"Ошибка при получении внешних цен: {e}")
            return {"status": "error", "message": str(e), "data": {}}

    async def calculate_materials(
        self, data: MaterialsCalculatorInput
    ) -> MaterialsCalculationResult:
        """
        Расчет необходимых материалов на основе входных данных.

        Args:
            data: Входные данные для расчета

        Returns:
            MaterialsCalculationResult: Объект с результатами расчета материалов
        """
        # Расчет основных параметров дома
        house_params = self._calculate_house_parameters(data)

        # Расчет материалов для фундамента
        foundation_materials = self._calculate_foundation_materials(data, house_params)
        # Расчет стоимости материалов фундамента
        foundation_materials = self._calculate_materials_cost(
            foundation_materials, "foundation", data.foundation_type.value
        )

        # Расчет материалов для стен
        wall_materials = self._calculate_wall_materials(data, house_params)
        # Расчет стоимости материалов стен
        wall_materials = self._calculate_materials_cost(
            wall_materials, "walls", data.wall_material.value
        )

        # Расчет материалов для кровли
        roof_materials = self._calculate_roof_materials(data, house_params)
        # Расчет стоимости материалов кровли
        roof_materials = self._calculate_materials_cost(
            roof_materials, "roof", data.roof_type.value
        )

        # Общая стоимость всех материалов
        total_cost = self._calculate_total_cost(
            foundation_materials, wall_materials, roof_materials
        )

        # Формирование итогового результата
        result = MaterialsCalculationResult(
            materials=MaterialsResult(
                foundation=foundation_materials,
                walls=wall_materials,
                roof=roof_materials,
            ),
            total_cost=total_cost,
        )

        return result

    def _calculate_house_parameters(
        self, data: MaterialsCalculatorInput
    ) -> Dict[str, float]:
        """
        Расчет основных параметров дома.

        Args:
            data: Входные данные для расчета

        Returns:
            Dict: Словарь с расчетными параметрами дома
        """
        # Базовые параметры
        area = data.area
        floors = data.floors
        floor_height = data.floorHeight

        # Для простоты считаем, что дом прямоугольный с соотношением сторон 1.5:1
        width = math.sqrt(area / 1.5)
        length = area / width

        # Периметр дома
        perimeter = 2 * (length + width)

        # Общая высота стен
        wall_height = floor_height * floors

        # Площадь наружных стен (без проемов)
        walls_area = perimeter * wall_height

        # Вычитаем площадь окон и дверей (примерно 20% от площади наружных стен)
        net_wall_area = walls_area * 0.8

        # Возвращаем все расчетные параметры
        return {
            "area": area,
            "floors": floors,
            "floor_height": floor_height,
            "width": width,
            "length": length,
            "perimeter": perimeter,
            "wall_height": wall_height,
            "walls_area": walls_area,
            "net_wall_area": net_wall_area,
        }

    def _calculate_roof_area(
        self,
        house_params: Dict[str, float],
        roof_construction: RoofConstruction,
        roof_angle: float,
    ) -> float:
        """
        Расчет площади кровли с учетом типа и уклона.

        Args:
            house_params: Параметры дома
            roof_construction: Тип конструкции крыши
            roof_angle: Угол наклона крыши в градусах

        Returns:
            float: Площадь кровли в м²
        """
        base_area = house_params["area"]

        # Коэффициент для учета свесов крыши
        eaves_factor = 1.15

        # Плоская крыша
        if roof_angle < 5:
            return base_area * eaves_factor

        # Учитываем угол наклона крыши
        angle_rad = math.radians(roof_angle)
        slope_factor = 1.0 / math.cos(angle_rad)

        if roof_construction == RoofConstruction.GABLE:
            # Для двускатной крыши
            return base_area * slope_factor * eaves_factor
        elif roof_construction == RoofConstruction.HIP:
            # Для вальмовой крыши (более сложная геометрия)
            return base_area * slope_factor * 1.3 * eaves_factor
        elif roof_construction == RoofConstruction.MONO:
            # Для односкатной крыши
            return base_area * slope_factor * eaves_factor
        else:
            # Для других типов крыш используем усредненный коэффициент
            return base_area * slope_factor * 1.2 * eaves_factor

    def _calculate_foundation_materials(
        self, data: MaterialsCalculatorInput, house_params: Dict[str, float]
    ) -> List[MaterialItem]:
        """
        Расчет материалов для фундамента.

        Args:
            data: Входные данные
            house_params: Расчетные параметры дома

        Returns:
            List[MaterialItem]: Список необходимых материалов
        """
        foundation_type = data.foundation_type
        foundation_params = data.foundation_params
        perimeter = house_params["perimeter"]
        area = house_params["area"]

        materials = []

        if foundation_type == FoundationType.STRIP:
            # Ленточный фундамент
            width = float(foundation_params.get("width", 0.4))  # м
            depth = float(foundation_params.get("depth", 0.8))  # м
            height = float(foundation_params.get("height", 0.5))  # м

            # Объем бетона
            concrete_volume = perimeter * width * (depth + height)
            materials.append(
                MaterialItem(
                    name="Бетон для ленточного фундамента",
                    quantity=round(concrete_volume, 2),
                    unit="м³",
                )
            )

            # Арматура (примерно 70 кг на 1 м³ бетона)
            rebar_weight = concrete_volume * 70
            materials.append(
                MaterialItem(
                    name="Арматура", quantity=round(rebar_weight, 2), unit="кг"
                )
            )

            # Опалубка (обе стороны ленты)
            formwork_area = perimeter * (depth + height) * 2
            materials.append(
                MaterialItem(
                    name="Опалубка", quantity=round(formwork_area, 2), unit="м²"
                )
            )

            # Гидроизоляция
            waterproofing_area = perimeter * width * 1.1
            materials.append(
                MaterialItem(
                    name="Гидроизоляция",
                    quantity=round(waterproofing_area, 2),
                    unit="м²",
                )
            )

        elif foundation_type == FoundationType.SLAB:
            # Плитный фундамент
            thickness = float(foundation_params.get("thickness", 0.3))  # м
            cushion = float(foundation_params.get("cushion", 0.1))  # м

            # Объем бетона
            concrete_volume = area * thickness * 1.05  # +5% на запас
            materials.append(
                MaterialItem(
                    name="Бетон для плитного фундамента",
                    quantity=round(concrete_volume, 2),
                    unit="м³",
                )
            )

            # Арматура (примерно 80 кг на 1 м³ бетона)
            rebar_weight = concrete_volume * 80
            materials.append(
                MaterialItem(
                    name="Арматура", quantity=round(rebar_weight, 2), unit="кг"
                )
            )

            # Песчаная подушка
            sand_volume = area * cushion
            materials.append(
                MaterialItem(
                    name="Песок для подушки", quantity=round(sand_volume, 2), unit="м³"
                )
            )

            # Гидроизоляция
            waterproofing_area = area * 1.1
            materials.append(
                MaterialItem(
                    name="Гидроизоляция",
                    quantity=round(waterproofing_area, 2),
                    unit="м²",
                )
            )

        elif foundation_type == FoundationType.PILE:
            # Свайный фундамент
            pile_step = float(foundation_params.get("step", 2.5))  # м
            pile_diameter = float(foundation_params.get("diameter", 0.3))  # м
            pile_depth = float(foundation_params.get("depth", 2.0))  # м

            # Количество свай
            piles_count = (
                math.ceil(perimeter / pile_step) + 4
            )  # +4 для углов и доп. точек

            # Объем бетона для свай
            pile_volume = math.pi * (pile_diameter / 2) ** 2 * pile_depth
            pile_concrete_volume = pile_volume * piles_count

            # Объем бетона для ростверка
            grillage_height = 0.4  # м
            grillage_width = 0.4  # м
            grillage_volume = perimeter * grillage_height * grillage_width

            # Общий объем бетона
            concrete_volume = pile_concrete_volume + grillage_volume

            materials.append(
                MaterialItem(
                    name=f"Сваи, {pile_diameter}м x {pile_depth}м",
                    quantity=piles_count,
                    unit="шт",
                )
            )

            materials.append(
                MaterialItem(
                    name="Бетон для свай и ростверка",
                    quantity=round(concrete_volume, 2),
                    unit="м³",
                )
            )

            # Арматура
            rebar_weight = concrete_volume * 60  # кг/м³
            materials.append(
                MaterialItem(
                    name="Арматура", quantity=round(rebar_weight, 2), unit="кг"
                )
            )

        elif foundation_type == FoundationType.COLUMN:
            # Столбчатый фундамент
            column_step = float(foundation_params.get("step", 2.5))  # м
            column_size = float(foundation_params.get("size", 0.4))  # м
            column_depth = float(foundation_params.get("depth", 1.5))  # м

            # Количество столбов
            columns_count = (
                math.ceil(perimeter / column_step) + 4
            )  # +4 для углов и доп. точек

            # Объем бетона для столбов
            column_volume = (
                column_size * column_size * (column_depth + 0.3)
            )  # +0.3м над землей
            column_concrete_volume = column_volume * columns_count

            # Объем бетона для ростверка
            grillage_height = 0.4  # м
            grillage_width = 0.3  # м
            grillage_volume = perimeter * grillage_height * grillage_width

            # Общий объем бетона
            concrete_volume = column_concrete_volume + grillage_volume

            materials.append(
                MaterialItem(
                    name=f"Столбы, {column_size}м x {column_size}м x {column_depth + 0.3}м",
                    quantity=columns_count,
                    unit="шт",
                )
            )

            materials.append(
                MaterialItem(
                    name="Бетон для столбов и ростверка",
                    quantity=round(concrete_volume, 2),
                    unit="м³",
                )
            )

            # Арматура
            rebar_weight = concrete_volume * 65  # кг/м³
            materials.append(
                MaterialItem(
                    name="Арматура", quantity=round(rebar_weight, 2), unit="кг"
                )
            )

        return materials

    def _calculate_wall_materials(
        self, data: MaterialsCalculatorInput, house_params: Dict[str, float]
    ) -> List[MaterialItem]:
        """
        Расчет материалов для стен.

        Args:
            data: Входные данные
            house_params: Расчетные параметры дома

        Returns:
            List[MaterialItem]: Список необходимых материалов
        """
        wall_material = data.wall_material
        wall_params = data.wall_params
        net_wall_area = house_params["net_wall_area"]

        materials = []

        if wall_material == WallMaterial.BRICK:
            # Кирпичные стены
            thickness = float(wall_params.get("thickness", 0.38))  # м
            brick_type_key = wall_params.get("type", "solid")

            # Словарь для перевода типов кирпича на русский
            brick_types = {
                "solid": "керамический полнотелый",
                "hollow": "керамический пустотелый",
                "silicate": "силикатный",
                "porous": "поризованный",
            }

            # Получаем русское название типа кирпича
            brick_type = brick_types.get(brick_type_key, "обычный")

            # Количество кирпичей на 1 м²
            if thickness <= 0.12:
                # Полкирпича (тонкая перегородка)
                bricks_per_m2 = 52  # шт/м²
            elif thickness <= 0.25:
                # В один кирпич
                bricks_per_m2 = 102  # шт/м²
            else:
                # В полтора или два кирпича
                bricks_per_m2 = int(thickness / 0.12) * 52

            # Общее количество кирпичей
            brick_count = net_wall_area * bricks_per_m2

            materials.append(
                MaterialItem(
                    name=f"Кирпич {brick_type}", quantity=round(brick_count), unit="шт"
                )
            )

            # Объем раствора (примерно 0.2 м³ на 1000 кирпичей)
            mortar_volume = (brick_count / 1000) * 0.2
            materials.append(
                MaterialItem(
                    name="Раствор для кладки",
                    quantity=round(mortar_volume, 2),
                    unit="м³",
                )
            )

        elif wall_material == WallMaterial.WOOD:
            # Деревянные стены
            wood_type = wall_params.get("type", "сосна")
            wood_size = int(wall_params.get("size", 150))  # мм

            # Площадь сечения бруса в м²
            section_area = (wood_size / 1000) * (wood_size / 1000)

            # Количество венцов
            wall_height = house_params["wall_height"]
            venets_count = math.ceil(wall_height / (wood_size / 1000))

            # Общая длина бруса
            total_length = house_params["perimeter"] * venets_count

            # Объем материала
            volume = total_length * section_area

            materials.append(
                MaterialItem(
                    name=f"Брус {wood_type} {wood_size}x{wood_size} мм",
                    quantity=round(total_length, 2),
                    unit="м.п.",
                )
            )

            materials.append(
                MaterialItem(
                    name=f"Объем пиломатериалов {wood_type}",
                    quantity=round(volume, 2),
                    unit="м³",
                )
            )

            # Межвенцовый утеплитель
            materials.append(
                MaterialItem(
                    name="Межвенцовый утеплитель",
                    quantity=round(house_params["perimeter"] * venets_count, 2),
                    unit="м.п.",
                )
            )

        elif wall_material == WallMaterial.BLOCK:
            # Блочные стены
            block_type = wall_params.get("type", "газобетон")
            block_thickness = int(wall_params.get("thickness", 300))  # мм

            # Стандартный размер блока: длина x высота x толщина
            block_length = 0.6  # м
            block_height = 0.25  # м
            block_volume = block_length * block_height * (block_thickness / 1000)  # м³

            # Площадь одного блока в м²
            block_area = block_length * block_height  # м²

            # Количество блоков с учетом подрезки и боя (добавляем 5%)
            block_count = net_wall_area / block_area * 1.05

            # Объем блоков
            blocks_volume = block_count * block_volume

            materials.append(
                MaterialItem(
                    name=f"Блоки {block_type} {block_thickness} мм",
                    quantity=math.ceil(block_count),
                    unit="шт",
                )
            )

            # Клей для блоков (примерно 25 кг на 1 м³ кладки)
            glue_weight = blocks_volume * 25  # кг

            materials.append(
                MaterialItem(
                    name=f"Клей для блоков {block_type}",
                    quantity=round(glue_weight, 2),
                    unit="кг",
                )
            )

        elif wall_material == WallMaterial.CONCRETE:
            # Монолитный бетон
            thickness = int(wall_params.get("thickness", 200))  # мм
            concrete_class = wall_params.get("class", "B25")

            # Объем бетона
            concrete_volume = net_wall_area * (thickness / 1000)

            materials.append(
                MaterialItem(
                    name=f"Бетон {concrete_class} для стен",
                    quantity=round(concrete_volume, 2),
                    unit="м³",
                )
            )

            # Арматура (примерно 90 кг на 1 м³ бетона для стен)
            rebar_weight = concrete_volume * 90
            materials.append(
                MaterialItem(
                    name="Арматура для стен", quantity=round(rebar_weight, 2), unit="кг"
                )
            )

            # Опалубка (с двух сторон)
            formwork_area = net_wall_area * 2
            materials.append(
                MaterialItem(
                    name="Опалубка для стен",
                    quantity=round(formwork_area, 2),
                    unit="м²",
                )
            )

        elif wall_material == WallMaterial.PANEL:
            # Панельные стены
            panel_type = wall_params.get("type", "ЖБИ")
            panel_thickness = int(wall_params.get("thickness", 180))  # мм

            # Средняя площадь панели
            panel_area = 3.0 * 1.2  # 3.0 x 1.2 м

            # Количество панелей
            panel_count = math.ceil(net_wall_area / panel_area * 1.05)  # +5% на запас

            materials.append(
                MaterialItem(
                    name=f"Панели {panel_type} {panel_thickness} мм",
                    quantity=panel_count,
                    unit="шт",
                )
            )

            # Монтажные материалы
            materials.append(
                MaterialItem(
                    name="Монтажный комплект (метизы, сварка)",
                    quantity=panel_count,
                    unit="компл.",
                )
            )

            # Герметик для швов
            materials.append(
                MaterialItem(
                    name="Герметик для швов",
                    quantity=round(panel_count * 1.5, 2),
                    unit="л",
                )
            )

        return materials

    def _calculate_roof_materials(
        self, data: MaterialsCalculatorInput, house_params: Dict[str, float]
    ) -> List[MaterialItem]:
        """
        Расчет материалов для кровли.

        Args:
            data: Входные данные
            house_params: Расчетные параметры дома

        Returns:
            List[MaterialItem]: Список необходимых материалов
        """
        roof_type = data.roof_type
        roof_construction = data.roof_construction
        roof_angle = data.roof_angle

        # Расчет площади кровли
        roof_area = self._calculate_roof_area(
            house_params, roof_construction, roof_angle
        )

        materials = []

        # Стропильная система (для всех видов скатных крыш)
        if roof_angle > 5:
            # Стропила (доска 50x150 мм)
            rafter_step = 0.6  # м
            rafter_length = (
                house_params["width"] / math.cos(math.radians(roof_angle)) * 1.2
            )  # +20% на свесы
            rafter_count = math.ceil(house_params["length"] / rafter_step) + 1

            rafter_total_length = rafter_length * rafter_count

            materials.append(
                MaterialItem(
                    name="Стропила 50x150 мм",
                    quantity=round(rafter_total_length, 2),
                    unit="м.п.",
                )
            )

            # Обрешетка
            batten_step = 0.3  # м
            batten_rows = math.ceil(rafter_length / batten_step)
            batten_total_length = house_params["length"] * batten_rows

            materials.append(
                MaterialItem(
                    name="Обрешетка 25x100 мм",
                    quantity=round(batten_total_length, 2),
                    unit="м.п.",
                )
            )

            # Гидроизоляция
            materials.append(
                MaterialItem(
                    name="Гидроизоляционная мембрана",
                    quantity=round(roof_area * 1.15, 2),  # +15% на нахлесты
                    unit="м²",
                )
            )

        # Кровельный материал
        if roof_type == RoofType.METAL:
            # Металлочерепица
            materials.append(
                MaterialItem(
                    name="Металлочерепица",
                    quantity=round(roof_area * 1.1, 2),  # +10% на нахлесты и отходы
                    unit="м²",
                )
            )

            # Комплектующие
            materials.append(
                MaterialItem(
                    name="Комплектующие для металлочерепицы (коньки, планки)",
                    quantity=1,
                    unit="компл.",
                )
            )

        elif roof_type == RoofType.TILE:
            # Керамическая черепица
            tile_per_m2 = 10  # штук на м²
            tile_count = math.ceil(roof_area * tile_per_m2 * 1.05)  # +5% на бой

            materials.append(
                MaterialItem(
                    name="Керамическая черепица", quantity=tile_count, unit="шт"
                )
            )

            # Комплектующие
            materials.append(
                MaterialItem(
                    name="Комплектующие для черепицы (коньки, карнизы)",
                    quantity=1,
                    unit="компл.",
                )
            )

        elif roof_type == RoofType.SHINGLE:
            # Гибкая черепица
            materials.append(
                MaterialItem(
                    name="Гибкая черепица",
                    quantity=round(roof_area * 1.15, 2),  # +15% на нахлесты и отходы
                    unit="м²",
                )
            )

            # Подкладочный ковер
            materials.append(
                MaterialItem(
                    name="Подкладочный ковер", quantity=round(roof_area, 2), unit="м²"
                )
            )

            # OSB плиты
            materials.append(
                MaterialItem(
                    name="OSB плиты",
                    quantity=round(roof_area * 1.05, 2),  # +5% на подрезку
                    unit="м²",
                )
            )

        elif roof_type == RoofType.SLATE:
            # Шифер
            sheet_area = 1.75 * 1.13  # площадь одного листа (м²)
            sheet_count = math.ceil(
                roof_area / (sheet_area * 0.85) * 1.05
            )  # учитываем нахлесты и запас

            materials.append(
                MaterialItem(name="Шифер", quantity=sheet_count, unit="лист")
            )

            # Гвозди шиферные
            materials.append(
                MaterialItem(
                    name="Гвозди шиферные",
                    quantity=sheet_count * 6,  # ~6 гвоздей на лист
                    unit="шт",
                )
            )

        elif roof_type == RoofType.FLAT:
            # Плоская кровля
            materials.append(
                MaterialItem(
                    name="Рулонная гидроизоляция",
                    quantity=round(roof_area * 2.1, 2),  # 2 слоя + 10% на нахлесты
                    unit="м²",
                )
            )

            # Утеплитель
            materials.append(
                MaterialItem(
                    name="Утеплитель для плоской кровли",
                    quantity=round(roof_area * 1.05, 2),  # +5% на подрезку
                    unit="м²",
                )
            )

            # Цементно-песчаная стяжка
            materials.append(
                MaterialItem(
                    name="Цементно-песчаная стяжка",
                    quantity=round(roof_area * 0.05, 2),  # толщина 5 см
                    unit="м³",
                )
            )

        return materials

    def _calculate_materials_cost(
        self, materials: List[MaterialItem], category: str, type_key: str
    ) -> List[MaterialItem]:
        """
        Расчет стоимости материалов на основе их количества и цены.

        Args:
            materials: Список материалов
            category: Категория материалов (foundation, walls, roof)
            type_key: Ключ типа материала (например, strip, brick, metal)

        Returns:
            List[MaterialItem]: Обновленный список материалов с добавленной стоимостью
        """
        try:
            # Загружаем данные о материалах
            with open(self.materials_data_path, "r", encoding="utf-8") as f:
                materials_data = json.load(f)

            # Получаем детализированные материалы для данной категории и типа
            if category in materials_data and type_key in materials_data[category]:
                detailed_materials = materials_data[category][type_key].get(
                    "materials", {}
                )

                # Обновляем каждый элемент материала, добавляя стоимость
                updated_materials = []
                for material in materials:
                    # Ищем соответствующий материал в детализированных материалах
                    material_price = None
                    for key, details in detailed_materials.items():
                        if details["name"] == material.name:
                            material_price = details["price"]
                            break

                    # Если цена найдена, добавляем стоимость к материалу
                    if material_price is not None:
                        updated_material = MaterialItem(
                            name=material.name,
                            quantity=material.quantity,
                            unit=material.unit,
                            price=material_price,
                            total_cost=round(material.quantity * material_price, 2),
                        )
                    else:
                        # Если цена не найдена, используем приблизительную цену
                        estimated_price = self._get_estimated_price(
                            material.name, material.unit
                        )
                        updated_material = MaterialItem(
                            name=material.name,
                            quantity=material.quantity,
                            unit=material.unit,
                            price=estimated_price,
                            total_cost=round(material.quantity * estimated_price, 2),
                        )

                    updated_materials.append(updated_material)

                return updated_materials
            else:
                # Если категория или тип не найдены, возвращаем исходный список с приблизительными ценами
                return self._add_estimated_costs(materials)

        except Exception as e:
            print(f"Ошибка при расчете стоимости материалов: {e}")
            # В случае ошибки возвращаем исходный список с приблизительными ценами
            return self._add_estimated_costs(materials)

    def _add_estimated_costs(self, materials: List[MaterialItem]) -> List[MaterialItem]:
        """
        Добавляет оценочные стоимости материалам, если точные цены недоступны.

        Args:
            materials: Список материалов

        Returns:
            List[MaterialItem]: Обновленный список материалов с добавленной стоимостью
        """
        updated_materials = []
        for material in materials:
            estimated_price = self._get_estimated_price(material.name, material.unit)
            updated_material = MaterialItem(
                name=material.name,
                quantity=material.quantity,
                unit=material.unit,
                price=estimated_price,
                total_cost=round(material.quantity * estimated_price, 2),
            )
            updated_materials.append(updated_material)

        return updated_materials

    def _get_estimated_price(self, material_name: str, unit: str) -> float:
        """
        Получает оценочную цену для материала на основе его названия и единицы измерения.

        Args:
            material_name: Название материала
            unit: Единица измерения

        Returns:
            float: Оценочная цена
        """
        # Примерные цены для различных единиц измерения
        default_prices = {
            "м³": 5000,  # кубический метр
            "м²": 1000,  # квадратный метр
            "м.п.": 500,  # погонный метр
            "шт": 100,  # штука
            "кг": 75,  # килограмм
            "т": 7500,  # тонна
            "л": 500,  # литр
            "компл.": 5000,  # комплект
            "лист": 750,  # лист
        }

        # Возвращаем примерную цену для данной единицы измерения
        return default_prices.get(unit, 500)  # если единица не найдена, возвращаем 500

    def _calculate_total_cost(
        self,
        foundation_materials: List[MaterialItem],
        wall_materials: List[MaterialItem],
        roof_materials: List[MaterialItem],
    ) -> float:
        """
        Расчет общей стоимости всех материалов.

        Args:
            foundation_materials: Материалы фундамента
            wall_materials: Материалы стен
            roof_materials: Материалы кровли

        Returns:
            float: Общая стоимость всех материалов
        """
        total_cost = 0.0

        # Суммируем стоимость материалов фундамента
        for material in foundation_materials:
            if hasattr(material, "total_cost"):
                total_cost += material.total_cost

        # Суммируем стоимость материалов стен
        for material in wall_materials:
            if hasattr(material, "total_cost"):
                total_cost += material.total_cost

        # Суммируем стоимость материалов кровли
        for material in roof_materials:
            if hasattr(material, "total_cost"):
                total_cost += material.total_cost

        return round(total_cost, 2)
