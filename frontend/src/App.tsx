import { useEffect, useState, Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useStore } from "./store/useProjectStore";
import WallCanvas from "./components/WallCanvas";
import Toolbar from "./components/Toolbar";
import FloorSwitcher from "./components/FloorSwitcher";
import PropertiesPanel from "./components/PropertiesPanel";
import ProjectSettings from "./components/ProjectSettings";
import ResultsPanel from "./components/ResultsPanel";
import LiveGeometry from "./components/LiveGeometry";
import CalculatingLoader from "./components/CalculatingLoader";
import FurniturePage from "./components/FurniturePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: String(e.message || e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: "#d32f2f", fontFamily: "monospace", fontSize: 14, whiteSpace: "pre-wrap" }}>
          <h2>Ошибка рендеринга React:</h2>
          <p>{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function BuilderPage() {
  const { load, results, calculating, calculate } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { load(); } catch (e) { console.warn("load:", e); }
    setReady(true);
  }, [load]);

  if (!ready) return <div style={{ padding: 40 }}>Загрузка...</div>;

  return (
    <ErrorBoundary>
      <div className="page">
        <Header />
        <Hero />

        <main className="page-main">
          <div className={results ? "builder-wrap builder-wrap--results" : "builder-wrap"}>
            <div className="builder-layout">
              <div className="canvas-area">
                <Toolbar />
                <LiveGeometry />
                <WallCanvas />
                <CanvasStatusBar />
              </div>

              <aside className="sidebar">
                <h2>Параметры</h2>
                <FloorSwitcher />
                <ProjectSettings />
                <PropertiesPanel />
                <button className="btn-calc" onClick={() => calculate()} disabled={calculating}>
                  {calculating ? "⏳ Расчёт..." : "📐 Рассчитать"}
                </button>
                <button className="btn-save" onClick={() => useStore.getState().save()}>💾 Сохранить</button>
              </aside>
            </div>
            {results && <ResultsPanel />}
            {calculating && <CalculatingLoader />}
          </div>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}

function CanvasStatusBar() {
  const { mode, drawInProgress, openingType, project, currentFloor, angleSnapMode } = useStore();

  let hint = "";
  if (mode === "draw") {
    const angleLabel =
      angleSnapMode === "strict" ? "углы 90°" :
      angleSnapMode === "standard" ? "углы кратно 15°" :
      "свободные углы";
    hint = drawInProgress
      ? `Длина и угол у курсора · ${angleLabel} · Esc — отмена · Enter — замкнуть`
      : `Клик — начало стены · ${angleLabel}`;
  } else if (mode === "erase") {
    hint = "Клик по стене/проёму — удалить";
  } else if (mode === "opening") {
    hint = `Клик по стене — добавить ${openingType === "door" ? "дверь" : "окно"}`;
  }

  const wallCount =
    project.external_walls.length +
    (project.internal_walls[currentFloor]?.length || 0);

  return (
    <div className="canvas-status-bar">
      <span className="status-hint">{hint}</span>
      <span className="status-legend">1 клетка = 1 м</span>
      <span className="status-count">{wallCount} стен</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BuilderPage />} />
        <Route path="/furniture" element={<FurniturePage />} />
      </Routes>
    </BrowserRouter>
  );
}
