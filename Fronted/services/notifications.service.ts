// services/notifications.service.ts

import { apiFetch } from "@/services/api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type NotifTipo = "warning" | "info" | "success" | "error";

export interface Notif {
  id: number;
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
  advertencias: number;
  errores: number;
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
    c: "#f87171",
    icon: "ti-circle-x",
    label: "Error",
  },
};

// ─────────────────────────────────────────────
// ERRORES TIPADOS
// ─────────────────────────────────────────────

export class NotificationsError extends Error {
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
    this.name = "NotificationsError";
  }
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    throw new NotificationsError(
      "Sesión expirada o sin permisos. Vuelve a iniciar sesión.",
      "UNAUTHORIZED"
    );
  }

  if (res.status === 403) {
    throw new NotificationsError(
      "No tienes permisos para realizar esta acción.",
      "FORBIDDEN"
    );
  }

  if (!res.ok) {
    throw new NotificationsError(
      `Error del servidor (${res.status}). Intenta más tarde.`,
      "SERVER_ERROR"
    );
  }

  const data = await res.json();

  if (!data.success) {
    throw new NotificationsError(
      data.message ?? "La respuesta del servidor no fue exitosa.",
      "SERVER_ERROR"
    );
  }

  return data as T;
}

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

    throw new NotificationsError(
      isNetwork
        ? "No se pudo conectar al servidor. Verifica que el backend esté corriendo."
        : "Ocurrió un error inesperado.",
      isNetwork ? "NETWORK_ERROR" : "UNKNOWN"
    );
  }
}

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

export const notificationsService = {
  /**
   * Obtiene todas las notificaciones del usuario autenticado.
   */
  async getNotificaciones(): Promise<Notif[]> {
    const res = await safeFetch("/notificaciones");

    const data =
      await handleResponse<NotifsResponse>(res);

    return data.data ?? [];
  },

  /**
   * Marca una notificación como leída en el backend.
   */
  async markAsRead(id: number): Promise<void> {
    const res = await safeFetch(
      `/notificaciones/${id}/leer`,
      {
        method: "PATCH",
      }
    );

    await handleResponse<NotifActionResponse>(res);
  },

  /**
   * Marca todas las notificaciones como leídas.
   */
  async markAllAsRead(): Promise<void> {
    const res = await safeFetch(
      "/notificaciones/leer-todas",
      {
        method: "PATCH",
      }
    );

    await handleResponse<NotifActionResponse>(res);
  },

  /**
   * Elimina una notificación del backend.
   */
  async deleteNotif(id: number): Promise<void> {
    const res = await safeFetch(
      `/notificaciones/${id}`,
      {
        method: "DELETE",
      }
    );

    await handleResponse<NotifActionResponse>(res);
  },

  // ─────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────

  calcStats(notifs: Notif[]): NotifStats {
    return {
      total: notifs.length,

      sinLeer: notifs.filter(
        (n) => !n.leida
      ).length,

      advertencias: notifs.filter(
        (n) => n.tipo === "warning"
      ).length,

      errores: notifs.filter(
        (n) => n.tipo === "error"
      ).length,
    };
  },

  filterNotifs(
    notifs: Notif[],
    opts: {
      readFilter:
        | "todas"
        | "no_leidas"
        | "leidas";

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
        opts.tipoFilter === "todos" ||
        n.tipo === opts.tipoFilter;

      return readMatch && tipoMatch;
    });
  },
};