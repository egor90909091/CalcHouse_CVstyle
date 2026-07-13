// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useProjectStore";
import type { Point, WallSegment, EditorMode } from "../types/project";
import * as fabricModule from "fabric";

// fabric 5.x: при ESM-импорте через vite Canvas может лежать на разных уровнях
const _f: any = fabricModule;
const fabric: any =
  typeof _f?.Canvas === "function"
    ? _f
    : typeof _f?.default?.Canvas === "function"
    ? _f.default
    : typeof _f?.default?.fabric?.Canvas === "function"
    ? _f.default.fabric
    : typeof _f?.fabric?.Canvas === "function"
    ? _f.fabric
    : _f;

const MM_PER_PX = 50;
const GRID_MM = 1000;
const SNAP_TOL_MM = 200;
const WALL_SNAP_TOL_MM = 400;   // привязка к точке на существующей стене
const CLOSE_TOL_MM = 300;      // замыкание контура по стартовой точке
const DUP_ANGLE_TOL = 1.5;     // допуск угла при поиске дублирующей стены (град.)
const DUP_OVERLAP = 0.7;       // порог перекрытия для блокировки дубликата

const mmToPx = (mm: number) => mm / MM_PER_PX;
const pxToMm = (px: number) => Math.round(px * MM_PER_PX);
const snapMm = (mm: number) => Math.round(mm / GRID_MM) * GRID_MM;

const cssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

const getThemeColors = () => ({
  bg: cssVar("--bg-canvas", "#1e2a3a"),
  grid: cssVar("--grid-line", "#2a3a4a"),
  external: cssVar("--wall-external", "#7ab8d4"),
  externalFill: cssVar("--wall-external-fill", "#3b82f6"),
  externalEdge: cssVar("--wall-external-edge", "#1e40af"),
  internal: cssVar("--wall-internal", "#9aa8b8"),
  internalFill: cssVar("--wall-internal-fill", "#cbd5e1"),
  internalEdge: cssVar("--wall-internal-edge", "#64748b"),
  locked: cssVar("--wall-locked", "#5a6a7a"),
  lockedFill: cssVar("--wall-locked", "#5a6a7a"),
  lockedEdge: cssVar("--wall-locked-edge", "#94a3b8"),
  preview: cssVar("--wall-preview", "#4fc3f7"),
  label: cssVar("--wall-label", "#a0b0c0"),
  door: cssVar("--opening-door", "#ff9800"),
  doorEdge: cssVar("--opening-door-edge", "#d97706"),
  window: cssVar("--opening-window", "#8bc34a"),
  windowEdge: cssVar("--opening-window-edge", "#059669"),
  accent: cssVar("--accent", "#2563eb"),
  accentStrong: cssVar("--accent-strong", "#1d4ed8"),
  surface: cssVar("--surface", "#ffffff"),
  border: cssVar("--border", "#e2e8f0"),
  textPrimary: cssVar("--text-primary", "#0f172a"),
});

// ── Shared wall/opening drawing helpers ──────────────────────────────
// Used by both the interactive canvas (renderWalls) and the export path
// (__wallCanvasExportAllFloors) so the printed image matches the editor.

// Compute the solid (non-opening) sub-ranges of a wall as fractions of wall length.
// Returns [[tStart, tEnd], ...] in [0,1] for solid parts.
function computeSubsegments(wallLen: number, openings: any[]): Array<[number, number]> {
  if (!openings || openings.length === 0) return [[0, 1]];
  const gaps: Array<[number, number]> = [];
  for (const op of openings) {
    const s = Math.max(0, op.offset - op.width / 2);
    const e = Math.min(wallLen, op.offset + op.width / 2);
    if (e > s) gaps.push([s, e]);
  }
  gaps.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of gaps) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }
  const solid: Array<[number, number]> = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) solid.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < wallLen) solid.push([cursor, wallLen]);
  return solid.map(([s, e]) => [s / wallLen, e / wallLen]);
}

interface WallPxInfo {
  x1: number; y1: number; x2: number; y2: number;
  nx: number; ny: number; halfThick: number; lenPx: number;
}

function wallPxInfo(wall: WallSegment, offX: number = 0, offY: number = 0): WallPxInfo {
  const x1 = mmToPx(wall.p1.x) + offX, y1 = mmToPx(wall.p1.y) + offY;
  const x2 = mmToPx(wall.p2.x) + offX, y2 = mmToPx(wall.p2.y) + offY;
  const dx = x2 - x1, dy = y2 - y1;
  const lenPx = Math.hypot(dx, dy) || 1;
  const nx = -dy / lenPx, ny = dx / lenPx;
  const thickPx = Math.max(4, mmToPx(wall.thickness));
  return { x1, y1, x2, y2, nx, ny, halfThick: thickPx / 2, lenPx };
}

function subSegPolyPts(w: WallPxInfo, tStart: number, tEnd: number, expand: number = 0): Array<{ x: number; y: number }> {
  const sx = w.x1 + (w.x2 - w.x1) * tStart;
  const sy = w.y1 + (w.y2 - w.y1) * tStart;
  const ex = w.x1 + (w.x2 - w.x1) * tEnd;
  const ey = w.y1 + (w.y2 - w.y1) * tEnd;
  const ht = w.halfThick + expand;
  return [
    { x: sx + w.nx * ht, y: sy + w.ny * ht },
    { x: ex + w.nx * ht, y: ey + w.ny * ht },
    { x: ex - w.nx * ht, y: ey - w.ny * ht },
    { x: sx - w.nx * ht, y: sy - w.ny * ht },
  ];
}

// Draw a wall as filled rectangle(s), split around its openings.
// opts: { selected, locked, palette, evented (default true) }
function drawWallBody(
  canvas: any, wall: WallSegment,
  opts: { selected?: boolean; locked?: boolean; palette: any; evented?: boolean; offX?: number; offY?: number },
): WallPxInfo {
  const p = opts.palette;
  const w = wallPxInfo(wall, opts.offX || 0, opts.offY || 0);
  const wallLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
  const subs = computeSubsegments(wallLen, wall.openings || []);

  let fill: string, edge: string;
  if (wall.external) {
    if (opts.locked) { fill = p.lockedFill || p.locked; edge = p.lockedEdge || p.locked; }
    else if (opts.selected) { fill = p.accent; edge = p.accentStrong || p.accent; }
    else { fill = p.externalFill || p.external; edge = p.externalEdge || p.external; }
  } else {
    if (opts.selected) { fill = p.accent; edge = p.accentStrong || p.accent; }
    else { fill = p.internalFill || p.internal; edge = p.internalEdge || p.internal; }
  }

  // Selection glow (under body)
  if (opts.selected) {
    for (const [s, e] of subs) {
      if (e - s < 0.001) continue;
      const pts = subSegPolyPts(w, s, e, 5);
      canvas.add(new fabric.Polygon(pts, {
        fill: p.accent, opacity: 0.18,
        selectable: false, evented: false, excludeFromExport: true,
      }));
    }
  }

  // Body segments
  const evented = opts.evented !== false;
  for (const [s, e] of subs) {
    if (e - s < 0.001) continue;
    const pts = subSegPolyPts(w, s, e, 0);
    const poly = new fabric.Polygon(pts, {
      fill,
      stroke: edge,
      strokeWidth: 1,
      strokeLineJoin: "miter",
      selectable: false,
      evented,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
    });
    poly._wallId = wall.id;
    poly._isExternal = wall.external;
    canvas.add(poly);
  }

  return w;
}

