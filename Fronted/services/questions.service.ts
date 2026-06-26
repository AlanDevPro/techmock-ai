// 📁 services/questions.service.ts

import { apiService } from "./api.service";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type TipoPregunta = "live_coding" | "teoria" | "debugging" | "arquitectura" | "optimizacion";

/** Shape que devuelve GET /admin/preguntas (con JOINs del model) */
export interface PreguntaAPI {
  id: number;
  titulo: string;
  enunciado: string;
  tecnologia_id: number;
  nivel_id: number;
  tipo: TipoPregunta;
  activa: boolean;
  generada_por_ia: boolean;
  tiempo_estimado_min: number;
  fecha_creacion: string;
  prompt_contexto: string | null;
  creada_por: string | null;
  
  // Campos JOIN
  tecnologia: string;
  nivel: string;
  
  // NUEVOS CAMPOS del sistema adaptativo
  categorias_error_objetivo: string[];  // JSON array de slugs
  sesion_origen_id: string | null;
  contexto_adaptativo: Record<string, unknown> | null;
}

export interface Tecnologia {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  activo: boolean;
}

export interface Nivel {
  id: number;
  nombre: string;
  multiplicador_puntaje: number;
}

export interface CatalogosPregunta {
  tecnologias: Tecnologia[];
  niveles: Nivel[];
}

/** Interfaz estándar para desenvolver las respuestas del Backend */
interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─────────────────────────────────────────────
// ENDPOINTS (SOLO LECTURA)
// ─────────────────────────────────────────────

const BASE       = "/admin/preguntas";
const TECHS_PATH = "/tecnologias";
const NIVS_PATH  = "/niveles";

/**
 * Obtiene el listado completo de preguntas del banco de reactivos.
 */
export async function getPreguntas(): Promise<PreguntaAPI[]> {
  try {
    const response = await apiService.get<BackendResponse<PreguntaAPI[]>>(BASE);
    // Tolera tanto envoltorios .data como respuestas directas del backend
    return response.data ?? (response as any);
  } catch (error: any) {
    throw new Error(error.message || "Error al obtener el listado de preguntas.");
  }
}

/**
 * Recupera catálogos globales de tecnologías y niveles en paralelo para poblar formularios y filtros de búsqueda.
 */
export async function getCatalogos(): Promise<CatalogosPregunta> {
  try {
    // Las peticiones van en paralelo y aprovechan la cola asíncrona de renovación de token de tu apiService
    const [techsRes, nivsRes] = await Promise.all([
      apiService.get<BackendResponse<Tecnologia[]>>(TECHS_PATH),
      apiService.get<BackendResponse<Nivel[]>>(NIVS_PATH),
    ]);

    const tecnologias = techsRes.data ?? (techsRes as any);
    const niveles = nivsRes.data ?? (nivsRes as any);

    return { tecnologias, niveles };
  } catch (error: any) {
    throw new Error(error.message || "Error al cargar los catálogos del sistema.");
  }
}

/**
 * Gatilla la carga concurrente en paralelo de las preguntas junto con sus respectivos catálogos paramétricos.
 */
export async function getPreguntasConCatalogos(): Promise<{
  preguntas: PreguntaAPI[];
  tecnologias: Tecnologia[];
  niveles: Nivel[];
}> {
  try {
    const [pregRes, techsRes, nivsRes] = await Promise.all([
      apiService.get<BackendResponse<PreguntaAPI[]>>(BASE),
      apiService.get<BackendResponse<Tecnologia[]>>(TECHS_PATH),
      apiService.get<BackendResponse<Nivel[]>>(NIVS_PATH),
    ]);

    const preguntas = pregRes.data ?? (pregRes as any);
    const tecnologias = techsRes.data ?? (techsRes as any);
    const niveles = nivsRes.data ?? (nivsRes as any);

    return { preguntas, tecnologias, niveles };
  } catch (error: any) {
    throw new Error(error.message || "Error al compilar la matriz de datos de preguntas.");
  }
}

/**
 * Recupera el registro individual de una pregunta según su identificador único numérico.
 */
export async function getPreguntaById(id: number): Promise<PreguntaAPI> {
  try {
    const response = await apiService.get<BackendResponse<PreguntaAPI>>(`${BASE}/${id}`);
    return response.data ?? (response as any);
  } catch (error: any) {
    throw new Error(error.message || `Error al recuperar la pregunta con ID ${id}.`);
  }
}

// Nota: No se incluyen funciones de creación, edición o eliminación
// porque el administrador solo debe visualizar las preguntas generadas por IA.trg