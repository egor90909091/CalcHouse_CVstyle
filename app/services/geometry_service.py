"""
Геометрический движок v2.

Принимает стены с координатами (мм) и вычисляет точные геометрические
параметры дома: периметр, площадь застройки, метрики каждой стены
(с вычетом проёмов), длину фундамента, геометрию кровли.

Использует Shapely для операций с полигонами.
Все входные координаты — в миллиметрах (целые).
Выходные площади/объёмы — в метрических единицах (м², м³).
"""

import math
from typing import Dict, List, Optional, Tuple

from shapely.geometry import Polygon, LineString, Point as ShapelyPoint
from shapely.ops import polygonize, unary_union
from shapely.validation import explain_validity

from app.models.project import (
    GeometryResult,
    Opening,
    Point,
    Project,
    RoofConstruction,
    RoomInfo,
    WallMetrics,
    WallSegment,
)


# Допуск при сопоставлении точек стен (мм)
_TOLERANCE_MM = 5


def _dist_mm(p1: Point, p2: Point) -> float:
    """Евклидово расстояние между двумя точками в мм."""
    return math.hypot(p1.x - p2.x, p1.y - p2.y)


def _wall_length_mm(wall: WallSegment) -> float:
    """Длина стены в мм."""
    return _dist_mm(wall.p1, wall.p2)


def _points_match(a: Point, b: Point, tol: float = _TOLERANCE_MM) -> bool:
    """Совпадают ли две точки в пределах допуска."""
    return _dist_mm(a, b) <= tol


def _reverse_wall(wall: WallSegment) -> WallSegment:
    """Развернуть стену задом наперёд (p1 <-> p2). Открытия не трогаем —
    их offset считается от p1, поэтому при развороте нужно пересчитать offset."""
    new_length = _wall_length_mm(wall)
    new_wall = wall.model_copy()
    new_wall.p1, new_wall.p2 = wall.p2, wall.p1
    # Пересчитываем смещения проёмов от нового начала
    new_wall.openings = [
        Opening(
            type=o.type,
            offset=round(new_length - o.offset - o.width),
            width=o.width,
            height=o.height,
            sill_height=o.sill_height,
        )
        for o in wall.openings
    ]
    return new_wall


def order_walls_into_loop(walls: List[WallSegment]) -> Tuple[List[WallSegment], bool]:
    """
    Упорядочить стены в замкнутый контур так, чтобы конец предыдущей
    совпадал с началом следующей.

    Возвращает (упорядоченный_список, замкнут_ли_контур).
    Если контур не замкнут, возвращает частичный результат.
    """
    if not walls:
        return [], False

    ordered: List[WallSegment] = []
    used = [False] * len(walls)

    # Стартуем с первой стены
    ordered.append(walls[0])
    used[0] = True
    current_end = walls[0].p2
    start_point = walls[0].p1

    while True:
        found = False
        for i, w in enumerate(walls):
            if used[i]:
                continue
            # Пробуем соединить p1 -> current_end
            if _points_match(w.p1, current_end):
                ordered.append(w)
                used[i] = True
                current_end = w.p2
                found = True
                break
            # Пробуем соединить p2 -> current_end (разворачиваем стену)
            if _points_match(w.p2, current_end):
                ordered.append(_reverse_wall(w))
                used[i] = True
                current_end = w.p2
                found = True
                break
        if not found:
            break
        # Проверка замыкания
        if _points_match(current_end, start_point):
            break

    is_closed = _points_match(current_end, start_point) and len(ordered) == len(walls)
    return ordered, is_closed


def build_external_polygon(walls: List[WallSegment]) -> Optional[Polygon]:
    """
    Построить полигон внешнего контура из стен.
    Возвращает Shapely Polygon или None, если контур не замкнут.
    """
    if len(walls) < 3:
        return None

    ordered, is_closed = order_walls_into_loop(walls)
    if not is_closed or len(ordered) < 3:
        return None

    # Вершины полигона = p1 каждой упорядоченной стены
    coords = [(w.p1.x, w.p1.y) for w in ordered]
    try:
        poly = Polygon(coords)
        if not poly.is_valid:
            # Пытаемся починить простые ошибки (самопересечения)
            poly = poly.buffer(0)
        return poly if not poly.is_empty else None
    except Exception:
        return None


def compute_wall_metrics(wall: WallSegment) -> WallMetrics:
    """Вычислить метрики одной стены."""
    length_mm = round(_wall_length_mm(wall))
    gross_area_m2 = length_mm * wall.height / 1_000_000.0

    opening_area_m2 = 0.0
    for op in wall.openings:
        opening_area_m2 += op.width * op.height / 1_000_000.0

    net_area_m2 = max(0.0, gross_area_m2 - opening_area_m2)
    volume_m3 = net_area_m2 * wall.thickness / 1000.0

    return WallMetrics(
        wall_id=wall.id,
        length_mm=length_mm,
        gross_area_m2=round(gross_area_m2, 3),
        net_area_m2=round(net_area_m2, 3),
        opening_area_m2=round(opening_area_m2, 3),
        volume_m3=round(volume_m3, 3),
    )


