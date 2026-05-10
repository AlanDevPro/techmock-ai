// controllers/evaluacion.controller.js
import { EvaluacionModel } from "../models/evaluacion.model.js";
import { DetalleEvaluacionModel } from "../models/detalleEvaluacion.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";

// GET /api/v1/evaluaciones/:sesionId
export const getEvaluacion = async (req, res, next) => {
  try {
    const sesion = await SesionEntrevistaModel.findById(req.params.sesionId);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id && req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }

    const evaluacion = await EvaluacionModel.findBySesion(req.params.sesionId);
    if (!evaluacion) {
      return res.status(404).json({ success: false, error: "Evaluación aún no disponible" });
    }

    const detalles = await DetalleEvaluacionModel.getByEvaluacion(evaluacion.id);

    res.json({ success: true, data: { ...evaluacion, detalles } });
  } catch (error) {
    next(error);
  }
};