// routes/index.js
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import empresaRoutes from "./empresa.routes.js";
import usuariosRoutes from "./usuarios.routes.js";
import tecnologiasRoutes from "./tecnologias.routes.js";
import nivelesRoutes from "./niveles.routes.js";
import sesionesRoutes from "./sesiones.routes.js";
import ejecucionesRoutes from "./ejecuciones.routes.js";
import evaluacionesRoutes from "./evaluaciones.routes.js";
import estadisticasRoutes from "./estadisticas.routes.js";
import notificacionesRoutes from "./notificaciones.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/auth",           authRoutes);
router.use("/empresa",        empresaRoutes);
router.use("/usuarios",       usuariosRoutes);
router.use("/tecnologias",    tecnologiasRoutes);
router.use("/niveles",        nivelesRoutes);
router.use("/sesiones",       sesionesRoutes);
router.use("/ejecuciones",    ejecucionesRoutes);
router.use("/evaluaciones",   evaluacionesRoutes);
router.use("/estadisticas",   estadisticasRoutes);
router.use("/notificaciones", notificacionesRoutes);
router.use("/admin",          adminRoutes);

export default router;