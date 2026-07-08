import { useStore, WALL_MAT_GROUPS, WALL_MAT_THICKNESS } from "../store/useProjectStore";
import type { FoundationType, RoofConstruction, FloorType } from "../types/project";
import type { WallMatType } from "../store/useProjectStore";

export default function ProjectSettings() {
  const { project, updateFoundation, updateRoof, updateFloorConfig, currentFloor, wallMatType, wallMatKey, setWallMaterial } = useStore();
  const foundation = project.foundation;
  const roof = project.roof;
  const floor = project.floor_config;

  const currentGroup = WALL_MAT_GROUPS.find((g) => g.type === wallMatType) ?? WALL_MAT_GROUPS[0];
  const currentThk = WALL_MAT_THICKNESS[wallMatKey] ?? { ext: 400, int: 200 };

  if (!foundation || !roof || !floor) return null;

  return (
    <>
      <div className="settings-section">
        <h3>Фундамент</h3>
        <div className="prop-row">
          <label>Тип</label>
          <select
            value={foundation.type}
            onChange={(e) => updateFoundation({ type: e.target.value as FoundationType })}
          >
            <option value="strip">Ленточный</option>
            <option value="slab">Плитный</option>
            <option value="pile">Свайный</option>
            <option value="column">Столбчатый</option>
          </select>
        </div>
        {foundation.type === "strip" && (
          <>
            <div className="prop-row">
              <label>Ширина ленты, мм</label>
              <input type="number" value={foundation.strip_width ?? 400}
                onChange={(e) => updateFoundation({ strip_width: parseInt(e.target.value) })} />
            </div>
            <div className="prop-row">
              <label>Глубина, мм</label>
              <input type="number" value={foundation.strip_depth ?? 800}
                onChange={(e) => updateFoundation({ strip_depth: parseInt(e.target.value) })} />
            </div>
            <div className="prop-row">
              <label>Над землёй, мм</label>
              <input type="number" value={foundation.strip_height ?? 400}
                onChange={(e) => updateFoundation({ strip_height: parseInt(e.target.value) })} />
            </div>
          </>
        )}
        {foundation.type === "slab" && (
          <>
            <div className="prop-row">
              <label>Толщина плиты, мм</label>
              <input type="number" value={foundation.slab_thickness ?? 300}
                onChange={(e) => updateFoundation({ slab_thickness: parseInt(e.target.value) })} />
            </div>
            <div className="prop-row">
              <label>Подушка, мм</label>
              <input type="number" value={foundation.slab_cushion ?? 100}
                onChange={(e) => updateFoundation({ slab_cushion: parseInt(e.target.value) })} />
            </div>
          </>
        )}
        {foundation.type === "pile" && (
          <>
            <div className="prop-row">
              <label>Шаг свай, мм</label>
              <input type="number" value={foundation.pile_step ?? 2000}
                onChange={(e) => updateFoundation({ pile_step: parseInt(e.target.value) })} />
            </div>
            <div className="prop-row">
              <label>Диаметр, мм</label>
              <input type="number" value={foundation.pile_diameter ?? 300}
                onChange={(e) => updateFoundation({ pile_diameter: parseInt(e.target.value) })} />
            </div>
            <div className="prop-row">
              <label>Глубина, мм</label>
              <input type="number" value={foundation.pile_depth ?? 2000}
                onChange={(e) => updateFoundation({ pile_depth: parseInt(e.target.value) })} />
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3>Стены</h3>
        <div className="prop-row">
          <label>Тип стен</label>
          <select
            value={wallMatType}
            onChange={(e) => {
              const type = e.target.value as WallMatType;
              const grp = WALL_MAT_GROUPS.find((g) => g.type === type) ?? WALL_MAT_GROUPS[0];
              setWallMaterial(type, grp.options[0].key);
            }}
          >
            {WALL_MAT_GROUPS.map((g) => (
              <option key={g.type} value={g.type}>{g.label}</option>
            ))}
          </select>
        </div>
        <div className="prop-row">
          <label>Подвид</label>
          <select
            value={wallMatKey}
            onChange={(e) => setWallMaterial(wallMatType, e.target.value)}
          >
            {currentGroup.options.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="prop-row hint-row">
          <span className="hint-text">
            Внешние: {currentThk.ext} мм · Внутренние: {currentThk.int} мм
          </span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Кровля</h3>
        <div className="prop-row">
          <label>Конструкция</label>
          <select
            value={roof.construction}
            onChange={(e) => updateRoof({ construction: e.target.value as RoofConstruction })}
          >
            <option value="gable">Двускатная</option>
            <option value="hip">Вальмовая</option>
            <option value="mono">Односкатная</option>
            <option value="flat">Плоская</option>
          </select>
        </div>
        {roof.construction !== "flat" && (
          <div className="prop-row">
            <label>Угол, град</label>
            <input type="number" value={roof.angle}
              onChange={(e) => updateRoof({ angle: parseFloat(e.target.value) })} />
          </div>
        )}
        <div className="prop-row">
          <label>Свес, мм</label>
          <input type="number" value={roof.overhang}
            onChange={(e) => updateRoof({ overhang: parseInt(e.target.value) })} />
        </div>
        <div className="prop-row">
          <label>Покрытие</label>
          <select
            value={roof.material_key}
            onChange={(e) => updateRoof({ material_key: e.target.value })}
          >
            <option value="metal">Металлочерепица</option>
            <option value="tile">Керамическая</option>
            <option value="shingle">Гибкая</option>
            <option value="slate">Шифер</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>Перекрытия {currentFloor > 1 ? "" : "(для 2+ этажей)"}</h3>
        <div className="prop-row">
          <label>Тип</label>
          <select
            value={floor.type}
            onChange={(e) => updateFloorConfig({ type: e.target.value as FloorType })}
          >
            <option value="concrete">Монолит ж/б</option>
            <option value="slab">Сборные плиты</option>
          </select>
        </div>
        {floor.type === "concrete" && (
          <div className="prop-row">
            <label>Толщина, мм</label>
            <input type="number" value={floor.thickness}
              onChange={(e) => updateFloorConfig({ thickness: parseInt(e.target.value) })} />
          </div>
        )}
      </div>
    </>
  );
}
