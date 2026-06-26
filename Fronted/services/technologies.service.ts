// 📁 services/technologies.service.ts

import { apiService } from "./api.service"; // Asegura la ruta correcta a tu api.service.ts

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface Tecnologia {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  version_actual: string;
  icono_url: string | null;
  activo: boolean;
  fecha_creacion: string;
  
  // Campos agregados (estadísticas)
  total_sesiones: number;
  promedio_puntaje: number;
  preguntas_totales: number;
  preguntas_activas: number;
}

export interface TecnologiasResponse {
  success: boolean;
  data: Tecnologia[];
}

export interface TecnologiaResponse {
  success: boolean;
  data: Tecnologia;
}

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

const BASE = "/tecnologias";

/**
 * Obtiene el listado de todas las tecnologías disponibles.
 * Si el token expira (401), apiService lo renovará en segundo plano 
 * y reintentará esta petición de manera transparente para el usuario.
 */
export async function getTecnologias(): Promise<Tecnologia[]> {
  try {
    const result = await apiService.get<TecnologiasResponse>(BASE);
    return result.data ?? [];
  } catch (error: any) {
    throw new Error(error.message || "Error al obtener el listado de tecnologías.");
  }
}

/**
 * Obtiene el detalle completo y las estadísticas de una tecnología específica por su ID.
 */
export async function getTecnologiaById(id: number): Promise<Tecnologia> {
  try {
    const result = await apiService.get<TecnologiaResponse>(`${BASE}/${id}`);
    return result.data;
  } catch (error: any) {
    throw new Error(error.message || `Error al obtener los detalles de la tecnología con ID ${id}.`);
  }
}

/**
 * Cambia de forma alternada el estado de activación (activo/inactivo) de una tecnología.
 * Solo administradores o personal autorizado suelen realizar esta acción en el backend.
 */
export async function toggleTecnologiaActivo(
  id: number,
  activo: boolean
): Promise<Tecnologia> {
  try {
    const result = await apiService.patch<TecnologiaResponse>(`${BASE}/${id}/estado`, { 
      activo 
    });
    return result.data;
  } catch (error: any) {
    throw new Error(error.message || `Error al cambiar el estado de la tecnología con ID ${id}.`);
  }
}

// Nota: No se incluyen funciones de creación, edición o eliminación
// porque las tecnologías son predefinidas y solo se pueden activar/desactivar.