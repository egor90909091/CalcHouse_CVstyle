// API клиент — обёртки над /api/v2 эндпоинтами

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
