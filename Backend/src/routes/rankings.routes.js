// src/routes/rankings.routes.js
import { Router } from "express";
import RankingController from "../controllers/ranking.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas principales
router.get("/", RankingController.getRankings);
router.get("/stats", RankingController.getStats);
router.get("/tecnologia/:tecnologiaId/top", RankingController.getTopByTech);
router.get("/:usuarioId", RankingController.getCandidateDetail);

export default router;