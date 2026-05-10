// validators/sesion.validator.js
import { z } from "zod";

// POST /api/v1/sesiones  — Crear nueva sesión
export const crearSesionSchema = z.object({
  tecnologia_id: z
    .number({ required_error: "La tecnología es requerida" })
    .int()
    .positive("El ID de tecnología debe ser un entero positivo"),

  nivel_dificultad_id: z
    .number({ required_error: "El nivel de dificultad es requerido" })
    .int()
    .positive("El ID de nivel debe ser un entero positivo"),
});