// Refined door symbol: hinge dot + solid leaf + thin swing arc.
function drawDoorSymbol(
  canvas: any, op: any, cx: number, cy: number, angleDeg: number,
  palette: any, evented: boolean, idx: number = -1,
) {
  const wPx = Math.max(10, mmToPx(op.width));
  const halfW = wPx / 2;
  const color = palette.door;
  const objs: any[] = [];

  // Hinge dot at one end
  objs.push(new fabric.Circle({
    left: -halfW - 2, top: -2, radius: 2,
    fill: color, selectable: false, evented: false,
  }));

  // Door leaf: solid line from hinge (-halfW, 0) to open end (-halfW, -halfW)
  objs.push(new fabric.Line([-halfW, 0, -halfW, -halfW], {
    stroke: color, strokeWidth: 3, strokeLineCap: "round",
    selectable: false, evented: false,
  }));

  // Swing arc (thin) from (halfW, 0) sweeping to (-halfW, -halfW)
  const arcPath = `M ${halfW} 0 A ${halfW} ${halfW} 0 0 0 ${-halfW} ${-halfW}`;
  objs.push(new fabric.Path(arcPath, {
    stroke: palette.doorEdge || color, strokeWidth: 1.2, fill: "transparent",
    strokeLineJoin: "round", selectable: false, evented: false,
  }));

  const group = new fabric.Group(objs, { selectable: false, evented });
  group.set({ left: cx, top: cy, originX: "center", originY: "center", angle: angleDeg });
  group._isOpening = true;
  group._openingIndex = idx;
  canvas.add(group);
}

// Refined window symbol: parallel pair, dashed center line, end caps.
function drawWindowSymbol(
  canvas: any, op: any, cx: number, cy: number, angleDeg: number,
  palette: any, evented: boolean, idx: number = -1,
) {
  const wPx = Math.max(10, mmToPx(op.width));
  const halfW = wPx / 2;
  const color = palette.window;
  const edgeColor = palette.windowEdge || color;
  const gap = 4;
  const objs: any[] = [
    new fabric.Line([-halfW, -gap, halfW, -gap], { stroke: color, strokeWidth: 2.2, strokeLineCap: "square", selectable: false, evented: false }),
    new fabric.Line([-halfW, gap, halfW, gap], { stroke: color, strokeWidth: 2.2, strokeLineCap: "square", selectable: false, evented: false }),
    new fabric.Line([-halfW, 0, halfW, 0], { stroke: edgeColor, strokeWidth: 0.8, strokeDashArray: [3, 3], selectable: false, evented: false }),
    new fabric.Line([-halfW, -gap, -halfW, gap], { stroke: edgeColor, strokeWidth: 1.5, selectable: false, evented: false }),
    new fabric.Line([halfW, -gap, halfW, gap], { stroke: edgeColor, strokeWidth: 1.5, selectable: false, evented: false }),
  ];
  const group = new fabric.Group(objs, { selectable: false, evented });
  group.set({ left: cx, top: cy, originX: "center", originY: "center", angle: angleDeg });
  group._isOpening = true;
  group._openingIndex = idx;
  canvas.add(group);
}

// Unified opening dispatcher.
function drawOpeningSymbol(
  canvas: any, op: any, cx: number, cy: number, angleDeg: number,
  palette: any, evented: boolean, idx: number = -1,
) {
  if (op.type === "door") drawDoorSymbol(canvas, op, cx, cy, angleDeg, palette, evented, idx);
  else drawWindowSymbol(canvas, op, cx, cy, angleDeg, palette, evented, idx);
}
// ── /Shared wall/opening drawing helpers ─────────────────────────────

interface CanvasState {
  mode: EditorMode;
  currentFloor: number;
  openingType: "door" | "window";
  externalWalls: WallSegment[];
  internalWalls: Record<number, WallSegment[]>;
  selectedWallId: string | null;
  selectedWallIsExternal: boolean;
  addWall: (p1: Point, p2: Point, isExternal: boolean) => void;
  addWallWithSplit: (p1: Point, p2: Point, isExternal: boolean, split?: { wallId: string; isExternal: boolean; point: Point } | null) => void;
  splitWall: (wallId: string, isExternal: boolean, point: Point) => void;
  selectWall: (id: string | null, isExternal: boolean) => void;
  deleteWall: (id: string, isExternal: boolean) => void;
  addOpening: (wallId: string, isExternal: boolean, opening: any) => void;
  closeContour: () => void;
  wallDisplayIndex: (id: string, isExternal: boolean, floor: number) => number;
  setDrawInProgress: (v: boolean) => void;
  angleSnapMode: "strict" | "standard" | "free";
}

