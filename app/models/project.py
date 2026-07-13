"""
Модели данных для калькулятора v2 — рисование плана дома по стенам.

Все координаты и размеры хранятся в миллиметрах (целые числа).
На фронтенде переводим в метры только для отображения.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ============================================================
# Базовые геометрические примитивы
# ============================================================

class Point(BaseModel):
    """Точка в плане (миллиметры)."""

    x: int = Field(..., description="Координата X, мм")
    y: int = Field(..., description="Координата Y, мм")


# ============================================================
# Слои стены (многослойный пирог)
# ============================================================

class LayerRole(str, Enum):
    """Назначение слоя в конструкции стены."""

    LOADBEARING = "loadbearing"  # Несущий (кирпич, блок, бетон, брус)
    INSULATION = "insulation"  # Утеплитель
    CLADDING = "cladding"  # Облицовка/фасад
    FINISHING = "finishing"  # Внутренняя отделка
    VAPOR = "vapor"  # Пароизоляция/гидроизоляция


class Layer(BaseModel):
    """Один слой конструкции стены (или перекрытия/кровли)."""

    role: LayerRole = Field(..., description="Назначение слоя")
    material_key: str = Field(..., description="Ключ материала в materials.json")
    thickness: int = Field(..., ge=1, description="Толщина слоя, мм")


# ============================================================
# Проёмы
# ============================================================

class OpeningType(str, Enum):
    DOOR = "door"
    WINDOW = "window"


class Opening(BaseModel):
    """Дверной или оконный проём на стене."""

    type: OpeningType = Field(..., description="Тип проёма")
    offset: int = Field(..., ge=0, description="Смещение от начала стены, мм")
    width: int = Field(..., ge=100, description="Ширина проёма, мм")
    height: int = Field(..., ge=100, description="Высота проёма, мм")
    sill_height: int = Field(
        0, ge=0, description="Высота подоконника от пола, мм (для окон); 0 для дверей"
    )


# ============================================================
# Стена
# ============================================================

class WallSegment(BaseModel):
    """
    Отрезок стены между двумя точками.

    В v1 поддерживаются только ортогональные стены (0° или 90°):
    либо |x1-x2|==0, либо |y1-y2|==0.
    """

    id: str = Field(..., description="Уникальный идентификатор стены")
    p1: Point = Field(..., description="Начало стены")
    p2: Point = Field(..., description="Конец стены")
    thickness: int = Field(400, ge=50, description="Толщина стены, мм")
    height: int = Field(2800, ge=2000, le=6000, description="Высота стены, мм")
    load_bearing: bool = Field(True, description="Несущая стена (влияет на фундамент)")
    external: bool = Field(True, description="Наружная стена (внешний контур)")
    layers: List[Layer] = Field(
        default_factory=list, description="Слои стены (пирог)"
    )
    openings: List[Opening] = Field(
        default_factory=list, description="Проёмы на стене"
    )


# ============================================================
# Фундамент
# ============================================================

class FoundationType(str, Enum):
    STRIP = "strip"  # Ленточный
    SLAB = "slab"  # Плитный
    PILE = "pile"  # Свайный
    COLUMN = "column"  # Столбчатый


class FoundationConfig(BaseModel):
    """Конфигурация фундамента. Поля зависят от типа."""

    type: FoundationType = Field(..., description="Тип фундамента")

    # Ленточный
    strip_width: Optional[int] = Field(None, ge=100, description="Ширина ленты, мм")
    strip_depth: Optional[int] = Field(None, ge=300, description="Глубина заложения, мм")
    strip_height: Optional[int] = Field(None, ge=0, description="Высота над землёй, мм")
    strip_cushion: Optional[int] = Field(
        None, ge=0, description="Песчаная подушка под ленту, мм"
    )

    # Плитный
    slab_thickness: Optional[int] = Field(None, ge=100, description="Толщина плиты, мм")
    slab_cushion: Optional[int] = Field(None, ge=0, description="Толщина песчаной подушки, мм")

    # Свайный
    pile_step: Optional[int] = Field(None, ge=500, description="Шаг свай, мм")
    pile_diameter: Optional[int] = Field(None, ge=150, description="Диаметр сваи, мм")
    pile_depth: Optional[int] = Field(None, ge=1000, description="Глубина сваи, мм")

    # Столбчатый
    column_step: Optional[int] = Field(None, ge=500, description="Шаг столбов, мм")
    column_size: Optional[int] = Field(None, ge=200, description="Размер столба, мм")
    column_depth: Optional[int] = Field(None, ge=600, description="Глубина заложения, мм")

    # Материалы
    concrete_key: str = Field("concrete_b25", description="Ключ бетона в materials.json")
    rebar_key: str = Field("rebar_a400", description="Ключ арматуры в materials.json")
    formwork_key: str = Field("formwork_plywood", description="Ключ опалубки")
    waterproofing_key: str = Field("strip_default", description="Ключ гидроизоляции")
    sand_key: str = Field("sand_river", description="Ключ песка для подушки")


# ============================================================
# Кровля
# ============================================================

class RoofConstruction(str, Enum):
    GABLE = "gable"  # Двускатная
    HIP = "hip"  # Вальмовая
    MONO = "mono"  # Односкатная
    FLAT = "flat"  # Плоская


class RoofConfig(BaseModel):
    """Конфигурация кровли. Простая модель v1: площадь скатов = footprint / cos(angle)."""

    construction: RoofConstruction = Field(..., description="Тип конструкции крыши")
    angle: float = Field(30, ge=0, le=89, description="Угол наклона, градусы")
    overhang: int = Field(600, ge=0, description="Свес кровли, мм")
    material_key: str = Field("metal", description="Тп кровельного покрытия (ключ в materials.json)")
    insulation_key: Optional[str] = Field(None, description="Утеплитель кровли (ключ)")
    rafter_section_key: str = Field("rafters", description="Сечение стропил (ключ)")
    batten_key: str = Field("batten", description="Обрешётка (ключ)")
    waterproofing_key: str = Field("waterproofing", description="Гидроизоляция кровли (ключ)")

    warm: bool = Field(True, description="Тёплая мансарда (иначе холодный чердак)")
    rafter_step_mm: int = Field(600, ge=300, le=1200, description="Шаг стропил, мм")
    mauerplat_required: bool = Field(True, description="Считать мауэрлат")
    vapor_key: str = Field("vapor_barrier", description="Пароизоляция (ключ)")
    valley_count: int = Field(0, ge=0, description="Число ендов")
    gutter: bool = Field(True, description="Водосточная система")
    snow_guards: bool = Field(True, description="Снегозадержатели")
    gable_planks: bool = Field(True, description="Фронтонные/ветровые планки")
    drip_edges: bool = Field(True, description="Капельники")


# ============================================================
# Междуэтажные перекрытия
# ============================================================

class FloorType(str, Enum):
    CONCRETE = "concrete"  # Монолитное железобетонное
    SLAB = "slab"  # Сборные железобетонные плиты


class FloorConfig(BaseModel):
    """Конфигурация междуэтажных перекрытий."""

    type: FloorType = Field(..., description="Тип перекрытия")
    thickness: int = Field(200, ge=100, description="Толщина перекрытия, мм (для монолита)")
    concrete_key: str = Field("concrete_200", description="Ключ бетона для монолита")
    rebar_key: str = Field("rebar", description="Ключ арматуры")
    formwork_key: str = Field("formwork", description="Ключ опалубки")
    slab_key: str = Field("slab_60_12_8", description="Ключ сборной плиты")
    mortar_key: str = Field("mortar", description="Ключ раствора для швов")


# ============================================================
# Проект дома
# ============================================================

class Project(BaseModel):
    """
    Полное описание проекта дома для расчёта.

    Внешние стены рисуются на 1-м этаже и автоматически копируются
    на верхние этажи (единый внешний контур).
    Внутренние стены — свои на каждом этаже (ключ = номер этажа, начиная с 1).
    """

    name: str = Field("Мой проект", description="Название проекта")
    floors_count: int = Field(1, ge=1, le=3, description="Количество этажей")
    floor_height: int = Field(2800, ge=2000, le=4000, description="Высота этажа, мм (единая)")

    external_walls: List[WallSegment] = Field(
        default_factory=list, description="Внешние стены (единый контур для всех этажей)"
    )
    internal_walls: Dict[int, List[WallSegment]] = Field(
        default_factory=dict,
        description="Внутренние стены по этажам: {1: [...], 2: [...]}",
    )

    foundation: Optional[FoundationConfig] = Field(None, description="Фундамент")
    roof: Optional[RoofConfig] = Field(None, description="Кровля")
    floor_config: Optional[FloorConfig] = Field(
        None, description="Междуэтажные перекрытия"
    )


# ============================================================
# Результаты геометрии (возвращает Geometry Engine)
# ============================================================

class WallMetrics(BaseModel):
    """Геометрические показатели одной стены."""

    wall_id: str
    length_mm: int = Field(..., description="Длина стены, мм")
    gross_area_m2: float = Field(..., description="Площадь без вычета проёмов, м²")
    net_area_m2: float = Field(..., description="Площадь за вычетом проёмов, м²")
    opening_area_m2: float = Field(..., description="Суммарная площадь проёмов, м²")
    volume_m3: float = Field(..., description="Объём стены (по толщине), м³")


class RoomInfo(BaseModel):
    """Информация о замкнутом помещении, образованном стенами."""

    area_m2: float = Field(..., description="Площадь помещения, м²")
    perimeter_mm: int = Field(..., description="Периметр помещения, мм")
    centroid_x: int = Field(..., description="X центра помещения для размещения подписи, мм")
    centroid_y: int = Field(..., description="Y центра помещения для размещения подписи, мм")


class GeometryResult(BaseModel):
    """Результат работы геометрического движка."""

    is_closed: bool = Field(..., description="Замкнут ли внешний контур")
    perimeter_mm: int = Field(..., description="Периметр внешних стен, мм")
    footprint_area_m2: float = Field(..., description="Площадь застройки, м²")
    foundation_length_mm: int = Field(
        ..., description="Суммарная длина несущих стен (под фундамент), мм"
    )
    bbox_width_mm: int = Field(..., description="Ширина габаритного контура, мм")
    bbox_length_mm: int = Field(..., description="Длина габаритного контура, мм")
    roof_area_m2: float = Field(..., description="Площадь скатов кровли, м²")
    roof_eaves_length_mm: int = Field(..., description="Длина карнизного свеса, мм")
    roof_ridge_length_mm: int = Field(..., description="Длина конька, мм")
    floor_area_m2: float = Field(
        ..., description="Площадь перекрытий на один этаж (= footprint), м²"
    )
    external_wall_metrics: List[WallMetrics] = Field(
        default_factory=list, description="Метрики внешних стен"
    )
    internal_wall_metrics: Dict[int, List[WallMetrics]] = Field(
        default_factory=dict, description="Метрики внутренних стен по этажам"
    )
    total_wall_net_area_m2: float = Field(
        ..., description="Суммарная чистая площадь всех стен, м²"
    )
    rooms_by_floor: Dict[int, List[RoomInfo]] = Field(
        default_factory=dict,
        description="Замкнутые помещения по этажам: {1: [room1, room2], 2: [...]}",
    )
    errors: List[str] = Field(default_factory=list, description="Ошибки/предупреждения")


# ============================================================
# Результаты расчёта материалов
# ============================================================

class MaterialItem(BaseModel):
    """Одна позиция материала в спецификации."""

    name: str = Field(..., description="Наименование")
    quantity: int = Field(..., description="Количество (округляется до целого в большую сторону)")
    unit: str = Field(..., description="Единица измерения")
    price: Optional[float] = Field(None, description="Цена за единицу, руб")
    total_cost: Optional[float] = Field(None, description="Суммарная стоимость, руб")
    detail: Optional[str] = Field(None, description="Пояснение к расчёту")


class SectionResult(BaseModel):
    """Результат расчёта по одному разделу (фундамент/стены/перекрытия/кровля)."""

    materials: List[MaterialItem] = Field(default_factory=list)
    section_total: float = 0.0  # Итог по разделу, руб


class MaterialsResult(BaseModel):
    """Полный результат расчёта материалов."""

    geometry: GeometryResult = Field(..., description="Геометрия (для справки)")
    foundation: SectionResult = Field(default_factory=SectionResult)
    walls: SectionResult = Field(default_factory=SectionResult)
    floors: SectionResult = Field(default_factory=SectionResult)
    roof: SectionResult = Field(default_factory=SectionResult)
    total_cost: float = Field(0.0, description="Итоговая стоимость материалов, руб")
    works_rate_percent: float = Field(
        0.0, description="Процент стоимости работ к материалам, %"
    )
    works_estimate_cost: float = Field(
        0.0, description="Оценка стоимости работ, руб"
    )
