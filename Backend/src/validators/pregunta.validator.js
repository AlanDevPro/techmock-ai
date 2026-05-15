// validators/pregunta.validator.js
import { z } from "zod";

// POST /api/v1/admin/preguntas
export const preguntaSchema = z.object({
  tecnologia_id: z
    .number({ required_error: "La tecnología es requerida" })
    .int()
    .positive(),

  nivel_dificultad_id: z
    .number({ required_error: "El nivel de dificultad es requerido" })
    .int()
    .positive(),

  titulo: z
    .string({ required_error: "El título es requerido" })
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(300),

  enunciado: z
    .string({ required_error: "El enunciado es requerido" })
    .min(10, "El enunciado debe tener al menos 10 caracteres"),

  ejemplo_entrada: z.string().optional(),
  ejemplo_salida: z.string().optional(),

  activa: z.boolean().default(true),
});

// PATCH /api/v1/admin/preguntas/:id  — todos los campos son opcionales
export const updatePreguntaSchema = preguntaSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" }
);