from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class FoundationType(str, Enum):
    """Типы фундамента"""

    STRIP = "strip"  # Ленточный
    PILE = "pile"  # Свайный
    SLAB = "slab"  # Плитный
    COLUMN = "column"  # Столбчатый


class WallMaterial(str, Enum):
    """Материалы стен"""

    BRICK = "brick"  # Кирпич
    WOOD = "wood"  # Дерево
    BLOCK = "block"  # Блоки
    CONCRETE = "concrete"  # Монолитный бетон
    PANEL = "panel"  # Панели


class RoofType(str, Enum):
    """Типы кровли"""

    METAL = "metal"  # Металлочерепица
    TILE = "tile"  # Керамическая черепица
    SHINGLE = "shingle"  # Гибкая черепица
    SLATE = "slate"  # Шифер
    FLAT = "flat"  # Плоская кровля


class RoofConstruction(str, Enum):
    """Тип конструкции крыши"""

    GABLE = "gable"  # Двускатная
    HIP = "hip"  # Вальмовая
    MONO = "mono"  # Односкатная


class AdditionalOption(str, Enum):
    """Дополнительные опции"""

    GARAGE = "garage"  # Гараж
    BASEMENT = "basement"  # Подвал
    TERRACE = "terrace"  # Терраса
    BALCONY = "balcony"  # Балкон
    WARM_FLOOR = "warm_floor"  # Теплый пол
    SMART_HOME = "smart_home"  # Умный дом


class CalculatorInput(BaseModel):
    """Входные данные для калькулятора"""

    area: float = Field(..., description="Площадь дома в кв. метрах")
    foundation_type: FoundationType = Field(..., description="Тип фундамента")
    wall_material: WallMaterial = Field(..., description="Материал стен")
    floors: int = Field(..., description="Количество этажей", ge=1, le=3)
    roof_type: RoofType = Field(..., description="Тип кровли")
    additional_options: Optional[List[AdditionalOption]] = Field(
        default=[], description="Дополнительные опции"
    )


class CalculationResult(BaseModel):
    """Результат расчета калькулятора"""

    total_cost: float = Field(..., description="Общая стоимость строительства")
    cost_breakdown: Dict[str, float] = Field(
        ..., description="Разбивка стоимости по категориям"
    )
    recommendations: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Рекомендации по оптимизации"
    )


class CalculationDetail(BaseModel):
    """Детализация расчета"""

    category: str = Field(..., description="Категория расчета")
    name: str = Field(..., description="Наименование")
    quantity: float = Field(..., description="Количество")
    unit: str = Field(..., description="Единица измерения")
    price_per_unit: float = Field(..., description="Цена за единицу")
    total: float = Field(..., description="Итоговая стоимость")
    note: Optional[str] = Field(None, description="Примечание")


class Recommendation(BaseModel):
    """Рекомендация по оптимизации"""

    title: str
    description: str
    impact: str
    estimated_savings: Optional[float] = None


class RecommendationResponse(BaseModel):
    """Ответ с рекомендациями"""

    recommendations: List[Recommendation]
    summary: str


class RecommendationRequest(BaseModel):
    """Запрос на получение рекомендаций"""

    calculator_data: CalculatorInput
    budget: Optional[float] = None
    priority: Optional[str] = None


# Новые модели для расчета материалов


class FoundationParams(BaseModel):
    """Параметры фундамента"""

    # Общие для всех типов фундаментов поля могут быть здесь
    pass


class StripFoundationParams(FoundationParams):
    """Параметры ленточного фундамента"""

    width: float = Field(..., description="Ширина ленты в метрах")
    depth: float = Field(..., description="Глубина заложения в метрах")
    height: float = Field(..., description="Высота ленты в метрах")


class SlabFoundationParams(FoundationParams):
    """Параметры плитного фундамента"""

    thickness: float = Field(..., description="Толщина плиты в метрах")
    cushion: float = Field(..., description="Толщина подушки в метрах")


class PileFoundationParams(FoundationParams):
    """Параметры свайного фундамента"""

    step: float = Field(..., description="Шаг свай в метрах")
    diameter: float = Field(..., description="Диаметр сваи в метрах")
    depth: float = Field(..., description="Глубина сваи в метрах")


class ColumnFoundationParams(FoundationParams):
    """Параметры столбчатого фундамента"""

    step: float = Field(..., description="Шаг столбов в метрах")
    size: float = Field(..., description="Размер столба в метрах")
    depth: float = Field(..., description="Глубина заложения в метрах")


