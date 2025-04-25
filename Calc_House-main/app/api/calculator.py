from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any
import math
import json

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import (
    CalculatorRequest,
    CalculatorResponse,
    MaterialsCalculatorInput,
    FoundationType,
    WallMaterial,
    RoofType,
    RoofConstruction,
)
from app.services.calculator_service import CalculatorService
from app.services.materials_service import MaterialsService

router = APIRouter()


@router.post("/calculate", response_model=CalculatorResponse)
async def calculate_construction(
    data: CalculatorRequest,
    service: CalculatorService = Depends(lambda: CalculatorService()),
):
    """
    Расчет стоимости строительства дома
    """
    try:
        result = await service.calculate(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-materials")
async def calculate_materials(
    data: MaterialsCalculatorInput,
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """
    Расчет материалов для строительства дома с ценами
    """
    try:
        result = await service.calculate_materials(data)

        # Преобразуем объект Pydantic к словарю с детализацией материалов
        response = {
            "foundation": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.foundation
            ],
            "walls": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.walls
            ],
            "roof": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.roof
            ],
            "total_cost": result.total_cost,
        }

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculator/calculate-materials")
async def calculate_simple_materials(request: Request):
    """
    Упрощенный расчет материалов для строительства дома

    Этот маршрут соответствует старой реализации из routes.py и используется
    frontend-кодом для совместимости. Принимает данные в простом формате JSON.
    """
    try:
        data = await request.json()

        # Проверяем наличие необходимых данных
        if not data:
            raise HTTPException(
                status_code=400, detail="Не получены данные для расчета"
            )

        # Извлекаем параметры дома
        house_length = float(data.get("houseLength", 0))
        house_width = float(data.get("houseWidth", 0))
        floors = int(data.get("floors", 1))
        ceiling_height = float(data.get("ceilingHeight", 2.7))

        # Проверяем основные параметры
        if house_length <= 0 or house_width <= 0 or floors <= 0 or ceiling_height <= 0:
            raise HTTPException(status_code=400, detail="Некорректные параметры дома")

        # Получаем выбранные материалы и их параметры
        materials = data.get("materials", {})

        # Рассчитываем площадь и объемы
        house_area = house_length * house_width
        wall_perimeter = 2 * (house_length + house_width)

        # Подготавливаем результат
        result = {
            "houseLength": house_length,
            "houseWidth": house_width,
            "houseArea": house_area,
            "floors": floors,
            "items": {"foundation": [], "walls": [], "roof": []},
        }

        # Расчет материалов для фундамента
        foundation_type = materials.get("foundation", {}).get("type", "strip")
        foundation_selected_materials = materials.get("foundation", {}).get(
            "selectedMaterials", []
        )

        # Расчет для ленточного фундамента
        if foundation_type == "strip":
            # Параметры ленточного фундамента
            strip_width = float(data.get("stripWidth", 0.4))
            strip_height = float(data.get("stripHeight", 0.8))

            # Объем бетона для ленточного фундамента
            concrete_volume = wall_perimeter * strip_width * strip_height

            # Добавляем выбранные материалы
            if "concrete_m200" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М200",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 4500.0,
                    }
                )

            if "concrete_m300" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М300",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5200.0,
                    }
                )

            if "concrete_m400" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М400",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5800.0,
                    }
                )

            if "rebar_a400" in foundation_selected_materials:
                # Арматура (примерно 70 кг на кубометр бетона)
                rebar_weight = concrete_volume * 70.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А400",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 60.0,
                    }
                )

            if "rebar_a500" in foundation_selected_materials:
                rebar_weight = concrete_volume * 70.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А500",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 65.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if not result["items"]["foundation"]:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М300",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5200.0,
                    }
                )

                rebar_weight = concrete_volume * 70.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А400",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 60.0,
                    }
                )

        # Расчет для плитного фундамента
        elif foundation_type == "slab":
            # Параметры плитного фундамента
            slab_thickness = float(data.get("slabThickness", 0.3))

            # Объем бетона для плитного фундамента
            concrete_volume = house_area * slab_thickness

            # Добавляем выбранные материалы
            if "concrete_m200" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М200",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 4500.0,
                    }
                )

            if "concrete_m300" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М300",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5200.0,
                    }
                )

            if "concrete_m400" in foundation_selected_materials:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М400",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5800.0,
                    }
                )

            if "rebar_a400" in foundation_selected_materials:
                # Арматура (примерно 90 кг на кубометр бетона)
                rebar_weight = concrete_volume * 90.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А400",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 60.0,
                    }
                )

            if "rebar_a500" in foundation_selected_materials:
                rebar_weight = concrete_volume * 90.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А500",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 65.0,
                    }
                )

            if "waterproofing" in foundation_selected_materials:
                # Гидроизоляция
                waterproofing_area = house_area * 1.1  # с запасом 10%
                result["items"]["foundation"].append(
                    {
                        "name": "Гидроизоляция (рулонная)",
                        "quantity": waterproofing_area,
                        "unit": "м²",
                        "price": 120.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if not result["items"]["foundation"]:
                result["items"]["foundation"].append(
                    {
                        "name": "Бетон М300",
                        "quantity": concrete_volume,
                        "unit": "м³",
                        "price": 5200.0,
                    }
                )

                rebar_weight = concrete_volume * 90.0
                result["items"]["foundation"].append(
                    {
                        "name": "Арматура А400",
                        "quantity": rebar_weight,
                        "unit": "кг",
                        "price": 60.0,
                    }
                )

                waterproofing_area = house_area * 1.1
                result["items"]["foundation"].append(
                    {
                        "name": "Гидроизоляция (рулонная)",
                        "quantity": waterproofing_area,
                        "unit": "м²",
                        "price": 120.0,
                    }
                )

        # Расчет материалов для стен
        wall_type = materials.get("walls", {}).get("type", "brick")
        walls_selected_materials = materials.get("walls", {}).get(
            "selectedMaterials", []
        )

        # Общая площадь стен (с учетом этажей и высоты потолков)
        walls_area = wall_perimeter * ceiling_height * floors

        # Расчет для кирпичных стен
        if wall_type == "brick":
            # Получаем дополнительные параметры для кирпичных стен
            brick_type = materials.get("walls", {}).get("brickType", "ordinary")
            brick_thickness = float(materials.get("walls", {}).get("thickness", 0.38))

            # Количество кирпичей на 1 м² стены
            bricks_per_sqm = 51 if brick_thickness <= 0.25 else 103

            # Общее количество кирпичей
            bricks_count = walls_area * bricks_per_sqm

            # Объем раствора (примерно 0.25 м³ на 1000 кирпичей)
            mortar_volume = (bricks_count / 1000) * 0.25

            if brick_type == "ordinary" or "brick_ordinary" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Кирпич обыкновенный",
                        "quantity": bricks_count,
                        "unit": "шт",
                        "price": 12.0,
                    }
                )

            if brick_type == "face" or "brick_face" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Кирпич облицовочный",
                        "quantity": bricks_count,
                        "unit": "шт",
                        "price": 20.0,
                    }
                )

            if brick_type == "silicate" or "brick_silicate" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Кирпич силикатный",
                        "quantity": bricks_count,
                        "unit": "шт",
                        "price": 14.0,
                    }
                )

            if "cement_mortar" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Цементный раствор",
                        "quantity": mortar_volume,
                        "unit": "м³",
                        "price": 2800.0,
                    }
                )

            if "lime_mortar" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Известковый раствор",
                        "quantity": mortar_volume,
                        "unit": "м³",
                        "price": 2500.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if not result["items"]["walls"]:
                result["items"]["walls"].append(
                    {
                        "name": "Кирпич обыкновенный",
                        "quantity": bricks_count,
                        "unit": "шт",
                        "price": 12.0,
                    }
                )

                result["items"]["walls"].append(
                    {
                        "name": "Цементный раствор",
                        "quantity": mortar_volume,
                        "unit": "м³",
                        "price": 2800.0,
                    }
                )

        # Расчет для деревянных стен
        elif wall_type == "wood":
            # Объем дерева (с учетом запаса)
            wood_volume = walls_area * 0.20  # примерно 20 см толщина

            if "pine" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Сосна (брус/бревно)",
                        "quantity": wood_volume,
                        "unit": "м³",
                        "price": 19000.0,
                    }
                )

            if "larch" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Лиственница (брус/бревно)",
                        "quantity": wood_volume,
                        "unit": "м³",
                        "price": 25000.0,
                    }
                )

            if "oak" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Дуб (брус/бревно)",
                        "quantity": wood_volume,
                        "unit": "м³",
                        "price": 35000.0,
                    }
                )

            if "insulation" in walls_selected_materials:
                result["items"]["walls"].append(
                    {
                        "name": "Утеплитель (минеральная вата)",
                        "quantity": walls_area,
                        "unit": "м²",
                        "price": 350.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if not result["items"]["walls"]:
                result["items"]["walls"].append(
                    {
                        "name": "Сосна (брус/бревно)",
                        "quantity": wood_volume,
                        "unit": "м³",
                        "price": 19000.0,
                    }
                )

                result["items"]["walls"].append(
                    {
                        "name": "Утеплитель (минеральная вата)",
                        "quantity": walls_area,
                        "unit": "м²",
                        "price": 350.0,
                    }
                )

        # Расчет материалов для кровли
        roof_type = materials.get("roof", {}).get("type", "pitched")
        roof_selected_materials = materials.get("roof", {}).get("selectedMaterials", [])

        # Площадь кровли (с учетом наклона)
        roof_angle = float(data.get("roofAngle", 25))
        roof_multiplier = 1.0 / math.cos(math.radians(roof_angle))
        roof_area = house_area * roof_multiplier

        # Расчет для скатной кровли
        if roof_type == "pitched":
            # Обрешетка (с запасом 20%)
            battens_volume = roof_area * 0.025  # примерно 2.5 см объема на м²

            # Обработка различных типов металлочерепицы
            if any(mat.startswith("metal_tile_") for mat in roof_selected_materials):
                # Определяем тип металлочерепицы
                metal_tile_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("metal_tile_")
                    ),
                    "metal_tile_standard",
                )

                # Цены в зависимости от типа
                metal_tile_prices = {
                    "metal_tile_standard": 500.0,
                    "metal_tile_premium": 900.0,
                    "metal_tile_matte": 700.0,
                }

                # Добавляем выбранную металлочерепицу
                result["items"]["roof"].append(
                    {
                        "name": f"Металлочерепица {metal_tile_type.replace('metal_tile_', '')}",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": metal_tile_prices.get(metal_tile_type, 500.0),
                    }
                )
            elif "metal_tile" in roof_selected_materials:
                # Обратная совместимость со старым вариантом
                result["items"]["roof"].append(
                    {
                        "name": "Металлочерепица",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 500.0,
                    }
                )

            # Обработка битумной черепицы
            if "bitumen_tile" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Битумная черепица",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 450.0,
                    }
                )

            # Обработка керамической черепицы
            if "ceramic_tile" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Керамическая черепица",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 1200.0,
                    }
                )

            # Обработка различных типов стропил
            if any(mat.startswith("rafters_") for mat in roof_selected_materials):
                # Определяем тип стропил
                rafters_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("rafters_")
                    ),
                    "rafters_50x150",
                )

                # Размеры стропил и цены
                rafters_info = {
                    "rafters_50x150": {
                        "name": "Стропила 50x150 мм",
                        "volume_factor": 1.0,
                        "price": 17000.0,
                    },
                    "rafters_50x200": {
                        "name": "Стропила 50x200 мм",
                        "volume_factor": 1.33,
                        "price": 18000.0,
                    },
                    "rafters_100x150": {
                        "name": "Стропила 100x150 мм",
                        "volume_factor": 2.0,
                        "price": 19000.0,
                    },
                }

                rafters_info_selected = rafters_info.get(
                    rafters_type, rafters_info["rafters_50x150"]
                )

                # Объем стропил с учетом типа
                rafters_volume = (
                    battens_volume * 2 * rafters_info_selected["volume_factor"]
                )

                result["items"]["roof"].append(
                    {
                        "name": rafters_info_selected["name"],
                        "quantity": rafters_volume,
                        "unit": "м³",
                        "price": rafters_info_selected["price"],
                    }
                )
            elif "rafters" in roof_selected_materials:
                # Обратная совместимость
                result["items"]["roof"].append(
                    {
                        "name": "Стропильная система",
                        "quantity": battens_volume * 2,
                        "unit": "м³",
                        "price": 17000.0,
                    }
                )

            # Обработка различных типов обрешетки
            if any(mat.startswith("batten_") for mat in roof_selected_materials):
                # Определяем тип обрешетки
                batten_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("batten_")
                    ),
                    "batten_25x100",
                )

                # Размеры обрешетки и цены
                batten_info = {
                    "batten_25x100": {
                        "name": "Обрешетка 25x100 мм",
                        "volume_factor": 1.0,
                        "price": 15000.0,
                    },
                    "batten_25x150": {
                        "name": "Обрешетка 25x150 мм",
                        "volume_factor": 1.5,
                        "price": 16000.0,
                    },
                    "batten_40x100": {
                        "name": "Обрешетка 40x100 мм",
                        "volume_factor": 1.6,
                        "price": 17000.0,
                    },
                }

                batten_info_selected = batten_info.get(
                    batten_type, batten_info["batten_25x100"]
                )

                # Объем обрешетки с учетом типа
                batten_volume = battens_volume * batten_info_selected["volume_factor"]

                result["items"]["roof"].append(
                    {
                        "name": batten_info_selected["name"],
                        "quantity": batten_volume,
                        "unit": "м³",
                        "price": batten_info_selected["price"],
                    }
                )
            elif "batten" in roof_selected_materials:
                # Обратная совместимость
                result["items"]["roof"].append(
                    {
                        "name": "Обрешетка (доска 25x100)",
                        "quantity": battens_volume,
                        "unit": "м³",
                        "price": 15000.0,
                    }
                )

            # Обработка утеплителя
            if "roof_insulation" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Утеплитель кровельный",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 380.0,
                    }
                )

            # Обработка различных типов гидроизоляции
            if any(mat.startswith("waterproofing_") for mat in roof_selected_materials):
                # Определяем тип гидроизоляции
                waterproofing_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("waterproofing_")
                    ),
                    "waterproofing_standard",
                )

                # Типы гидроизоляции и цены
                waterproofing_info = {
                    "waterproofing_standard": {
                        "name": "Гидроизоляционная пленка стандарт",
                        "price": 150.0,
                    },
                    "waterproofing_premium": {
                        "name": "Гидроизоляционная пленка премиум",
                        "price": 250.0,
                    },
                    "waterproofing_diffusion": {
                        "name": "Диффузионная мембрана",
                        "price": 350.0,
                    },
                }

                waterproofing_info_selected = waterproofing_info.get(
                    waterproofing_type, waterproofing_info["waterproofing_standard"]
                )

                result["items"]["roof"].append(
                    {
                        "name": waterproofing_info_selected["name"],
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": waterproofing_info_selected["price"],
                    }
                )
            elif (
                "waterproofing_film" in roof_selected_materials
                or "waterproofing" in roof_selected_materials
            ):
                # Обратная совместимость
                result["items"]["roof"].append(
                    {
                        "name": "Гидроизоляционная пленка",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 150.0,
                    }
                )

            # Обработка различных крепежных элементов
            if any(
                mat.startswith("screws_") or mat.startswith("fasteners_")
                for mat in roof_selected_materials
            ):
                # Определяем тип крепежа
                fasteners_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("screws_") or mat.startswith("fasteners_")
                    ),
                    "screws_standard",
                )

                # Типы крепежа и цены (за шт. для саморезов и за компл. для набора)
                fasteners_info = {
                    "screws_standard": {
                        "name": "Саморезы кровельные стандарт",
                        "quantity": roof_area * 8,
                        "unit": "шт",
                        "price": 5.0,
                    },
                    "screws_premium": {
                        "name": "Саморезы кровельные усиленные",
                        "quantity": roof_area * 8,
                        "unit": "шт",
                        "price": 8.0,
                    },
                    "fasteners_set": {
                        "name": "Комплексный набор креплений",
                        "quantity": roof_area / 10,
                        "unit": "компл.",
                        "price": 500.0,
                    },
                }

                fasteners_info_selected = fasteners_info.get(
                    fasteners_type, fasteners_info["screws_standard"]
                )

                result["items"]["roof"].append(
                    {
                        "name": fasteners_info_selected["name"],
                        "quantity": fasteners_info_selected["quantity"],
                        "unit": fasteners_info_selected["unit"],
                        "price": fasteners_info_selected["price"],
                    }
                )
            elif "screws" in roof_selected_materials:
                # Обратная совместимость
                result["items"]["roof"].append(
                    {
                        "name": "Саморезы кровельные",
                        "quantity": roof_area * 8,
                        "unit": "шт",
                        "price": 5.0,
                    }
                )

            # Обработка различных доборных элементов
            if any(
                mat.startswith("ridge_elements")
                or mat.startswith("valley_elements")
                or mat == "full_set"
                for mat in roof_selected_materials
            ):
                # Определяем тип доборных элементов
                extra_elements_type = next(
                    (
                        mat
                        for mat in roof_selected_materials
                        if mat.startswith("ridge_elements")
                        or mat.startswith("valley_elements")
                        or mat == "full_set"
                    ),
                    "ridge_elements",
                )

                # Типы доборных элементов и цены
                extra_elements_info = {
                    "ridge_elements": {
                        "name": "Коньковые элементы",
                        "quantity": house_length,
                        "unit": "м.п.",
                        "price": 400.0,
                    },
                    "valley_elements": {
                        "name": "Ендовы",
                        "quantity": house_length * 0.5,
                        "unit": "м.п.",
                        "price": 450.0,
                    },
                    "full_set": {
                        "name": "Полный комплект доборных элементов",
                        "quantity": 1,
                        "unit": "компл.",
                        "price": house_length * 1000.0,
                    },
                }

                extra_elements_info_selected = extra_elements_info.get(
                    extra_elements_type, extra_elements_info["ridge_elements"]
                )

                result["items"]["roof"].append(
                    {
                        "name": extra_elements_info_selected["name"],
                        "quantity": extra_elements_info_selected["quantity"],
                        "unit": extra_elements_info_selected["unit"],
                        "price": extra_elements_info_selected["price"],
                    }
                )
            elif "ridge_elements" in roof_selected_materials:
                # Обратная совместимость
                result["items"]["roof"].append(
                    {
                        "name": "Коньковые элементы",
                        "quantity": house_length,
                        "unit": "м.п.",
                        "price": 400.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if (
                len(result["items"]["roof"]) <= 2
            ):  # только обрешетка и стропильная система
                result["items"]["roof"].append(
                    {
                        "name": "Металлочерепица",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 500.0,
                    }
                )

                result["items"]["roof"].append(
                    {
                        "name": "Гидроизоляционная пленка",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 150.0,
                    }
                )

        # Расчет для плоской кровли
        elif roof_type == "flat":
            if "bitumen_roll" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Рулонный битум",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 280.0,
                    }
                )

            if "polymer_membrane" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Полимерная мембрана",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 600.0,
                    }
                )

            if "flat_roof_insulation" in roof_selected_materials:
                result["items"]["roof"].append(
                    {
                        "name": "Утеплитель для плоской кровли",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 450.0,
                    }
                )

            # Если ничего не выбрано, добавляем стандартные материалы
            if not result["items"]["roof"]:
                result["items"]["roof"].append(
                    {
                        "name": "Рулонный битум",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 280.0,
                    }
                )

                result["items"]["roof"].append(
                    {
                        "name": "Утеплитель для плоской кровли",
                        "quantity": roof_area,
                        "unit": "м²",
                        "price": 450.0,
                    }
                )

        # Расчет общей стоимости
        total_cost = 0
        for section in result["items"].values():
            for item in section:
                total_cost += item["quantity"] * item["price"]

        result["totalCost"] = total_cost

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Произошла ошибка при расчете: {str(e)}"
        )


