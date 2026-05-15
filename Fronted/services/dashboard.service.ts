// services/dashboard.service.ts

import { apiFetch } from "@/services/api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface DashboardStats {
  active_users: number;
  today_interviews: number;
  questions_count: number;
  average_score: number;
}

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

export type SessionStatus =
  | "completada"
  | "en_progreso"
  | "abandonada";

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

export interface RecentNotif {
  time: ReactNode;
  msg: ReactNode;
  type: any;
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha_creacion: string;
}

// ─────────────────────────────────────────────
// ERROR TIPADO
// ─────────────────────────────────────────────

export class DashboardError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "SERVER_ERROR"
      | "NETWORK_ERROR"
      | "UNKNOWN"
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function safeFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  try {
    return await apiFetch(endpoint, options);
  } catch (err) {
    const isNetwork =
      err instanceof TypeError &&
      (err.message.includes("fetch") ||
        err.message.includes("network"));

    throw new DashboardError(
      isNetwork
        ? "No se pudo conectar al servidor."
        : "Error inesperado.",
      isNetwork ? "NETWORK_ERROR" : "UNKNOWN"
    );
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401)
    throw new DashboardError(
      "Sesión expirada.",
      "UNAUTHORIZED"
    );

  if (res.status === 403)
    throw new DashboardError(
      "Sin permisos.",
      "FORBIDDEN"
    );

  if (!res.ok)
    throw new DashboardError(
      `Error del servidor (${res.status}).`,
      "SERVER_ERROR"
    );

  const data = await res.json();

  if (!data.success)
    throw new DashboardError(
      data.message ?? "Error del backend.",
      "SERVER_ERROR"
    );

  return data as T;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export const dashboardService = {

  async getStats(): Promise<DashboardStats> {
    const res = await safeFetch("/dashboard/stats");

    const data = await handleResponse<{
      success: boolean;
      data: DashboardStats;
    }>(res);

    return data.data;
  },

  async getRecentSessions(): Promise<RecentSession[]> {
    const res = await safeFetch(
      "/dashboard/recent-sessions"
    );

    const data = await handleResponse<{
      success: boolean;
      data: RecentSession[];
    }>(res);

    return data.data;
  },

  async getTopTechs(): Promise<TopTech[]> {
    const res = await safeFetch(
      "/dashboard/top-technologies"
    );

    const data = await handleResponse<{
      success: boolean;
      data: TopTech[];
    }>(res);

    return data.data;
  },

  async getRecentContacts(): Promise<RecentContact[]> {
    const res = await safeFetch(
      "/dashboard/recent-recruitment"
    );

    const data = await handleResponse<{
      success: boolean;
      data: RecentContact[];
    }>(res);

    return data.data;
  },

  async getRecentNotifs(): Promise<RecentNotif[]> {
    const res = await safeFetch(
      "/dashboard/notifications"
    );

    const data = await handleResponse<{
      success: boolean;
      data: RecentNotif[];
    }>(res);

    return data.data;
  },
};