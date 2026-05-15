// controllers/estadisticas.controller.js
import { EstadisticasUsuarioModel } from "../models/estadisticasUsuario.model.js";

// GET /api/v1/estadisticas/mi-perfil
export const getMisEstadisticas = async (req, res, next) => {
  try {
    const stats = await EstadisticasUsuarioModel.findByUsuarioId(req.usuario.id);
    if (!stats) {
      return res.status(404).json({ success: false, error: "Estadísticas no encontradas" });
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};