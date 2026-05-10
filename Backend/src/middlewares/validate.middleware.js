// middlewares/validate.middleware.js
import { ZodError } from "zod";

/**
 * Middleware de validación con Zod.
 * Uso: validate(miSchema) — valida req.body por defecto.
 *
 * Ejemplo en rutas:
 *   router.post("/sesiones", verifyToken, validate(crearSesionSchema), sesionController.crear)
 */
export const validate = (schema, target = "body") => {
  return (req, res, next) => {
    try {
      const data = target === "body" ? req.body
                 : target === "query" ? req.query
                 : req.params;

      const parsed = schema.parse(data);

      // Reemplazar con datos parseados/coercionados por Zod
      if (target === "body") req.body = parsed;
      else if (target === "query") req.query = parsed;
      else req.params = parsed;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errores = error.errors.map((e) => ({
          campo: e.path.join("."),
          mensaje: e.message,
        }));

        return res.status(422).json({
          success: false,
          error: "Datos de entrada inválidos",
          detalles: errores,
        });
      }

      // Error inesperado durante validación
      console.error("❌ [VALIDATE MIDDLEWARE] Error inesperado:", error.message);
      return res.status(500).json({
        success: false,
        error: "Error interno en validación",
      });
    }
  };
};