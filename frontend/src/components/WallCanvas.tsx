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
  internal: cssVar("--wall-internal", "#9aa8b8"),
  locked: cssVar("--wall-locked", "#5a6a7a"),
  preview: cssVar("--wall-preview", "#4fc3f7"),
  label: cssVar("--wall-label", "#a0b0c0"),
  door: cssVar("--opening-door", "#ff9800"),
  window: cssVar("--opening-window", "#8bc34a"),
  accent: cssVar("--accent", "#2563eb"),
  surface: cssVar("--surface", "#ffffff"),
  border: cssVar("--border", "#e2e8f0"),
  textPrimary: cssVar("--text-primary", "#0f172a"),
});

interface CanvasState {
  mode: EditorMode;
  currentFloor: number;
  openingType: "door" | "window";
  externalWalls: WallSegment[];
  internalWalls: Record<number, WallSegment[]>;
  selectedWallId: string | null;
  selectedWallIsExternal: boolean;
  addWall: (p1: Point, p2: Point, isExternal: boolean) => void;
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

        // Walls
        for (const wall of allWalls) {
          const x1 = mmToPx(wall.p1.x) + offX, y1 = mmToPx(wall.p1.y) + offY;
          const x2 = mmToPx(wall.p2.x) + offX, y2 = mmToPx(wall.p2.y) + offY;
          const thickPx = Math.max(3, mmToPx(wall.thickness));
          const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: wall.external ? expColors.exterior : expColors.interior,
            strokeWidth: thickPx,
            strokeLineCap: "round",
            selectable: false,
            evented: false,
          });
          tempCanvas.add(line);
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

        // Openings
        for (const wall of allWalls) {
          if (!wall.openings?.length) continue;
          const x1 = mmToPx(wall.p1.x) + offX, y1 = mmToPx(wall.p1.y) + offY;
          const x2 = mmToPx(wall.p2.x) + offX, y2 = mmToPx(wall.p2.y) + offY;
          const wLen = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
          const angleDeg = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x) * 180 / Math.PI;
          for (const op of wall.openings) {
            const t = op.offset / wLen;
            const cx = x1 + (x2 - x1) * t;
            const cy = y1 + (y2 - y1) * t;
            addOpeningSymbol(tempCanvas, op, cx, cy, angleDeg, colors, false);
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

    // Pass 1: walls (lines with round caps)
    for (const wall of all) {
      drawWallLine(canvas, wall, externalLocked && wall.external);
    }

    // Pass 2: openings
    for (const wall of all) {
      drawOpenings(canvas, wall);
    }

    // Pass 3: junction nodes
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

  function drawWallLine(canvas: any, wall: WallSegment, locked: boolean) {
    const colors = getThemeColors();
    const x1 = mmToPx(wall.p1.x), y1 = mmToPx(wall.p1.y);
    const x2 = mmToPx(wall.p2.x), y2 = mmToPx(wall.p2.y);
    const thickPx = Math.max(3, mmToPx(wall.thickness));
    const isSelected = stateRef.current.selectedWallId === wall.id;

    const stroke = wall.external
      ? (locked ? colors.locked : (isSelected ? colors.accent : colors.external))
      : (isSelected ? colors.accent : colors.internal);

    if (isSelected) {
      const glow = new fabric.Line([x1, y1, x2, y2], {
        stroke: colors.accent,
        strokeWidth: thickPx + 8,
        strokeLineCap: "round",
        opacity: 0.18,
        selectable: false,
        evented: false,
      });
      canvas.add(glow);
    }

    const line = new fabric.Line([x1, y1, x2, y2], {
      stroke,
      strokeWidth: isSelected ? thickPx + 2 : thickPx,
      strokeLineCap: "round",
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
    });
    line._wallId = wall.id;
    line._isExternal = wall.external;
    canvas.add(line);
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
      addOpeningSymbol(canvas, op, cx, cy, angleDeg, colors, false, i);
    }
  }

  // Универсальный символ проёма в локальных координатах (стена горизонтальна, центр в 0,0),
  // затем поворот на angleDeg и сдвиг в (cx, cy).
  // idx — индекс проёма на стене (для интерактивных маркеров). evented=true — в интерактивном canvas.
  function addOpeningSymbol(
    canvas: any, op: any, cx: number, cy: number, angleDeg: number,
    palette: any, evented: boolean, idx: number = -1,
  ) {
    const wPx = Math.max(10, mmToPx(op.width));
    const halfW = wPx / 2;
    const color = op.type === "door" ? palette.door : palette.window;
    const objs: any[] = [];

    if (op.type === "door") {
      // Четверть-дуга открывания (петля на левом краю, радиус = ширина проёма)
      // Локально: петля в (-halfW, 0), дуга от (halfW, 0) до (-halfW, -halfW)
      const sweep = halfW;
      const ax = -halfW, ay = 0;
      const bx = halfW, by = 0;
      const ex = -halfW, ey = -sweep;
      const arcPath = `M ${ax} ${ay} L ${bx} ${by} A ${sweep} ${sweep} 0 0 0 ${ex} ${ey} Z`;
      const arc = new fabric.Path(arcPath, {
        stroke: color, strokeWidth: 1.5, fill: "transparent",
        strokeLineJoin: "round", selectable: false, evented: false,
      });
      objs.push(arc);
      // Панель двери: линия от петли к открытому концу
      const panel = new fabric.Line([ax, ay, ex, ey], {
        stroke: color, strokeWidth: 3, strokeLineCap: "round",
        selectable: false, evented: false,
      });
      objs.push(panel);
    } else {
      // Окно: две параллельные линии вдоль стены (символ стеклянной полосы) + тонкая центральная линия
      const gap = 4;
      const top = new fabric.Line([-halfW, -gap, halfW, -gap], {
        stroke: color, strokeWidth: 2, selectable: false, evented: false,
      });
      const bot = new fabric.Line([-halfW, gap, halfW, gap], {
        stroke: color, strokeWidth: 2, selectable: false, evented: false,
      });
      const mid = new fabric.Line([-halfW, 0, halfW, 0], {
        stroke: color, strokeWidth: 0.8, strokeDashArray: [3, 3], selectable: false, evented: false,
      });
      objs.push(top, bot, mid);
      // Короткие торцевые штрихи
      const capL = new fabric.Line([-halfW, -gap, -halfW, gap], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false });
      const capR = new fabric.Line([halfW, -gap, halfW, gap], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false });
      objs.push(capL, capR);
    }

    // Объединяем в группу и поворачиваем
    const group = new fabric.Group(objs, { selectable: false, evented: false });
    group.set({
      left: cx, top: cy,
      originX: "center", originY: "center",
      angle: angleDeg,
    });
    // Сохраняем метаданные для hit-test взаимодействия в интерактивном canvas
    group._isOpening = true;
    group._openingIndex = idx;
    canvas.add(group);
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
    const vertex = findNearVertex(p.mmX, p.mmY);

    if (!tempStartRef.current) {
      const point = vertex || { x: p.mmX, y: p.mmY };
      tempStartRef.current = point;
      stateRef.current.setDrawInProgress(true);
      return;
    }

    // При наличии стартовой точки — snap к углу должен honourся точно как в превью
    const rawEnd = vertex || { x: p.mmX, y: p.mmY };
    const snapped = snapAngle(tempStartRef.current, rawEnd).point;

    if (snapped.x === tempStartRef.current.x && snapped.y === tempStartRef.current.y) {
      tempStartRef.current = null;
      stateRef.current.setDrawInProgress(false);
      clearTempLine();
      renderWalls();
      return;
    }
    const isExt = stateRef.current.currentFloor === 1;
    stateRef.current.addWall(tempStartRef.current, snapped, isExt);
    tempStartRef.current = snapped;
    stateRef.current.setDrawInProgress(true);
    clearTempLine();
  }

  function handleMouseMove(opt: any) {
    const s = stateRef.current;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const colors = getThemeColors();

    // Snap ring indicator (draw mode)
    if (s.mode === "draw") {
      const p = getPointer(opt);
      const vertex = findNearVertex(p.mmX, p.mmY);
      if (vertex) {
        drawSnapRing(vertex);
      } else {
        clearSnapRing();
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
    const vertex = findNearVertex(p.mmX, p.mmY);
    const rawEnd = vertex || { x: p.mmX, y: p.mmY };
    const { point: snapped, angleDeg } = snapAngle(tempStartRef.current, rawEnd);

    clearTempLine();
    tempLineRef.current = new fabric.Line(
      [mmToPx(tempStartRef.current.x), mmToPx(tempStartRef.current.y),
       mmToPx(snapped.x), mmToPx(snapped.y)],
      { stroke: colors.preview, strokeWidth: 3, strokeDashArray: [6, 4],
        strokeLineCap: "round", selectable: false, evented: false }
    );
    const lenMm = Math.hypot(snapped.x - tempStartRef.current.x, snapped.y - tempStartRef.current.y);
    const labelText = (lenMm / 1000).toFixed(1) + " м  " + angleDeg + "°";
    const label = new fabric.Text(labelText, {
      left: mmToPx(snapped.x) + 10, top: mmToPx(snapped.y) + 10,
      fontSize: 14, fontWeight: 600, fill: colors.preview, selectable: false, evented: false,
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
