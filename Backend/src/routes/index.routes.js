// routes/index.js
import { Router } from "express";

// ── Rutas públicas / auth ──────────────────────────────────────────────────
import authRoutes        from "./auth.routes.js";
import authProviderRoutes from "./authProvider.routes.js";

// ── Recursos generales (requieren token) ──────────────────────────────────
import usuariosRoutes    from "./usuarios.routes.js";
import tecnologiasRoutes from "./tecnologias.routes.js";
import nivelesRoutes     from "./niveles.routes.js";

// ── Flujo de entrevista ───────────────────────────────────────────────────
import sesionesRoutes    from "./sesiones.routes.js";
import ejecucionesRoutes from "./ejecuciones.routes.js";
import evaluacionesRoutes from "./evaluaciones.routes.js";
import estadisticasRoutes from "./estadisticas.routes.js";

// ── Panel admin ───────────────────────────────────────────────────────────
import adminRoutes       from "./admin.routes.js";         // /admin/preguntas, /admin/rubricas

// ── Otros ─────────────────────────────────────────────────────────────────
import notificacionesRoutes from "./notificaciones.routes.js";

import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

// 🔐 Auth
router.use("/auth",            authRoutes);
router.use("/auth/providers",  authProviderRoutes);

// 👤 Usuarios
router.use("/usuarios",        usuariosRoutes);

// 📚 Catálogos
router.use("/tecnologias",     tecnologiasRoutes);
router.use("/niveles",         nivelesRoutes);

// 🎯 Flujo entrevista
router.use("/sesiones",        sesionesRoutes);
router.use("/ejecuciones",     ejecucionesRoutes);
router.use("/evaluaciones",    evaluacionesRoutes);
router.use("/estadisticas",    estadisticasRoutes);

// 👑 Admin (preguntas, rúbricas, etc.)
router.use("/admin",           adminRoutes);

// 🔔 Notificaciones
router.use("/notificaciones",  notificacionesRoutes);

// 📊 Dashboard
router.use("/dashboard", dashboardRoutes);

export default router;