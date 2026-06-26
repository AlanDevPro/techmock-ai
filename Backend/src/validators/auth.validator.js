// 📁 validators/auth.validator.js
import Joi from "joi";

// ──────────────────────────────────────────────────────────
// Esquemas de autenticación
// ──────────────────────────────────────────────────────────

// POST /api/v1/auth/register - Registro de usuario
export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Debe ser un email válido",
      "any.required": "El email es requerido",
      "string.empty": "El email no puede estar vacío",
    }),
  nombre: Joi.string()
    .min(2)
    .max(100)
    .required()
    .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/)
    .messages({
      "string.min": "El nombre debe tener al menos 2 caracteres",
      "string.max": "El nombre no puede tener más de 100 caracteres",
      "string.pattern.base": "El nombre solo puede contener letras y espacios",
      "any.required": "El nombre es requerido",
      "string.empty": "El nombre no puede estar vacío",
    }),
  apellido: Joi.string()
    .min(2)
    .max(100)
    .required()
    .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/)
    .messages({
      "string.min": "El apellido debe tener al menos 2 caracteres",
      "string.max": "El apellido no puede tener más de 100 caracteres",
      "string.pattern.base": "El apellido solo puede contener letras y espacios",
      "any.required": "El apellido es requerido",
      "string.empty": "El apellido no puede estar vacío",
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      "string.min": "La contraseña debe tener al menos 8 caracteres",
      "string.max": "La contraseña no puede tener más de 100 caracteres",
      "string.pattern.base": "La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial",
      "any.required": "La contraseña es requerida",
      "string.empty": "La contraseña no puede estar vacía",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/login - Inicio de sesión
export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Debe ser un email válido",
      "any.required": "El email es requerido",
      "string.empty": "El email no puede estar vacío",
    }),
  password: Joi.string()
    .required()
    .messages({
      "any.required": "La contraseña es requerida",
      "string.empty": "La contraseña no puede estar vacía",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/refresh - Refrescar access token
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .min(1)
    .messages({
      "any.required": "El refresh token es requerido",
      "string.empty": "El refresh token no puede estar vacío",
      "string.min": "El refresh token debe tener al menos 1 carácter",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/logout - Cerrar sesión
export const logoutSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .min(1)
    .messages({
      "any.required": "El refresh token es requerido",
      "string.empty": "El refresh token no puede estar vacío",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/forgot-password - Solicitar recuperación de contraseña
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Debe ser un email válido",
      "any.required": "El email es requerido",
      "string.empty": "El email no puede estar vacío",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/reset-password - Restablecer contraseña
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .min(1)
    .messages({
      "any.required": "El token es requerido",
      "string.empty": "El token no puede estar vacío",
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      "string.min": "La contraseña debe tener al menos 8 caracteres",
      "string.max": "La contraseña no puede tener más de 100 caracteres",
      "string.pattern.base": "La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial",
      "any.required": "La contraseña es requerida",
      "string.empty": "La contraseña no puede estar vacía",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/change-password - Cambiar contraseña (autenticado)
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      "any.required": "La contraseña actual es requerida",
      "string.empty": "La contraseña actual no puede estar vacía",
    }),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      "string.min": "La nueva contraseña debe tener al menos 8 caracteres",
      "string.max": "La nueva contraseña no puede tener más de 100 caracteres",
      "string.pattern.base": "La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial",
      "any.required": "La nueva contraseña es requerida",
      "string.empty": "La nueva contraseña no puede estar vacía",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Las contraseñas no coinciden",
      "any.required": "Debes confirmar la nueva contraseña",
    }),
}).options({ stripUnknown: true });

// POST /api/v1/auth/verify-email - Verificar email
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .min(1)
    .messages({
      "any.required": "El token es requerido",
      "string.empty": "El token no puede estar vacío",
    }),
}).options({ stripUnknown: true });

// ──────────────────────────────────────────────────────────
// Esquemas de perfil de usuario - MEJORADO ✅
// ──────────────────────────────────────────────────────────

// PATCH /api/v1/usuarios/perfil - Actualizar perfil
export const updatePerfilSchema = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/)
    .optional()
    .allow('')
    .messages({
      "string.min": "El nombre debe tener al menos 2 caracteres",
      "string.max": "El nombre no puede tener más de 100 caracteres",
      "string.pattern.base": "El nombre solo puede contener letras y espacios",
    }),
  apellido: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/)
    .optional()
    .allow('')
    .messages({
      "string.min": "El apellido debe tener al menos 2 caracteres",
      "string.max": "El apellido no puede tener más de 100 caracteres",
      "string.pattern.base": "El apellido solo puede contener letras y espacios",
    }),
  avatar_url: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      "string.uri": "Debe ser una URL válida",
    }),
  // ✅ MODIFICADO: Aceptar solo el nombre de usuario de GitHub (sin URL completa)
  // Ejemplo válido: "alanDevPro", "john-doe", "user123"
  github_url: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/)
    .messages({
      "string.pattern.base": "Debe ser un nombre de usuario de GitHub válido (solo letras, números y guiones, máximo 39 caracteres)",
    }),
  // ✅ MODIFICADO: Aceptar solo el nombre de usuario de LinkedIn (sin URL completa)
  // Ejemplo válido: "john-doe", "johndoe123", "john_doe"
  linkedin_url: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[A-Za-z0-9-]{5,100}$/)
    .messages({
      "string.pattern.base": "Debe ser un nombre de usuario de LinkedIn válido (solo letras, números y guiones, mínimo 5 caracteres)",
    }),
  telefono: Joi.string()
    .pattern(/^\+?[0-9\s\-\(\)]{8,20}$/)
    .optional()
    .allow('', null)
    .messages({
      "string.pattern.base": "Debe ser un número de teléfono válido",
    }),
  bio: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      "string.max": "La biografía no puede tener más de 500 caracteres",
    }),
  website: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      "string.uri": "Debe ser una URL válida",
    }),
  location: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      "string.max": "La ubicación no puede tener más de 100 caracteres",
    }),
  twitter: Joi.string()
    .pattern(/^@?[A-Za-z0-9_]{1,15}$/)
    .optional()
    .allow('', null)
    .messages({
      "string.pattern.base": "Debe ser un nombre de usuario de Twitter válido (ej: @usuario o usuario)",
    }),
}).min(1).messages({
  "object.min": "Debes enviar al menos un campo para actualizar",
}).options({ stripUnknown: true });

// ──────────────────────────────────────────────────────────
// Esquemas de sesiones
// ──────────────────────────────────────────────────────────

// GET /api/v1/auth/sessions - Obtener sesiones activas
export const getSessionsSchema = Joi.object({
  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional()
      .messages({
        "number.base": "La página debe ser un número",
        "number.integer": "La página debe ser un número entero",
        "number.min": "La página debe ser al menos 1",
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .optional()
      .messages({
        "number.base": "El límite debe ser un número",
        "number.integer": "El límite debe ser un número entero",
        "number.min": "El límite debe ser al menos 1",
        "number.max": "El límite no puede ser mayor a 100",
      }),
  }).optional(),
}).options({ stripUnknown: true });

// DELETE /api/v1/auth/sessions/:sessionId - Revocar sesión
export const revokeSessionSchema = Joi.object({
  params: Joi.object({
    sessionId: Joi.string()
      .pattern(/^\d+$/)
      .required()
      .messages({
        "string.pattern.base": "El ID de sesión debe ser un número válido",
        "any.required": "El ID de sesión es requerido",
        "string.empty": "El ID de sesión no puede estar vacío",
      }),
  }).required(),
}).options({ stripUnknown: true });