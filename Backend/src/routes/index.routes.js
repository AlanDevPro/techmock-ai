// 📁 src/routes/index.routes.js
import { Router } from "express";

// Importación de limitadores estratégicos
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { verifyToken as authenticate } from "../middlewares/auth.middleware.js";

// ── Módulos de Rutas ────────────────────────────────────────────────────────
import authRoutes           from "./auth.routes.js";
import authProviderRoutes   from "./authProvider.routes.js";
import usuariosRoutes       from "./usuarios.routes.js";
import tecnologiasRoutes    from "./tecnologias.routes.js";
import nivelesRoutes        from "./niveles.routes.js";
import sesionesRoutes       from "./sesiones.routes.js";
import ejecucionesRoutes    from "./ejecuciones.routes.js";
import evaluacionesRoutes   from "./evaluaciones.routes.js";
import estadisticasRoutes   from "./estadisticas.routes.js";
import progresoRoutes       from './progreso.routes.js';
import adminRoutes          from "./admin.routes.js";
import notificacionesRoutes from "./notificaciones.routes.js";
import dashboardRoutes      from "./dashboard.routes.js";
import profileRoutes        from './profile.routes.js'; 
import rankingRoutes        from "./rankings.routes.js";
import rankingAdminRoutes   from "./rankingsAdmin.routes.js";

const router = Router();

// ────────────────────────────────────────────────────────────────────────────
// 1. ZONA TOTALMENTE PÚBLICA (Exenta de verifyToken global)
// ────────────────────────────────────────────────────────────────────────────
// Estas rutas manejan su propio `authLimiter` estricto internamente
router.use("/auth", authRoutes);
router.use("/auth/providers", authProviderRoutes);


// ────────────────────────────────────────────────────────────────────────────
// 2. FILTRO DE SEGURIDAD Y CONSUMO PARA RUTA PRIVADAS
// ────────────────────────────────────────────────────────────────────────────
// A partir de este punto, inyectamos consecutivamente la verificación del JWT
// y luego el limitador general. Así, `generalLimiter` siempre tendrá acceso a `req.usuario.id`.
router.use(authenticate);   // 🔐 Obliga a estar autenticado en todo lo subsecuente
router.use(generalLimiter); // 🛡️ Aplica el límite de solicitudes por ID de usuario


// ────────────────────────────────────────────────────────────────────────────
// 3. ZONA PRIVADA/PROTEGIDA (Ya cuentan con Auth y Rate Limit por ID)
// ────────────────────────────────────────────────────────────────────────────

// 👤 Usuarios y Perfil
router.use("/usuarios",        usuariosRoutes);
router.use('/profile',         profileRoutes);

// 📚 Catálogos Paramétricos
router.use("/tecnologias",     tecnologiasRoutes);
router.use("/niveles",         nivelesRoutes);

// 🎯 Flujo de Entrevistas y Métricas
router.use("/sesiones",        sesionesRoutes);
router.use("/ejecuciones",     ejecucionesRoutes);
router.use("/evaluaciones",    evaluacionesRoutes);
router.use("/estadisticas",    estadisticasRoutes);
router.use('/progreso',        progresoRoutes);
router.use('/rankings',        rankingRoutes);

// 👑 Panel Administrativo (Preguntas, Rúbricas y Gestión de Rankings)
router.use("/admin",           adminRoutes);
router.use('/admin/rankings',  rankingAdminRoutes);

// 🔔 Notificaciones y Tableros
router.use("/notificaciones",  notificacionesRoutes);
router.use("/dashboard",       dashboardRoutes);

export default router;