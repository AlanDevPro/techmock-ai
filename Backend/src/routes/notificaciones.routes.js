// routes/notificaciones.routes.js
import { Router } from "express";
import { getMisNotificaciones, marcarLeida } from "../controllers/notificacion.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

// GET   /api/v1/notificaciones
router.get("/", getMisNotificaciones);

// PATCH /api/v1/notificaciones/:id/leer
router.patch("/:id/leer", marcarLeida);

export default router;