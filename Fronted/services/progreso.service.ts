// app/services/progreso.service.ts
'use client';

import { apiService } from './api.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PillarScore {
  label: string;
  key: string;
  score: number;
}

export interface Session {
  id: string;
  fecha: string;
  tipo: string;
  duracion: string;
  puntaje: number;
  nivel_candidato: "descartado" | "revisar" | "promisorio" | "recomendado" | "destacado";
  fue_adaptativa: boolean;
  pregunta: string;
  pregunta_resumen: string;
}

export interface ErrorDetectado {
  categoria: string;
  severidad: "bajo" | "medio" | "alto" | "critico";
  descripcion: string;
  veces: number;
}

export interface Recomendacion {
  tipo: "codigo" | "concepto" | "recurso" | "patron";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  codigo_ejemplo?: string;
  recurso_url?: string;
}

export interface TechData {
  nombre: string;
  slug: string;
  sessions: Session[];
  pilares: PillarScore[];
  errores: ErrorDetectado[];
  recomendaciones: Recomendacion[];
  fortalezas: string[];
  debilidades: string[];
  tendencia: "↑" | "→" | "↓";
  score_global: number;
  sesiones_completadas: number;
  consistencia: number;
}

export interface EstadisticasGenerales {
  racha_actual: number;
  total_entrevistas: number;
  entrevistas_finalizadas: number;
  puntaje_promedio: number;
  consistencia: number;
  tendencia: "↑" | "→" | "↓";
  nivel_actual: string;
}

export interface ProgresoResponse {
  success: boolean;
  data: {
    tecnologias: TechData[];
    estadisticas: EstadisticasGenerales;
    nivel_global: string;
    tendencia_global: "↑" | "→" | "↓";
  };
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export class ProgresoService {
  /**
   * Obtiene el progreso completo del usuario
   * @returns {Promise<ProgresoResponse>} Datos completos de progreso
   */
  static async obtenerProgresoCompleto(): Promise<ProgresoResponse> {
    return apiService.get<ProgresoResponse>('/progreso');
  }

  /**
   * Obtiene el progreso de una tecnología específica
   * @param {string} slug - Slug de la tecnología (ej: 'javascript', 'python')
   * @returns {Promise<TechData>} Datos de progreso de la tecnología
   */
  static async obtenerProgresoTecnologia(slug: string): Promise<TechData> {
    const response = await apiService.get<{ data: TechData }>(
      `/progreso/tecnologia/${slug}`
    );
    return response.data;
  }

  /**
   * Obtiene las estadísticas generales del usuario
   * @returns {Promise<EstadisticasGenerales>} Estadísticas del usuario
   */
  static async obtenerEstadisticas(): Promise<EstadisticasGenerales> {
    const response = await apiService.get<{ data: EstadisticasGenerales }>(
      '/progreso/estadisticas'
    );
    return response.data;
  }
}