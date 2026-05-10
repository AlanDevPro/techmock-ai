// controllers/enviosCodigo.controller.js
import { EnviosCodigoModel } from "../models/enviosCodigo.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { lanzarEjecucion } from "../services/kubernetes.service.js";
import { EjecucionIdeModel } from "../models/ejecucionIde.model.js";

// GET /api/v1/sesiones/:id/codigo
export const getVersionesCodigo = async (req, res, next) => {
  try {
    const sesion = await SesionEntrevistaModel.findById(req.params.id);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id && req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }

    const versiones = await EnviosCodigoModel.getBySesion(req.params.id);
    res.json({ success: true, data: versiones });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/sesiones/:id/codigo
export const guardarCodigo = async (req, res, next) => {
  try {
    const { codigo, lenguaje, es_envio_final } = req.body;
    const sesionId = req.params.id;

    const sesion = await SesionEntrevistaModel.findById(sesionId);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }

    const envio = await EnviosCodigoModel.create({
      sesionId,
      lenguaje,
      codigo,
      esEnvioFinal: es_envio_final ?? false,
    });

    // Auto-run: lanzar ejecución K8s automáticamente
    lanzarEjecucion({
      sesionId,
      envioCodigoId: envio.id,
      codigo,
      lenguaje,
    }).catch(console.error);

    res.status(201).json({ success: true, data: envio });
  } catch (error) {
    next(error);
  }
};