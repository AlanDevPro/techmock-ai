// routes/ejecuciones.routes.js
import { Router } from "express";
import { crearEjecucion, getEjecucion } from "../controllers/ejecucionIde.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { ejecucionLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { codigoSchema } from "../validators/codigo.validator.js";

const router = Router();

router.use(verifyToken);

// POST /api/v1/ejecuciones
router.post("/", ejecucionLimiter, validate(codigoSchema), crearEjecucion);

// GET  /api/v1/ejecuciones/:id
router.get("/:id", getEjecucion);

export default router;