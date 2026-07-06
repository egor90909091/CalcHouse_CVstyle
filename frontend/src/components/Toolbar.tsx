import { useStore } from "../store/useProjectStore";
import type { EditorMode } from "../types/project";

const MODES: { mode: EditorMode; label: string }[] = [
  { mode: "draw", label: "✏️ Стены" },
  { mode: "select", label: "✋ Выбрать" },
  { mode: "opening", label: "🚪 Проём" },
];

const ANGLE_MODES: { mode: "strict" | "standard" | "free"; label: string; title: string }[] = [
  { mode: "strict", label: "90°", title: "Только прямые углы (0°, 90°, 180°, 270°)" },
  { mode: "standard", label: "15°", title: "Шаг 15° (0°, 15°, 30°, 45°, 60°, 75°, 90°...)" },
  { mode: "free", label: "∞", title: "Свободные углы — без привязки" },
];

export default function Toolbar() {
  const {
    mode, setMode, openingType, setOpeningType,
    project, currentFloor, closeContour, clearAll,
    angleSnapMode, setAngleSnapMode,
    setDrawInProgress,
  } = useStore();

  const extWalls = project.external_walls;
  const canClose =
    mode === "draw" &&
    extWalls.length >= 3 &&
    !(extWalls[extWalls.length - 1].p2.x === extWalls[0].p1.x &&
      extWalls[extWalls.length - 1].p2.y === extWalls[0].p1.y);

  const canClear =
    project.external_walls.length > 0 ||
    (project.internal_walls[currentFloor] && project.internal_walls[currentFloor].length > 0);

  const handleCancel = () => {
    setDrawInProgress(false);
  };

  return (
    <div className="canvas-toolbar">
      <div className="toolbar-segment">
        {MODES.map((m) => (
          <button
            key={m.mode}
            className={`tool-btn ${mode === m.mode ? "active" : ""}`}
            onClick={() => setMode(m.mode)}
          >
            {m.label}
          </button>
        ))}
        {mode === "opening" && (
          <select
            className="tool-btn tool-btn-select"
            value={openingType}
            onChange={(e) => setOpeningType(e.target.value as "door" | "window")}
          >
            <option value="window">🪟 Окно</option>
            <option value="door">🚪 Дверь</option>
          </select>
        )}
      </div>

      {mode === "draw" && (
        <div className="toolbar-segment toolbar-angle">
          {ANGLE_MODES.map((a) => (
            <button
              key={a.mode}
              className={`tool-btn ${angleSnapMode === a.mode ? "active" : ""}`}
              onClick={() => setAngleSnapMode(a.mode)}
              title={a.title}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {canClose && (
        <button className="tool-btn tool-btn-ctx" onClick={() => closeContour()}>
          🔗 Замкнуть
        </button>
      )}
      {canClear && (
        <button
          className="tool-btn tool-btn-ctx tool-btn-danger"
          onClick={() => {
            if (confirm("Удалить все стены проекта?")) clearAll();
          }}
        >
          🗑 Очистить
        </button>
      )}
      {!canClear && (
        <button className="tool-btn tool-btn-ctx" onClick={() => clearAll()}>
          ✨ Новый проект
        </button>
      )}

      <div className="toolbar-mobile-actions">
        {mode === "draw" && (
          <>
            <button className="tool-btn tool-btn-ctx" onClick={handleCancel}>
              ✖ Отмена
            </button>
            {canClose && (
              <button className="tool-btn tool-btn-ctx" onClick={() => closeContour()}>
                🔗 Замкнуть
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
