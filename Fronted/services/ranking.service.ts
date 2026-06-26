// app/services/ranking.service.ts
'use client';

import { apiService } from './api.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TecnologiaRanking {
  id: number;
  nombre: string;
  slug: string;
  icono_url: string;
}

export interface CandidatoRanking {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  github_url: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  
  // Perfil técnico
  score_global: number;
  score_javascript: number;
  score_arquitectura: number;
  score_buenas_practicas: number;
  score_comunicacion: number;
  score_resolucion: number;
  consistencia: number;
  tendencia: "↑ mejorando" | "→ estable" | "↓ bajando";
  nivel_actual: "destacado" | "recomendado" | "promisorio" | "revisar" | "descartado";
  total_sesiones: number;
  sesiones_completadas: number;
  
  // Tecnología
  tecnologia_id: number;
  tecnologia_nombre: string;
  tecnologia_slug: string;
  tecnologia_icono: string | null;
  
  // Última evaluación
  feedback_general: string;
  fortalezas: string; // <-- String simple para la vista de lista resumida
  areas_mejora: string;
  resumen_para_reclutador: string;
  apto_para_contratacion: boolean;
  ultima_evaluacion_fecha: string;
  nivel_candidato: string;
  
  // Estadísticas
  racha_actual: number;
  ultima_entrevista_fecha: string;
}

export interface EstadisticasRanking {
  total_candidatos: number;
  destacados: number;
  recomendados: number;
  promisorios: number;
  revisar: number;
  descartados: number;
  score_promedio_global: number;
  consistencia_promedio: number;
  score_maximo: number;
  score_minimo: number;
}

export interface RankingResponse {
  success: boolean;
  data: {
    candidatos: CandidatoRanking[];
    estadisticas: EstadisticasRanking;
    total: number;
  };
}

export interface CandidatoDetailResponse {
  success: boolean;
  data: CandidatoDetail;
}

/**
 * ✅ SOLUCIÓN: Omitimos 'fortalezas' de la interfaz base para redefinirla 
 * como un arreglo estructurado sin generar conflictos de herencia.
 */
export interface CandidatoDetail extends Omit<CandidatoRanking, 'fortalezas'> {
  telefono: string;
  bio: string;
  mejor_tecnologia: string;
  peor_tecnologia: string;
  sesiones_recientes: SessionRanking[];
  fortalezas: FortalezaDetail[]; // <-- Ahora se redefine de forma segura
  debilidades: DebilidadDetail[];
  errores_recientes: ErrorRanking[];
  recomendaciones: RecomendacionRanking[];
  total_entrevistas: number;
  entrevistas_finalizadas: number;
  puntaje_promedio: number;
  tecnologia_favorita_id: number;
}

export interface SessionRanking {
  id: string;
  fecha: string;
  tipo: string;
  duracion: number;
  puntaje: number;
  nivel_candidato: string;
  fue_adaptativa: boolean;
  pregunta: string;
  pregunta_resumen: string;
}

export interface FortalezaDetail {
  categoria: string;
  descripcion: string;
  veces: number;
  confianza: number;
}

export interface DebilidadDetail {
  categoria: string;
  descripcion: string;
  veces: number;
  impacto: number;
}

export interface ErrorRanking {
  categoria: string;
  severidad: "bajo" | "medio" | "alto" | "critico";
  descripcion: string;
  veces: number;
}

export interface RecomendacionRanking {
  tipo: "codigo" | "concepto" | "recurso" | "patron";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  codigo_ejemplo?: string;
  recurso_url?: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export class RankingService {
  /**
   * Obtiene el ranking completo de desarrolladores
   */
  static async obtenerRanking(filters?: {
    tecnologia_id?: number;
    nivel?: string;
    limit?: number;
  }): Promise<RankingResponse> {
    const params = new URLSearchParams();
    if (filters?.tecnologia_id) params.append('tecnologia_id', String(filters.tecnologia_id));
    if (filters?.nivel && filters.nivel !== 'all') params.append('nivel', filters.nivel);
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiService.get<RankingResponse>(`/rankings${queryString}`);
  }
  
  /**
   * Obtiene el detalle de un candidato específico
   */
  static async obtenerCandidatoDetail(usuarioId: string): Promise<CandidatoDetail> {
    const response = await apiService.get<CandidatoDetailResponse>(`/rankings/${usuarioId}`);
    return response.data;
  }
  
  /**
   * Obtiene estadísticas generales del ranking
   */
  static async obtenerEstadisticasRanking(): Promise<EstadisticasRanking> {
    const response = await apiService.get<{ success: boolean; data: EstadisticasRanking }>('/rankings/stats');
    return response.data;
  }
  
  /**
   * Obtiene el top de candidatos por tecnología
   */
  static async obtenerTopPorTecnologia(tecnologiaId: number, limit?: number): Promise<CandidatoRanking[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.get<{ success: boolean; data: CandidatoRanking[] }>(
      `/rankings/tecnologia/${tecnologiaId}/top${queryString}`
    );
    return response.data;
  }

  /**
   * Obtiene todas las tecnologías activas para los filtros del ranking
   */
  static async obtenerTecnologias(): Promise<{ success: boolean; data: TecnologiaRanking[] }> {
    return apiService.get<{ success: boolean; data: TecnologiaRanking[] }>('/tecnologias');
  }
}

export default RankingService;