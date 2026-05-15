// routes/mensajes.routes.js
import { Router } from "express";
import { getMensajes, enviarMensaje } from "../controllers/mensaje.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

router.use(verifyToken);

// GET  /api/v1/sesiones/:id/mensajes
router.get("/", getMensajes);

// POST /api/v1/sesiones/:id/mensajes
router.post("/", enviarMensaje);

export default router;