def compute_perimeter_mm(walls: List[WallSegment]) -> int:
    """Суммарная длина внешних стен (периметр), мм."""
    return round(sum(_wall_length_mm(w) for w in walls))


def compute_footprint_area_m2(polygon: Optional[Polygon]) -> float:
    """Площадь застройки из полигона (м²). Формула Гаусса внутри Shapely."""
    if polygon is None or polygon.is_empty:
        return 0.0
    # Shapely area в единицах координат (мм²) → переводим в м²
    return round(polygon.area / 1_000_000.0, 3)


def compute_foundation_length_mm(
    external_walls: List[WallSegment],
    internal_walls_floor1: List[WallSegment],
) -> int:
    """
    Длина фундамента = сумма длин несущих стен 1-го этажа
    (внешних несущих + внутренних несущих на этаже 1).
    """
    total = 0.0
    for w in external_walls:
        if w.load_bearing:
            total += _wall_length_mm(w)
    for w in internal_walls_floor1:
        if w.load_bearing:
            total += _wall_length_mm(w)
    return round(total)


def compute_bbox(polygon: Optional[Polygon]) -> Tuple[int, int, int, int]:
    """
    Габаритный контур (bounding box) полигона.
    Возвращает (min_x, min_y, width_mm, length_mm).
    """
    if polygon is None or polygon.is_empty:
        return 0, 0, 0, 0
    minx, miny, maxx, maxy = polygon.bounds
    width = round(maxx - minx)
    length = round(maxy - miny)
    # Делаем length >= width (длинная сторона)
    if width > length:
        width, length = length, width
    return round(minx), round(miny), width, length


def compute_roof_geometry(
    polygon: Optional[Polygon],
    construction: RoofConstruction,
    angle_deg: float,
    overhang_mm: int,
    perimeter_mm: int,
) -> Tuple[float, int, int]:
    """
    Вычислить геометрию кровли (простая модель v1).

    Возвращает (roof_area_m2, eaves_length_mm, ridge_length_mm).

    Упрощения v1:
    - площадь скатов = footprint / cos(angle) для gable/hip/mono
    - для flat = footprint
    - свесы учитываются через buffer полигона (для площади) или через периметр
    """
    if polygon is None or polygon.is_empty:
        return 0.0, 0, 0

    footprint_m2 = polygon.area / 1_000_000.0
    _, _, bbox_w, bbox_l = compute_bbox(polygon)

    # Полигон со свесом (для площади карнизов)
    if overhang_mm > 0:
        roof_polygon = polygon.buffer(overhang_mm)
        if roof_polygon.is_empty or not roof_polygon.is_valid:
            roof_polygon = polygon
    else:
        roof_polygon = polygon

    roof_footprint_m2 = roof_polygon.area / 1_000_000.0
    perimeter_with_overhang = round(roof_polygon.length) if not roof_polygon.is_empty else perimeter_mm

    angle_rad = math.radians(angle_deg)
    cos_a = math.cos(angle_rad)
    if cos_a < 0.01:
        cos_a = 0.01  # защита от деления на ноль при ~90°

    if construction == RoofConstruction.FLAT:
        roof_area_m2 = roof_footprint_m2
        eaves_mm = perimeter_with_overhang
        ridge_mm = 0
    elif construction == RoofConstruction.GABLE:
        # Двускатная: площадь = footprint / cos(angle)
        roof_area_m2 = roof_footprint_m2 / cos_a
        # Карнизы идут по двум длинным сторонам
        eaves_mm = round(2 * bbox_l + 2 * overhang_mm * 2)
        # Конёк вдоль длинной стороны
        ridge_mm = bbox_l
    elif construction == RoofConstruction.HIP:
        # Вальмовая: площадь ≈ footprint / cos(angle)
        roof_area_m2 = roof_footprint_m2 / cos_a
        # Карнизы по всему периметру
        eaves_mm = perimeter_with_overhang
        # Конёк = длинная сторона минус ширина/tan(angle)
        tan_a = math.tan(angle_rad)
        if tan_a > 0.01:
            ridge_mm = max(0, round(bbox_l - bbox_w / tan_a))
        else:
            ridge_mm = bbox_l
    elif construction == RoofConstruction.MONO:
        # Односкатная: площадь = footprint / cos(angle)
        roof_area_m2 = roof_footprint_m2 / cos_a
        eaves_mm = perimeter_with_overhang
        ridge_mm = bbox_l
    else:
        roof_area_m2 = roof_footprint_m2
        eaves_mm = perimeter_with_overhang
        ridge_mm = 0

    return round(roof_area_m2, 3), eaves_mm, ridge_mm


