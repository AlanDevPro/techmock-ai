// routes/evaluaciones.routes.js
import { Router } from "express";
import { getEvaluacion } from "../controllers/evaluacion.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

// GET /api/v1/evaluaciones/:sesionId
router.get("/:sesionId", getEvaluacion);

export default router;