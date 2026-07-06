import { useStore } from "../store/useProjectStore";

export default function LiveGeometry() {
  const { geometry, project, setMode } = useStore();

  let text = "нарисуйте контур";
  let cls = "canvas-info-pill";

  if (geometry) {
    if (geometry.is_closed) {
      text = `S=${geometry.footprint_area_m2}м² · P=${(geometry.perimeter_mm / 1000).toFixed(1)}м · ✓ замкнут`;
      cls = "canvas-info-pill pill-closed";
    } else {
      text = `S=${geometry.footprint_area_m2}м² · P=${(geometry.perimeter_mm / 1000).toFixed(1)}м · замкните контур`;
      cls = "canvas-info-pill pill-open";
    }
  } else if (project.external_walls.length > 0) {
    text = `${project.external_walls.length} стен(а)`;
  }

  return (
    <div className="canvas-info">
      <span
        className={cls}
        onClick={() => {
          if (geometry && !geometry.is_closed) setMode("draw");
        }}
        role={geometry && !geometry.is_closed ? "button" : undefined}
      >
        {text}
      </span>
    </div>
  );
}
