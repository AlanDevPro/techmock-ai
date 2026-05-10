// validators/contacto.validator.js
import { z } from "zod";

// POST /api/v1/admin/reclutamiento
export const contactoSchema = z.object({
  developer_id: z
    .number({ required_error: "El ID del developer es requerido" })
    .int()
    .positive("El ID del developer debe ser un entero positivo"),

  mensaje: z
    .string({ required_error: "El mensaje es requerido" })
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(2000, "El mensaje no puede superar los 2 000 caracteres"),

  asunto: z
    .string()
    .min(3, "El asunto debe tener al menos 3 caracteres")
    .max(200)
    .optional(),
});