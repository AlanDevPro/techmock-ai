// services/candidatos.service.ts

import { apiService } from "./api.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidatoRanking {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  github_url: string | null;
  linkedin_url: string | null;
  score_global: number;
  score_javascript: number;
  score_arquitectura: number;
  score_buenas_practicas: number;
  score_comunicacion: number;
  score_resolucion: number;
  consistencia: number;
  tendencia: string;
  nivel_actual: 'destacado' | 'recomendado' | 'promisorio' | 'revisar' | 'descartado';
  total_sesiones: number;
  sesiones_completadas: number;
  sesiones_abandonadas?: number;
  racha_actual: number;
  ultima_entrevista_fecha: string | null;
  feedback_general: string;
  resumen_para_reclutador: string;
  apto_para_contratacion: boolean;
  mejor_tecnologia: string;
  peor_tecnologia: string;
}

export interface TecnologiaRanking {
  id: number;
  nombre: string;
  slug: string;
  icono_url: string | null;
  tipo: string;
}

export interface CandidatoDetail extends CandidatoRanking {
  telefono?: string;
  avatar_url?: string;
  ultima_entrevista?: string;
  fortalezas: Fortaleza[];
  debilidades: Debilidad[];
  errores_recientes: ErrorDetectado[];
  recomendaciones: Recomendacion[];
  fue_adaptativa_ultima: boolean;
}

export interface Fortaleza {
  categoria: string;
  descripcion: string;
  veces_demostrada: number;
  confianza: number;
}

export interface Debilidad {
  categoria: string;
  descripcion: string;
  veces_fallada: number;
  impacto: number;
  requiere_practica: boolean;
}

export interface ErrorDetectado {
  categoria: string;
  descripcion: string;
  severidad: 'bajo' | 'medio' | 'alto' | 'critico';
  es_conceptual: boolean;
}

export interface Recomendacion {
  tipo: 'codigo' | 'concepto' | 'recurso' | 'patron';
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  recurso_url?: string;
}

export interface ContactoPayload {
  asunto: string;
  mensaje: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

const BASE = '/admin/rankings';

export const candidatosService = {
  /**
   * Obtener ranking de candidatos con filtros
   * GET /api/v1/admin/rankings/candidatos?tecnologia_id=1&nivel=destacado
   */
  async obtenerRanking(params?: { tecnologia_id?: number; nivel?: string }): Promise<{
    success: boolean;
    data: CandidatoRanking[];
    message?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.tecnologia_id) {
        queryParams.append('tecnologia_id', String(params.tecnologia_id));
      }
      if (params?.nivel) {
        queryParams.append('nivel', params.nivel);
      }

      const url = `${BASE}/candidatos${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      console.log(`📊 [candidatosService] Obteniendo ranking: ${url}`);
      const response = await apiService.get<ApiResponse<CandidatoRanking[]>>(url);

      return {
        success: response.success,
        data: response.data || [],
        message: response.message,
      };
    } catch (error) {
      console.error('[candidatosService.obtenerRanking] Error:', error);
      throw error;
    }
  },

  /**
   * Obtener detalle completo de un candidato
   * GET /api/v1/admin/rankings/candidatos/:id/detalle
   */
  async obtenerDetalleCandidato(id: string): Promise<{
    success: boolean;
    data: CandidatoDetail;
    message?: string;
  }> {
    try {
      console.log(`📊 [candidatosService] Obteniendo detalle del candidato: ${id}`);
      const response = await apiService.get<ApiResponse<CandidatoDetail>>(
        `${BASE}/candidatos/${id}/detalle`
      );

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      console.error('[candidatosService.obtenerDetalleCandidato] Error:', error);
      throw error;
    }
  },

  /**
   * Obtener tecnologías para los filtros
   * GET /api/v1/admin/rankings/tecnologias
   */
  async obtenerTecnologias(): Promise<{
    success: boolean;
    data: TecnologiaRanking[];
    message?: string;
  }> {
    try {
      console.log(`📊 [candidatosService] Obteniendo tecnologías`);
      const response = await apiService.get<ApiResponse<TecnologiaRanking[]>>(
        `${BASE}/tecnologias`
      );

      return {
        success: response.success,
        data: response.data || [],
        message: response.message,
      };
    } catch (error) {
      console.error('[candidatosService.obtenerTecnologias] Error:', error);
      throw error;
    }
  },

  /**
   * Contactar a un candidato (reclutamiento)
   * POST /api/v1/admin/rankings/candidatos/:id/contactar
   */
  async contactarCandidato(
    id: string,
    payload: ContactoPayload
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      console.log(`📧 [candidatosService] Contactando candidato: ${id}`);
      const response = await apiService.post<ApiResponse<null>>(
        `${BASE}/candidatos/${id}/contactar`,
        payload
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('[candidatosService.contactarCandidato] Error:', error);
      throw error;
    }
  },
};