@router.post("/form-calculate-materials")
async def form_calculate_materials(
    request: Request,
    service: MaterialsService = Depends(lambda: MaterialsService()),
):
    """
    Обработка данных из формы калькулятора и расчет необходимых материалов

    Этот эндпоинт принимает данные из формы на главной странице и преобразует их
    в формат для расчета материалов.
    """
    try:
        # Получаем данные формы
        form_data = await request.json()

        # Преобразуем данные формы в формат для расчета
        calculator_input = await _convert_form_data_to_calculator_input(form_data)

        # Вызываем сервис для расчета материалов
        result = await service.calculate_materials(calculator_input)

        # Преобразуем результат для отображения на клиенте
        response = {
            "foundation": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.foundation
            ],
            "walls": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.walls
            ],
            "roof": [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.roof
            ],
            "total_cost": result.total_cost,
        }

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка расчета: {str(e)}")


async def _convert_form_data_to_calculator_input(
    form_data: Dict,
) -> MaterialsCalculatorInput:
    """
    Преобразует данные из формы в формат для расчета материалов
    """
    # Базовые параметры
    area = float(form_data.get("area", 100))
    floor_height = float(form_data.get("floorHeight", 2.7))
    floors = int(form_data.get("floors", 1))

    # Фундамент
    foundation_type = form_data.get("foundationType", "strip")
    foundation_params = {}

    if foundation_type == "strip":
        foundation_params = {
            "width": float(form_data.get("stripWidth", 0.4)),
            "height": float(form_data.get("stripHeight", 0.5)),
            "depth": float(form_data.get("stripDepth", 1.2)),
            "concrete": form_data.get("foundation_concrete", "concrete_b20"),
        }
    elif foundation_type == "slab":
        foundation_params = {
            "thickness": float(form_data.get("slabThickness", 0.2)),
            "cushion": float(form_data.get("slabCushion", 0.15)),
            "concrete": form_data.get("slab_concrete", "concrete_b25"),
        }
    elif foundation_type == "pile":
        foundation_params = {
            "step": float(form_data.get("pileStep", 1.5)),
            "diameter": float(form_data.get("pileDiameter", 0.2)),
            "depth": float(form_data.get("pileDepth", 2.5)),
            "type": form_data.get("pile_type", "piles_concrete"),
        }
    elif foundation_type == "column":
        foundation_params = {
            "step": float(form_data.get("columnStep", 1.5)),
            "size": float(form_data.get("columnSize", 0.3)),
            "depth": float(form_data.get("columnDepth", 1.5)),
            "type": form_data.get("column_type", "columns_concrete"),
        }

    # Стены
    wall_material = form_data.get("wallMaterial", "brick")
    wall_params = {}

    if wall_material == "brick":
        wall_params = {
            "thickness": 0.38,  # м
            "type": form_data.get("brickType", "solid"),
            "mortar": form_data.get("brick_mortar", "mortar_cement"),
            "insulation": form_data.get("brick_insulation", "insulation_mineral"),
        }
    elif wall_material == "wood":
        wall_params = {
            "type": form_data.get("woodType", "timber"),
            "size": form_data.get("woodSize", "150"),
            "materials": form_data.get("wood_materials", "wall_insulation"),
        }
    elif wall_material == "block":
        wall_params = {
            "type": form_data.get("blockType", "aerated_concrete"),
            "thickness": form_data.get("blockThickness", "300"),
            "materials": form_data.get("block_materials", "adhesive"),
        }
    elif wall_material == "concrete":
        wall_params = {
            "thickness": form_data.get("concreteThickness", "200"),
            "class": form_data.get("concreteClass", "B25"),
            "materials": form_data.get("concrete_materials", "all"),
        }
    elif wall_material == "panel":
        wall_params = {
            "type": form_data.get("panelType", "sip_panels"),
            "thickness": form_data.get("panelThickness", "150"),
            "materials": form_data.get("panel_materials", "both"),
        }

    # Крыша
    roof_type = form_data.get("roofType", "metal")
    roof_construction = form_data.get("roofConstruction", "gable")
    roof_angle = float(form_data.get("roofAngle", 30))

    # Создаем экземпляр MaterialsCalculatorInput
    return MaterialsCalculatorInput(
        area=area,
        floorHeight=floor_height,
        floors=floors,
        foundation_type=FoundationType(foundation_type),
        foundation_params=foundation_params,
        wall_material=WallMaterial(wall_material),
        wall_params=wall_params,
        roof_type=RoofType(roof_type),
        roof_construction=RoofConstruction(roof_construction),
        roof_angle=roof_angle,
    )
