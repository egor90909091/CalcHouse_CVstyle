// Zustand store — центральное состояние конструктора дома

import { create } from "zustand";
import type {
  EditorMode,
  FoundationConfig,
  GeometryResult,
  MaterialsResult,
  Opening,
  Point,
  Project,
  RoofConfig,
  FloorConfig,
  WallSegment,
} from "../types/project";
import { calculateMaterials, computeGeometry } from "../api/client";

const STORAGE_KEY = "wallBuilderProject";

// Толщина стен по material_key: { ext, int } в мм
export const WALL_MAT_THICKNESS: Record<string, { ext: number; int: number }> = {
  aerated_concrete: { ext: 400, int: 200 },
  foam_concrete: { ext: 400, int: 200 },
  timber_200: { ext: 200, int: 150 },
  round_log: { ext: 240, int: 200 },
  brick_solid: { ext: 510, int: 250 },
  brick_hollow: { ext: 510, int: 250 },
};

// Конфигурация типов стен и подвидов для глобального выбора
export const WALL_MAT_GROUPS: {
  type: WallMatType;
  label: string;
  options: { key: string; label: string }[];
}[] = [
  {
    type: "block",
    label: "Газобетонные блоки",
    options: [
      { key: "aerated_concrete", label: "Газобетон 300×600" },
      { key: "foam_concrete", label: "Пенобетон 300×600" },
    ],
  },
  {
    type: "wood",
    label: "Древесина",
    options: [
      { key: "timber_200", label: "Брус 200×200" },
      { key: "round_log", label: "Оцилиндрованное бревно" },
    ],
  },
  {
    type: "brick",
    label: "Строительный кирпич",
    options: [
      { key: "brick_solid", label: "Кирпич полнотелый" },
      { key: "brick_hollow", label: "Кирпич пустотелый" },
    ],
  },
];

// Значения по умолчанию
const defaultFoundation: FoundationConfig = {
  type: "strip",
  strip_width: 400,
  strip_depth: 800,
  strip_height: 400,
  concrete_key: "concrete_b25",
  rebar_key: "rebar_a400",
  formwork_key: "formwork_plywood",
  waterproofing_key: "strip_default",
  sand_key: "sand_river",
};

const defaultRoof: RoofConfig = {
  construction: "gable",
  angle: 30,
  overhang: 600,
  material_key: "metal",
  insulation_key: null,
  rafter_section_key: "rafters",
  batten_key: "batten",
  waterproofing_key: "waterproofing",
};

const defaultFloorConfig: FloorConfig = {
  type: "concrete",
  thickness: 200,
  concrete_key: "concrete_200",
  rebar_key: "rebar",
  formwork_key: "formwork",
  slab_key: "slab_60_12_8",
  mortar_key: "mortar",
};

const defaultProject: Project = {
  name: "Мой проект",
  floors_count: 1,
  floor_height: 2800,
  external_walls: [],
  internal_walls: { 1: [] },
  foundation: defaultFoundation,
  roof: defaultRoof,
  floor_config: defaultFloorConfig,
};

export type WallMatType = "block" | "wood" | "brick";

interface StoreState {
  // Проект
  project: Project;
  // Глобальный материал стен (применяется ко всем стенам)
  wallMatType: WallMatType;
  wallMatKey: string;
  // Редактор
  mode: EditorMode;
  currentFloor: number;
  selectedWallId: string | null;
  selectedWallIsExternal: boolean;
  openingType: "door" | "window";
  wallIdCounter: number;
  drawInProgress: boolean;
  angleSnapMode: "strict" | "standard" | "free";
  // Результаты
  geometry: GeometryResult | null;
  results: MaterialsResult | null;
  calculating: boolean;
  canvasImage: string | null;
  // Действия: режим
  setMode: (mode: EditorMode) => void;
  setOpeningType: (type: "door" | "window") => void;
  setDrawInProgress: (v: boolean) => void;
  setAngleSnapMode: (m: "strict" | "standard" | "free") => void;
  setCanvasImage: (img: string | null) => void;
  // Действия: этажи
  setFloor: (n: number) => void;
  setFloorsCount: (n: number) => void;
  setFloorHeight: (h: number) => void;
  // Действия: стены
  addWall: (p1: Point, p2: Point, isExternal: boolean) => void;
  selectWall: (id: string | null, isExternal: boolean) => void;
  updateWall: (id: string, isExternal: boolean, updates: Partial<WallSegment>) => void;
  deleteWall: (id: string, isExternal: boolean) => void;
  addOpening: (wallId: string, isExternal: boolean, opening: Opening) => void;
  removeOpening: (wallId: string, isExternal: boolean, index: number) => void;
  clearAll: () => void;
  closeContour: () => void;
  wallDisplayIndex: (id: string, isExternal: boolean, floor: number) => number;
  // Действия: настройки
  updateFoundation: (updates: Partial<FoundationConfig>) => void;
  updateRoof: (updates: Partial<RoofConfig>) => void;
  updateFloorConfig: (updates: Partial<FloorConfig>) => void;
  setWallMaterial: (type: WallMatType, key: string) => void;
  // Действия: расчёт
  calculate: () => Promise<void>;
  updateGeometry: () => Promise<void>;
  // Сохранение/загрузка
  save: () => void;
  load: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  project: defaultProject,
  wallMatType: "block",
  wallMatKey: "aerated_concrete",
  mode: "draw",
  currentFloor: 1,
  selectedWallId: null,
  selectedWallIsExternal: true,
  openingType: "window",
  wallIdCounter: 0,
  drawInProgress: false,
  angleSnapMode: "standard",
  geometry: null,
  results: null,
  calculating: false,
  canvasImage: null,

