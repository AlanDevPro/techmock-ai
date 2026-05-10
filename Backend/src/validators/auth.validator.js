// validators/auth.validator.js
import { z } from "zod";

// POST /api/v1/auth/refresh
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: "El refresh token es requerido" })
    .min(1, "El refresh token no puede estar vacío"),
});

// POST /api/v1/auth/logout
export const logoutSchema = z.object({
  refreshToken: z
    .string({ required_error: "El refresh token es requerido" })
    .min(1, "El refresh token no puede estar vacío"),
});

// POST /api/v1/auth/register
export const registerSchema = z.object({
  email: z
    .string({ required_error: "El email es requerido" })
    .email("Debe ser un email válido"),
  nombre: z
    .string({ required_error: "El nombre es requerido" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  apellido: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(100, "El apellido no puede tener más de 100 caracteres")
    .optional(),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
});

// POST /api/v1/auth/login
export const loginSchema = z.object({
  email: z
    .string({ required_error: "El email es requerido" })
    .email("Debe ser un email válido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(1, "La contraseña no puede estar vacía"),
});

// POST /api/v1/auth/change-password
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "La contraseña actual es requerida" })
    .min(1, "La contraseña actual no puede estar vacía"),
  newPassword: z
    .string({ required_error: "La nueva contraseña es requerida" })
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
});

// DELETE /api/v1/auth/sessions/:sessionId
export const revokeSessionSchema = z.object({
  params: z.object({
    sessionId: z
      .string({ required_error: "El ID de sesión es requerido" })
      .regex(/^\d+$/, "El ID de sesión debe ser un número válido"),
  }),
});

// PATCH /api/v1/usuarios/perfil
export const updatePerfilSchema = z
  .object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede tener más de 100 caracteres").optional(),
    apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres").max(100, "El apellido no puede tener más de 100 caracteres").optional(),
    avatar_url: z.string().url("Debe ser una URL válida").optional(),
    github_url: z
      .string()
      .url("Debe ser una URL válida")
      .regex(/^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+$/, "Debe ser una URL válida de GitHub")
      .optional(),
    linkedin_url: z
      .string()
      .url("Debe ser una URL válida")
      .regex(/^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9_-]+$/, "Debe ser una URL válida de LinkedIn")
      .optional(),
    telefono: z
      .string()
      .regex(/^\+?[0-9\s\-\(\)]{8,20}$/, "Debe ser un número de teléfono válido")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

// GET /api/v1/auth/sessions (query params opcionales)
export const getSessionsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, "La página debe ser un número")
      .optional()
      .transform(Number),
    limit: z
      .string()
      .regex(/^\d+$/, "El límite debe ser un número")
      .optional()
      .transform(Number),
  }).optional(),
});

// POST /api/v1/auth/forgot-password (opcional - para recuperación)
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "El email es requerido" })
    .email("Debe ser un email válido"),
});

// POST /api/v1/auth/reset-password (opcional - para recuperación)
export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: "El token es requerido" })
    .min(1, "El token no puede estar vacío"),
  newPassword: z
    .string({ required_error: "La nueva contraseña es requerida" })
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
});

// POST /api/v1/auth/verify-email (opcional - para verificación)
export const verifyEmailSchema = z.object({
  token: z
    .string({ required_error: "El token es requerido" })
    .min(1, "El token no puede estar vacío"),
});