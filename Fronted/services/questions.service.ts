// services/questions.service.ts

import { apiFetch } from "./api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Shape que devuelve GET /admin/preguntas (con JOINs del model) */
export interface PreguntaAPI {
  id: number;
  titulo: string;
  enunciado: string;
  tecnologia_id: number;
  nivel_id: number;
  tipo: string;
  activa: boolean;
  generada_por_ia: boolean;
  tiempo_estimado_min: number;
  fecha_creacion: string;
  prompt_contexto: string | null;
  creada_por: string | null;
  // Campos JOIN
  tecnologia: string; // t.nombre AS tecnologia
  nivel: string;      // n.nombre AS nivel
}

export interface Tecnologia {
  id: number;
  nombre: string;
}

export interface Nivel {
  id: number;
  nombre: string;
}

export interface CatalogosPregunta {
  tecnologias: Tecnologia[];
  niveles: Nivel[];
}

export interface CreatePreguntaPayload {
  tecnologia_id: number;
  nivel_id: number;
  titulo: string;
  enunciado: string;
  tipo: string;
  tiempo_estimado_min: number;
  prompt_contexto?: string;
}

export type UpdatePreguntaPayload = Partial<CreatePreguntaPayload & { activa: boolean }>;

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }
  const json = await response.json();
  // DELETE devuelve { success, message } sin .data — lo manejamos arriba
  return (json.data ?? json) as T;
}

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

const BASE       = "/admin/preguntas";
const TECHS_PATH = "/tecnologias";
const NIVS_PATH  = "/niveles";

// ── GET /admin/preguntas ───────────────────────────────────────────────────────

export async function getPreguntas(): Promise<PreguntaAPI[]> {
  const response = await apiFetch(BASE);
  return parseResponse<PreguntaAPI[]>(response);
}

// ── GET /tecnologias + /niveles (en paralelo) ──────────────────────────────────

export async function getCatalogos(): Promise<CatalogosPregunta> {
  const [techsRes, nivsRes] = await Promise.all([
    apiFetch(TECHS_PATH),
    apiFetch(NIVS_PATH),
  ]);

  const [tecnologias, niveles] = await Promise.all([
    parseResponse<Tecnologia[]>(techsRes),
    parseResponse<Nivel[]>(nivsRes),
  ]);

  return { tecnologias, niveles };
}

// ── GET /admin/preguntas + catálogos (en paralelo) ─────────────────────────────
// Carga todo lo necesario para la página en una sola llamada

export async function getPreguntasConCatalogos(): Promise<{
  preguntas: PreguntaAPI[];
  tecnologias: Tecnologia[];
  niveles: Nivel[];
}> {
  const [pregRes, techsRes, nivsRes] = await Promise.all([
    apiFetch(BASE),
    apiFetch(TECHS_PATH),
    apiFetch(NIVS_PATH),
  ]);

  const [preguntas, tecnologias, niveles] = await Promise.all([
    parseResponse<PreguntaAPI[]>(pregRes),
    parseResponse<Tecnologia[]>(techsRes),
    parseResponse<Nivel[]>(nivsRes),
  ]);

  return { preguntas, tecnologias, niveles };
}

// ── POST /admin/preguntas ──────────────────────────────────────────────────────

export async function createPregunta(
  payload: CreatePreguntaPayload
): Promise<PreguntaAPI> {
  const response = await apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      prompt_contexto: payload.prompt_contexto || undefined,
    }),
  });
  return parseResponse<PreguntaAPI>(response);
}

// ── PATCH /admin/preguntas/:id ─────────────────────────────────────────────────

export async function updatePregunta(
  id: number,
  payload: UpdatePreguntaPayload
): Promise<PreguntaAPI> {
  const response = await apiFetch(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseResponse<PreguntaAPI>(response);
}

// ── PATCH /admin/preguntas/:id  { activa } ─────────────────────────────────────
// Shortcut semántico para el toggle de estado

export async function togglePreguntaActiva(
  id: number,
  activa: boolean
): Promise<PreguntaAPI> {
  return updatePregunta(id, { activa });
}

// ── DELETE /admin/preguntas/:id ────────────────────────────────────────────────
// Soft delete en el model (pone activa = false, no elimina físicamente)

export async function deletePregunta(id: number): Promise<void> {
  const response = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }
}