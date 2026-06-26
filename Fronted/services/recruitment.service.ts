// 📁 services/recruitment.service.ts

import { apiService } from "@/services/api.service";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface Contact {
  id: number;
  admin_id: string;
  developer_id: string;
  developer_name: string;
  developer_email: string;
  developer_initials: string;
  asunto: string;
  estado: ContactEstado;
  fecha_envio: string;
  sesion_id: string | null;
  sesion_score: number | null;
  tecnologia: string;
  nivel: string;
  mensaje: string;
  respuesta_developer: string | null;
}

export type ContactEstado =
  | "enviado"
  | "respondido"
  | "rechazado"
  | "en_proceso";

export interface CreateContactPayload {
  developer_id: string;
  asunto: string;
  mensaje: string;
  sesion_id?: string;
}

export interface ContactsResponse {
  success: boolean;
  data: Contact[];
  message?: string;
}

export interface ContactResponse {
  success: boolean;
  data: Contact;
  message?: string;
}

export interface ContactStats {
  total: number;
  enviado: number;
  respondido: number;
  en_proceso: number;
  rechazado: number;
}

export interface DeveloperOption {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  puntaje_promedio: number | null;
  nivel_actual: string | null;
  mejor_tecnologia: string | null;
}

// ─────────────────────────────────────────────
// SERVICIO CORREGIDO
// ─────────────────────────────────────────────

export const recruitmentService = {
  /**
   * Obtiene todos los contactos de reclutamiento registrados en el sistema.
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const response = await apiService.get<ContactsResponse>("/admin/reclutamiento");
      // Resiliencia: Tolera tanto payloads envueltos en .data como arrays distribuidos nativos
      return response.data ?? (response as any);
    } catch (error: any) {
      throw new Error(error.message || "Error al recuperar el historial de contactos de reclutamiento.");
    }
  },

  /**
   * Obtiene la lista de desarrolladores disponibles para contactar.
   */
  async getDevelopers(): Promise<DeveloperOption[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: DeveloperOption[] }>("/admin/developers");
      return response.data ?? (response as any);
    } catch (error: any) {
      throw new Error(error.message || "No se pudo compilar el catálogo de desarrolladores elegibles.");
    }
  },

  /**
   * Registra y envía una nueva propuesta de contacto a un desarrollador.
   */
  async createContact(payload: CreateContactPayload): Promise<Contact> {
    try {
      const response = await apiService.post<ContactResponse>("/admin/reclutamiento", payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || "Error al procesar el envío del contacto.");
    }
  },

  /**
   * Actualiza el estado operativo y almacena respuestas para un contacto específico.
   */
  async updateContactStatus(
    id: number,
    estado: ContactEstado,
    respuesta?: string
  ): Promise<Contact> {
    try {
      const response = await apiService.patch<ContactResponse>(`/admin/reclutamiento/${id}/estado`, {
        estado,
        respuesta,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || `No se pudo actualizar el estado operativo del contacto #${id}.`);
    }
  },

  // ─────────────────────────────────────────
  // UTILIDADES DE CÁLCULO LOCAL (Mantenidas intactas)
  // ─────────────────────────────────────────

  calcStats(contacts: Contact[]): ContactStats {
    return {
      total: contacts.length,
      enviado: contacts.filter((c) => c.estado === "enviado").length,
      respondido: contacts.filter((c) => c.estado === "respondido").length,
      en_proceso: contacts.filter((c) => c.estado === "en_proceso").length,
      rechazado: contacts.filter((c) => c.estado === "rechazado").length,
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
        c.developer_name.toLowerCase().includes(q) ||
        c.asunto.toLowerCase().includes(q) ||
        c.tecnologia.toLowerCase().includes(q);
      const matchEstado = opts.estado === "todos" || c.estado === opts.estado;
      return matchSearch && matchEstado;
    });
  },
};