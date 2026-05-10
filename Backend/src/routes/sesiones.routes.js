// routes/sesiones.routes.js
import { Router } from "express";
import {
  crearSesion,
  getSesion,
  finalizarSesion,
  getHistorial,
} from "../controllers/sesionEntrevista.controller.js";
import {
  getMensajes,
  enviarMensaje,
} from "../controllers/mensaje.controller.js";
import {
  getVersionesCodigo,
  guardarCodigo,
} from "../controllers/enviosCodigo.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { iaLimiter } from "../middlewares/rateLimiter.middleware.js";
import { crearSesionSchema } from "../validators/sesion.validator.js";
import { codigoSchema } from "../validators/codigo.validator.js";

const router = Router();

// Todas las rutas de sesiones requieren autenticación
router.use(verifyToken);

// ── Sesiones ────────────────────────────────────────────────────────────────

// IMPORTANTE: /historial debe ir ANTES de /:id para evitar conflicto de rutas
// GET  /api/v1/sesiones/historial
router.get("/historial", getHistorial);

// POST /api/v1/sesiones
router.post("/", iaLimiter, validate(crearSesionSchema), crearSesion);

// GET  /api/v1/sesiones/:id
router.get("/:id", getSesion);

// PATCH /api/v1/sesiones/:id/finalizar
router.patch("/:id/finalizar", finalizarSesion);

// ── Mensajes ─────────────────────────────────────────────────────────────────

// GET  /api/v1/sesiones/:id/mensajes
router.get("/:id/mensajes", getMensajes);

// POST /api/v1/sesiones/:id/mensajes
router.post("/:id/mensajes", enviarMensaje);

// ── Código ───────────────────────────────────────────────────────────────────

// GET  /api/v1/sesiones/:id/codigo
router.get("/:id/codigo", getVersionesCodigo);

// POST /api/v1/sesiones/:id/codigo
router.post("/:id/codigo", validate(codigoSchema), guardarCodigo);

export default router;