class WallParams(BaseModel):
    """Параметры стен"""

    # Общие для всех типов стен поля могут быть здесь
    pass


class BrickWallParams(WallParams):
    """Параметры кирпичных стен"""

    thickness: float = Field(..., description="Толщина стены в метрах")
    type: str = Field(..., description="Тип кирпича")


class WoodWallParams(WallParams):
    """Параметры деревянных стен"""

    type: str = Field(..., description="Тип дерева")
    size: int = Field(..., description="Размер сечения в мм")


class BlockWallParams(WallParams):
    """Параметры блочных стен"""

    type: str = Field(..., description="Тип блока")
    thickness: int = Field(..., description="Толщина блока в мм")


class ConcreteWallParams(WallParams):
    """Параметры монолитных стен"""

    thickness: int = Field(..., description="Толщина стены в мм")
    class_: str = Field(..., alias="class", description="Класс бетона")


class PanelWallParams(WallParams):
    """Параметры панельных стен"""

    type: str = Field(..., description="Тип панели")
    thickness: int = Field(..., description="Толщина панели в мм")


class MaterialPrice(BaseModel):
    """Информация о цене материала"""

    name: str = Field(..., description="Наименование материала")
    unit: str = Field(..., description="Единица измерения")
    price: float = Field(..., description="Цена за единицу")
    description: Optional[str] = Field(None, description="Описание материала")


class MaterialItem(BaseModel):
    """Модель для представления материала в результатах расчета"""

    name: str = Field(..., description="Наименование материала")
    quantity: float = Field(..., description="Количество")
    unit: str = Field(..., description="Единица измерения")
    price: Optional[float] = Field(None, description="Цена за единицу")
    total_cost: Optional[float] = Field(None, description="Общая стоимость")
    detail: Optional[str] = Field(
        None, description="Дополнительная информация о материале"
    )


class MaterialsResult(BaseModel):
    """Результат расчета материалов"""

    foundation: List[MaterialItem] = Field(..., description="Материалы для фундамента")
    walls: List[MaterialItem] = Field(..., description="Материалы для стен")
    roof: List[MaterialItem] = Field(..., description="Материалы для кровли")


class MaterialsCalculationResult(BaseModel):
    """Результат расчета калькулятора материалов"""

    materials: MaterialsResult = Field(..., description="Необходимые материалы")
    total_cost: Optional[float] = Field(
        None, description="Общая стоимость всех материалов"
    )


class MaterialsCalculatorInput(BaseModel):
    """Входные данные для калькулятора материалов"""

    # Базовые параметры
    area: float = Field(..., description="Площадь дома в кв. метрах")
    floorHeight: float = Field(..., description="Высота этажа в метрах")
    floors: int = Field(..., description="Количество этажей", ge=1, le=3)

    # Фундамент
    foundation_type: FoundationType = Field(..., description="Тип фундамента")
    foundation_params: Dict[str, Any] = Field(..., description="Параметры фундамента")

    # Стены
    wall_material: WallMaterial = Field(..., description="Материал стен")
    wall_params: Dict[str, Any] = Field(..., description="Параметры стен")

    # Крыша
    roof_type: RoofType = Field(..., description="Тип кровли")
    roof_construction: RoofConstruction = Field(
        ..., description="Тип конструкции крыши"
    )
    roof_angle: float = Field(..., description="Угол наклона крыши в градусах")
    roof_height: float = Field(1.5, description="Высота крыши в метрах")
    roof_overhang: float = Field(0.6, description="Свес крыши в метрах")
    roof_material: str = Field("metal", description="Материал кровли")


# Классы для совместимости с API


class CalculatorRequest(BaseModel):
    """Запрос для калькулятора строительства"""

    area: float = Field(..., description="Площадь дома в кв. метрах")
    foundation_type: FoundationType = Field(..., description="Тип фундамента")
    wall_material: WallMaterial = Field(..., description="Материал стен")
    floors: int = Field(..., description="Количество этажей", ge=1, le=3)
    roof_type: RoofType = Field(..., description="Тип кровли")
    additional_options: Optional[List[AdditionalOption]] = Field(
        default=[], description="Дополнительные опции"
    )


class CalculatorResponse(BaseModel):
    """Ответ калькулятора строительства"""

    total_cost: float = Field(..., description="Общая стоимость строительства")
    cost_breakdown: Dict[str, float] = Field(
        ..., description="Разбивка стоимости по категориям"
    )
    recommendations: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Рекомендации по оптимизации"
    )
