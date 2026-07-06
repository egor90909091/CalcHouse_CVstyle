"""
Движок расчёта материалов v2.

Считает материалы от точной геометрии (не от площади!):
  - Фундамент: по реальной длине несущих стен
  - Стены: по каждой стене × каждому слою × норме расхода
  - Перекрытия: по площади застройки × (этажей - 1)
  - Кровля: по реальной площади скатов + коньки + карнизы

Коэффициенты отхода берутся из materials.json → consumption_rates
(не захардкожены, не универсальный 0.8).
"""

import json
import math
import os
from typing import Dict, List, Optional, Tuple, Any

from app.models.project import (
    FoundationConfig,
    FoundationType,
    FloorConfig,
    FloorType,
    GeometryResult,
    Layer,
    LayerRole,
    MaterialItem,
    MaterialsResult,
    Project,
    RoofConfig,
    RoofConstruction,
    SectionResult,
    WallSegment,
)
from app.services.geometry_service import compute_geometry


class MaterialsServiceV2:
    """Сервис расчёта материалов от точной геометрии проекта."""

    def __init__(self):
        self._data_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "app",
            "static",
            "data",
            "materials.json",
        )
        with open(self._data_path, encoding="utf-8") as f:
            self._db: Dict = json.load(f)
        self._rates = self._db.get("consumption_rates", {})
        self._index = self._build_material_index()

    # ============================================================
    # Индекс материалов (плоский lookup по ключу)
    # ============================================================

    def _build_material_index(self) -> Dict[str, Dict]:
        """
        Построить плоский индекс: {key: {name, price, unit, category, subcategory, raw}}.
        Обходит все секции materials.json и собирает материалы.

        Структура materials.json неоднородна:
          - foundation/walls/roof/floors: подкатегории с обёрткой "materials"
          - waterproofing_types/options: плоские, прямой "price" у детей
          - wall_layers/installation_materials: подкатегории БЕЗ обёртки "materials"
        """
        SKIP = {"consumption_rates", "work"}
        index: Dict[str, Dict] = {}

        for category, cat_data in self._db.items():
            if not isinstance(cat_data, dict) or category in SKIP:
                continue

            # Есть ли среди детей хотя бы один с ключом "materials"?
            has_materials_wrapper = any(
                isinstance(v, dict) and "materials" in v
                for v in cat_data.values()
            )

            if has_materials_wrapper:
                # foundation / walls / roof / floors
                for subkey, subdata in cat_data.items():
                    if not isinstance(subdata, dict) or "materials" not in subdata:
                        continue
                    for mat_key, mat in subdata["materials"].items():
                        self._add_to_index(index, mat_key, mat, category, subkey)
            else:
                # waterproofing_types / options / wall_layers / installation_materials
                for subkey, subdata in cat_data.items():
                    if not isinstance(subdata, dict):
                        continue
                    if "price" in subdata:
                        # Прямой материал (waterproofing_types.roll, options.garage, ...)
                        self._add_to_index(index, subkey, subdata, category, None)
                    else:
                        # Подкатегория с прямыми материалами (wall_layers.insulation, ...)
                        for mat_key, mat in subdata.items():
                            if isinstance(mat, dict) and "price" in mat:
                                self._add_to_index(index, mat_key, mat, category, subkey)
        return index

    def _add_to_index(
        self, index: Dict, key: str, mat: Dict, category: str, subcategory: Optional[str]
    ) -> None:
        """Добавить материал в индекс. Индекс хранит список записей
        (один ключ может встречаться в разных секциях — стены/перекрытия/кровля)."""
        entry = {
            "name": mat.get("name", key),
            "price": mat.get("price", 0) or 0,
            "unit": mat.get("unit", ""),
            "category": category,
            "subcategory": subcategory,
            "raw": mat,
        }
        if key not in index:
            index[key] = []
        index[key].append(entry)

    def _lookup(self, key: str, section: Optional[str] = None) -> Dict:
        """Найти материал по ключу. Если указана секция — искать в ней.
        Индекс хранит список записей на ключ (дубликаты из разных секций)."""
        entries = self._index.get(key)
        if not entries:
            return {"name": key, "price": 0, "unit": "", "category": "", "subcategory": ""}
        if section:
            for e in entries:
                if e.get("category") == section:
                    return e
        return entries[0]

    def _rate(self, name: str, default: float = 1.0) -> float:
        """Получить норму расхода из consumption_rates."""
        return float(self._rates.get(name, default))

    def _make_item(
        self,
        key: str,
        quantity: float,
        detail: Optional[str] = None,
        section: Optional[str] = None,
    ) -> MaterialItem:
        """Создать позицию материала с ценой и итоговой стоимостью."""
        mat = self._lookup(key, section)
        price = mat.get("price", 0) or 0
        total = round(quantity * price, 2) if price else None
        return MaterialItem(
            name=mat.get("name", key),
            quantity=round(quantity, 3),
            unit=mat.get("unit", ""),
            price=price if price else None,
            total_cost=total,
            detail=detail,
        )

    def _make_rebar_item(
        self, key: str, weight_kg: float, detail: str, section: Optional[str] = None
    ) -> MaterialItem:
        """Создать позицию арматуры. Вес передаётся в кг,
        конвертируется в тонны если единица материала — 'т'."""
        mat = self._lookup(key, section)
        unit = mat.get("unit", "")
        if unit == "т":
            qty = weight_kg / 1000.0
        else:
            qty = weight_kg
        return self._make_item(key, qty, detail, section)

    # ============================================================
    # ФУНДАМЕНТ
    # ============================================================

    def _calc_foundation(
        self, geom: GeometryResult, config: FoundationConfig
    ) -> SectionResult:
        items: List[MaterialItem] = []

        if config.type == FoundationType.STRIP:
            items = self._calc_strip_foundation(geom, config)
        elif config.type == FoundationType.SLAB:
            items = self._calc_slab_foundation(geom, config)
        elif config.type == FoundationType.PILE:
            items = self._calc_pile_foundation(geom, config)
        elif config.type == FoundationType.COLUMN:
            items = self._calc_column_foundation(geom, config)

        total = sum(i.total_cost for i in items if i.total_cost)
        return SectionResult(materials=items, section_total=round(total, 2))

    def _calc_strip_foundation(
        self, geom: GeometryResult, config: FoundationConfig
    ) -> List[MaterialItem]:
        length_m = geom.foundation_length_mm / 1000.0
        width_m = (config.strip_width or 400) / 1000.0
        depth_m = (config.strip_depth or 800) / 1000.0
        height_m = (config.strip_height or 400) / 1000.0

        # Объём бетона (подземная + надземная часть)
        concrete_m3 = length_m * width_m * (depth_m + height_m)
        concrete_m3 *= self._rate("concrete_shrinkage", 1.02)

        items: List[MaterialItem] = [self._make_item(
            config.concrete_key, concrete_m3, f"Лента {length_m:.1f}м × {width_m}м × {depth_m+height_m:.1f}м"
        )]

        # Арматура: 4 продольных стержня + хомуты
        rebar_kg = self._calc_strip_rebar(length_m, width_m, depth_m + height_m)
        items.append(self._make_rebar_item(
            config.rebar_key, rebar_kg,
            f"Продольная d{self._rate('rebar_longitudinal_diameter_mm', 12)}мм × {self._rate('rebar_longitudinal_count', 4)} + хомуты"
        ))

        # Опалубка
        formwork_m2 = length_m * (depth_m + height_m) * 2 * self._rate("formwork_reuse_factor", 1.2)
        items.append(self._make_item(config.formwork_key, formwork_m2, "Опалубка с двух сторон"))

        # Гидроизоляция
        waterproofing_m2 = length_m * width_m * self._rate("waterproofing_overlap", 1.15)
        items.append(self._make_item(config.waterproofing_key, waterproofing_m2, "Низ ленты"))

        # Песчаная подушка (если задана)
        if config.slab_cushion and config.slab_cushion > 0:
            sand_m3 = length_m * width_m * (config.slab_cushion / 1000.0) * self._rate("sand_compaction", 1.15)
            items.append(self._make_item(config.sand_key, sand_m3, "Песчаная подушка"))

        return items

    def _calc_strip_rebar(
        self, length_m: float, width_m: float, total_height_m: float
    ) -> float:
        """Вес арматуры для ленточного фундамента (кг)."""
        diam_long = self._rate("rebar_longitudinal_diameter_mm", 12)
        diam_trans = self._rate("rebar_transverse_diameter_mm", 8)
        count_long = self._rate("rebar_longitudinal_count", 4)
        spacing = self._rate("rebar_stirrup_spacing_mm", 500)

        # Продольная: длина × кол-во стержней × нахлёст 10%
        long_m = length_m * count_long * 1.1
        long_weight_per_m = (diam_long / 1000.0) ** 2 * math.pi / 4 * 7850  # кг/м
        long_kg = long_m * long_weight_per_m

        # Хомуты: длина_ленты / шаг × периметр хомута
        stirrup_count = math.ceil(length_m * 1000 / spacing)
        stirrup_perimeter = 2 * (width_m + total_height_m) * 1.05  # нахлёст
        trans_m = stirrup_count * stirrup_perimeter
        trans_weight_per_m = (diam_trans / 1000.0) ** 2 * math.pi / 4 * 7850
        trans_kg = trans_m * trans_weight_per_m

        return long_kg + trans_kg

    def _calc_slab_foundation(
        self, geom: GeometryResult, config: FoundationConfig
    ) -> List[MaterialItem]:
        area_m2 = geom.footprint_area_m2
        thickness_m = (config.slab_thickness or 300) / 1000.0

        concrete_m3 = area_m2 * thickness_m * self._rate("concrete_shrinkage", 1.02)
        items: List[MaterialItem] = [self._make_item(
            config.concrete_key, concrete_m3, f"Плита {area_m2:.1f}м² × {thickness_m}м"
        )]

        # Арматура: две сетки с шагом 200мм → ~80 кг/м³
        rebar_kg = concrete_m3 * self._rate("rebar_per_m3_foundation_slab_kg", 80)
        items.append(self._make_rebar_item(
            config.rebar_key, rebar_kg, "Две арматурные сетки 200мм"
        ))

        # Гидрофикация
        waterproofing_m2 = area_m2 * self._rate("waterproofing_overlap", 1.15)
        items.append(self._make_item(config.waterproofing_key, waterproofing_m2, "Низ плиты"))

        # Песчаная подушка
        if config.slab_cushion and config.slab_cushion > 0:
            sand_m3 = area_m2 * (config.slab_cushion / 1000.0) * self._rate("sand_compaction", 1.15)
            items.append(self._make_item(config.sand_key, sand_m3, "Песчаная подушка"))

        return items

    def _calc_pile_foundation(
        self, geom: GeometryResult, config: FoundationConfig
    ) -> List[MaterialItem]:
        length_m = geom.foundation_length_mm / 1000.0
        step_m = (config.pile_step or 2000) / 1000.0
        diameter_m = (config.pile_diameter or 300) / 1000.0
        depth_m = (config.pile_depth or 2000) / 1000.0

        pile_count = math.ceil(length_m / step_m) + 4  # +4 на углы
        pile_concrete = math.pi * (diameter_m / 2) ** 2 * depth_m * pile_count
        pile_concrete *= self._rate("concrete_shrinkage", 1.02)

        items: List[MaterialItem] = [self._make_item(
            config.concrete_key, pile_concrete, f"{pile_count} свай Ø{diameter_m*1000:.0f}мм × {depth_m}м"
        )]

        # Ростверк
        grillage_m3 = length_m * 0.4 * 0.4 * self._rate("concrete_shrinkage", 1.02)
        items.append(self._make_item(
            config.concrete_key, grillage_m3, "Ростверк 400×400мм"
        ))

        # Арматура (упрощённо: 70 кг/м³)
        rebar_kg = (pile_concrete + grillage_m3) * self._rate("rebar_per_m3_foundation_strip_kg", 70)
        items.append(self._make_rebar_item(
            config.rebar_key, rebar_kg, "Армирование свай + ростверк"
        ))

        # Гидроизоляция ростверка
        waterproofing_m2 = length_m * 0.4 * self._rate("waterproofing_overlap", 1.15)
        items.append(self._make_item(config.waterproofing_key, waterproofing_m2, "Ростверк"))

        return items

    def _calc_column_foundation(
        self, geom: GeometryResult, config: FoundationConfig
    ) -> List[MaterialItem]:
        length_m = geom.foundation_length_mm / 1000.0
        step_m = (config.column_step or 1500) / 1000.0
        size_m = (config.column_size or 400) / 1000.0
        depth_m = (config.column_depth or 800) / 1000.0

        col_count = math.ceil(length_m / step_m) + 4
        col_concrete = size_m ** 2 * depth_m * col_count
        col_concrete *= self._rate("concrete_shrinkage", 1.02)

        items: List[MaterialItem] = [self._make_item(
            config.concrete_key, col_concrete, f"{col_count} столбов {size_m}×{size_m}×{depth_m}м"
        )]

        # Ростверк
        grillage_m3 = length_m * 0.4 * 0.4 * self._rate("concrete_shrinkage", 1.02)
        items.append(self._make_item(
            config.concrete_key, grillage_m3, "Ростверк 400×400мм"
        ))

        rebar_kg = (col_concrete + grillage_m3) * self._rate("rebar_per_m3_foundation_strip_kg", 70)
        items.append(self._make_rebar_item(
            config.rebar_key, rebar_kg, "Армирование столбов + ростверк"
        ))

        waterproofing_m2 = length_m * 0.4 * self._rate("waterproofing_overlap", 1.15)
        items.append(self._make_item(config.waterproofing_key, waterproofing_m2, "Ростверк"))

        return items

    # ============================================================
    # СТЕНЫ
    # ============================================================

    def _calc_walls(self, geom: GeometryResult, project: Project) -> SectionResult:
        items: List[MaterialItem] = []

        # Внешние стены (на каждом этаже — одинаковые)
        for wall in project.external_walls:
            metric = next(
                (m for m in geom.external_wall_metrics if m.wall_id == wall.id), None
            )
            if metric is None:
                continue
            # Внешние стены на всех этажах
            for _ in range(project.floors_count):
                items.extend(self._calc_wall_layers(wall, metric.net_area_m2))

        # Внутренние стены по этажам
        for floor_num, walls in project.internal_walls.items():
            metrics = geom.internal_wall_metrics.get(floor_num, [])
            for wall in walls:
                metric = next((m for m in metrics if m.wall_id == wall.id), None)
                if metric is None:
                    continue
                items.extend(self._calc_wall_layers(wall, metric.net_area_m2))

        # Агрегация: суммируем одинаковые материалы
        items = self._aggregate_items(items)
        total = sum(i.total_cost for i in items if i.total_cost)
        return SectionResult(materials=items, section_total=round(total, 2))

    def _calc_wall_layers(
        self, wall: WallSegment, net_area_m2: float
    ) -> List[MaterialItem]:
        """Расчёт материалов по слоям одной стены."""
        items: List[MaterialItem] = []
        wall_length_m = 0.0
        import math as _m
        dx = wall.p2.x - wall.p1.x
        dy = wall.p2.y - wall.p1.y
        wall_length_m = _m.hypot(dx, dy) / 1000.0

        for layer in wall.layers:
            if layer.role == LayerRole.LOADBEARING:
                items.extend(self._calc_loadbearing_layer(layer, net_area_m2, wall_length_m, wall))
            elif layer.role == LayerRole.INSULATION:
                items.extend(self._calc_insulation_layer(layer, net_area_m2))
            elif layer.role == LayerRole.CLADDING:
                items.extend(self._calc_cladding_layer(layer, net_area_m2))
            elif layer.role == LayerRole.FINISHING:
                items.extend(self._calc_finishing_layer(layer, net_area_m2))
            elif layer.role == LayerRole.VAPOR:
                items.extend(self._calc_vapor_layer(layer, net_area_m2))

        return items

    def _calc_loadbearing_layer(
        self, layer: Layer, net_area_m2: float, wall_length_m: float, wall: WallSegment
    ) -> List[MaterialItem]:
        """Расчёт несущего слоя стены в зависимости от материала."""
        key = layer.material_key
        mat = self._lookup(key)
        subcat = mat.get("subcategory", "")
        thickness_mm = layer.thickness
        items: List[MaterialItem] = []

        if subcat == "brick" or key.startswith("brick") or key.startswith("silicate"):
            # Кирпич
            bricks_per_m2 = self._calc_bricks_per_m2(thickness_mm)
            count = net_area_m2 * bricks_per_m2 * self._rate("brick_waste", 1.05)
            items.append(self._make_item(key, count, f"{bricks_per_m2} шт/м² × {net_area_m2:.1f}м² × бой 5%"))
            # Раствор
            mortar_m3 = (count / 1000) * self._rate("mortar_per_1000_bricks_m3", 0.25)
            items.append(self._make_item("mortar_cement_lime", mortar_m3, "Раствор для кладки"))

        elif subcat == "block" or key in ("aerated_concrete", "foam_concrete", "expanded_clay"):
            # Блоки
            if key == "expanded_clay":
                face_area = self._rate("block_face_area_expanded_clay_m2", 0.08)
            else:
                face_area = self._rate("block_face_area_aerated_m2", 0.18)
            count = (net_area_m2 / face_area) * self._rate("block_waste", 1.03)
            # Если есть варианты по толщине — берём цену варианта
            items.append(self._make_item(key, count, f"Лицо {face_area}м² × {net_area_m2:.1f}м² × отход 3%"))
            # Клей
            adhesive_kg = net_area_m2 * self._rate("adhesive_per_m2_block_kg", 5)
            items.append(self._make_item("adhesive_standard", adhesive_kg, "Клей для блоков"))

        elif subcat == "wood" or key.startswith("timber") or key == "round_log":
            # Дерево: объём бруса
            volume = net_area_m2 * (thickness_mm / 1000.0) * self._rate("timber_waste", 1.05)
            items.append(self._make_item(key, volume, f"V = {net_area_m2:.1f}м² × {thickness_mm}мм"))
            # Межвенцовый утеплитель: по венцам
            section_m = thickness_mm / 1000.0
            crowns = math.ceil(wall.height / thickness_mm) if thickness_mm > 0 else 0
            interlayer_m = wall_length_m * crowns
            items.append(self._make_item("interlayer_insulation", interlayer_m, f"{crowns} венцов × {wall_length_m:.1f}м"))

        elif subcat == "concrete" or key == "concrete_b25":
            # Монолитный бетон
            volume = net_area_m2 * (thickness_mm / 1000.0) * self._rate("concrete_shrinkage", 1.02)
            items.append(self._make_item(key, volume, f"V = {net_area_m2:.1f}м² × {thickness_mm}мм"))
            # Арматура
            rebar_kg = volume * self._rate("rebar_per_m3_wall_kg", 90)
            items.append(self._make_rebar_item("rebar", rebar_kg, "Армирование стены", section="walls"))
            # Опалубка
            formwork_m2 = net_area_m2 * 2 * self._rate("formwork_reuse_factor", 1.2)
            items.append(self._make_item("formwork", formwork_m2, "Опалубка с двух сторон"))

        elif subcat == "panel" or key.startswith("sip") or key.startswith("concrete_panel") or key.startswith("sandwich"):
            # Панели
            if key.startswith("sip"):
                face_area = self._rate("panel_face_area_sip_m2", 3.125)
            elif key.startswith("concrete_panel"):
                face_area = self._rate("panel_face_area_concrete_m2", 3.259)
            else:
                face_area = self._rate("panel_face_area_sandwich_m2", 1.0)
            count = math.ceil(net_area_m2 / face_area) * self._rate("panel_waste", 1.05)
            items.append(self._make_item(key, count, f"{net_area_m2:.1f}м² / {face_area}м² × отход 5%"))
            # Герметик швов
            sealant_l = wall_length_m * 0.1  # ~0.1 л/м шва
            items.append(self._make_item("sealant", sealant_l, "Герметизация швов"))

        else:
            # Неизвестный несущий материал — считаем по объёму
            volume = net_area_m2 * (thickness_mm / 1000.0)
            items.append(self._make_item(key, volume, f"Объём {net_area_m2:.1f}м² × {thickness_mm}мм"))

        return items

    def _calc_bricks_per_m2(self, thickness_mm: int) -> int:
        """Количество кирпичей на 1 м² стены в зависимости от толщины."""
        half = self._rate("brick_per_m2_half", 51)
        single = self._rate("brick_per_m2_single", 102)
        if thickness_mm <= 130:
            return int(half)
        elif thickness_mm <= 260:
            return int(single)
        else:
            # Для толстых стен: кратное одинарному
            layers = max(2, round(thickness_mm / 120))
            return int(half * layers)

    def _calc_insulation_layer(self, layer: Layer, net_area_m2: float) -> List[MaterialItem]:
        """Утеплитель: по площади (с запасом на отход)."""
        area = net_area_m2 * self._rate("insulation_waste", 1.03)
        return [self._make_item(layer.material_key, area, f"Утеплитель {net_area_m2:.1f}м² × отход 3%")]

    def _calc_cladding_layer(self, layer: Layer, net_area_m2: float) -> List[MaterialItem]:
        """Облицовка/фасад."""
        key = layer.material_key
        if key == "brick_veneer":
            # Облицовочный кирпич — 51 шт/м² (полкирпича)
            count = net_area_m2 * self._rate("brick_per_m2_half", 51) * self._rate("cladding_waste", 1.05)
            return [self._make_item(key, count, f"Облицовка 51 шт/м² × отход 5%")]
        else:
            area = net_area_m2 * self._rate("cladding_waste", 1.05)
            return [self._make_item(key, area, f"Облицовка {net_area_m2:.1f}м²")]

    def _calc_finishing_layer(self, layer: Layer, net_area_m2: float) -> List[MaterialItem]:
        """Внутренняя отделка (штукатурка/ГКЛ)."""
        key = layer.material_key
        if key.startswith("plaster") or key == "putty":
            # Штукатурка: ~мешок на 5 м² при толщине 10мм
            bags = (net_area_m2 / 5) * self._rate("finishing_waste", 1.05)
            return [self._make_item(key, bags, f"Отделка {net_area_m2:.1f}м² × отход 5%")]
        elif key == "drywall":
            area = net_area_m2 * self._rate("finishing_waste", 1.05)
            return [self._make_item(key, area, f"ГКЛ {net_area_m2:.1f}м²")]
        else:
            area = net_area_m2 * self._rate("finishing_waste", 1.05)
            return [self._make_item(key, area, f"Отделка {net_area_m2:.1f}м²")]

    def _calc_vapor_layer(self, layer: Layer, net_area_m2: float) -> List[MaterialItem]:
        """Паро/ветрозащита."""
        area = net_area_m2 * self._rate("waterproofing_overlap", 1.15)
        return [self._make_item(layer.material_key, area, f"Плёнка {net_area_m2:.1f}м² × нахлёст 15%")]

    # ============================================================
    # ПЕРЕКРЫТИЯ
    # ============================================================

    def _calc_floors(
        self, geom: GeometryResult, config: FloorConfig, floors_count: int
    ) -> SectionResult:
        if floors_count <= 1 or config is None:
            return SectionResult()

        area_m2 = geom.floor_area_m2
        slab_count = floors_count - 1  # межэтажные перекрытия
        total_area = area_m2 * slab_count
        items: List[MaterialItem] = []

        if config.type == FloorType.CONCRETE:
            thickness_m = config.thickness / 1000.0
            volume = total_area * thickness_m * self._rate("concrete_shrinkage", 1.02)
            items.append(self._make_item(
                config.concrete_key, volume, f"{slab_count} перекрытие × {area_m2:.1f}м² × {thickness_m}м"
            ))
            rebar_kg = volume * self._rate("rebar_per_m3_slab_kg", 80)
            items.append(self._make_rebar_item(config.rebar_key, rebar_kg, "Армирование", section="floors"))
            formwork_m2 = total_area * self._rate("formwork_reuse_factor", 1.2)
            items.append(self._make_item(config.formwork_key, formwork_m2, "Опалубка", section="floors"))

        elif config.type == FloorType.SLAB:
            # Сборные плиты ПК 60-12-8 (6×1.2м = 7.2м²)
            slab_area = 6.0 * 1.2
            count = math.ceil(total_area / slab_area) * self._rate("panel_waste", 1.05)
            items.append(self._make_item(
                config.slab_key, count, f"{slab_count} перекрытие, {total_area:.1f}м² / {slab_area}м²"
            ))
            # Раствор для швов
            mortar_m3 = total_area * 0.01  # ~10мм слой
            items.append(self._make_item(config.mortar_key, mortar_m3, "Заделка швов"))

        total = sum(i.total_cost for i in items if i.total_cost)
        return SectionResult(materials=items, section_total=round(total, 2))

    # ============================================================
    # КРОВЛЯ
    # ============================================================

    def _calc_roof(self, geom: GeometryResult, config: RoofConfig) -> SectionResult:
        items: List[MaterialItem] = []
        roof_area = geom.roof_area_m2
        ridge_m = geom.roof_ridge_length_mm / 1000.0
        eaves_m = geom.roof_eaves_length_mm / 1000.0

        if config.construction == RoofConstruction.FLAT:
            items = self._calc_flat_roof(geom, config)
        else:
            # Скатная кровля
            # Стропила
            rafter_len = geom.bbox_width_mm / 2 / math.cos(math.radians(config.angle)) / 1000.0
            rafter_count = math.ceil((geom.bbox_length_mm / 1000.0) / 0.6) + 1
            rafter_total_m = rafter_len * rafter_count * 2  # два ската
            items.append(self._make_item(
                config.rafter_section_key, rafter_total_m,
                f"{rafter_count}×2 стропил × {rafter_len:.1f}м"
            ))

            # Обрешётка
            batten_m = roof_area / 0.3  # шаг 300мм
            items.append(self._make_item(config.batten_key, batten_m, "Обрешётка шаг 300мм"))

            # Гидроизоляция
            membrane_m2 = roof_area * self._rate("waterproofing_overlap", 1.15)
            items.append(self._make_item(config.waterproofing_key, membrane_m2, "Гидроизоляция"))

            # Покрытие
            covering_items = self._calc_roof_covering(config, roof_area, ridge_m, eaves_m)
            items.extend(covering_items)

        total = sum(i.total_cost for i in items if i.total_cost)
        return SectionResult(materials=items, section_total=round(total, 2))

    def _calc_roof_covering(
        self, config: RoofConfig, roof_area: float, ridge_m: float, eaves_m: float
    ) -> List[MaterialItem]:
        """Кровельное покрытие в зависимости от типа."""
        key = config.material_key
        items: List[MaterialItem] = []
        waste = self._rate("roof_covering_waste", 1.10)

        if key == "metal":
            area = roof_area * waste
            items.append(self._make_item("metal_tile_standard", area, f"Металлочерепица {roof_area:.1f}м² × отход 10%"))
            # Конёковые элементы (шт по 2м)
            ridge_count = math.ceil(ridge_m / 2.0) if ridge_m > 0 else 0
            items.append(self._make_item("ridge_elements", ridge_count, f"Конёк {ridge_m:.1f}м"))
            # Саморезы (~10 шт/м²)
            screws = roof_area * 10
            items.append(self._make_item("screws", screws, "Кровельные саморезы"))

        elif key == "tile":
            tiles = roof_area * 10 * waste  # 10 шт/м²
            items.append(self._make_item("ceramic_tile", tiles, f"Черепица 10 шт/м² × отход 10%"))
            items.append(self._make_item("ridge_elements", ridge_m, f"Конёк {ridge_m:.1f}м"))
            fasteners = roof_area * 8
            items.append(self._make_item("fasteners", fasteners, "Крепления"))

        elif key == "shingle":
            area = roof_area * waste
            items.append(self._make_item("flexible_tile", area, f"Гибкая черепица {roof_area:.1f}м²"))
            items.append(self._make_item("underlay", roof_area * 1.1, "Подкладочный ковёр"))
            items.append(self._make_item("osb", roof_area * 1.05, "OSB основание"))

        elif key == "slate":
            sheet_area = 1.75 * 1.13  # м²
            sheets = math.ceil(roof_area / sheet_area * 0.85) * waste  # 0.85 — полезная площадь
            items.append(self._make_item("slate", sheets, f"Шифер {roof_area:.1f}м² / {sheet_area}м²"))
            nails = sheets * 4
            items.append(self._make_item("nails", nails, "Гвозди"))

        else:
            area = roof_area * waste
            items.append(self._make_item(key, area, f"Покрытие {roof_area:.1f}м²"))

        return items

    def _calc_flat_roof(self, geom: GeometryResult, config: RoofConfig) -> List[MaterialItem]:
        """Плоская кровля."""
        area = geom.footprint_area_m2 * 1.05  # небольшой запас на парапеты
        items: List[MaterialItem] = []

        # Гидроизоляция (2 слоя)
        items.append(self._make_item("tpo_membrane", area * self._rate("waterproofing_overlap", 1.15), "ТПО мембрана"))
        # Утеплитель
        if config.insulation_key:
            items.append(self._make_item(config.insulation_key, area, "Утеплитель плоской кровли"))
        else:
            items.append(self._make_item("insulation", area, "Утеплитель плоской кровли"))
        # Стяжка
        screed_m3 = area * 0.05  # 50мм
        items.append(self._make_item("screed", screed_m3, "Цементно-песчаная стяжка 50мм"))
        # Пароизоляция
        items.append(self._make_item("vapor_barrier", area * 1.1, "Пароизоляция"))

        return items

    # ============================================================
    # Агрегация
    # ============================================================

    def _aggregate_items(self, items: List[MaterialItem]) -> List[MaterialItem]:
        """Суммировать одинаковые материалы (по имени + единице)."""
        agg: Dict[str, MaterialItem] = {}
        for item in items:
            k = f"{item.name}|{item.unit}"
            if k in agg:
                agg[k].quantity = round(agg[k].quantity + item.quantity, 3)
                if agg[k].total_cost is not None and item.total_cost is not None:
                    agg[k].total_cost = round(agg[k].total_cost + item.total_cost, 2)
                details = []
                if agg[k].detail and item.detail:
                    details = [agg[k].detail, item.detail]
                    agg[k].detail = "; ".join(details)
            else:
                agg[k] = item
        return list(agg.values())

    # ============================================================
    # Главная функция
    # ============================================================

    def calculate(self, project: Project) -> MaterialsResult:
        """Полный расчёт материалов от геометрии проекта."""
        geom = compute_geometry(project)

        foundation = self._calc_foundation(geom, project.foundation) if project.foundation else SectionResult()
        walls = self._calc_walls(geom, project)
        floors = self._calc_floors(geom, project.floor_config, project.floors_count) if project.floor_config else SectionResult()
        roof = self._calc_roof(geom, project.roof) if project.roof else SectionResult()

        total = (
            foundation.section_total
            + walls.section_total
            + floors.section_total
            + roof.section_total
        )

        return MaterialsResult(
            geometry=geom,
            foundation=foundation,
            walls=walls,
            floors=floors,
            roof=roof,
            total_cost=round(total, 2),
        )
