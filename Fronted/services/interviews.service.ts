// services/interviews.service.ts

import { apiFetch } from "./api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type EstadoSesion = "en_progreso" | "completada" | "abandonada" | "expirada";

/** Shape que devuelve el backend (tablas con JOINs opcionales) */
export interface SesionAPI {
  id: string;
  usuario_id: string;
  tecnologia_id: number;
  nivel_id: number;
  pregunta_id: number;
  estado: EstadoSesion;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_segundos: number | null;
  tiempo_limite_segundos: number;
  ip_usuario: string;
  user_agent: string | null;
  // Campos JOIN (depende de tu query SQL)
  usuario_nombre?: string;
  usuario_apellido?: string;
  tecnologia_nombre?: string;
  tecnologia_color?: string;
  nivel_nombre?: string;
  pregunta_titulo?: string;
  // Conteos agregados
  mensajes_count?: number;
  envios_count?: number;
  // Evaluación
  puntaje_total?: number | null;
  // Ejecución IDE
  ultimo_exit_code?: number | null;
  tiempo_ejecucion_ms?: number | null;
}

/** Tipo normalizado para la UI */
export interface Sesion {
  id: string;
  usuario_nombre: string;
  usuario_initials: string;
  tecnologia: string;
  tecnologia_color: string;
  nivel: string;
  pregunta_titulo: string;
  estado: EstadoSesion;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_segundos: number | null;
  tiempo_limite_segundos: number;
  ip_usuario: string;
  mensajes_count: number;
  envios_count: number;
  puntaje_total: number | null;
  ultimo_exit_code: number | null;
  tiempo_ejecucion_ms: number | null;
}

// ─────────────────────────────────────────────
// NORMALIZACIÓN
// ─────────────────────────────────────────────

export function normalizeSesion(s: SesionAPI): Sesion {
  const nombre = s.usuario_nombre ?? "Sin nombre";
  const apellido = s.usuario_apellido ?? "";
  const nombreCompleto = apellido ? `${nombre} ${apellido}` : nombre;
  const initials = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase() || "??";

  return {
    id:                    s.id,
    usuario_nombre:        nombreCompleto,
    usuario_initials:      initials,
    tecnologia:            s.tecnologia_nombre   ?? `Tech #${s.tecnologia_id}`,
    tecnologia_color:      s.tecnologia_color    ?? "#888",
    nivel:                 s.nivel_nombre        ?? `Nivel #${s.nivel_id}`,
    pregunta_titulo:       s.pregunta_titulo     ?? `Pregunta #${s.pregunta_id}`,
    estado:                s.estado,
    fecha_inicio:          s.fecha_inicio,
    fecha_fin:             s.fecha_fin,
    duracion_segundos:     s.duracion_segundos   ?? null,
    tiempo_limite_segundos: s.tiempo_limite_segundos,
    ip_usuario:            s.ip_usuario          ?? "—",
    mensajes_count:        s.mensajes_count      ?? 0,
    envios_count:          s.envios_count        ?? 0,
    puntaje_total:         s.puntaje_total       ?? null,
    ultimo_exit_code:      s.ultimo_exit_code    ?? null,
    tiempo_ejecucion_ms:   s.tiempo_ejecucion_ms ?? null,
  };
}

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

const BASE = "/sesiones";

// ── GET /sesiones/admin/historial ──────────────────────────────────────────────
// Devuelve TODAS las sesiones (vista admin)

export async function getSesiones(): Promise<Sesion[]> {
  const response = await apiFetch(`${BASE}/admin/historial`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }

  const json = await response.json();
  const data: SesionAPI[] = json.data ?? json;

  return data.map(normalizeSesion);
}

// ── GET /sesiones/:id ──────────────────────────────────────────────────────────

export async function getSesionById(id: string): Promise<Sesion> {
  const response = await apiFetch(`${BASE}/${id}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }

  const json = await response.json();
  const data: SesionAPI = json.data ?? json;

  return normalizeSesion(data);
}

// ── PATCH /sesiones/:id/estado ─────────────────────────────────────────────────
// Permite forzar un estado (ej: terminar sesión en_progreso desde el admin)

export async function updateEstadoSesion(
  id: string,
  estado: EstadoSesion
): Promise<Sesion> {
  const response = await apiFetch(`${BASE}/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }

  const json = await response.json();
  const data: SesionAPI = json.data ?? json;

  return normalizeSesion(data);
}

// ── DELETE /sesiones/:id ───────────────────────────────────────────────────────

export async function deleteSesion(id: string): Promise<void> {
  const response = await apiFetch(`${BASE}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error ?? `HTTP ${response.status}`);
  }
}