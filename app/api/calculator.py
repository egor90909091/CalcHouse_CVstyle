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


def safe_float(value, default=0):
    if isinstance(value, list):
        # Если это список, возьмите первое значение или используйте значение по умолчанию
        return float(value[0]) if value else default
    return float(value) if value is not None else default


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

        # Добавляем материалы для пола, если есть этажи > 1
        if data.floors > 1 and data.floor_type and result.materials.floors:
            response["floors"] = [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.floors
            ]

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
        house_length = safe_float(data.get("houseLength", 0))
        house_width = safe_float(data.get("houseWidth", 0))
        floors = int(data.get("floors", 1))
        ceiling_height = safe_float(data.get("ceilingHeight", 2.7))

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
            strip_width = safe_float(data.get("stripWidth", 0.4))
            strip_height = safe_float(data.get("stripHeight", 0.8))
            strip_depth = safe_float(data.get("stripDepth", 1.2))

            # Параметры арматуры
            longitudinal_rebar_diameter = int(data.get("longitudinalRebarDiameter", 12))
            transverse_rebar_diameter = int(data.get("transverseRebarDiameter", 8))

            # Добавляем параметры в объект foundation_params
            foundation_params = {
                "width": strip_width,
                "height": strip_height,
                "depth": strip_depth,
                "longitudinal_rebar_diameter": longitudinal_rebar_diameter,
                "transverse_rebar_diameter": transverse_rebar_diameter,
            }

            # Объем бетона для ленточного фундамента
            concrete_volume = (
                wall_perimeter * strip_width * (strip_depth + strip_height)
            )

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
            slab_thickness = safe_float(data.get("slabThickness", 0.2))
            slab_cushion = safe_float(data.get("slabCushion", 0.15))

            # Параметры арматуры
            slab_main_rebar_diameter = int(data.get("slabMainRebarDiameter", 12))
            slab_distribution_rebar_diameter = int(
                data.get("slabDistributionRebarDiameter", 8)
            )

            # Добавляем параметры в объект foundation_params
            foundation_params = {
                "thickness": slab_thickness,
                "cushion": slab_cushion,
                "main_rebar_diameter": slab_main_rebar_diameter,
                "distribution_rebar_diameter": slab_distribution_rebar_diameter,
            }

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

        # Расчет для свайного фундамента
        elif foundation_type == "pile":
            # Параметры свайного фундамента
            pile_step = safe_float(data.get("pileStep", 1.5))
            pile_diameter = safe_float(data.get("pileDiameter", 0.2))
            pile_depth = safe_float(data.get("pileDepth", 2.5))

            # Параметры арматуры
            pile_longitudinal_rebar_diameter = int(
                data.get("pileLongitudinalRebarDiameter", 12)
            )
            pile_transverse_rebar_diameter = int(
                data.get("pileTransverseRebarDiameter", 8)
            )
            grillage_longitudinal_rebar_diameter = int(
                data.get("grillageLongitudinalRebarDiameter", 12)
            )
            grillage_transverse_rebar_diameter = int(
                data.get("grillageTransverseRebarDiameter", 8)
            )

            # Добавляем параметры в объект foundation_params
            foundation_params = {
                "step": pile_step,
                "diameter": pile_diameter,
                "depth": pile_depth,
                "pile_longitudinal_rebar_diameter": pile_longitudinal_rebar_diameter,
                "pile_transverse_rebar_diameter": pile_transverse_rebar_diameter,
                "grillage_longitudinal_rebar_diameter": grillage_longitudinal_rebar_diameter,
                "grillage_transverse_rebar_diameter": grillage_transverse_rebar_diameter,
            }

            # Объем бетона для свайного фундамента
            concrete_volume = pile_depth * pile_diameter**2 * math.pi

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

        # Расчет для столбчатого фундамента
        elif foundation_type == "column":
            # Параметры столбчатого фундамента
            column_step = safe_float(data.get("columnStep", 1.5))
            column_size = safe_float(data.get("columnSize", 0.3))
            column_depth = safe_float(data.get("columnDepth", 1.5))

            # Параметры арматуры
            column_longitudinal_rebar_diameter = int(
                data.get("columnLongitudinalRebarDiameter", 12)
            )
            column_transverse_rebar_diameter = int(
                data.get("columnTransverseRebarDiameter", 8)
            )
            beam_longitudinal_rebar_diameter = int(
                data.get("beamLongitudinalRebarDiameter", 12)
            )
            beam_transverse_rebar_diameter = int(
                data.get("beamTransverseRebarDiameter", 8)
            )

            # Добавляем параметры в объект foundation_params
            foundation_params = {
                "step": column_step,
                "size": column_size,
                "depth": column_depth,
                "column_longitudinal_rebar_diameter": column_longitudinal_rebar_diameter,
                "column_transverse_rebar_diameter": column_transverse_rebar_diameter,
                "beam_longitudinal_rebar_diameter": beam_longitudinal_rebar_diameter,
                "beam_transverse_rebar_diameter": beam_transverse_rebar_diameter,
            }

            # Объем бетона для столбчатого фундамента
            concrete_volume = column_depth * column_size**2 * math.pi

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
            brick_thickness = safe_float(
                materials.get("walls", {}).get("thickness", 0.38)
            )

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

            # Добавляем утеплитель для кирпичных стен
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
        roof_angle = safe_float(data.get("roofAngle", 25))
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

        # Добавляем материалы для пола, если есть этажи > 1
        if (
            calculator_input.floors > 1
            and calculator_input.floor_type
            and result.materials.floors
        ):
            response["floors"] = [
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "price": item.price,
                    "total_cost": item.total_cost,
                }
                for item in result.materials.floors
            ]

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
    area = safe_float(form_data.get("area", 100))
    floor_height = safe_float(form_data.get("floorHeight", 2.7))
    floors = (
        int(form_data.get("floors", 1))
        if not isinstance(form_data.get("floors"), list)
        else int(form_data.get("floors", [1])[0])
    )

    # Добавляем обработку типа межэтажного перекрытия для домов больше 1 этажа
    floor_type = None
    floor_params = None

    if floors > 1:
        floor_type_value = form_data.get("floor_type", "wood")
        if isinstance(floor_type_value, list):
            floor_type = floor_type_value[0] if floor_type_value else "wood"
        else:
            floor_type = floor_type_value

        # Заполняем параметры пола в зависимости от типа
        floor_params = {}
        if floor_type == "wood":
            # Проверка типа балок
            beam_type_value = form_data.get("beam_type", "pine")
            if isinstance(beam_type_value, list):
                beam_type = beam_type_value[0] if beam_type_value else "pine"
            else:
                beam_type = beam_type_value

            # Проверка размера балок
            beam_size_value = form_data.get("beam_size", "200")
            if isinstance(beam_size_value, list):
                beam_size = beam_size_value[0] if beam_size_value else "200"
            else:
                beam_size = beam_size_value

            floor_params = {
                "beam_type": beam_type,
                "beam_size": beam_size,
                "beam_spacing": 0.6,  # Значение по умолчанию
            }
        elif floor_type == "concrete":
            # Проверка класса бетона
            concrete_class_value = form_data.get("concrete_class", "B25")
            if isinstance(concrete_class_value, list):
                concrete_class = (
                    concrete_class_value[0] if concrete_class_value else "B25"
                )
            else:
                concrete_class = concrete_class_value

            floor_params = {
                "concrete_class": concrete_class,
                "concrete_thickness": safe_float(
                    form_data.get("concrete_thickness", 20)
                )
                / 100,  # Переводим см в метры
            }
        elif floor_type == "slab":
            # Проверка типа плит
            slab_type_value = form_data.get("slab_type", "solid")
            if isinstance(slab_type_value, list):
                slab_type = slab_type_value[0] if slab_type_value else "solid"
            else:
                slab_type = slab_type_value

            # Проверка толщины плит
            slab_thickness_value = form_data.get("slab_thickness", "20")
            if isinstance(slab_thickness_value, list):
                slab_thickness = (
                    slab_thickness_value[0] if slab_thickness_value else "20"
                )
            else:
                slab_thickness = slab_thickness_value

            floor_params = {"slab_type": slab_type, "slab_thickness": slab_thickness}
        elif floor_type == "prefab":
            # Проверка типа панелей
            panel_type_value = form_data.get("panel_type", "reinforced")
            if isinstance(panel_type_value, list):
                panel_type = panel_type_value[0] if panel_type_value else "reinforced"
            else:
                panel_type = panel_type_value

            # Проверка размера панелей
            panel_size_value = form_data.get("panel_size", "medium")
            if isinstance(panel_size_value, list):
                panel_size = panel_size_value[0] if panel_size_value else "medium"
            else:
                panel_size = panel_size_value

            floor_params = {"panel_type": panel_type, "panel_size": panel_size}
        elif floor_type == "steel":
            # Проверка типа профиля
            beam_profile_value = form_data.get("beam_profile", "channel")
            if isinstance(beam_profile_value, list):
                beam_profile = (
                    beam_profile_value[0] if beam_profile_value else "channel"
                )
            else:
                beam_profile = beam_profile_value

            floor_params = {
                "beam_profile": beam_profile,
                "beam_spacing": safe_float(form_data.get("beam_spacing", 0.6)),
            }

    # Фундамент
    foundation_type_value = form_data.get("foundationType", "strip")
    if isinstance(foundation_type_value, list):
        foundation_type = foundation_type_value[0] if foundation_type_value else "strip"
    else:
        foundation_type = foundation_type_value

    foundation_params = {}

    if foundation_type == "strip":
        # Проверка параметров бетона
        foundation_concrete_value = form_data.get("foundation_concrete", "concrete_b20")
        if isinstance(foundation_concrete_value, list):
            foundation_concrete = (
                foundation_concrete_value[0]
                if foundation_concrete_value
                else "concrete_b20"
            )
        else:
            foundation_concrete = foundation_concrete_value

        foundation_params = {
            "width": safe_float(form_data.get("stripWidth", 0.4)),
            "height": safe_float(form_data.get("stripHeight", 0.5)),
            "depth": safe_float(form_data.get("stripDepth", 1.2)),
            "longitudinal_rebar_diameter": (
                int(form_data.get("longitudinalRebarDiameter", 12))
                if not isinstance(form_data.get("longitudinalRebarDiameter"), list)
                else int(form_data.get("longitudinalRebarDiameter", [12])[0])
            ),
            "transverse_rebar_diameter": (
                int(form_data.get("transverseRebarDiameter", 8))
                if not isinstance(form_data.get("transverseRebarDiameter"), list)
                else int(form_data.get("transverseRebarDiameter", [8])[0])
            ),
            "concrete": foundation_concrete,
        }
    elif foundation_type == "slab":
        # Проверка параметров бетона
        slab_concrete_value = form_data.get("slab_concrete", "concrete_b25")
        if isinstance(slab_concrete_value, list):
            slab_concrete = (
                slab_concrete_value[0] if slab_concrete_value else "concrete_b25"
            )
        else:
            slab_concrete = slab_concrete_value

        foundation_params = {
            "thickness": safe_float(form_data.get("slabThickness", 0.2)),
            "cushion": safe_float(form_data.get("slabCushion", 0.15)),
            "concrete": slab_concrete,
        }
    elif foundation_type == "pile":
        # Проверка типа свай
        pile_type_value = form_data.get("pile_type", "piles_concrete")
        if isinstance(pile_type_value, list):
            pile_type = pile_type_value[0] if pile_type_value else "piles_concrete"
        else:
            pile_type = pile_type_value

        # Проверка типа гидроизоляции
        pile_waterproofing_value = form_data.get(
            "pile_waterproofing", "waterproofing_roll"
        )
        if isinstance(pile_waterproofing_value, list):
            pile_waterproofing = (
                pile_waterproofing_value[0]
                if pile_waterproofing_value
                else "waterproofing_roll"
            )
        else:
            pile_waterproofing = pile_waterproofing_value

        foundation_params = {
            "step": safe_float(form_data.get("pileStep", 1.5)),
            "diameter": safe_float(form_data.get("pileDiameter", 0.2)),
            "depth": safe_float(form_data.get("pileDepth", 2.5)),
            "type": pile_type,
            "waterproofing": pile_waterproofing,
        }
    elif foundation_type == "column":
        # Проверка типа колонн
        column_type_value = form_data.get("column_type", "columns_concrete")
        if isinstance(column_type_value, list):
            column_type = (
                column_type_value[0] if column_type_value else "columns_concrete"
            )
        else:
            column_type = column_type_value

        # Проверка типа гидроизоляции
        column_waterproofing_value = form_data.get(
            "column_waterproofing", "waterproofing_roll"
        )
        if isinstance(column_waterproofing_value, list):
            column_waterproofing = (
                column_waterproofing_value[0]
                if column_waterproofing_value
                else "waterproofing_roll"
            )
        else:
            column_waterproofing = column_waterproofing_value

        foundation_params = {
            "step": safe_float(form_data.get("columnStep", 1.5)),
            "size": safe_float(form_data.get("columnSize", 0.3)),
            "depth": safe_float(form_data.get("columnDepth", 1.5)),
            "type": column_type,
            "waterproofing": column_waterproofing,
        }

    # Стены
    wall_material_value = form_data.get("wallMaterial", "brick")
    if isinstance(wall_material_value, list):
        wall_material = wall_material_value[0] if wall_material_value else "brick"
    else:
        wall_material = wall_material_value

    wall_params = {}

    if wall_material == "brick":
        # Проверка типа кирпича
        brick_type_value = form_data.get("brickType", "solid")
        if isinstance(brick_type_value, list):
            brick_type = brick_type_value[0] if brick_type_value else "solid"
        else:
            brick_type = brick_type_value

        # Проверка раствора
        brick_mortar_value = form_data.get("brick_mortar", "mortar_cement")
        if isinstance(brick_mortar_value, list):
            brick_mortar = (
                brick_mortar_value[0] if brick_mortar_value else "mortar_cement"
            )
        else:
            brick_mortar = brick_mortar_value

        # Проверка утеплителя
        brick_insulation_value = form_data.get("brick_insulation", "insulation_mineral")
        if isinstance(brick_insulation_value, list):
            brick_insulation = (
                brick_insulation_value[0]
                if brick_insulation_value
                else "insulation_mineral"
            )
        else:
            brick_insulation = brick_insulation_value

        wall_params = {
            "thickness": safe_float(
                form_data.get("brickThickness", 0.38)
            ),  # Берем толщину из параметров формы
            "type": brick_type,
            "mortar": brick_mortar,
            "insulation": brick_insulation,
        }
    elif wall_material == "wood":
        # Проверка типа древесины
        wood_type_value = form_data.get("woodType", "timber")
        if isinstance(wood_type_value, list):
            wood_type = wood_type_value[0] if wood_type_value else "timber"
        else:
            wood_type = wood_type_value

        # Проверка размера древесины
        wood_size_value = form_data.get("woodSize", "150")
        if isinstance(wood_size_value, list):
            wood_size = wood_size_value[0] if wood_size_value else "150"
        else:
            wood_size = wood_size_value

        # Проверка материалов
        wood_materials_value = form_data.get("wood_materials", "wall_insulation")
        if isinstance(wood_materials_value, list):
            wood_materials = (
                wood_materials_value[0] if wood_materials_value else "wall_insulation"
            )
        else:
            wood_materials = wood_materials_value

        wall_params = {
            "type": wood_type,
            "size": wood_size,
            "materials": wood_materials,
        }
    elif wall_material == "block":
        # Проверка типа блоков
        block_type_value = form_data.get("blockType", "lightweight")
        if isinstance(block_type_value, list):
            block_type = block_type_value[0] if block_type_value else "lightweight"
        else:
            block_type = block_type_value

        # Проверка раствора
        block_mortar_value = form_data.get("block_mortar", "mortar_cement")
        if isinstance(block_mortar_value, list):
            block_mortar = (
                block_mortar_value[0] if block_mortar_value else "mortar_cement"
            )
        else:
            block_mortar = block_mortar_value

        # Проверка утеплителя
        block_insulation_value = form_data.get("block_insulation", "insulation_mineral")
        if isinstance(block_insulation_value, list):
            block_insulation = (
                block_insulation_value[0]
                if block_insulation_value
                else "insulation_mineral"
            )
        else:
            block_insulation = block_insulation_value

        wall_params = {
            "thickness": safe_float(form_data.get("blockThickness", 0.4)),
            "type": block_type,
            "mortar": block_mortar,
            "insulation": block_insulation,
        }
    elif wall_material == "concrete":
        # Проверка типа бетона
        concrete_type_value = form_data.get("concreteType", "concrete_b25")
        if isinstance(concrete_type_value, list):
            concrete_type = (
                concrete_type_value[0] if concrete_type_value else "concrete_b25"
            )
        else:
            concrete_type = concrete_type_value

        # Проверка утеплителя
        concrete_insulation_value = form_data.get(
            "concrete_insulation", "insulation_mineral"
        )
        if isinstance(concrete_insulation_value, list):
            concrete_insulation = (
                concrete_insulation_value[0]
                if concrete_insulation_value
                else "insulation_mineral"
            )
        else:
            concrete_insulation = concrete_insulation_value

        wall_params = {
            "thickness": safe_float(form_data.get("concreteThickness", 0.2)),
            "type": concrete_type,
            "insulation": concrete_insulation,
        }
    elif wall_material == "panel":
        # Проверка типа панелей
        panel_type_value = form_data.get("panelType", "panel_concrete")
        if isinstance(panel_type_value, list):
            panel_type = panel_type_value[0] if panel_type_value else "panel_concrete"
        else:
            panel_type = panel_type_value

        # Проверка толщины панелей
        panel_thickness_value = form_data.get("panelThickness", "180")
        if isinstance(panel_thickness_value, list):
            panel_thickness = (
                panel_thickness_value[0] if panel_thickness_value else "180"
            )
        else:
            panel_thickness = panel_thickness_value

        wall_params = {
            "type": panel_type,
            "thickness": panel_thickness,
        }

    # Крыша
    roof_type_value = form_data.get("roofType", "pitched")
    if isinstance(roof_type_value, list):
        roof_type = roof_type_value[0] if roof_type_value else "pitched"
    else:
        roof_type = roof_type_value

    # Проверка конструкции крыши
    roof_construction_value = form_data.get("roofConstruction", "gable")
    if isinstance(roof_construction_value, list):
        roof_construction = (
            roof_construction_value[0] if roof_construction_value else "gable"
        )
    else:
        roof_construction = roof_construction_value

    # Проверка материала крыши
    roof_material_value = form_data.get("roofMaterial", "metal")
    if isinstance(roof_material_value, list):
        roof_material = roof_material_value[0] if roof_material_value else "metal"
    else:
        roof_material = roof_material_value

    roof_params = {
        "type": roof_type,
        "construction": roof_construction,
        "angle": safe_float(form_data.get("roofAngle", 25)),
        "height": safe_float(form_data.get("roofHeight", 1.5)),
        "overhang": safe_float(form_data.get("roofOverhang", 0.6)),
        "material": roof_material,
    }

    # Создаем экземпляр MaterialsCalculatorInput
    return MaterialsCalculatorInput(
        area=area,
        floorHeight=floor_height,
        floors=floors,
        foundation_type=FoundationType(foundation_type),
        foundation_params=foundation_params,
        wall_material=WallMaterial(wall_material),
        wall_params=wall_params,
        floor_type=floor_type,
        floor_params=floor_params,
        roof_type=RoofType(roof_type),
        roof_construction=RoofConstruction(roof_construction),
        roof_angle=roof_params["angle"],
        roof_height=roof_params["height"],
        roof_overhang=roof_params["overhang"],
        roof_material=roof_material,
    )
