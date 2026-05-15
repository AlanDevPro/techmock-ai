// middlewares/validate.middleware.js
import Joi from "joi";

/**
 * Middleware de validación con Joi.
 * Valida req.body directamente con el esquema proporcionado.
 *
 * Uso: validate(miSchema) — valida req.body
 *
 * Ejemplo en rutas:
 *   router.post("/sesiones", verifyToken, validate(crearSesionSchema), sesionController.crear)
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.log("❌ VALIDATION ERROR:", error.details);
      return res.status(422).json({
        success: false,
        error: "Error de validación en los datos de entrada",
        detalles: error.details,
      });
    }

    next();
  };
};

/**
 * Middleware de validación simplificado para validar solo req.body
 *
 * Uso: validateBody(miSchemaBody) — valida solo req.body
 *
 * Ejemplo:
 *   router.post("/login", validateBody(loginSchema), authController.login)
 */
export const validateBody = (schema, options = {}) => {
  return (req, res, next) => {
    try {
      console.log("🔍 [VALIDATE BODY] Validating body:", req.body);

      const defaultOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options,
      };

      const { error, value } = schema.validate(req.body, defaultOptions);

      if (error) {
        console.log("❌ [VALIDATE BODY] Validation errors:", error.details);
        console.log("❌ [VALIDATE BODY] Error details:", JSON.stringify(error.details, null, 2));

        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        if (process.env.NODE_ENV === "development") {
          console.log("⚠️ [VALIDATION BODY ERROR]", {
            path: req.path,
            errors: errors.map((e) => ({ field: e.field, message: e.message })),
          });
        }

        return res.status(422).json({
          success: false,
          error: "Error de validación en los datos enviados",
          detalles: errors,
        });
      }

      console.log("✅ [VALIDATE BODY] Validation successful");
      req.body = value;
      next();
    } catch (error) {
      console.error("❌ [VALIDATE BODY MIDDLEWARE] Error inesperado:", error.message);
      return res.status(500).json({
        success: false,
        error: "Error interno en el servidor de validación",
      });
    }
  };
};

/**
 * Middleware de validación para validar solo req.query
 *
 * Uso: validateQuery(miSchemaQuery) — valida solo req.query
 */
export const validateQuery = (schema, options = {}) => {
  return (req, res, next) => {
    try {
      console.log("🔍 [VALIDATE QUERY] Validating query:", req.query);

      const defaultOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options,
      };

      const { error, value } = schema.validate(req.query, defaultOptions);

      if (error) {
        console.log("❌ [VALIDATE QUERY] Validation errors:", error.details);

        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return res.status(422).json({
          success: false,
          error: "Error de validación en los parámetros de consulta",
          detalles: errors,
        });
      }

      console.log("✅ [VALIDATE QUERY] Validation successful");
      req.query = value;
      next();
    } catch (error) {
      console.error("❌ [VALIDATE QUERY MIDDLEWARE] Error inesperado:", error.message);
      return res.status(500).json({
        success: false,
        error: "Error interno en el servidor de validación",
      });
    }
  };
};

/**
 * Middleware de validación para validar solo req.params
 *
 * Uso: validateParams(miSchemaParams) — valida solo req.params
 */
export const validateParams = (schema, options = {}) => {
  return (req, res, next) => {
    try {
      console.log("🔍 [VALIDATE PARAMS] Validating params:", req.params);

      const defaultOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options,
      };

      const { error, value } = schema.validate(req.params, defaultOptions);

      if (error) {
        console.log("❌ [VALIDATE PARAMS] Validation errors:", error.details);

        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return res.status(422).json({
          success: false,
          error: "Error de validación en los parámetros de URL",
          detalles: errors,
        });
      }

      console.log("✅ [VALIDATE PARAMS] Validation successful");
      req.params = value;
      next();
    } catch (error) {
      console.error("❌ [VALIDATE PARAMS MIDDLEWARE] Error inesperado:", error.message);
      return res.status(500).json({
        success: false,
        error: "Error interno en el servidor de validación",
      });
    }
  };
};