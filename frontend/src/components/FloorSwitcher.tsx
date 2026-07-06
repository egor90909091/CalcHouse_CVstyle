import { useStore } from "../store/useProjectStore";

export default function FloorSwitcher() {
  const { project, currentFloor, setFloor, setFloorsCount, setFloorHeight } = useStore();

  return (
    <>
      <div className="prop-row">
        <label>Этажей</label>
        <select
          value={project.floors_count}
          onChange={(e) => setFloorsCount(parseInt(e.target.value))}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>
      <div className="prop-row">
        <label>Высота этажа, мм</label>
        <input
          type="number"
          value={project.floor_height}
          onChange={(e) => setFloorHeight(parseInt(e.target.value))}
        />
      </div>
      <div className="floor-switcher">
        {Array.from({ length: project.floors_count }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`floor-btn ${n === currentFloor ? "active" : ""}`}
            onClick={() => setFloor(n)}
          >
            Этаж {n}
          </button>
        ))}
      </div>
    </>
  );
}
