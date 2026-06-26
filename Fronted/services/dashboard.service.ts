// 📁 services/dashboard.service.ts

import { ReactNode } from "react";
import { apiService } from "@/services/api.service"; // Asegúrate de apuntar a la ruta correcta de tu api.service.ts

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface DashboardStats {
  active_users: number;
  today_interviews: number;
  questions_count: number;
  average_score: number;
}

export type SessionStatus = "completada" | "en_progreso" | "abandonada";

export interface RecentSession {
  status: string;
  time: ReactNode;
  id: string;
  user_name: string;
  initials: string;
  tech: string;
  level: string;
  score: number | null;
  estado: SessionStatus;
  fecha_inicio: string;
}

export interface TopTech {
  nombre: string;
  sessions: number;
  avg: number;
}

export interface RecentContact {
  time: ReactNode;
  status: string;
  subject: ReactNode;
  dev: ReactNode;
  id: number;
  developer: string;
  asunto: string;
  estado: string;
  fecha_envio: string;
}

// ─────────────────────────────────────────────
// TIPOS DE NOTIFICACIÓN
// ─────────────────────────────────────────────

export type NotificationType = "success" | "error" | "warning" | "info";

export interface RecentNotif {
  time: ReactNode;
  msg: ReactNode;
  type: NotificationType;
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha_creacion: string;
}

// Interfaces genéricas para envolver las respuestas estándar de tu backend
interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export const dashboardService = {
  /**
   * Obtiene las métricas generales del panel administrativo.
   */
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.get<BackendResponse<DashboardStats>>("/dashboard/stats");
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar las estadísticas del dashboard.");
    }
  },

  /**
   * Obtiene la lista de las últimas sesiones o simulaciones realizadas por los usuarios.
   */
  async getRecentSessions(): Promise<RecentSession[]> {
    try {
      const response = await apiService.get<BackendResponse<RecentSession[]>>("/dashboard/recent-sessions");
      return response.data ?? [];
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar las sesiones recientes.");
    }
  },

  /**
   * Obtiene el top de tecnologías más utilizadas y sus promedios de puntaje.
   */
  async getTopTechs(): Promise<TopTech[]> {
    try {
      const response = await apiService.get<BackendResponse<TopTech[]>>("/dashboard/top-technologies");
      return response.data ?? [];
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar el top de tecnologías.");
    }
  },

  /**
   * Obtiene las solicitudes o contactos recientes vinculados a procesos de reclutamiento.
   */
  async getRecentContacts(): Promise<RecentContact[]> {
    try {
      const response = await apiService.get<BackendResponse<RecentContact[]>>("/dashboard/recent-recruitment");
      return response.data ?? [];
    } catch (error: any) {
      throw new Error(error.message || "Error al obtener contactos recientes de reclutamiento.");
    }
  },

  /**
   * Obtiene el listado de alertas y notificaciones del sistema orientadas al dashboard.
   */
  async getRecentNotifs(): Promise<RecentNotif[]> {
    try {
      const response = await apiService.get<BackendResponse<RecentNotif[]>>("/dashboard/notifications");
      return response.data ?? [];
    } catch (error: any) {
      throw new Error(error.message || "Error al cargar las notificaciones de control.");
    }
  },
};