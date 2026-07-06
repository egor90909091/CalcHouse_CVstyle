import { useState, useEffect } from "react";
import { useStore } from "../store/useProjectStore";
import type { MaterialsResult, SectionResult } from "../types/project";

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

function SectionTable({ title, section }: { title: string; section: SectionResult }) {
  if (!section || !section.materials || section.materials.length === 0) return null;
  return (
    <div className="result-section">
      <h3>
        {title}
        <span className="section-total">{fmt(section.section_total)} ₽</span>
      </h3>
      <table>
        <thead>
          <tr>
            <th>Материал</th>
            <th>Кол-во</th>
            <th>Ед.</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {section.materials.map((m, i) => (
            <tr key={i}>
              <td>{m.name}</td>
              <td className="num">{m.quantity.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</td>
              <td>{m.unit}</td>
              <td className="num">{m.price ? fmt(m.price) : "—"}</td>
              <td className="num">{m.total_cost ? fmt(m.total_cost) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FloorPlan {
  image: string;
  label: string;
}

export default function ResultsPanel() {
  const { results } = useStore();
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);

  useEffect(() => {
    const exportFn = (window as any).__wallCanvasExportAllFloors as
      (() => Record<string, { image: string; label: string }>) | undefined;
    if (!exportFn) {
      // fallback: single export
      const singleFn = (window as any).__wallCanvasExport as (() => string | null) | undefined;
      if (singleFn) {
        const img = singleFn();
        if (img) setFloorPlans([{ image: img, label: "План этажа" }]);
      }
      return;
    }
    try {
      const plans = exportFn();
      const list: FloorPlan[] = Object.values(plans);
      setFloorPlans(list);
    } catch {
      const singleFn = (window as any).__wallCanvasExport as (() => string | null) | undefined;
      if (singleFn) {
        const img = singleFn();
        if (img) setFloorPlans([{ image: img, label: "План этажа" }]);
      }
    }
  }, [results]);

  if (!results) return null;

  const r: MaterialsResult = results;
  const g = r.geometry;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>Смета материалов</h2>
        <div className="geo-summary">
          Площадь: <b>{g.footprint_area_m2} м²</b> ·{" "}
          Периметр: <b>{(g.perimeter_mm / 1000).toFixed(1)} м</b> ·{" "}
          Фундамент: <b>{(g.foundation_length_mm / 1000).toFixed(1)} м</b> ·{" "}
          Кровля: <b>{g.roof_area_m2} м²</b>
        </div>
        <div className="total-cost">ИТОГО: {fmt(r.total_cost)} ₽</div>
      </div>
      <SectionTable title="Фундамент" section={r.foundation} />
      <SectionTable title="Стены" section={r.walls} />
      <SectionTable title="Перекрытия" section={r.floors} />
      <SectionTable title="Кровля" section={r.roof} />

      {floorPlans.length > 0 && (
        <div className="floor-plans-section">
          <h3>План строения</h3>
          <div className="floor-plans-grid">
            {floorPlans.map((plan, idx) => (
              <div key={idx} className="floor-plan-frame">
                <div className="floor-plan-label">{plan.label}</div>
                <img src={plan.image} alt={plan.label} className="floor-plan-img" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-actions">
        <button className="btn-print" onClick={handlePrint}>
          🖨 Распечатать
        </button>
        <button
          className="btn-close"
          onClick={() => useStore.setState({ results: null })}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
