// routes/niveles.routes.js
import { Router } from "express";
import { getNiveles } from "../controllers/nivelDificultad.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/v1/niveles
router.get("/", verifyToken, getNiveles);

export default router;