  setMode: (mode) =>
    set({ mode, selectedWallId: null, drawInProgress: false }),

  setOpeningType: (type) => set({ openingType: type }),

  setDrawInProgress: (v) => set({ drawInProgress: v }),

  setAngleSnapMode: (m) => set({ angleSnapMode: m }),

  setCanvasImage: (img) => set({ canvasImage: img }),

  setFloor: (n) =>
    set({ currentFloor: n, selectedWallId: null }),

  setFloorsCount: (n) => {
    const project = { ...get().project, floors_count: n };
    const currentFloor = Math.min(get().currentFloor, n);
    set({ project, currentFloor });
  },

  setFloorHeight: (h) =>
    set((s) => ({ project: { ...s.project, floor_height: h } })),

  addWall: (p1, p2, isExternal) => {
    const id = "w" + (++get().wallIdCounter);
    const isExt = isExternal;
    const matKey = get().wallMatKey;
    const thk = WALL_MAT_THICKNESS[matKey] ?? { ext: 400, int: 200 };
    const thickness = isExt ? thk.ext : thk.int;
    const wall: WallSegment = {
      id,
      p1: { ...p1 },
      p2: { ...p2 },
      thickness,
      height: get().project.floor_height,
      load_bearing: true,
      external: isExt,
      layers: [
        {
          role: "loadbearing",
          material_key: matKey,
          thickness,
        },
      ],
      openings: [],
    };
    set((s) => {
      if (isExt) {
        return {
          project: {
            ...s.project,
            external_walls: [...s.project.external_walls, wall],
          },
          wallIdCounter: s.wallIdCounter + 1,
        };
      }
      const internal = { ...s.project.internal_walls };
      const floor = s.currentFloor;
      internal[floor] = [...(internal[floor] || []), wall];
      return {
        project: { ...s.project, internal_walls: internal },
        wallIdCounter: s.wallIdCounter + 1,
      };
    });
    // Обновляем геометрию в фоне
    get().updateGeometry();
  },

  selectWall: (id, isExternal) =>
    set({ selectedWallId: id, selectedWallIsExternal: isExternal }),

  updateWall: (id, isExternal, updates) => {
    set((s) => {
      if (isExternal) {
        return {
          project: {
            ...s.project,
            external_walls: s.project.external_walls.map((w) =>
              w.id === id ? { ...w, ...updates, layers: updates.layers ?? w.layers } : w
            ),
          },
        };
      }
      const internal = { ...s.project.internal_walls };
      const floor = s.currentFloor;
      internal[floor] = (internal[floor] || []).map((w) =>
        w.id === id ? { ...w, ...updates, layers: updates.layers ?? w.layers } : w
      );
      return { project: { ...s.project, internal_walls: internal } };
    });
  },

  deleteWall: (id, isExternal) => {
    set((s) => {
      if (isExternal) {
        return {
          project: {
            ...s.project,
            external_walls: s.project.external_walls.filter((w) => w.id !== id),
          },
          selectedWallId: null,
        };
      }
      const internal = { ...s.project.internal_walls };
      const floor = s.currentFloor;
      internal[floor] = (internal[floor] || []).filter((w) => w.id !== id);
      return {
        project: { ...s.project, internal_walls: internal },
        selectedWallId: null,
      };
    });
    get().updateGeometry();
  },

  addOpening: (wallId, isExternal, opening) => {
    const updater = (w: WallSegment) =>
      w.id === wallId
        ? { ...w, openings: [...w.openings, opening] }
        : w;
    set((s) => {
      if (isExternal) {
        return {
          project: {
            ...s.project,
            external_walls: s.project.external_walls.map(updater),
          },
        };
      }
      const internal = { ...s.project.internal_walls };
      const floor = s.currentFloor;
      internal[floor] = (internal[floor] || []).map(updater);
      return { project: { ...s.project, internal_walls: internal } };
    });
  },

