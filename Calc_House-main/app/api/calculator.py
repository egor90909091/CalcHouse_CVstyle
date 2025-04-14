from fastapi import APIRouter, Depends, HTTPException

# Исправляем импорты с учетом структуры папки app
from app.models.calculator import CalculatorRequest, CalculatorResponse
from app.services.calculator_service import CalculatorService

router = APIRouter()
calculator_service = CalculatorService()


@router.post("/calculate", response_model=CalculatorResponse)
async def calculate_construction_cost(request: CalculatorRequest):
    """
    Расчет стоимости строительства дома на основе введенных параметров.

    - **area**: Площадь дома в м²
    - **foundation_type**: Тип фундамента (strip, pile, slab, column)
    - **wall_material**: Материал стен (brick, wood, block, concrete, panel)
    - **floors**: Количество этажей (1-3)
    - **roof_type**: Тип кровли (metal, tile, shingle, slate, flat)
    - **additional_options**: Дополнительные опции (garage, basement, terrace, etc.)
    """
    try:
        calculation_result = await calculator_service.calculate(request)
        return calculation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при расчете: {str(e)}")
