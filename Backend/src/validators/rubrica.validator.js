// validators/rubrica.validator.js
import { z } from "zod";

export const rubricaSchema = z.object({
  nombre:           z.string().min(2).max(100),
  descripcion:      z.string().optional(),
  peso_porcentual:  z.number().min(0).max(100),
});

export const updateRubricaSchema = rubricaSchema.partial();// validators/rubrica.validator.js
import { z } from "zod";

// POST /api/v1/admin/rubricas
export const rubricaSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es requerido" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),

  descripcion: z
    .string()
    .max(500)
    .optional(),

  peso_porcentual: z
    .number({ required_error: "El peso porcentual es requerido" })
    .min(0, "El peso no puede ser negativo")
    .max(100, "El peso no puede superar el 100 %"),
});

// PATCH /api/v1/admin/rubricas/:id
export const updateRubricaSchema = rubricaSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" }
);