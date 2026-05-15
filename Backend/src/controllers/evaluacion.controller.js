// controllers/evaluacion.controller.js
import { EvaluacionModel } from "../models/evaluacion.model.js";
import { DetalleEvaluacionModel } from "../models/detalleEvaluacion.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { MensajeModel } from "../models/mensaje.model.js"; // 🆕 para el feedback como mensaje

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

    // 🆕 Si la sesión aún está en progreso, la evaluación no puede existir todavía
    if (sesion.estado === "en_progreso") {
      return res.status(400).json({
        success: false,
        error: "La sesión aún está en progreso. Finaliza la sesión para obtener la evaluación.",
      });
    }

    const evaluacion = await EvaluacionModel.findBySesion(req.params.sesionId);

    // 🆕 Respuesta diferenciada: procesando vs lista.
    // El frontend hace polling cada N segundos hasta que estado === "lista".
    if (!evaluacion) {
      return res.status(202).json({
        success: true,
        data: {
          estado: "procesando",
          mensaje: "La evaluación está siendo generada por la IA. Consulta nuevamente en unos segundos.",
        },
      });
    }

    const detalles = await DetalleEvaluacionModel.getByEvaluacion(evaluacion.id);

    // 🆕 Adjuntar el mensaje de feedback enviado al usuario durante la sesión,
    // para que el frontend pueda mostrarlo junto con la evaluación sin una
    // llamada extra. Solo tomamos el último mensaje del assistant (feedback final).
    let mensajeFeedback = null;
    try {
      const mensajes = await MensajeModel.getBySesion(req.params.sesionId);
      const mensajesIA = mensajes.filter((m) => m.rol === "assistant");
      if (mensajesIA.length > 0) {
        mensajeFeedback = mensajesIA[mensajesIA.length - 1].contenido;
      }
    } catch {
      // No es crítico si falla, la evaluación igual se retorna
    }

    res.json({
      success: true,
      data: {
        estado: "lista",
        evaluacion: {
          ...evaluacion,
          detalles,
        },
        // 🆕 Resumen ejecutivo para mostrar en pantalla de resultados
        resumen: {
          puntaje_total: evaluacion.puntaje_total,
          duracion_segundos: sesion.duracion_segundos,
          tecnologia: sesion.tecnologia_id,
          nivel: sesion.nivel_id,
          fortalezas: evaluacion.fortalezas,
          areas_mejora: evaluacion.areas_mejora,
          sugerencias_recursos: evaluacion.sugerencias_recursos,
          feedback_mensaje: mensajeFeedback,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};