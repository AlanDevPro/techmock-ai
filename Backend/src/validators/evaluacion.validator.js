// validators/evaluacion.validator.js
import { z } from "zod";

// Usado internamente por evaluacion.service.js si se necesita validar
// el payload antes de disparar la evaluación IA manualmente.
// GET /api/v1/evaluaciones/:sesionId no requiere body, pero
// este schema está disponible por si se agrega un endpoint POST en el futuro.

export const evaluacionSchema = z.object({
  sesion_id: z
    .number({ required_error: "El ID de sesión es requerido" })
    .int()
    .positive(),
});