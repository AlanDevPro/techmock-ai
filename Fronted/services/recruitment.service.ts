// services/recruitment.service.ts

import { apiFetch } from "@/services/api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface Contact {
  id: number;
  developer: string;
  initials: string;
  email: string;
  asunto: string;
  estado: ContactEstado;
  fecha_envio: string;
  sesion_score: number | null;
  tecnologia: string;
  nivel: string;
  mensaje: string;
  respuesta: string | null;
}

export type ContactEstado =
  | "enviado"
  | "respondido"
  | "rechazado"
  | "en_proceso";

export interface ContactsResponse {
  success: boolean;
  data: Contact[];
  message?: string;
}

export interface ContactStats {
  total: number;
  enviado: number;
  respondido: number;
  en_proceso: number;
  rechazado: number;
}

// ─────────────────────────────────────────────
// ERRORES TIPADOS
// ─────────────────────────────────────────────

export class RecruitmentError extends Error {
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
    this.name = "RecruitmentError";
  }
}

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

export const recruitmentService = {
  /**
   * Obtiene todos los contactos de reclutamiento.
   * Lanza `RecruitmentError` en caso de fallo.
   */
  async getContacts(): Promise<Contact[]> {
    let res: Response;

    try {
      res = await apiFetch("/admin/reclutamiento");
    } catch (err) {
      const isNetwork =
        err instanceof TypeError &&
        (err.message.includes("fetch") ||
          err.message.includes("network"));

      throw new RecruitmentError(
        isNetwork
          ? "No se pudo conectar al servidor. Verifica que el backend esté corriendo."
          : "Ocurrió un error inesperado al cargar los contactos.",
        isNetwork ? "NETWORK_ERROR" : "UNKNOWN"
      );
    }

    if (res.status === 401) {
      throw new RecruitmentError(
        "Sesión expirada o sin permisos. Vuelve a iniciar sesión.",
        "UNAUTHORIZED"
      );
    }

    if (res.status === 403) {
      throw new RecruitmentError(
        "No tienes permisos de administrador para ver esta sección.",
        "FORBIDDEN"
      );
    }

    if (!res.ok) {
      throw new RecruitmentError(
        `Error del servidor (${res.status}). Intenta más tarde.`,
        "SERVER_ERROR"
      );
    }

    const data: ContactsResponse = await res.json();

    if (!data.success) {
      throw new RecruitmentError(
        data.message ?? "La respuesta del servidor no fue exitosa.",
        "SERVER_ERROR"
      );
    }

    return data.data ?? [];
  },

  // ─────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────

  calcStats(contacts: Contact[]): ContactStats {
    return {
      total:      contacts.length,
      enviado:    contacts.filter((c) => c.estado === "enviado").length,
      respondido: contacts.filter((c) => c.estado === "respondido").length,
      en_proceso: contacts.filter((c) => c.estado === "en_proceso").length,
      rechazado:  contacts.filter((c) => c.estado === "rechazado").length,
    };
  },

  filterContacts(
    contacts: Contact[],
    opts: { search: string; estado: string }
  ): Contact[] {
    const q = opts.search.toLowerCase();
    return contacts.filter((c) => {
      const matchSearch =
        !q ||
        c.developer.toLowerCase().includes(q) ||
        c.asunto.toLowerCase().includes(q) ||
        c.tecnologia.toLowerCase().includes(q);
      const matchEstado =
        opts.estado === "todos" || c.estado === opts.estado;
      return matchSearch && matchEstado;
    });
  },
};