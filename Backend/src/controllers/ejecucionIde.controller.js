// controllers/ejecucionIde.controller.js
import { EjecucionIdeModel } from "../models/ejecucionIde.model.js";
import { lanzarEjecucion } from "../services/kubernetes.service.js";

// POST /api/v1/ejecuciones
export const crearEjecucion = async (req, res, next) => {
  try {
    const { sesion_id, codigo, lenguaje } = req.body;

    const ejecucion = await lanzarEjecucion({
      sesionId: sesion_id,
      envioCodigoId: null,
      codigo,
      lenguaje,
    });

    res.status(201).json({ success: true, data: ejecucion });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/ejecuciones/:id
export const getEjecucion = async (req, res, next) => {
  try {
    const ejecucion = await EjecucionIdeModel.findById(req.params.id);
    if (!ejecucion) {
      return res.status(404).json({ success: false, error: "Ejecución no encontrada" });
    }
    res.json({ success: true, data: ejecucion });
  } catch (error) {
    next(error);
  }
};