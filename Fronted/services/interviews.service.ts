// 📁 services/interviews.service.ts

import { apiService } from "./api.service";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type EstadoSesion = "en_progreso" | "completada" | "abandonada" | "tiempo_agotado";

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
  
  // NUEVOS CAMPOS DE TRAZABILIDAD ADAPTATIVA
  fue_adaptativa?: boolean;
  sesion_anterior_id?: string | null;
  
  // CAMPOS DE EVALUACIÓN AVANZADA
  puntaje_javascript?: number | null;
  puntaje_arquitectura?: number | null;
  puntaje_buenas_practicas?: number | null;
  puntaje_comunicacion?: number | null;
  puntaje_resolucion?: number | null;
  nivel_candidato?: string | null;
  apto_para_contratacion?: boolean | null;
  resumen_para_reclutador?: string | null;
  
  // CAMPOS DE ANÁLISIS DE ERRORES
  errores_detectados_count?: number;
  errores_conceptuales_count?: number;
  
  // CAMPOS DE EJECUCIÓN MEJORADOS
  memoria_usada_mb?: number | null;
  kubernetes_namespace?: string | null;
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
  
  // Nuevos campos para UI
  fue_adaptativa: boolean;
  nivel_candidato: string | null;
  apto_para_contratacion: boolean | null;
  resumen_para_reclutador: string | null;
  errores_detectados_count: number;
  errores_conceptuales_count: number;
  memoria_usada_mb: number | null;
}

/** Interfaz estándar para el envoltorio del Backend */
interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
    id: s.id,
    usuario_nombre: nombreCompleto,
    usuario_initials: initials,
    tecnologia: s.tecnologia_nombre ?? `Tech #${s.tecnologia_id}`,
    tecnologia_color: s.tecnologia_color ?? "#888",
    nivel: s.nivel_nombre ?? `Nivel #${s.nivel_id}`,
    pregunta_titulo: s.pregunta_titulo ?? `Pregunta #${s.pregunta_id}`,
    estado: s.estado,
    fecha_inicio: s.fecha_inicio,
    fecha_fin: s.fecha_fin,
    duracion_segundos: s.duracion_segundos ?? null,
    tiempo_limite_segundos: s.tiempo_limite_segundos,
    ip_usuario: s.ip_usuario ?? "—",
    mensajes_count: s.mensajes_count ?? 0,
    envios_count: s.envios_count ?? 0,
    puntaje_total: s.puntaje_total ?? null,
    ultimo_exit_code: s.ultimo_exit_code ?? null,
    tiempo_ejecucion_ms: s.tiempo_ejecucion_ms ?? null,
    
    // Nuevos campos
    fue_adaptativa: s.fue_adaptativa ?? false,
    nivel_candidato: s.nivel_candidato ?? null,
    apto_para_contratacion: s.apto_para_contratacion ?? null,
    resumen_para_reclutador: s.resumen_para_reclutador ?? null,
    errores_detectados_count: s.errores_detectados_count ?? 0,
    errores_conceptuales_count: s.errores_conceptuales_count ?? 0,
    memoria_usada_mb: s.memoria_usada_mb ?? null,
  };
}

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

const BASE = "/sesiones";

/**
 * Devuelve TODAS las sesiones registradas en el sistema (Vía panel de administración).
 */
export async function getSesiones(): Promise<Sesion[]> {
  try {
    const response = await apiService.get<BackendResponse<SesionAPI[]>>(`${BASE}/admin/historial`);
    // Soporta tanto estructuras envueltas en .data como respuestas directas de arrays distribuidos
    const data = response.data ?? (response as any);
    return (data ?? []).map(normalizeSesion);
  } catch (error: any) {
    throw new Error(error.message || "Error al obtener el historial de sesiones.");
  }
}

/**
 * Obtiene el detalle técnico pormenorizado de una sesión de entrevista por su ID único.
 */
export async function getSesionById(id: string): Promise<Sesion> {
  try {
    const response = await apiService.get<BackendResponse<SesionAPI>>(`${BASE}/${id}`);
    const data = response.data ?? (response as any);
    return normalizeSesion(data);
  } catch (error: any) {
    throw new Error(error.message || `Error al recuperar la sesión de entrevista ${id}.`);
  }
}

/**
 * Actualiza el estado actual del flujo técnico de una sesión (IDE, tiempo agotado, finalizaciones forzadas).
 */
export async function updateEstadoSesion(id: string, estado: EstadoSesion): Promise<Sesion> {
  try {
    const response = await apiService.patch<BackendResponse<SesionAPI>>(`${BASE}/${id}/estado`, { 
      estado 
    });
    const data = response.data ?? (response as any);
    return normalizeSesion(data);
  } catch (error: any) {
    throw new Error(error.message || `No se pudo actualizar el estado de la sesión ${id}.`);
  }
}

/**
 * Elimina de manera física o lógica una sesión del historial técnico del backend.
 */
export async function deleteSesion(id: string): Promise<void> {
  try {
    await apiService.delete<any>(`${BASE}/${id}`);
  } catch (error: any) {
    throw new Error(error.message || `Error al intentar eliminar la sesión ${id}.`);
  }
}