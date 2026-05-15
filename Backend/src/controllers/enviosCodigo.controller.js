// controllers/enviosCodigo.controller.js
import { EnviosCodigoModel } from "../models/enviosCodigo.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { lanzarEjecucion } from "../services/kubernetes.service.js";
import { evaluarSesion } from "../services/evaluacion.service.js";       // 🆕
import { recalcularEstadisticas } from "../services/estadisticas.service.js"; // 🆕

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
    if (sesion.estado !== "en_progreso") {
      return res.status(400).json({ success: false, error: "La sesión no está en progreso" });
    }

    // Guardar el envío de código
    const envio = await EnviosCodigoModel.create({
      sesionId,
      lenguaje,
      codigo,
      esEnvioFinal: es_envio_final ?? false,
    });

    // Lanzar ejecución en Kubernetes (siempre, tanto para envíos parciales como final)
    const ejecucion = await lanzarEjecucion({
      sesionId,
      envioCodigoId: envio.id,
      codigo,
      lenguaje,
    }).catch((err) => {
      console.error(`[guardarCodigo] Error lanzando ejecución K8s para sesión ${sesionId}:`, err);
      return null;
    });

    // 🆕 Si es el envío final, finalizar la sesión automáticamente.
    // El developer no necesita llamar a PATCH /sesiones/:id/finalizar por separado.
    // Esto unifica el flujo: "enviar código final" = "terminar entrevista".
    let sesionFinalizada = null;
    if (es_envio_final) {
      sesionFinalizada = await SesionEntrevistaModel.finalizar(sesionId);

      // Disparar evaluación IA y recálculo de estadísticas en background
      evaluarSesion(sesionId).catch((err) =>
        console.error(`[guardarCodigo] Error evaluando sesión ${sesionId}:`, err)
      );
      recalcularEstadisticas(req.usuario.id).catch((err) =>
        console.error(`[guardarCodigo] Error recalculando stats usuario ${req.usuario.id}:`, err)
      );
    }

    res.status(201).json({
      success: true,
      data: {
        envio,
        ejecucion_id: ejecucion?.id ?? null,
        // 🆕 Si fue envío final, incluir resumen de la sesión finalizada
        ...(sesionFinalizada && {
          sesion_finalizada: {
            id: sesionFinalizada.id,
            duracion_segundos: sesionFinalizada.duracion_segundos,
            fecha_fin: sesionFinalizada.fecha_fin,
            evaluacion_estado: "procesando",
            evaluacion_url: `/api/v1/evaluaciones/${sesionId}`,
            mensaje: "Código enviado y sesión finalizada. La evaluación estará disponible en unos momentos.",
          },
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};