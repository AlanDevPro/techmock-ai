// middlewares/errorHandler.middleware.js
import { ZodError } from "zod";

/**
 * Manejador global de errores — debe ser el ÚLTIMO middleware en app.js
 * Uso en app.js: app.use(errorHandler)
 */
export const errorHandler = (err, req, res, next) => {
  // ── Log diferenciado por severidad ──────────────────────────────────
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    // Errores reales del servidor: loguear con stack completo
    console.error("❌ [ERROR HANDLER]", {
      mensaje: err.message,
      ruta: `${req.method} ${req.originalUrl}`,
      stack: err.stack,
    });
  } else {
    // Errores de cliente (4xx): solo mensaje, sin stack para no ensuciar consola
    console.warn("⚠️ [ERROR HANDLER]", {
      status,
      mensaje: err.message,
      ruta: `${req.method} ${req.originalUrl}`,
    });
  }

  // ── Errores de validación Zod ────────────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Datos de entrada inválidos",
      detalles: err.errors.map((e) => ({
        campo: e.path.join("."),
        mensaje: e.message,
      })),
    });
  }

  // ── Errores de JWT ───────────────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expirado",
      code: "TOKEN_EXPIRED",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Token inválido",
      code: "TOKEN_INVALID",
    });
  }

  // ── Errores de PostgreSQL ────────────────────────────────────────────
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "Registro duplicado",
      detalle: err.detail || "Ya existe un registro con esos datos",
    });
  }

  if (err.code === "23503") {
    return res.status(409).json({
      success: false,
      error: "Referencia inválida",
      detalle: err.detail || "El recurso referenciado no existe",
    });
  }

  if (err.code === "23502") {
    return res.status(422).json({
      success: false,
      error: "Campo requerido faltante",
      detalle: err.detail || "Un campo obligatorio no fue proporcionado",
    });
  }

  if (err.code === "42P01") {
    console.error("❌ [ERROR HANDLER] Tabla no existe — verifica migraciones");
    return res.status(500).json({
      success: false,
      error: "Error interno de base de datos",
    });
  }

  // ── Errores de Firebase Admin ────────────────────────────────────────
  if (err.code === "auth/id-token-expired") {
    return res.status(401).json({
      success: false,
      error: "Token Firebase expirado",
      code: "FIREBASE_TOKEN_EXPIRED",
    });
  }

  if (err.code === "auth/invalid-id-token" || err.code === "auth/argument-error") {
    return res.status(401).json({
      success: false,
      error: "Token Firebase inválido",
      code: "FIREBASE_TOKEN_INVALID",
    });
  }

  // ── ✅ FIX CRÍTICO: Errores HTTP con status personalizado ─────────────
  // Antes solo revisaba err.statusCode, ignorando err.status
  // Los services lanzan: throw Object.assign(new Error("..."), { status: 401 })
  // por eso todo caía al bloque 500 de abajo
  if (status !== 500) {
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }

  // ── Error genérico 500 ───────────────────────────────────────────────
  return res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Error interno del servidor",
  });
};

/**
 * Helper para lanzar errores HTTP controlados desde controladores/servicios
 * Compatible con ambas propiedades para no romper nada existente.
 *
 * Uso: throw createError(404, "Sesión no encontrada")
 */
export const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;        // ✅ Propiedad que usan los services
  err.statusCode = status;    // ✅ Propiedad alternativa (compatibilidad)
  return err;
};