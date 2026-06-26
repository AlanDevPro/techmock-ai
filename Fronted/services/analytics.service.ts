// 📁 services/analytics.service.ts

import { apiService } from "@/services/api.service";

// ─────────────────────────────────────────────
// TIPOS ACTUALIZADOS PARA LA NUEVA BASE DE DATOS
// ─────────────────────────────────────────────

export interface Rubrica {
  id: number;
  nombre: string;
  descripcion: string;
  peso_porcentual: number;
  activa: boolean;
}

export interface DetalleEvaluacion {
  rubrica_id: number;
  rubrica_nombre: string;
  puntaje: number;
  comentario: string;
}

export interface Evaluacion {
  id: number;
  sesion_id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_initials: string;
  tecnologia: string;
  tecnologia_id: number;
  nivel: string;
  nivel_id: number;
  puntaje_total: number;
  
  // Nuevos campos del sistema adaptativo
  puntaje_javascript: number | null;
  puntaje_arquitectura: number | null;
  puntaje_buenas_practicas: number | null;
  puntaje_comunicacion: number | null;
  puntaje_resolucion: number | null;
  nivel_candidato: string | null;
  apto_para_contratacion: boolean | null;
  resumen_para_reclutador: string | null;
  
  // Feedback
  feedback_general: string;
  fortalezas: string;
  areas_mejora: string;
  sugerencias_recursos: string | null;
  
  // Metadata
  generado_por_ia: boolean;
  modelo_ia_usado: string;
  tokens_evaluacion: number;
  fecha: string;
  detalles: DetalleEvaluacion[];
}

export interface EvaluacionesResponse {
  success: boolean;
  data: Evaluacion[];
  message?: string;
}

// ─────────────────────────────────────────────
// CONSTANTES DE DOMINIO - RÚBRICAS ACTUALIZADAS
// ─────────────────────────────────────────────

export const RUBRICAS: Rubrica[] = [
  {
    id: 1,
    nombre: "JavaScript",
    descripcion: "Dominio del lenguaje base, sintaxis, características modernas",
    peso_porcentual: 25,
    activa: true,
  },
  {
    id: 2,
    nombre: "Arquitectura",
    descripcion: "Estructura de componentes, separación de responsabilidades",
    peso_porcentual: 20,
    activa: true,
  },
  {
    id: 3,
    nombre: "Buenas prácticas",
    descripcion: "Clean code, naming, inmutabilidad, patrones",
    peso_porcentual: 20,
    activa: true,
  },
  {
    id: 4,
    nombre: "Comunicación",
    descripcion: "Explicación clara del enfoque y decisiones",
    peso_porcentual: 20,
    activa: true,
  },
  {
    id: 5,
    nombre: "Resolución",
    descripcion: "Manejo de bloqueos, capacidad de buscar soluciones",
    peso_porcentual: 15,
    activa: true,
  },
];

// ─────────────────────────────────────────────
// SERVICIO CORREGIDO
// ─────────────────────────────────────────────

export const analyticsService = {
  /**
   * Obtiene todas las evaluaciones desde el backend.
   */
  async getEvaluaciones(): Promise<Evaluacion[]> {
    try {
      const response = await apiService.get<EvaluacionesResponse>("/admin/evaluaciones");
      // Tolera tanto la estructura .data de la API como respuestas de arreglos nativos directos
      return response.data ?? (response as any);
    } catch (error: any) {
      // Captura el mensaje estructurado lanzado desde tu apiService de forma limpia
      throw new Error(error.message || "Error inesperado al cargar las evaluaciones de analítica.");
    }
  },

  /**
   * Obtiene una evaluación específica por ID
   */
  async getEvaluacionById(id: number): Promise<Evaluacion> {
    try {
      const response = await apiService.get<{ success: boolean; data: Evaluacion }>(`/admin/evaluaciones/${id}`);
      return response.data ?? (response as any);
    } catch (error: any) {
      throw new Error(error.message || `No se pudo recuperar la evaluación con ID ${id}.`);
    }
  },

  // ─────────────────────────────────────────
  // UTILIDADES DE CÁLCULO (Se mantienen idénticas)
  // ─────────────────────────────────────────

  calcAvgScore(evaluaciones: Evaluacion[]): number | null {
    if (!evaluaciones.length) return null;
    const sum = evaluaciones.reduce(
      (acc, e) => acc + Number(e.puntaje_total),
      0
    );
    return sum / evaluaciones.length;
  },

  calcTotalTokens(evaluaciones: Evaluacion[]): number {
    return evaluaciones.reduce(
      (acc, e) => acc + Number(e.tokens_evaluacion),
      0
    );
  },

  calcHighScores(
    evaluaciones: Evaluacion[],
    threshold = 85
  ): number {
    return evaluaciones.filter(
      (e) => Number(e.puntaje_total) >= threshold
    ).length;
  },

  calcLowScores(evaluaciones: Evaluacion[], threshold = 55): number {
    return evaluaciones.filter(
      (e) => Number(e.puntaje_total) < threshold
    ).length;
  },

  calcAptosContratacion(evaluaciones: Evaluacion[]): number {
    return evaluaciones.filter(
      (e) => e.apto_para_contratacion === true
    ).length;
  },

  calcAvgByRubrica(
    evaluaciones: Evaluacion[]
  ): (Rubrica & { avg: number })[] {
    return RUBRICAS.map((rubrica) => {
      const values = evaluaciones.flatMap((e) =>
        e.detalles
          .filter((d) => d.rubrica_id === rubrica.id)
          .map((d) => Number(d.puntaje))
      );
      const avg = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
      return { ...rubrica, avg };
    });
  },

  filterEvaluaciones(
    evaluaciones: Evaluacion[],
    opts: { search: string; nivel: string; tecnologia: string; apto?: string }
  ): Evaluacion[] {
    const q = opts.search.toLowerCase();
    return evaluaciones.filter((e) => {
      if (
        q &&
        !e.usuario_nombre.toLowerCase().includes(q) &&
        !e.tecnologia.toLowerCase().includes(q)
      )
        return false;
      if (opts.nivel !== "todos" && e.nivel !== opts.nivel)
        return false;
      if (
        opts.tecnologia !== "todas" &&
        e.tecnologia !== opts.tecnologia
      )
        return false;
      if (opts.apto && opts.apto !== "todos") {
        if (opts.apto === "apto" && e.apto_para_contratacion !== true)
          return false;
        if (opts.apto === "no_apto" && e.apto_para_contratacion !== false)
          return false;
      }
      return true;
    });
  },

  getUniqueTechs(evaluaciones: Evaluacion[]): string[] {
    return [...new Set(evaluaciones.map((e) => e.tecnologia))];
  },

  getUniqueNiveles(evaluaciones: Evaluacion[]): string[] {
    return [...new Set(evaluaciones.map((e) => e.nivel))];
  },

  getNivelCandidatoStats(evaluaciones: Evaluacion[]): Record<string, number> {
    const stats: Record<string, number> = {
      destacado: 0,
      recomendar: 0,
      promisorio: 0,
      revisar: 0,
      descartado: 0,
      sin_evaluar: 0,
    };
    
    evaluaciones.forEach((e) => {
      if (!e.nivel_candidato) {
        stats.sin_evaluar++;
      } else {
        // Validación preventiva si viene un string del backend fuera de los predefinidos en stats
        if (stats[e.nivel_candidato] !== undefined) {
          stats[e.nivel_candidato]++;
        } else {
          stats.sin_evaluar++;
        }
      }
    });
    
    return stats;
  },
};