// validators/authProvider.validator.js
import Joi from "joi";

export const linkProviderSchema = Joi.object({
  provider: Joi.string()
    .valid("google", "github")
    .required()
    .messages({
      "any.only": "El provider debe ser 'google' o 'github'",
      "any.required": "El provider es requerido",
    }),

  provider_uid: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "El provider_uid es requerido",
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).optional(),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      "string.min": "La nueva contraseña debe tener al menos 8 caracteres",
      "any.required": "La nueva contraseña es requerida",
    }),
});