  removeOpening: (wallId, isExternal, index) => {
    const updater = (w: WallSegment) =>
      w.id === wallId
        ? { ...w, openings: w.openings.filter((_, i) => i !== index) }
        : w;
    set((s) => {
      if (isExternal) {
        return {
          project: {
            ...s.project,
            external_walls: s.project.external_walls.map(updater),
          },
        };
      }
      const internal = { ...s.project.internal_walls };
      const floor = s.currentFloor;
      internal[floor] = (internal[floor] || []).map(updater);
      return { project: { ...s.project, internal_walls: internal } };
    });
  },

  clearAll: () => {
    set((s) => ({
      project: {
        ...s.project,
        external_walls: [],
        internal_walls: { 1: [] },
      },
      selectedWallId: null,
      geometry: null,
      results: null,
    }));
  },

  closeContour: () => {
    const { project } = get();
    const walls = project.external_walls;
    if (walls.length < 2) return;
    const last = walls[walls.length - 1];
    const first = walls[0];
    if (last.p2.x === first.p1.x && last.p2.y === first.p1.y) return;
    get().addWall(last.p2, first.p1, true);
  },

  wallDisplayIndex: (id, isExternal, floor) => {
    const { project } = get();
    const list = isExternal
      ? project.external_walls
      : project.internal_walls[floor] || [];
    const idx = list.findIndex((w) => w.id === id);
    return idx >= 0 ? idx + 1 : 0;
  },

  updateFoundation: (updates) =>
    set((s) => ({
      project: {
        ...s.project,
        foundation: s.project.foundation
          ? { ...s.project.foundation, ...updates }
          : null,
      },
    })),

  updateRoof: (updates) =>
    set((s) => ({
      project: {
        ...s.project,
        roof: s.project.roof
          ? { ...s.project.roof, ...updates }
          : null,
      },
    })),

  updateFloorConfig: (updates) =>
    set((s) => ({
      project: {
        ...s.project,
        floor_config: s.project.floor_config
          ? { ...s.project.floor_config, ...updates }
          : null,
      },
    })),

  setWallMaterial: (type, key) => {
    const extThk = WALL_MAT_THICKNESS[key]?.ext ?? 400;
    const intThk = WALL_MAT_THICKNESS[key]?.int ?? 200;
    set((s) => {
      const apply = (w: WallSegment, isExt: boolean): WallSegment => {
        const thickness = isExt ? extThk : intThk;
        const layers = w.layers.length
          ? w.layers.map((l, i) =>
              i === 0 ? { ...l, material_key: key, thickness } : l
            )
          : [{ role: "loadbearing" as const, material_key: key, thickness }];
        return { ...w, thickness, layers };
      };
      const project: Project = {
        ...s.project,
        external_walls: s.project.external_walls.map((w) => apply(w, true)),
        internal_walls: Object.fromEntries(
          Object.entries(s.project.internal_walls).map(([f, walls]) => [
            f,
            walls.map((w) => apply(w, false)),
          ])
        ),
      };
      return { project, wallMatType: type, wallMatKey: key };
    });
    get().updateGeometry();
    get().save();
  },

  calculate: async () => {
    set({ calculating: true });
    try {
      get().save();
      const result = await calculateMaterials(get().project);
      set({ results: result, geometry: result.geometry, calculating: false });
    } catch (e) {
      console.error("Calculate error:", e);
      set({ calculating: false });
      alert("Ошибка расчёта: " + (e as Error).message);
    }
  },

  updateGeometry: async () => {
    const { project } = get();
    if (project.external_walls.length < 3) return;
    try {
      const g = await computeGeometry(project);
      set({ geometry: g });
    } catch {
      // молча — геометрия обновится при следующем изменении
    }
  },

  save: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().project));
    localStorage.setItem("wallMatType", get().wallMatType);
    localStorage.setItem("wallMatKey", get().wallMatKey);
  },

  load: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    try {
      const proj = JSON.parse(data) as Project;
      const maxId = Math.max(
        0,
        ...proj.external_walls.map((w) => parseInt(w.id.replace(/\D/g, "")) || 0),
        ...Object.values(proj.internal_walls)
          .flat()
          .map((w) => parseInt(w.id.replace(/\D/g, "")) || 0)
      );
      const savedType = localStorage.getItem("wallMatType") as WallMatType | null;
      const savedKey = localStorage.getItem("wallMatKey");
      set({
        project: { ...defaultProject, ...proj },
        wallIdCounter: maxId,
        currentFloor: 1,
        geometry: null,
        results: null,
        wallMatType: savedType ?? get().wallMatType,
        wallMatKey: savedKey ?? get().wallMatKey,
      });
      get().updateGeometry();
    } catch (e) {
      console.warn("Load failed", e);
    }
  },
}));
