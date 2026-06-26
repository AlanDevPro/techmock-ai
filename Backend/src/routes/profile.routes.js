// 📁 src/routes/profile.routes.js
import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  getPerfilCompleto,
  getEstadisticas,
  getPerfilTecnico,
  getSesionesRecientes,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas
} from '../controllers/profile.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Perfil completo
router.get('/completo', getPerfilCompleto);

// Estadísticas
router.get('/estadisticas', getEstadisticas);

// Perfil técnico
router.get('/perfil-tecnico', getPerfilTecnico);

// Sesiones recientes
router.get('/sesiones', getSesionesRecientes);

// Notificaciones
router.get('/notificaciones', getNotificaciones);
router.patch('/notificaciones/:id/leer', marcarNotificacionLeida);
router.patch('/notificaciones/leer-todas', marcarTodasNotificacionesLeidas);

export default router;