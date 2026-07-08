import { useStore } from "../store/useProjectStore";
import type { WallSegment } from "../types/project";

const WALL_MATERIAL_GROUPS: { label: string; options: { key: string; label: string }[] }[] = [
  {
    label: "Газобетонные блоки",
    options: [
      { key: "aerated_concrete", label: "Газобетон 300×600" },
      { key: "foam_concrete", label: "Пенобетон 300×600" },
    ],
  },
  {
    label: "Древесина",
    options: [
      { key: "timber_200", label: "Брус 200×200" },
      { key: "round_log", label: "Оцилиндрованное бревно" },
    ],
  },
  {
    label: "Строительный кирпич",
    options: [
      { key: "brick_solid", label: "Кирпич полнотелый" },
      { key: "brick_hollow", label: "Кирпич пустотелый" },
    ],
  },
];

export default function PropertiesPanel() {
  const {
    project, currentFloor, selectedWallId, selectedWallIsExternal,
    updateWall, deleteWall, removeOpening, wallDisplayIndex,
  } = useStore();

  if (!selectedWallId) {
    return (
      <div className="hint">
        <p>Выберите стену на канвасе (режим «✋ Выбрать»), чтобы редактировать свойства.</p>
      </div>
    );
  }

  const walls: WallSegment[] = selectedWallIsExternal
    ? project.external_walls
    : (project.internal_walls[currentFloor] || []);
  const wall = walls.find((w) => w.id === selectedWallId);
  if (!wall) return null;

  const lenMm = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y);
  const isExtLocked = wall.external && currentFloor > 1;
  const layer = wall.layers[0];
  const displayIdx = wallDisplayIndex(wall.id, wall.external, currentFloor);

  return (
    <div className="settings-section">
      <h3>
        Стена {displayIdx > 0 ? displayIdx : wall.id} {wall.external ? "(внешняя)" : "(внутренняя)"}
      </h3>
      {isExtLocked && (
        <p className="locked-hint">Внешние стены редактируются на этаже 1</p>
      )}
      <div className="prop-row">
        <label>Длина</label>
        <span style={{ color: "var(--text-primary)" }}>{(lenMm / 1000).toFixed(2)} м</span>
      </div>
      <div className="prop-row">
        <label>Толщина, мм</label>
        <input
          type="number"
          value={wall.thickness}
          disabled={isExtLocked}
          onChange={(e) => {
            const thickness = parseInt(e.target.value);
            updateWall(wall.id, wall.external, {
              thickness,
              layers: [{ ...layer, thickness }],
            });
          }}
        />
      </div>
      <div className="prop-row">
        <label>Высота, мм</label>
        <input
          type="number"
          value={wall.height}
          disabled={isExtLocked}
          onChange={(e) => updateWall(wall.id, wall.external, { height: parseInt(e.target.value) })}
        />
      </div>
      <div className="prop-row">
        <label>Несущая</label>
        <input
          type="checkbox"
          checked={wall.load_bearing}
          disabled={isExtLocked}
          onChange={(e) => updateWall(wall.id, wall.external, { load_bearing: e.target.checked })}
        />
      </div>
      <div className="prop-row">
        <label>Материал</label>
        <select
          value={layer?.material_key || "aerated_concrete"}
          disabled={isExtLocked}
          onChange={(e) =>
            updateWall(wall.id, wall.external, {
              layers: [{ ...layer, material_key: e.target.value }],
            })
          }
        >
          {WALL_MATERIAL_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="prop-row">
        <label>Проёмы</label>
        <span>{wall.openings.length} шт</span>
      </div>
      {wall.openings.map((op, i) => (
        <div key={i} className="opening-item">
          {op.type === "door" ? "Дверь" : "Окно"} {op.width}×{op.height}мм
          <button onClick={() => removeOpening(wall.id, wall.external, i)}>×</button>
        </div>
      ))}
      {!isExtLocked && (
        <button className="btn-danger" onClick={() => deleteWall(wall.id, wall.external)}>
          Удалить стену
        </button>
      )}
    </div>
  );
}