def compute_rooms(
    external_walls: List[WallSegment],
    internal_walls: List[WallSegment],
) -> List[RoomInfo]:
    """
    Найти все замкнутые помещения, образованные внешними и внутренними стенами.

    Использует shapely.ops.polygonize для выделения всех замкнутых контуров
    из отрезков стен. Внешний контур отфильтровывается по площади.
    """
    if len(external_walls) < 3:
        return []

    lines = []
    for w in external_walls + internal_walls:
        lines.append(LineString([(w.p1.x, w.p1.y), (w.p2.x, w.p2.y)]))

    if not lines:
        return []

    try:
        # Сливаем все линии в один мульти-линстринг - это расщепляет отрезки
        # в точках пересечения, что необходимо для polygonize
        merged = unary_union(lines)
        polys = list(polygonize(merged))
    except Exception:
        return []

    if not polys:
        return []

    # После unary_union polygonize возвращает комнаты напрямую —
    # нет отдельного внешнего контура. Фильтруем по минимальной площади.
    rooms: List[RoomInfo] = []

    for poly in polys:
        if poly.is_empty:
            continue
        if poly.area < 500_000:  # менее 0.5 м² — пропускаем (артефакты)
            continue
        area_m2 = round(poly.area / 1_000_000.0, 3)
        perimeter_mm = round(poly.length)
        centroid = poly.centroid
        rooms.append(
            RoomInfo(
                area_m2=area_m2,
                perimeter_mm=perimeter_mm,
                centroid_x=round(centroid.x),
                centroid_y=round(centroid.y),
            )
        )

    return rooms


def compute_geometry(project: Project) -> GeometryResult:
    """
    Главная функция: вычислить всю геометрию проекта.

    Принимает Project, возвращает GeometryResult.
    """
    errors: List[str] = []

    # --- Внешний контур ---
    external_walls = project.external_walls
    polygon = build_external_polygon(external_walls)

    if polygon is None:
        errors.append(
            "Внешний контур не замкнут или содержит менее 3 стен. "
            "Расчёт будет неполным."
        )
        is_closed = False
    else:
        is_closed = True
        if not polygon.is_valid:
            errors.append("Полигон внешнего контура невалиден (самопересечения).")

    perimeter_mm = compute_perimeter_mm(external_walls)
    footprint_m2 = compute_footprint_area_m2(polygon)
    _, _, bbox_w, bbox_l = compute_bbox(polygon)

    # --- Метрики внешних стен ---
    ext_metrics = [compute_wall_metrics(w) for w in external_walls]

    # --- Метрики внутренних стен по этажам ---
    int_metrics: Dict[int, List[WallMetrics]] = {}
    for floor_num, walls in sorted(project.internal_walls.items()):
        int_metrics[floor_num] = [compute_wall_metrics(w) for w in walls]

    # --- Замкнутые помещения (комнаты) по этажам ---
    rooms_by_floor: Dict[int, List[RoomInfo]] = {}
    for floor_num in range(1, project.floors_count + 1):
        internal = list(project.internal_walls.get(floor_num, []))
        floor_rooms = compute_rooms(external_walls, internal)
        if floor_rooms:
            rooms_by_floor[floor_num] = floor_rooms

    # --- Суммарная чистая площадь стен ---
    total_net = sum(m.net_area_m2 for m in ext_metrics)
    # Внешние стены на всех этажах
    total_net = total_net * project.floors_count
    # Внутренние стены на каждом этаже
    for floor_metrics in int_metrics.values():
        total_net += sum(m.net_area_m2 for m in floor_metrics)

    # --- Длина фундамента ---
    # Внутренние стены 1-го этажа
    internal_floor1 = project.internal_walls.get(1, [])
    foundation_length = compute_foundation_length_mm(external_walls, internal_floor1)

    # --- Площадь перекрытий (на один этаж) ---
    floor_area_m2 = footprint_m2

    # --- Геометрия кровли ---
    if project.roof is not None:
        roof_area, eaves_len, ridge_len = compute_roof_geometry(
            polygon,
            project.roof.construction,
            project.roof.angle,
            project.roof.overhang,
            perimeter_mm,
        )
    else:
        roof_area, eaves_len, ridge_len = 0.0, 0, 0
        errors.append("Конфигурация кровли не задана.")

    return GeometryResult(
        is_closed=is_closed,
        perimeter_mm=perimeter_mm,
        footprint_area_m2=footprint_m2,
        foundation_length_mm=foundation_length,
        bbox_width_mm=bbox_w,
        bbox_length_mm=bbox_l,
        roof_area_m2=roof_area,
        roof_eaves_length_mm=eaves_len,
        roof_ridge_length_mm=ridge_len,
        floor_area_m2=floor_area_m2,
        external_wall_metrics=ext_metrics,
        internal_wall_metrics=int_metrics,
        total_wall_net_area_m2=round(total_net, 3),
        rooms_by_floor=rooms_by_floor,
        errors=errors,
    )
