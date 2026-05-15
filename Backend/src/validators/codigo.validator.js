// validators/codigo.validator.js
import { z } from "zod";

const LENGUAJES_SOPORTADOS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "cpp",
  "go",
  "rust",
  "php",
  "ruby",
];

// POST /api/v1/sesiones/:id/codigo
// POST /api/v1/ejecuciones
export const codigoSchema = z.object({
  code: z
    .string({ required_error: "El código es requerido" })
    .min(1, "El código no puede estar vacío")
    .max(50_000, "El código no puede superar los 50 000 caracteres"),

  language: z
    .string({ required_error: "El lenguaje es requerido" })
    .refine((val) => LENGUAJES_SOPORTADOS.includes(val.toLowerCase()), {
      message: `Lenguaje no soportado. Opciones: ${LENGUAJES_SOPORTADOS.join(", ")}`,
    }),
});