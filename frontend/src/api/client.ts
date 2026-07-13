// API клиент — обёртки над /api и /api/v2 эндпоинтами

import type { GeometryResult, MaterialsResult, Project } from "../types/project";

const API_BASE = "/api/v2";

export async function computeGeometry(project: Project): Promise<GeometryResult> {
  const resp = await fetch(`${API_BASE}/geometry/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!resp.ok) throw new Error(`Geometry API: ${resp.status}`);
  return resp.json();
}

export async function calculateMaterials(project: Project): Promise<MaterialsResult> {
  const resp = await fetch(`${API_BASE}/materials/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!resp.ok) throw new Error(`Materials API: ${resp.status}`);
  return resp.json();
}

export async function fetchMaterialsCatalog(): Promise<Record<string, unknown>> {
  const resp = await fetch(`${API_BASE}/materials`);
  if (!resp.ok) throw new Error(`Materials catalog: ${resp.status}`);
  return resp.json();
}

// ── Чат с ИИ-прорабом ──────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContextItem {
  name: string;
  qty: number;
  unit: string;
}

export interface ChatContextSection {
  items: ChatContextItem[];
}

export interface ChatContext {
  footprint_area_m2: number;
  perimeter_m: number;
  foundation_length_m: number;
  roof_area_m2: number;
  floors_count: number;
  foundation: ChatContextSection;
  walls: ChatContextSection;
  floors: ChatContextSection;
  roof: ChatContextSection;
}

const SECONDARY_PATTERNS = [
  /утеплит/i,
  /пароизоляц/i,
  /подкладочн/i,
  /OSB/i,
  /стяжк/i,
  /песок/i,
  /опалубк/i,
  /раствор/i,
  /коньк/i,
  /саморез/i,
  /креплен/i,
  /гвозд/i,
  /герметик/i,
  /уплотнит/i,
  /сетка/i,
  /фибр/i,
];

const isMainMaterial = (name: string): boolean =>
  !SECONDARY_PATTERNS.some((p) => p.test(name));

export function buildChatContext(r: MaterialsResult, floorsCount: number): ChatContext {
  const g = r.geometry;
  const toSection = (s: { materials: { name: string; quantity: number; unit: string }[] }): ChatContextSection => ({
    items: s.materials
      .filter((m) => isMainMaterial(m.name))
      .map((m) => ({ name: m.name, qty: m.quantity, unit: m.unit })),
  });
  return {
    footprint_area_m2: g.footprint_area_m2,
    perimeter_m: g.perimeter_mm / 1000,
    foundation_length_m: g.foundation_length_mm / 1000,
    roof_area_m2: g.roof_area_m2,
    floors_count: floorsCount,
    foundation: toSection(r.foundation),
    walls: toSection(r.walls),
    floors: toSection(r.floors),
    roof: toSection(r.roof),
  };
}

export async function askAdvisor(
  context: ChatContext,
  history: ChatMessage[],
  question: string
): Promise<string> {
  const resp = await fetch(`/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, history, question }),
  });
  if (resp.status === 503) throw new Error("AI-советник недоступен: не настроен API-ключ DeepSeek");
  if (!resp.ok) throw new Error(`Chat API: ${resp.status}`);
  const data = await resp.json();
  return data.answer as string;
}