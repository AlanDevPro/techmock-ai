// routes/tecnologias.routes.js
import { Router } from "express";
import { getTecnologias } from "../controllers/tecnologia.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/v1/tecnologias
router.get("/", verifyToken, getTecnologias);

export default router;