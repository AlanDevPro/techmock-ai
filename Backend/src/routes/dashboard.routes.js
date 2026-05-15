// routes/dashboard.routes.js (CREAR ESTE ARCHIVO COMPLETO)
import { Router } from "express";
import { 
  getDashboardStats,
  getRecentSessions,
  getTopTechnologies,
  getAdminDashboard, 
  getDeveloperDashboard,
  getRecentRecruitment,
  getRecentNotifications
} from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ─── Endpoints públicos para cualquier usuario autenticado ───
// GET /api/v1/dashboard/stats
router.get("/stats", getDashboardStats);

// GET /api/v1/dashboard/recent-sessions
router.get("/recent-sessions", getRecentSessions);

// GET /api/v1/dashboard/top-technologies
router.get("/top-technologies", getTopTechnologies);

// GET /api/v1/dashboard/notifications
router.get("/notifications", getRecentNotifications);

// ─── Endpoints específicos para admin ───
// GET /api/v1/dashboard/admin
router.get("/admin", onlyAdmin, getAdminDashboard);

// GET /api/v1/dashboard/recent-recruitment
router.get("/recent-recruitment", onlyAdmin, getRecentRecruitment);

// ─── Endpoints para developer ───
// GET /api/v1/dashboard/developer
router.get("/developer", getDeveloperDashboard);

export default router;