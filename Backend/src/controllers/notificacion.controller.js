// controllers/notificacion.controller.js
import { NotificacionModel } from "../models/notificacion.model.js";

// GET /api/v1/notificaciones
export const getMisNotificaciones = async (req, res, next) => {
  try {
    const notificaciones = await NotificacionModel.getByUsuario(req.usuario.id);
    res.json({ success: true, data: notificaciones });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notificaciones/:id/leer
export const marcarLeida = async (req, res, next) => {
  try {
    const notificacion = await NotificacionModel.marcarLeida(req.params.id, req.usuario.id);
    if (!notificacion) {
      return res.status(404).json({ success: false, error: "Notificación no encontrada" });
    }
    res.json({ success: true, data: notificacion });
  } catch (error) {
    next(error);
  }
};