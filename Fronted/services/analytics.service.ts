// services/analytics.service.ts

import { apiFetch } from "@/services/api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface Rubrica {
  id: number;
  nombre: string;
  descripcion: string;
  peso_porcentual: number;
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
  usuario_nombre: string;
  usuario_initials: string;
  tecnologia: string;
  nivel: string;
  puntaje_total: number;
  feedback_general: string;
  fortalezas: string;
  areas_mejora: string;
  sugerencias_recursos: string;
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
// CONSTANTES DE DOMINIO
// ─────────────────────────────────────────────

export const RUBRICAS: Rubrica[] = [
  {
    id: 1,
    nombre: "Correctitud",
    descripcion: "El código resuelve el problema correctamente",
    peso_porcentual: 35,
  },
  {
    id: 2,
    nombre: "Eficiencia",
    descripcion: "Complejidad temporal y espacial óptima",
    peso_porcentual: 25,
  },
  {
    id: 3,
    nombre: "Legibilidad",
    descripcion: "Código limpio, nombrado adecuado, comentarios",
    peso_porcentual: 20,
  },
  {
    id: 4,
    nombre: "Comunicación",
    descripcion: "Explicación clara del enfoque y decisiones",
    peso_porcentual: 20,
  },
];

// ─────────────────────────────────────────────
// ERRORES TIPADOS
// ─────────────────────────────────────────────

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NO_TOKEN"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "SERVER_ERROR"
      | "NETWORK_ERROR"
      | "UNKNOWN"
  ) {
    super(message);
    this.name = "AnalyticsError";
  }
}

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

export const analyticsService = {
  /**
   * Obtiene todas las evaluaciones desde el backend.
   * Lanza `AnalyticsError` en caso de fallo.
   */
  async getEvaluaciones(): Promise<Evaluacion[]> {
    let res: Response;

    try {
      res = await apiFetch("/admin/evaluaciones");
    } catch (err) {
      const isNetwork =
        err instanceof TypeError &&
        (err.message.includes("fetch") ||
          err.message.includes("network"));

      throw new AnalyticsError(
        isNetwork
          ? "No se pudo conectar al servidor. Verifica que el backend esté corriendo."
          : "Ocurrió un error inesperado al cargar las evaluaciones.",
        isNetwork ? "NETWORK_ERROR" : "UNKNOWN"
      );
    }

    if (res.status === 401) {
      throw new AnalyticsError(
        "Sesión expirada o sin permisos. Vuelve a iniciar sesión.",
        "UNAUTHORIZED"
      );
    }

    if (res.status === 403) {
      throw new AnalyticsError(
        "No tienes permisos de administrador para ver esta sección.",
        "FORBIDDEN"
      );
    }

    if (!res.ok) {
      throw new AnalyticsError(
        `Error del servidor (${res.status}). Intenta más tarde.`,
        "SERVER_ERROR"
      );
    }

    const data: EvaluacionesResponse = await res.json();

    if (!data.success) {
      throw new AnalyticsError(
        data.message ?? "La respuesta del servidor no fue exitosa.",
        "SERVER_ERROR"
      );
    }

    return data.data ?? [];
  },

  // ─────────────────────────────────────────
  // UTILIDADES DE CÁLCULO
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
    opts: { search: string; nivel: string; tecnologia: string }
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
      return true;
    });
  },

  getUniqueTechs(evaluaciones: Evaluacion[]): string[] {
    return [...new Set(evaluaciones.map((e) => e.tecnologia))];
  },

  getUniqueNiveles(evaluaciones: Evaluacion[]): string[] {
    return [...new Set(evaluaciones.map((e) => e.nivel))];
  },
};