export default function WallCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);
  const tempStartRef = useRef<Point | null>(null);
  const tempLineRef = useRef<any>(null);
  const snapRingRef = useRef<any>(null);
  const snapCircleRef = useRef<any>(null);
  const dupWarnRef = useRef<any>(null);
  const eraseHoverRef = useRef<any>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const store = useStore();

  const stateRef = useRef<CanvasState>({} as CanvasState);
  stateRef.current = {
    mode: store.mode,
    currentFloor: store.currentFloor,
    openingType: store.openingType,
    externalWalls: store.project.external_walls,
    internalWalls: store.project.internal_walls,
    selectedWallId: store.selectedWallId,
    selectedWallIsExternal: store.selectedWallIsExternal,
    addWall: store.addWall,
    addWallWithSplit: store.addWallWithSplit,
    splitWall: store.splitWall,
    selectWall: store.selectWall,
    deleteWall: store.deleteWall,
    addOpening: store.addOpening,
    closeContour: store.closeContour,
    wallDisplayIndex: store.wallDisplayIndex,
    setDrawInProgress: store.setDrawInProgress,
    angleSnapMode: store.angleSnapMode,
  };

  // Expose canvas image export for printing — cropped to building bounds
  useEffect(() => {
    const exportCropped = (walls: WallSegment[], scale: number) => {
      if (walls.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of walls) {
        for (const pt of [w.p1, w.p2]) {
          const px = mmToPx(pt.x) * scale, py = mmToPx(pt.y) * scale;
          minX = Math.min(minX, px); minY = Math.min(minY, py);
          maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        }
      }
      const pad = 24;
      const wPx = (maxX - minX) + pad * 2;
      const hPx = (maxY - minY) + pad * 2;
      if (wPx <= 0 || hPx <= 0) return null;
      return { left: minX - pad, top: minY - pad, width: wPx, height: hPx };
    };

    (window as any).__wallCanvasExport = () => {
      const c = fabricRef.current;
      if (!c) return null;
      const walls = getAllWalls();
      const crop = exportCropped(walls, 1);
      if (!crop) return null;
      return c.toDataURL({
        format: "png", multiplier: 2,
        left: crop.left, top: crop.top,
        width: crop.width, height: crop.height,
      });
    };

    (window as any).__wallCanvasExportAllFloors = () => {
      const s = stateRef.current;
      const store = useStore.getState();
      const geometry = store.geometry;
      const colors = getThemeColors();
      const result: Record<string, { image: string; label: string }> = {};
      const floorsCount = store.project?.floors_count || 1;

      for (let floor = 1; floor <= floorsCount; floor++) {
        const allWalls: WallSegment[] = [];
        allWalls.push(...s.externalWalls);
        if (s.internalWalls[floor]) {
          allWalls.push(...s.internalWalls[floor]);
        }
        if (allWalls.length === 0) continue;

        const crop = exportCropped(allWalls, 1);
        if (!crop) continue;

        const expColors = {
          exterior: colors.external,
          interior: colors.internal,
          text: colors.textPrimary,
          surface: colors.surface,
          border: colors.border,
          bg: "#ffffff",
          gridLine: "#e2e8f0",
        };

        // Unified export palette for shared wall/opening helpers
        const expPal = {
          external: expColors.exterior,
          externalFill: expColors.exterior,
          externalEdge: colors.externalEdge || expColors.exterior,
          internal: expColors.interior,
          internalFill: expColors.interior,
          internalEdge: colors.internalEdge || expColors.interior,
          locked: expColors.interior,
          lockedFill: expColors.interior,
          lockedEdge: colors.internalEdge || expColors.interior,
          accent: expColors.exterior,
          accentStrong: expColors.exterior,
          door: colors.door,
          doorEdge: colors.doorEdge || colors.door,
          window: colors.window,
          windowEdge: colors.windowEdge || colors.window,
        };

        const tempCanvas = new fabric.StaticCanvas(null, {
          width: crop.width + 50,
          height: crop.height + 50,
          backgroundColor: expColors.bg,
        });

        const offX = -crop.left + 25;
        const offY = -crop.top + 25;

        // Grid
        const gridStep = mmToPx(GRID_MM);
        const gridLines: any[] = [];
        for (let gx = 0; gx <= crop.width + 50; gx += gridStep) {
          gridLines.push(new fabric.Line([gx, 0, gx, crop.height + 50], {
            stroke: expColors.gridLine, selectable: false, evented: false,
          }));
        }
        for (let gy = 0; gy <= crop.height + 50; gy += gridStep) {
          gridLines.push(new fabric.Line([0, gy, crop.width + 50, gy], {
            stroke: expColors.gridLine, selectable: false, evented: false,
          }));
        }
        tempCanvas.add(new fabric.Group(gridLines, { selectable: false, evented: false }));

        // Walls — filled bodies, split around openings (gaps show export bg)
        for (const wall of allWalls) {
          drawWallBody(tempCanvas, wall, { palette: expPal, locked: false, evented: false, offX, offY });
        }

        // Junction nodes
        const vertexMap = new Map<string, { x: number; y: number; count: number; color: string }>();
        const key = (p: Point) => `${p.x},${p.y}`;
        for (const w of allWalls) {
          for (const p of [w.p1, w.p2]) {
            const k = key(p);
            const ex = vertexMap.get(k);
            if (ex) { ex.count++; } else {
              vertexMap.set(k, {
                x: mmToPx(p.x) + offX, y: mmToPx(p.y) + offY,
                count: 1, color: w.external ? expColors.exterior : expColors.interior,
              });
            }
          }
        }
        for (const v of vertexMap.values()) {
          if (v.count < 2) continue;
          const r = 4;
          tempCanvas.add(new fabric.Circle({
            left: v.x - r, top: v.y - r, radius: r,
            fill: v.color, selectable: false, evented: false,
          }));
        }

        // Wall length labels + badges
        for (const wall of allWalls) {
          const x1 = mmToPx(wall.p1.x) + offX, y1 = mmToPx(wall.p1.y) + offY;
          const x2 = mmToPx(wall.p2.x) + offX, y2 = mmToPx(wall.p2.y) + offY;
          const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
          const lenMm = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y);
          const lenText = (lenMm / 1000).toFixed(1) + "\u00A0м";

          const dx = x2 - x1, dy = y2 - y1;
          const lenPx = Math.hypot(dx, dy) || 1;
          const nx = -dy / lenPx, ny = dx / lenPx;
          const lblOffset = 16;
          const lblX = midX + nx * lblOffset;
          const lblY = midY + ny * lblOffset;

          const wlText = new fabric.Text(lenText, {
            fontSize: 10, fontWeight: 600,
            fill: expColors.text,
            selectable: false, evented: false,
          });
          const padX = 8, padY = 4;
          const wlChip = new fabric.Rect({
            left: lblX - (wlText.width + padX * 2) / 2,
            top: lblY - (wlText.height + padY * 2) / 2,
            width: wlText.width + padX * 2,
            height: wlText.height + padY * 2,
            rx: 6, ry: 6,
            fill: expColors.surface,
            opacity: 0.92,
            stroke: expColors.border,
            strokeWidth: 1,
            selectable: false, evented: false,
          });
          wlText.set({
            left: lblX - wlText.width / 2,
            top: lblY - wlText.height / 2,
          });
          tempCanvas.add(wlChip);
          tempCanvas.add(wlText);

          // Badge
          const extList = wall.external ? s.externalWalls : s.internalWalls[floor];
          const bIdx = (extList || []).findIndex((w: WallSegment) => w.id === wall.id) + 1;
          if (bIdx > 0) {
            const br = 8;
            const badgeColor = wall.external ? expColors.exterior : expColors.interior;
            const badge = new fabric.Circle({
              left: x1 - br, top: y1 - br, radius: br,
              fill: badgeColor,
              stroke: expColors.surface,
              strokeWidth: 1.5,
              selectable: false, evented: false,
            });
            const bText = new fabric.Text(String(bIdx), {
              fontSize: 10, fontWeight: 700,
              fill: expColors.surface,
              selectable: false, evented: false,
            });
            bText.set({ left: x1 - bText.width / 2, top: y1 - bText.height / 2 });
            tempCanvas.add(badge);
            tempCanvas.add(bText);
          }
        }

        // Openings — refined door/window symbols (editor-identical)
        for (const wall of allWalls) {
          if (!wall.openings?.length) continue;
          const wInfo = wallPxInfo(wall, offX, offY);
          const angleDeg = Math.atan2(wInfo.y2 - wInfo.y1, wInfo.x2 - wInfo.x1) * 180 / Math.PI;
          const wLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
          for (const op of wall.openings) {
            const t = op.offset / wLen;
            const cx = wInfo.x1 + (wInfo.x2 - wInfo.x1) * t;
            const cy = wInfo.y1 + (wInfo.y2 - wInfo.y1) * t;
            drawOpeningSymbol(tempCanvas, op, cx, cy, angleDeg, expPal, false, -1);
          }
        }

        // Room labels
        const rooms = geometry?.rooms_by_floor?.[floor];
        if (rooms && rooms.length > 0) {
          for (const room of rooms) {
            const cx = mmToPx(room.centroid_x) + offX;
            const cy = mmToPx(room.centroid_y) + offY;
            const areaStr = "S=" + room.area_m2.toFixed(1) + "\u00A0м²";
            const perimStr = "P=" + (room.perimeter_mm / 1000).toFixed(1) + "\u00A0м";
            const rlText = new fabric.Text(areaStr + "\n" + perimStr, {
              fontSize: 10, lineHeight: 1.25, textAlign: "center",
              fill: expColors.text, opacity: 0.35,
              selectable: false, evented: false,
            });
            rlText.set({ left: cx - (rlText.width || 0) / 2, top: cy - (rlText.height || 0) / 2 });
            tempCanvas.add(rlText);
          }
        }

        const floorLabel = floor === 1 ? "1-й этаж" : `${floor}-й этаж`;
        result[`floor_${floor}`] = {
          image: tempCanvas.toDataURL({ format: "png", multiplier: 2 }),
          label: floorLabel,
        };

        tempCanvas.dispose();
      }

      return result;
    };
    return () => {
      delete (window as any).__wallCanvasExport;
      delete (window as any).__wallCanvasExportAllFloors;
    };
  }, []);

  // Init Fabric canvas
  useEffect(() => {
    try {
      if (!canvasElRef.current) return;
      if (typeof fabric.Canvas !== "function") {
        setInitError("Fabric.js: Canvas не является функцией. Проверьте импорт.");
        return;
      }

      const canvas = new fabric.Canvas(canvasElRef.current, {
        backgroundColor: getThemeColors().bg,
        selection: false,
        hoverCursor: "crosshair",
        allowTouchScrolling: false,
      });
      fabricRef.current = canvas;

      const resize = () => {
        if (!stageRef.current) return;
        const w = stageRef.current.clientWidth;
        const h = stageRef.current.clientHeight;
        if (w <= 0 || h <= 0) return;
        canvas.setWidth(w);
        canvas.setHeight(h);
        drawGrid(canvas);
        renderWalls();
      };

      // Multiple resize attempts for mobile devices where layout may not be ready immediately
      requestAnimationFrame(() => {
        resize();
        setTimeout(resize, 50);
        setTimeout(resize, 150);
        setTimeout(resize, 300);
        setTimeout(resize, 500);
      });
      window.addEventListener("resize", resize);

      // ResizeObserver — ловит изменение размера stage даже без window resize
      let resizeObs: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && stageRef.current) {
        resizeObs = new ResizeObserver(() => {
          const w = stageRef.current?.clientWidth || 0;
          const h = stageRef.current?.clientHeight || 0;
          if (w > 0 && h > 0) {
            canvas.setWidth(w);
            canvas.setHeight(h);
            drawGrid(canvas);
            renderWalls();
          }
        });
        resizeObs.observe(stageRef.current);
      }

      canvas.on("mouse:down", (opt: any) => handleMouseDown(opt));
      canvas.on("mouse:move", (opt: any) => handleMouseMove(opt));
      canvas.on("selection:created", () => {});
      canvas.on("selection:updated", () => {});
      canvas.on("selection:cleared", () => {});

      // Keyboard
      const onKey = (e: KeyboardEvent) => {
        const s = stateRef.current;
        if (e.key === "Escape") {
          tempStartRef.current = null;
          s.setDrawInProgress(false);
          clearTempLine();
          clearSnapRing();
          clearSnapCircle();
          clearDuplicateWarn();
          renderWalls();
        } else if (e.key === "Delete" || e.key === "Backspace") {
          if (s.selectedWallId) {
            s.deleteWall(s.selectedWallId, s.selectedWallIsExternal);
          }
        } else if (e.key === "Enter") {
          if (s.mode === "draw" && s.externalWalls.length >= 3) {
            s.closeContour();
            tempStartRef.current = null;
            s.setDrawInProgress(false);
            clearTempLine();
            renderWalls();
          }
        }
      };
      window.addEventListener("keydown", onKey);

      setInitError(null);
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
        if (resizeObs) resizeObs.disconnect();
        canvas.dispose();
        fabricRef.current = null;
      };
    } catch (e: any) {
      console.error("Fabric init error:", e);
      setInitError("Fabric ошибка: " + String(e?.message || e));
    }
  }, []);

  // Re-render on state change
  useEffect(() => {
    if (!initError) renderWalls();
  }, [store.project.external_walls, store.project.internal_walls, store.currentFloor, store.mode, store.selectedWallId, store.geometry, initError]);

  // Re-render when theme changes (observe class toggles on <html>)
  useEffect(() => {
    if (initError || !fabricRef.current) return;
    const observer = new MutationObserver(() => {
      renderWalls();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [initError]);

  // Track drawInProgress — clear temp elements when draw is cancelled externally
  useEffect(() => {
    if (!store.drawInProgress && tempStartRef.current) {
      tempStartRef.current = null;
      clearTempLine();
      clearSnapRing();
      clearSnapCircle();
      clearDuplicateWarn();
      renderWalls();
    }
  }, [store.drawInProgress]);

  // Update cursor/selection
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.selection = false;
    canvas.defaultCursor =
      store.mode === "draw" ? "crosshair" :
      store.mode === "opening" ? "pointer" :
      store.mode === "erase" ? "pointer" : "default";
    canvas.hoverCursor = canvas.defaultCursor;
    clearEraseHover();
    canvas.renderAll();
  }, [store.mode]);

  // Track empty state for overlay
  useEffect(() => {
    const s = stateRef.current;
    const hasWalls =
      s.externalWalls.length > 0 ||
      (s.internalWalls[s.currentFloor] && s.internalWalls[s.currentFloor].length > 0);
    setIsEmpty(!hasWalls);
  }, [store.project.external_walls, store.project.internal_walls, store.currentFloor]);

  function drawGrid(canvas: any) {
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    if (w <= 0 || h <= 0) return;
    const step = mmToPx(GRID_MM);
    const gridColor = getThemeColors().grid;
    const lines: any[] = [];
    for (let x = 0; x <= w; x += step) {
      lines.push(new fabric.Line([x, 0, x, h], {
        stroke: gridColor, selectable: false, evented: false, excludeFromExport: true,
      }));
    }
    for (let y = 0; y <= h; y += step) {
      lines.push(new fabric.Line([0, y, w, y], {
        stroke: gridColor, selectable: false, evented: false, excludeFromExport: true,
      }));
    }
    const grid = new fabric.Group(lines, { selectable: false, evented: false });
    canvas.gridGroup = grid;
  }

  function getAllWalls(): WallSegment[] {
    const s = stateRef.current;
    const all = [...s.externalWalls];
    if (s.internalWalls[s.currentFloor]) {
      all.push(...s.internalWalls[s.currentFloor]);
    }
    return all;
  }

  function renderWalls() {
    const canvas = fabricRef.current;
    if (!canvas || initError) return;
    const colors = getThemeColors();
    canvas.clear();
    canvas.backgroundColor = colors.bg;
    if (canvas.gridGroup) canvas.add(canvas.gridGroup);

    const s = stateRef.current;
    const externalLocked = s.currentFloor > 1;
    const all = getAllWalls();

    // Pass 1: walls (filled bodies, split around openings — gaps show canvas bg)
    for (const wall of all) {
      drawWallBody(canvas, wall, {
        selected: stateRef.current.selectedWallId === wall.id,
        locked: externalLocked && wall.external,
        palette: colors,
        evented: true,
      });
    }

    // Pass 2: openings (door/window symbols centered in wall gaps)
    for (const wall of all) {
      drawOpenings(canvas, wall);
    }

    // Pass 3: junction nodes (fill hairline gaps at angled corners)
    drawJunctionNodes(canvas, all);

    // Pass 4: labels (chip + badge)
    for (const wall of all) {
      drawWallLabel(canvas, wall, externalLocked && wall.external);
    }

    // Pass 5: room area/perimeter labels (from geometry)
    const geo = useStore.getState().geometry;
    const rooms = geo?.rooms_by_floor?.[s.currentFloor];
    if (rooms && rooms.length > 0) {
      drawRoomLabels(canvas, rooms);
    }

    canvas.renderAll();
  }

  function drawOpenings(canvas: any, wall: WallSegment) {
    if (!wall.openings?.length) return;
    const colors = getThemeColors();
    const wLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
    const angleDeg = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x) * 180 / Math.PI;
    const x1 = mmToPx(wall.p1.x), y1 = mmToPx(wall.p1.y);
    const x2 = mmToPx(wall.p2.x), y2 = mmToPx(wall.p2.y);
    for (let i = 0; i < wall.openings.length; i++) {
      const op = wall.openings[i];
      const t = op.offset / wLen;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      drawOpeningSymbol(canvas, op, cx, cy, angleDeg, colors, true, i);
    }
  }

  function drawJunctionNodes(canvas: any, walls: WallSegment[]) {
    const colors = getThemeColors();
    const vertexMap = new Map<string, { x: number; y: number; count: number; color: string }>();
    const key = (p: Point) => `${p.x},${p.y}`;
    for (const w of walls) {
      for (const p of [w.p1, w.p2]) {
        const k = key(p);
        const existing = vertexMap.get(k);
        if (existing) {
          existing.count++;
        } else {
          vertexMap.set(k, { x: p.x, y: p.y, count: 1, color: w.external ? colors.external : colors.internal });
        }
      }
    }
    for (const v of vertexMap.values()) {
      if (v.count < 2) continue;
      const r = 4;
      const node = new fabric.Circle({
        left: mmToPx(v.x) - r,
        top: mmToPx(v.y) - r,
        radius: r,
        fill: v.color,
        selectable: false,
        evented: false,
      });
      canvas.add(node);
    }
  }

  function drawWallLabel(canvas: any, wall: WallSegment, locked: boolean) {
    const colors = getThemeColors();
    const x1 = mmToPx(wall.p1.x), y1 = mmToPx(wall.p1.y);
    const x2 = mmToPx(wall.p2.x), y2 = mmToPx(wall.p2.y);
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const lenMm = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y);
    const lenText = (lenMm / 1000).toFixed(1) + " м";

    // Normal offset (perpendicular to wall)
    const dx = x2 - x1, dy = y2 - y1;
    const lenPx = Math.hypot(dx, dy) || 1;
    const nx = -dy / lenPx, ny = dx / lenPx;
    const offset = 16;
    const labelX = midX + nx * offset;
    const labelY = midY + ny * offset;

    const isSelected = stateRef.current.selectedWallId === wall.id;
    const displayIdx = stateRef.current.wallDisplayIndex(wall.id, wall.external, stateRef.current.currentFloor);

    // Length chip text
    const lenLabel = new fabric.Text(lenText, {
      fontSize: 12,
      fontWeight: 600,
      fill: isSelected ? colors.accent : colors.textPrimary,
      selectable: false,
      evented: false,
    });
    // Chip background
    const chipPadX = 8, chipPadY = 4;
    const chipW = lenLabel.width + chipPadX * 2;
    const chipH = lenLabel.height + chipPadY * 2;
    const chip = new fabric.Rect({
      left: labelX - chipW / 2,
      top: labelY - chipH / 2,
      width: chipW,
      height: chipH,
      rx: 6,
      ry: 6,
      fill: colors.surface,
      opacity: 0.92,
      stroke: isSelected ? colors.accent : colors.border,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    lenLabel.set({
      left: labelX - lenLabel.width / 2,
      top: labelY - lenLabel.height / 2,
    });
    canvas.add(chip);
    canvas.add(lenLabel);

    // Number badge at wall start endpoint
    if (displayIdx > 0) {
      const badgeText = new fabric.Text(String(displayIdx), {
        fontSize: 10,
        fontWeight: 700,
        fill: colors.surface,
        selectable: false,
        evented: false,
      });
      const br = 8;
      const badge = new fabric.Circle({
        left: x1 - br,
        top: y1 - br,
        radius: br,
        fill: wall.external ? colors.external : colors.internal,
        stroke: colors.surface,
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
      });
      badgeText.set({
        left: x1 - badgeText.width / 2,
        top: y1 - badgeText.height / 2,
      });
      canvas.add(badge);
      canvas.add(badgeText);
    }
  }

  function drawRoomLabels(canvas: any, rooms: Array<{ area_m2: number; perimeter_mm: number; centroid_x: number; centroid_y: number }>) {
    const colors = getThemeColors();
    for (const room of rooms) {
      const cx = mmToPx(room.centroid_x);
      const cy = mmToPx(room.centroid_y);
      const areaStr = "S=" + room.area_m2.toFixed(1) + "\u00A0м²";
      const perimStr = "P=" + (room.perimeter_mm / 1000).toFixed(1) + "\u00A0м";
      const labelText = areaStr + "\n" + perimStr;

      const text = new fabric.Text(labelText, {
        fontSize: 10,
        lineHeight: 1.25,
        textAlign: "center",
        fill: colors.textPrimary,
        opacity: 0.35,
        selectable: false,
        evented: false,
      });
      text.set({ left: cx - (text.width || 0) / 2, top: cy - (text.height || 0) / 2 });
      canvas.add(text);
    }
  }

  function getPointer(opt: any): { mmX: number; mmY: number } {
    const canvas = fabricRef.current;
    if (!canvas) return { mmX: 0, mmY: 0 };
    const ptr = canvas.getPointer(opt.e);
    return { mmX: snapMm(pxToMm(ptr.x)), mmY: snapMm(pxToMm(ptr.y)) };
  }

  function snapAngle(start: Point, end: Point): { point: Point; angleDeg: number } {
    const dx = end.x - start.x, dy = end.y - start.y;
    const rawAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    const len = Math.hypot(dx, dy);
    const mode = stateRef.current.angleSnapMode;

    let snappedAngle: number;
    if (mode === "strict") {
      snappedAngle = Math.round(rawAngle / 90) * 90;
    } else if (mode === "standard") {
      snappedAngle = Math.round(rawAngle / 15) * 15;
    } else {
      snappedAngle = rawAngle;
    }

    const rad = snappedAngle * Math.PI / 180;
    return {
      point: {
        x: Math.round(start.x + Math.cos(rad) * len),
        y: Math.round(start.y + Math.sin(rad) * len),
      },
      angleDeg: Math.round(snappedAngle),
    };
  }

  function findNearVertex(mmX: number, mmY: number): Point | null {
    const s = stateRef.current;
    const all = [...s.externalWalls];
    if (s.internalWalls[s.currentFloor]) all.push(...s.internalWalls[s.currentFloor]);
    for (const w of all) {
      if (Math.hypot(w.p1.x - mmX, w.p1.y - mmY) <= SNAP_TOL_MM) return { ...w.p1 };
      if (Math.hypot(w.p2.x - mmX, w.p2.y - mmY) <= SNAP_TOL_MM) return { ...w.p2 };
    }
    return null;
  }

  function pointToSegDist(px: number, py: number, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - p1.x, py - p1.y);
    let t = ((px - p1.x) * dx + (py - p1.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (p1.x + t * dx), py - (p1.y + t * dy));
  }

  // Hit-test проёма: возвращает { wall, isExternal, index } ближайшего проёма в радиусе
  function findNearOpening(mmX: number, mmY: number): { wall: WallSegment; isExternal: boolean; index: number } | null {
    const s = stateRef.current;
    const all = [...s.externalWalls];
    if (s.internalWalls[s.currentFloor]) all.push(...s.internalWalls[s.currentFloor]);
    const tol = 300; // мм
    let best: { wall: WallSegment; isExternal: boolean; index: number } | null = null;
    let bestDist = tol;
    for (const w of all) {
      if (!w.openings?.length) continue;
      const wLen = Math.hypot(w.p2.x - w.p1.x, w.p2.y - w.p1.y) || 1;
      for (let i = 0; i < w.openings.length; i++) {
        const op = w.openings[i];
        const t = op.offset / wLen;
        const ox = w.p1.x + (w.p2.x - w.p1.x) * t;
        const oy = w.p1.y + (w.p2.y - w.p1.y) * t;
        const d = Math.hypot(ox - mmX, oy - mmY);
        const opPxHalf = Math.max(200, op.width / 2);
        if (d <= opPxHalf && d < bestDist) {
          bestDist = d;
          best = { wall: w, isExternal: w.external, index: i };
        }
      }
    }
    return best;
  }

  function findNearestWall(mmX: number, mmY: number): WallSegment | null {
    const s = stateRef.current;
    const all = [...s.externalWalls];
    if (s.internalWalls[s.currentFloor]) all.push(...s.internalWalls[s.currentFloor]);
    let best: WallSegment | null = null;
    let bestDist = Infinity;
    for (const w of all) {
      const d = pointToSegDist(mmX, mmY, w.p1, w.p2);
      if (d < bestDist) { bestDist = d; best = w; }
    }
    return bestDist < 500 ? best : null;
  }

  // Проекция точки на сегмент: возвращает { point, t } где t ∈ [0,1]
  function pointToSegProj(px: number, py: number, p1: Point, p2: Point): { x: number; y: number; t: number } {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return { x: p1.x, y: p1.y, t: 0 };
    let t = ((px - p1.x) * dx + (py - p1.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { x: Math.round(p1.x + t * dx), y: Math.round(p1.y + t * dy), t };
  }

  // Привязка к точке на существующей стене (внутри сегмента, не на концах).
  // Возвращает ближайшего кандидата в радиусе WALL_SNAP_TOL_MM.
  function findSnapOnWall(mmX: number, mmY: number): { point: Point; wall: WallSegment; isExternal: boolean } | null {
    const s = stateRef.current;
    const all: WallSegment[] = [...s.externalWalls];
    if (s.internalWalls[s.currentFloor]) all.push(...s.internalWalls[s.currentFloor]);
    let best: { point: Point; wall: WallSegment; isExternal: boolean } | null = null;
    let bestDist = WALL_SNAP_TOL_MM;
    for (const w of all) {
      const proj = pointToSegProj(mmX, mmY, w.p1, w.p2);
      // Только внутри сегмента (концы покрыты вершинной привязкой)
      if (proj.t <= 0.001 || proj.t >= 0.999) continue;
      const d = Math.hypot(proj.x - mmX, proj.y - mmY);
      if (d < bestDist) {
        bestDist = d;
        best = { point: { x: proj.x, y: proj.y }, wall: w, isExternal: w.external };
      }
    }
    return best;
  }

  // Замыкание контура по стартовой точке цепи: если рисуем и курсор у начала — это замыкание.
  function findChainCloseSnap(mmX: number, mmY: number): Point | null {
    const s = stateRef.current;
    if (!tempStartRef.current) return null;
    if (s.currentFloor !== 1) return null; // замыкание актуально для внешнего контура (1 этаж)
    const ext = s.externalWalls;
    if (ext.length < 1) return null;
    const start = ext[0].p1;
    if (Math.hypot(start.x - mmX, start.y - mmY) <= CLOSE_TOL_MM) {
      return { x: start.x, y: start.y };
    }
    return null;
  }

  // Проверка, ложится ли новая стена [p1,p2] поверх существующей (дубликат).
  // Коллинеарность + перекрытие по длине > DUP_OVERLAP.
  function isDuplicateWall(a1: Point, a2: Point, isExt: boolean): boolean {
    const s = stateRef.current;
    const all: WallSegment[] = [];
    if (isExt) all.push(...s.externalWalls);
    if (s.internalWalls[s.currentFloor]) all.push(...s.internalWalls[s.currentFloor]);
    const newLen = Math.hypot(a2.x - a1.x, a2.y - a1.y);
    if (newLen < 1) return false;
    const newDx = a2.x - a1.x, newDy = a2.y - a1.y;
    for (const w of all) {
      const wLen = Math.hypot(w.p2.x - w.p1.x, w.p2.y - w.p1.y);
      if (wLen < 1) continue;
      const wDx = w.p2.x - w.p1.x, wDy = w.p2.y - w.p1.y;
      // Углы обеих стен
      const angNew = Math.atan2(newDy, newDx) * 180 / Math.PI;
      const angW = Math.atan2(wDy, wDx) * 180 / Math.PI;
      let dAng = Math.abs(((angNew - angW) % 360 + 360) % 360);
      if (dAng > 180) dAng = 360 - dAng;
      // Коллинеарны, если угол ~0 (сонаправлены) ИЛИ ~180 (противонаправлены, та же прямая)
      if (dAng > DUP_ANGLE_TOL && Math.abs(dAng - 180) > DUP_ANGLE_TOL) continue;
      // Коллинеарность: расстояние от p1 новой до прямой старой
      const cross = (a1.x - w.p1.x) * wDy - (a1.y - w.p1.y) * wDx;
      const distToLine = Math.abs(cross) / wLen;
      if (distToLine > 50) continue; // не на одной прямой (>5см — разные стены)
      // Перекрытие проекций вдоль направления старой стены
      const t1 = ((a1.x - w.p1.x) * wDx + (a1.y - w.p1.y) * wDy) / (wLen * wLen);
      const t2 = ((a2.x - w.p1.x) * wDx + (a2.y - w.p1.y) * wDy) / (wLen * wLen);
      const lo = Math.max(0, Math.min(t1, t2));
      const hi = Math.min(1, Math.max(t1, t2));
      if (hi <= lo) continue; // нет перекрытия
      const overlapLen = (hi - lo) * wLen;
      const shorter = Math.min(newLen, wLen);
      if (overlapLen / shorter >= DUP_OVERLAP) return true;
    }
    return false;
  }

  function clearSnapRing() {
    const canvas = fabricRef.current;
    if (!canvas || !snapRingRef.current) return;
    canvas.remove(snapRingRef.current);
    snapRingRef.current = null;
  }

  function drawSnapRing(p: Point) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearSnapRing();
    clearSnapCircle();
    const colors = getThemeColors();
    const r = 10;
    const ring = new fabric.Circle({
      left: mmToPx(p.x) - r,
      top: mmToPx(p.y) - r,
      radius: r,
      fill: "transparent",
      stroke: colors.accent,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(ring);
    snapRingRef.current = ring;
    canvas.renderAll();
  }

  function clearSnapCircle() {
    const canvas = fabricRef.current;
    if (!canvas || !snapCircleRef.current) return;
    canvas.remove(snapCircleRef.current);
    snapCircleRef.current = null;
    canvas.renderAll();
  }

  // Тонкий полупрозрачный круг-контур — индикатор привязки к точке на стене / замыкания.
  // kind: "onWall" (привязка) | "close" (замыкание контура)
  function drawSnapCircle(p: Point, kind: "onWall" | "close") {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearSnapCircle();
    clearSnapRing();
    const colors = getThemeColors();
    const r = 12;
    const color = kind === "close" ? colors.preview : colors.window;
    const circle = new fabric.Circle({
      left: mmToPx(p.x) - r,
      top: mmToPx(p.y) - r,
      radius: r,
      fill: "transparent",
      stroke: color,
      strokeWidth: 1.5,
      strokeDashArray: [3, 3],
      opacity: 0.7,
      selectable: false,
      evented: false,
    });
    canvas.add(circle);
    snapCircleRef.current = circle;
    canvas.renderAll();
  }

  // Предупреждение о дублирующей стене: красная линия на 600мс.
  function drawDuplicateWarn(p1: Point, p2: Point) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearDuplicateWarn();
    const colors = getThemeColors();
    const line = new fabric.Line(
      [mmToPx(p1.x), mmToPx(p1.y), mmToPx(p2.x), mmToPx(p2.y)],
      {
        stroke: colors.door,
        strokeWidth: 4,
        strokeDashArray: [8, 4],
        strokeLineCap: "round",
        selectable: false,
        evented: false,
        opacity: 0.85,
      }
    );
    canvas.add(line);
    dupWarnRef.current = line;
    canvas.renderAll();
    window.setTimeout(() => clearDuplicateWarn(), 650);
  }

  function clearDuplicateWarn() {
    const canvas = fabricRef.current;
    if (!canvas || !dupWarnRef.current) return;
    canvas.remove(dupWarnRef.current);
    dupWarnRef.current = null;
    canvas.renderAll();
  }

  function clearEraseHover() {
    const canvas = fabricRef.current;
    if (!canvas || !eraseHoverRef.current) return;
    for (const obj of eraseHoverRef.current) canvas.remove(obj);
    eraseHoverRef.current = null;
    canvas.renderAll();
  }

  // Подсветка стены при наведении ластиком (glow) или кольца вокруг проёма
  function drawEraseHover(target: { wall: WallSegment } | { wall: WallSegment; index: number } | null) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearEraseHover();
    if (!target) return;
    const colors = getThemeColors();
    const objs: any[] = [];
    const wall = target.wall;
    const x1 = mmToPx(wall.p1.x), y1 = mmToPx(wall.p1.y);
    const x2 = mmToPx(wall.p2.x), y2 = mmToPx(wall.p2.y);
    const thickPx = Math.max(3, mmToPx(wall.thickness));
    const glow = new fabric.Line([x1, y1, x2, y2], {
      stroke: colors.accent,
      strokeWidth: thickPx + 8,
      strokeLineCap: "round",
      opacity: 0.22,
      selectable: false,
      evented: false,
    });
    objs.push(glow);

    if ("index" in target) {
      const wLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
      const op = wall.openings[target.index];
      const t = op.offset / wLen;
      const ox = x1 + (x2 - x1) * t;
      const oy = y1 + (y2 - y1) * t;
      const r = 14;
      const ring = new fabric.Circle({
        left: ox - r, top: oy - r, radius: r,
        fill: "transparent",
        stroke: "#ef4444",
        strokeWidth: 2.5,
        selectable: false, evented: false,
      });
      objs.push(ring);
    }
    for (const o of objs) canvas.add(o);
    eraseHoverRef.current = objs;
    canvas.renderAll();
  }

  function handleMouseDown(opt: any) {
    const s = stateRef.current;
    if (s.mode === "draw") handleDrawClick(opt);
    else if (s.mode === "opening") handleOpeningClick(opt);
    else if (s.mode === "erase") handleEraseClick(opt);
  }

  function handleEraseClick(opt: any) {
    const p = getPointer(opt);
    const nearOp = findNearOpening(p.mmX, p.mmY);
    if (nearOp) {
      stateRef.current.removeOpening(nearOp.wall.id, nearOp.isExternal, nearOp.index);
      clearEraseHover();
      renderWalls();
      return;
    }
    const wall = findNearestWall(p.mmX, p.mmY);
    if (!wall) return;
    stateRef.current.deleteWall(wall.id, wall.external);
    clearEraseHover();
    renderWalls();
  }

  function handleDrawClick(opt: any) {
    const p = getPointer(opt);
    const s = stateRef.current;
    // Приоритет привязки: вершина > замыкание по старту > точка на стене > сетка
    const vertex = findNearVertex(p.mmX, p.mmY);
    const closePt = findChainCloseSnap(p.mmX, p.mmY);
    const onWall = !vertex && !closePt ? findSnapOnWall(p.mmX, p.mmY) : null;
    const snapPoint = vertex || closePt || onWall?.point || null;

    // Первый клик — установка стартовой точки
    if (!tempStartRef.current) {
      const point = snapPoint || { x: p.mmX, y: p.mmY };
      tempStartRef.current = point;
      s.setDrawInProgress(true);
      return;
    }

    const start = tempStartRef.current;
    // Конец: приоритет у snap-точки; иначе angle-snap по сетке
    const rawEnd = snapPoint || { x: p.mmX, y: p.mmY };
    const snapped = snapPoint
      ? snapPoint
      : snapAngle(start, rawEnd).point;

    // Замыкание: конец лёг на стартовую точку цепи → закрыть контур
    if (closePt || (snapped.x === start.x && snapped.y === start.y)) {
      const ext = s.externalWalls;
      if (s.currentFloor === 1 && ext.length >= 1) {
        // Если последняя стена не доходит до начала — добавим замыкающий сегмент
        const last = ext[ext.length - 1];
        const first = ext[0];
        const isClosed =
          last && first &&
          last.p2.x === first.p1.x && last.p2.y === first.p1.y;
        if (!isClosed && last) {
          s.addWall(last.p2, first.p1, true);
        }
        tempStartRef.current = null;
        s.setDrawInProgress(false);
        clearTempLine();
        clearSnapCircle();
        clearSnapRing();
        renderWalls();
        return;
      }
      // На не-внешнем этаже: просто завершить сегмент, не замыкая контур
      tempStartRef.current = null;
      s.setDrawInProgress(false);
      clearTempLine();
      clearSnapCircle();
      clearSnapRing();
      renderWalls();
      return;
    }

    // Блокировка дублирующей стены (полное перекрытие поверх существующей)
    const isExt = s.currentFloor === 1;
    if (isDuplicateWall(start, snapped, isExt)) {
      drawDuplicateWarn(start, snapped);
      // Сбрасываем текущий сегмент, чтобы пользователь видел отказ
      tempStartRef.current = null;
      s.setDrawInProgress(false);
      clearTempLine();
      clearSnapCircle();
      clearSnapRing();
      renderWalls();
      return;
    }

    // Атомарное добавление + деление старой стены в точке привязки
    const splitTarget = onWall
      ? { wallId: onWall.wall.id, isExternal: onWall.isExternal, point: snapped }
      : null;
    s.addWallWithSplit(start, snapped, isExt, splitTarget);

    tempStartRef.current = snapped;
    s.setDrawInProgress(true);
    clearTempLine();
  }

  function handleMouseMove(opt: any) {
    const s = stateRef.current;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const colors = getThemeColors();

    // Snap-индикаторы (draw mode)
    if (s.mode === "draw") {
      const p = getPointer(opt);
      const vertex = findNearVertex(p.mmX, p.mmY);
      const closePt = findChainCloseSnap(p.mmX, p.mmY);
      const onWall = !vertex && !closePt ? findSnapOnWall(p.mmX, p.mmY) : null;
      if (vertex) {
        clearSnapCircle();
        drawSnapRing(vertex);
      } else if (closePt) {
        drawSnapCircle(closePt, "close");
      } else if (onWall) {
        drawSnapCircle(onWall.point, "onWall");
      } else {
        clearSnapRing();
        clearSnapCircle();
      }
    }

    // Erase-hover (ластик подсвечивает цель)
    if (s.mode === "erase") {
      const p = getPointer(opt);
      const nearOp = findNearOpening(p.mmX, p.mmY);
      if (nearOp) {
        drawEraseHover({ wall: nearOp.wall, index: nearOp.index });
      } else {
        const wall = findNearestWall(p.mmX, p.mmY);
        drawEraseHover(wall ? { wall } : null);
      }
      return;
    }
    clearEraseHover();

    if (s.mode !== "draw" || !tempStartRef.current) return;
    const p = getPointer(opt);
    const start = tempStartRef.current;
    const vertex = findNearVertex(p.mmX, p.mmY);
    const closePt = findChainCloseSnap(p.mmX, p.mmY);
    const onWall = !vertex && !closePt ? findSnapOnWall(p.mmX, p.mmY) : null;
    const snapPoint = vertex || closePt || onWall?.point || null;
    const rawEnd = snapPoint || { x: p.mmX, y: p.mmY };
    // snapAngle не переприменяем к snap-точкам — иначе он сбивает привязку
    const { point: snapped, angleDeg } = snapPoint
      ? { point: snapPoint, angleDeg: 0 }
      : snapAngle(start, rawEnd);

    // Если наводимся на дублирующую стену — красим preview в красный
    const isExt = s.currentFloor === 1;
    const isDup = isDuplicateWall(start, snapped, isExt);
    const previewColor = isDup ? colors.door : colors.preview;

    clearTempLine();
    tempLineRef.current = new fabric.Line(
      [mmToPx(start.x), mmToPx(start.y),
       mmToPx(snapped.x), mmToPx(snapped.y)],
      { stroke: previewColor, strokeWidth: 3, strokeDashArray: [6, 4],
        strokeLineCap: "round", selectable: false, evented: false }
    );
    const lenMm = Math.hypot(snapped.x - start.x, snapped.y - start.y);
    const labelText = (lenMm / 1000).toFixed(1) + " м  " + angleDeg + "°";
    const label = new fabric.Text(labelText, {
      left: mmToPx(snapped.x) + 10, top: mmToPx(snapped.y) + 10,
      fontSize: 14, fontWeight: 600, fill: previewColor, selectable: false, evented: false,
    });
    canvas.add(tempLineRef.current);
    canvas.add(label);
    tempLineRef.current._label = label;
    canvas.renderAll();
  }

  function clearTempLine() {
    const canvas = fabricRef.current;
    if (!canvas || !tempLineRef.current) return;
    canvas.remove(tempLineRef.current);
    if (tempLineRef.current._label) canvas.remove(tempLineRef.current._label);
    tempLineRef.current = null;
  }

  function handleOpeningClick(opt: any) {
    const p = getPointer(opt);
    const wall = findNearestWall(p.mmX, p.mmY);
    if (!wall) return;
    const wallLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y);
    if (wallLen < 1) return;
    const t = ((p.mmX - wall.p1.x) * (wall.p2.x - wall.p1.x) +
               (p.mmY - wall.p1.y) * (wall.p2.y - wall.p1.y)) / (wallLen * wallLen);
    const offset = Math.round(Math.max(0, Math.min(wallLen, t * wallLen)));
    const isDoor = stateRef.current.openingType === "door";
    stateRef.current.addOpening(wall.id, wall.external, {
      type: isDoor ? "door" : "window", offset,
      width: isDoor ? 900 : 1200, height: isDoor ? 2100 : 1400,
      sill_height: isDoor ? 0 : 900,
    });
    renderWalls();
  }

  function handleSelected(opt: any) {
    const obj = opt.selected?.[0];
    if (obj && obj._wallId) {
      stateRef.current.selectWall(obj._wallId, obj._isExternal);
    }
  }

  if (initError) {
    return (
      <div style={{ padding: 20, color: "#ff6b6b", fontFamily: "monospace", fontSize: 14 }}>
        Fabric.js не загрузился: {initError}
      </div>
    );
  }

  return (
    <div className="canvas-stage" ref={stageRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasElRef} />
      {isEmpty && store.mode === "draw" && (
        <div className="canvas-empty-state">
          <div className="canvas-empty-icon">✏️</div>
          <div className="canvas-empty-title">Начните рисовать контур</div>
          <div className="canvas-empty-hint">
            Кликните, чтобы поставить первую точку стены.
            Следующий клик — конец стены. По умолчанию углы строго 90°.
          </div>
        </div>
      )}
    </div>
  );
}
