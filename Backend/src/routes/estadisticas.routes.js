// routes/estadisticas.routes.js
import { Router } from "express";
import { getMisEstadisticas } from "../controllers/estadisticas.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

// GET /api/v1/estadisticas/mi-perfil
router.get("/mi-perfil", getMisEstadisticas);

export default router;