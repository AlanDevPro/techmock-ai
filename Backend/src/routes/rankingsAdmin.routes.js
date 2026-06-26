// backend/src/routes/rankingsAdmin.routes.js

import { Router } from "express";
import {
  obtenerRankingCandidatos,
  obtenerDetalleCandidato,
  obtenerTecnologias,
  contactarCandidato,
} from "../controllers/rankingAdmin.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.use(verifyToken, onlyAdmin);

// ── Ranking ───────────────────────────────────────────────────────────────────
router.get("/candidatos", obtenerRankingCandidatos);
router.get("/candidatos/:id/detalle", obtenerDetalleCandidato);
router.post("/candidatos/:id/contactar", contactarCandidato);
router.get("/tecnologias", obtenerTecnologias);

export default router;