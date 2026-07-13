// Типы данных — зеркало бэкенд-моделей (app/models/project.py)
// Все координаты и размеры в миллиметрах (int)

export interface Point {
  x: number;
  y: number;
}

export type LayerRole =
  | "loadbearing"
  | "insulation"
  | "cladding"
  | "finishing"
  | "vapor";

export interface Layer {
  role: LayerRole;
  material_key: string;
  thickness: number;
}

export type OpeningType = "door" | "window";

export interface Opening {
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sill_height: number;
}

export interface WallSegment {
  id: string;
  p1: Point;
  p2: Point;
  thickness: number;
  height: number;
  load_bearing: boolean;
  external: boolean;
  layers: Layer[];
  openings: Opening[];
}

export type FoundationType = "strip" | "slab" | "pile" | "column";

export interface FoundationConfig {
  type: FoundationType;
  strip_width?: number;
  strip_depth?: number;
  strip_height?: number;
  strip_cushion?: number;
  slab_thickness?: number;
  slab_cushion?: number;
  pile_step?: number;
  pile_diameter?: number;
  pile_depth?: number;
  column_step?: number;
  column_size?: number;
  column_depth?: number;
  concrete_key: string;
  rebar_key: string;
  formwork_key: string;
  waterproofing_key: string;
  sand_key: string;
}

export type RoofConstruction = "gable" | "hip" | "mono" | "flat";

export interface RoofConfig {
  construction: RoofConstruction;
  angle: number;
  overhang: number;
  material_key: string;
  insulation_key: string | null;
  rafter_section_key: string;
  batten_key: string;
  waterproofing_key: string;
  warm: boolean;
  rafter_step_mm: number;
  mauerplat_required: boolean;
  vapor_key: string;
  valley_count: number;
  gutter: boolean;
  snow_guards: boolean;
  gable_planks: boolean;
  drip_edges: boolean;
}

export type FloorType = "concrete" | "slab";

export interface FloorConfig {
  type: FloorType;
  thickness: number;
  concrete_key: string;
  rebar_key: string;
  formwork_key: string;
  slab_key: string;
  mortar_key: string;
}

export interface Project {
  name: string;
  floors_count: number;
  floor_height: number;
  external_walls: WallSegment[];
  internal_walls: Record<number, WallSegment[]>;
  foundation: FoundationConfig | null;
  roof: RoofConfig | null;
  floor_config: FloorConfig | null;
}

// Результаты геометрии
export interface WallMetrics {
  wall_id: string;
  length_mm: number;
  gross_area_m2: number;
  net_area_m2: number;
  opening_area_m2: number;
  volume_m3: number;
}

export interface RoomInfo {
  area_m2: number;
  perimeter_mm: number;
  centroid_x: number;
  centroid_y: number;
}

export interface GeometryResult {
  is_closed: boolean;
  perimeter_mm: number;
  footprint_area_m2: number;
  foundation_length_mm: number;
  bbox_width_mm: number;
  bbox_length_mm: number;
  roof_area_m2: number;
  roof_eaves_length_mm: number;
  roof_ridge_length_mm: number;
  floor_area_m2: number;
  external_wall_metrics: WallMetrics[];
  internal_wall_metrics: Record<number, WallMetrics[]>;
  total_wall_net_area_m2: number;
  rooms_by_floor: Record<number, RoomInfo[]>;
  errors: string[];
}

// Результаты расчёта материалов
export interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  total_cost: number | null;
  detail: string | null;
}

export interface SectionResult {
  materials: MaterialItem[];
  section_total: number;
}

export interface MaterialsResult {
  geometry: GeometryResult;
  foundation: SectionResult;
  walls: SectionResult;
  floors: SectionResult;
  roof: SectionResult;
  total_cost: number;
  works_rate_percent: number;
  works_estimate_cost: number;
}

// Состояние редактора
export type EditorMode = "draw" | "erase" | "opening";
