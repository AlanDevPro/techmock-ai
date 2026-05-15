// middlewares/rateLimiter.middleware.js
import rateLimit from "express-rate-limit";

/**
 * Limitador general para todas las rutas /api/v1
 * 100 requests por IP cada 15 minutos
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiadas solicitudes desde esta IP. Intenta nuevamente en 15 minutos.",
  },
  keyGenerator: (req) => {
    // Si el usuario está autenticado, limitar por usuario; si no, por IP
    return req.usuario?.id?.toString() || req.ip;
  },
});

/**
 * Limitador estricto para rutas de autenticación
 * 10 intentos por IP cada 15 minutos
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.",
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
});

/**
 * Limitador para ejecuciones de código (K8s Jobs)
 * Recurso costoso: 20 ejecuciones por usuario cada 10 minutos
 */
export const ejecucionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Límite de ejecuciones alcanzado. Intenta nuevamente en 10 minutos.",
  },
  keyGenerator: (req) => {
    return req.usuario?.id?.toString() || req.ip;
  },
});

/**
 * Limitador para generación de preguntas con IA
 * 30 sesiones por usuario por hora
 */
export const iaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Límite de solicitudes IA alcanzado. Intenta nuevamente en una hora.",
  },
  keyGenerator: (req) => {
    return req.usuario?.id?.toString() || req.ip;
  },
});