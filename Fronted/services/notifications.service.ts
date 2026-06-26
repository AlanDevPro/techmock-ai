// 📁 services/notifications.service.ts

import { apiService } from "@/services/api.service";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type NotifTipo = "warning" | "info" | "success" | "error";

export interface Notif {
  id: number;
  usuario_id: string;
  tipo: NotifTipo;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url_accion: string | null;
  fecha_creacion: string;
}

export interface NotifsResponse {
  success: boolean;
  data: Notif[];
  message?: string;
}

export interface NotifActionResponse {
  success: boolean;
  message?: string;
}

export interface NotifStats {
  total: number;
  sinLeer: number;
  leidas: number;
  advertencias: number;
  errores: number;
  exitos: number;
  informacion: number;
}

// ─────────────────────────────────────────────
// CONFIGURACIÓN VISUAL (compartida con la UI)
// ─────────────────────────────────────────────

export const TIPO_CONFIG: Record<
  NotifTipo,
  {
    bg: string;
    c: string;
    icon: string;
    label: string;
  }
> = {
  warning: {
    bg: "rgba(245,158,11,0.1)",
    c: "#fbbf24",
    icon: "ti-alert-triangle",
    label: "Advertencia",
  },
  info: {
    bg: "rgba(59,130,246,0.1)",
    c: "#60a5fa",
    icon: "ti-info-circle",
    label: "Información",
  },
  success: {
    bg: "rgba(0,201,107,0.1)",
    c: "#00c96b",
    icon: "ti-circle-check",
    label: "Éxito",
  },
  error: {
    bg: "rgba(239,68,68,0.1)",
    c: "#239,68,68",
    icon: "ti-circle-x",
    label: "Error",
  },
};

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

export const notificationsService = {
  /**
   * Obtiene todas las notificaciones del usuario autenticado.
   * Delega el manejo de expiración de token y de red a apiService de forma transparente.
   */
  async getNotificaciones(): Promise<Notif[]> {
    try {
      // apiService.get ya maneja internamente el tipado, .json() y los errores HTTP comunes
      const response = await apiService.get<NotifsResponse>("/notificaciones");

      return (response.data ?? []).map((notif) => ({
        ...notif,
        mensaje: notif.mensaje || "Sin contenido",
        titulo: notif.titulo || "Notificación",
      }));
    } catch (error: any) {
      throw new Error(error.message || "No se pudieron cargar las notificaciones.");
    }
  },

  /**
   * Marca una notificación como leída en el backend.
   */
  async markAsRead(id: number): Promise<void> {
    try {
      await apiService.patch<NotifActionResponse>(`/notificaciones/${id}/leer`);
    } catch (error: any) {
      throw new Error(error.message || `Error al marcar la notificación ${id} como leída.`);
    }
  },

  /**
   * Marca todas las notificaciones como leídas.
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiService.patch<NotifActionResponse>("/notificaciones/leer-todas");
    } catch (error: any) {
      throw new Error(error.message || "Error al marcar todas las notificaciones como leídas.");
    }
  },

  /**
   * Elimina una notificación del backend.
   */
  async deleteNotif(id: number): Promise<void> {
    try {
      await apiService.delete<NotifActionResponse>(`/notificaciones/${id}`);
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar la notificación.");
    }
  },

  /**
   * Elimina todas las notificaciones leídas.
   */
  async deleteAllRead(): Promise<void> {
    try {
      await apiService.delete<NotifActionResponse>("/notificaciones/leidas");
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar las notificaciones leídas.");
    }
  },

  // ─────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────

  calcStats(notifs: Notif[]): NotifStats {
    return {
      total: notifs.length,
      sinLeer: notifs.filter((n) => !n.leida).length,
      leidas: notifs.filter((n) => n.leida).length,
      advertencias: notifs.filter((n) => n.tipo === "warning").length,
      errores: notifs.filter((n) => n.tipo === "error").length,
      exitos: notifs.filter((n) => n.tipo === "success").length,
      informacion: notifs.filter((n) => n.tipo === "info").length,
    };
  },

  filterNotifs(
    notifs: Notif[],
    opts: {
      readFilter: "todas" | "no_leidas" | "leidas";
      tipoFilter: string;
    }
  ): Notif[] {
    return notifs.filter((n) => {
      const readMatch =
        opts.readFilter === "todas"
          ? true
          : opts.readFilter === "no_leidas"
          ? !n.leida
          : n.leida;

      const tipoMatch =
        opts.tipoFilter === "todos" || n.tipo === opts.tipoFilter;

      return readMatch && tipoMatch;
    });
  },
};