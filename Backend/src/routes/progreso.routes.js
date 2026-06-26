// src/routes/progreso.routes.js
import { Router } from 'express';
import { 
    obtenerProgresoCompleto,
    obtenerProgresoTecnologia,
    obtenerEstadisticas,
    getTodasTecnologias,
    getSesionesRecientes,
    getEstadisticasGlobales
} from '../controllers/progreso.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ✅ Todas las rutas requieren autenticación
router.use(verifyToken);

// ✅ RUTA RAÍZ - Progreso completo del usuario (TODAS las tecnologías)
router.get('/', obtenerProgresoCompleto);

// ✅ RUTA USUARIO - Alias de la ruta raíz (para compatibilidad)
router.get('/usuario', obtenerProgresoCompleto);

// ✅ RUTA TECNOLOGÍA - Progreso de una tecnología específica por SLUG
router.get('/tecnologia/:slug', obtenerProgresoTecnologia);

// ✅ RUTA TECNOLOGÍAS - Resumen de todas las tecnologías del usuario
router.get('/tecnologias', getTodasTecnologias);

// ✅ RUTA SESIONES RECIENTES - Últimas sesiones del usuario
router.get('/sesiones-recientes', getSesionesRecientes);

// ✅ RUTA ESTADÍSTICAS - Estadísticas generales del usuario
router.get('/estadisticas', obtenerEstadisticas);

// ✅ RUTA ESTADÍSTICAS GLOBALES - Alias de estadísticas (para compatibilidad)
router.get('/estadisticas-globales', getEstadisticasGlobales);

export default router;