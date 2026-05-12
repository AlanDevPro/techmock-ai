// services/developers.service.ts

import { apiFetch } from "./api";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type Rol = "admin" | "developer" | "recruiter";

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  telefono: string | null;
  activo: boolean;
  email_verificado: boolean;
  fecha_creacion: string;       // ISO string
  ultimo_login: string | null;  // ISO string
  provider: "password" | "google" | "github";
  // stats join (de estadisticas_usuario)
  total_entrevistas?: number;
  puntaje_promedio?: number | null;
}

export interface UsuariosResponse {
  success: boolean;
  data: Usuario[];
}

export interface UsuarioResponse {
  success: boolean;
  data: Usuario;
}

export type CreateUsuarioPayload = Omit<
  Usuario,
  "fecha_creacion" | "ultimo_login" | "total_entrevistas" | "puntaje_promedio"
>;

export type UpdateUsuarioPayload = Partial<
  Omit<Usuario, "id" | "fecha_creacion" | "ultimo_login" | "total_entrevistas" | "puntaje_promedio">
>;

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

const BASE = "/admin/usuarios";

// ── GET /admin/usuarios ────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<Usuario[]> {
  const response = await apiFetch(BASE);

  if (!response.ok) {
    throw new Error(`Error al obtener usuarios: ${response.status}`);
  }

  const result: UsuariosResponse = await response.json();

  if (!result.success) {
    throw new Error("La respuesta del servidor indica error");
  }

  return result.data;
}

// ── GET /admin/usuarios/:id ────────────────────────────────────────────────────

export async function getUsuarioById(id: string): Promise<Usuario> {
  const response = await apiFetch(`${BASE}/${id}`);

  if (!response.ok) {
    throw new Error(`Error al obtener usuario ${id}: ${response.status}`);
  }

  const result: UsuarioResponse = await response.json();

  if (!result.success) {
    throw new Error("La respuesta del servidor indica error");
  }

  return result.data;
}

// ── POST /admin/usuarios ───────────────────────────────────────────────────────

export async function createUsuario(
  payload: CreateUsuarioPayload
): Promise<Usuario> {
  const response = await apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al crear usuario: ${response.status}`);
  }

  const result: UsuarioResponse = await response.json();

  if (!result.success) {
    throw new Error("La respuesta del servidor indica error");
  }

  return result.data;
}

// ── PATCH /admin/usuarios/:id ─────────────────────────────────────────────────

export async function updateUsuario(
  id: string,
  payload: UpdateUsuarioPayload
): Promise<Usuario> {
  const response = await apiFetch(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al actualizar usuario ${id}: ${response.status}`);
  }

  const result: UsuarioResponse = await response.json();

  if (!result.success) {
    throw new Error("La respuesta del servidor indica error");
  }

  return result.data;
}

// ── PATCH /admin/usuarios/:id/estado ──────────────────────────────────────────
// Endpoint específico para toggle activo/inactivo

export async function toggleUsuarioActivo(
  id: string,
  activo: boolean
): Promise<Usuario> {
  const response = await apiFetch(`${BASE}/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });

  if (!response.ok) {
    throw new Error(`Error al cambiar estado del usuario ${id}: ${response.status}`);
  }

  const result: UsuarioResponse = await response.json();

  if (!result.success) {
    throw new Error("La respuesta del servidor indica error");
  }

  return result.data;
}

// ── DELETE /admin/usuarios/:id ────────────────────────────────────────────────

export async function deleteUsuario(id: string): Promise<void> {
  const response = await apiFetch(`${BASE}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Error al eliminar usuario ${id}: ${response.status}`);
  }
}