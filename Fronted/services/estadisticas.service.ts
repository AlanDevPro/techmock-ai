// services/estadisticas.service.ts

import {
  type DashboardStats,
  type RecentSession,
  type TopTech,
} from "@/services/dashboard.service";

// ─────────────────────────────────────────────
// TIPOS DE ESTADÍSTICAS DERIVADAS
// ─────────────────────────────────────────────

export interface StatCard {
  id: string; // ✅ Añadido: id único para cada tarjeta
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  accent: string;
}

export interface SessionStatusCount {
  completadas: number;
  en_progreso: number;
  abandonadas: number;
}

// ─────────────────────────────────────────────
// PALETA DE COLORES POR DEFECTO PARA TECHS
// ─────────────────────────────────────────────

const TECH_COLORS: Record<string, string> = {
  React:      "#61dafb",
  "Node.js":  "#68a063",
  Python:     "#f7c948",
  TypeScript: "#3178c6",
  PostgreSQL: "#336791",
  Go:         "#00add8",
  Java:       "#ed8b00",
  Rust:       "#ce422b",
  Docker:     "#2496ed",
  Kubernetes: "#326ce5",
};

const FALLBACK_COLORS = [
  "#00c96b", "#3b82f6", "#a855f7",
  "#f59e0b", "#ec4899", "#14b8a6",
];

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

export const estadisticasService = {
  /**
   * Convierte DashboardStats en tarjetas listas para renderizar.
   * Cada tarjeta tiene un id único para uso en listas de React.
   */
  buildStatCards(stats: DashboardStats): StatCard[] {
    return [
      {
        id: "active-users",
        label: "Usuarios activos",
        value: stats.active_users,
        sub: "Total registrados activos",
        icon: "ti-users",
        accent: "#00c96b",
      },
      {
        id: "today-interviews",
        label: "Entrevistas hoy",
        value: stats.today_interviews,
        sub: "Sesiones iniciadas hoy",
        icon: "ti-video",
        accent: "#3b82f6",
      },
      {
        id: "questions-count",
        label: "Preguntas en BD",
        value: stats.questions_count,
        sub: "Total de preguntas",
        icon: "ti-help-circle",
        accent: "#a855f7",
      },
      {
        id: "average-score",
        label: "Puntaje promedio",
        value: stats.average_score?.toFixed(1) ?? "—",
        sub: "Global de sesiones",
        icon: "ti-chart-bar",
        accent: "#f59e0b",
      },
    ];
  },

  /**
   * Inyecta el color de visualización a cada tech.
   * Usa la paleta conocida o un color de fallback por índice.
   */
  enrichTopTechs(techs: TopTech[]): (TopTech & { color: string })[] {
    return techs.map((tech, i) => ({
      ...tech,
      color:
        TECH_COLORS[tech.nombre] ??
        FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));
  },

  /**
   * Calcula la barra de progreso relativa al máximo de sesiones.
   */
  calcBarWidth(sessions: number, maxSessions: number): number {
    if (maxSessions === 0) return 0;
    return (sessions / maxSessions) * 100;
  },

  /**
   * Cuenta sesiones por estado.
   */
  calcSessionStatusCount(sessions: RecentSession[]): SessionStatusCount {
    return {
      completadas: sessions.filter((s) => s.status === "completada").length,
      en_progreso: sessions.filter((s) => s.status === "en_progreso").length,
      abandonadas: sessions.filter((s) => s.status === "abandonada").length,
    };
  },

  /**
   * Devuelve el color del score según el valor.
   */
  scoreColor(
    score: number | null,
    tokens: { accent: string; warning: string; danger: string; textFaint: string }
  ): string {
    if (score === null) return tokens.textFaint;
    if (score >= 80)    return tokens.accent;
    if (score >= 60)    return tokens.warning;
    return tokens.danger;
  },
};