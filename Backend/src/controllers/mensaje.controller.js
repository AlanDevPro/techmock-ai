// controllers/mensaje.controller.js
import { MensajeModel } from "../models/mensaje.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { chatConIA } from "../services/ia.service.js";

// GET /api/v1/sesiones/:id/mensajes
export const getMensajes = async (req, res, next) => {
  try {
    const sesion = await SesionEntrevistaModel.findById(req.params.id);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id && req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }

    const mensajes = await MensajeModel.getBySesion(req.params.id);
    res.json({ success: true, data: mensajes });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/sesiones/:id/mensajes
export const enviarMensaje = async (req, res, next) => {
  try {
    const { contenido } = req.body;
    const sesionId = req.params.id;

    const sesion = await SesionEntrevistaModel.findById(sesionId);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    if (sesion.estado !== "en_progreso") {
      return res.status(400).json({ success: false, error: "La sesión no está activa" });
    }

    // Guardar mensaje del usuario
    await MensajeModel.create({ sesionId, rol: "user", contenido });

    // Obtener historial para contexto IA
    const historial = await MensajeModel.getBySesion(sesionId);

    // Llamar a la IA
    const { respuesta, tokensUsados } = await chatConIA({
      sesion,
      historial,
      mensajeUsuario: contenido,
    });

    // Guardar respuesta de la IA
    const mensajeIA = await MensajeModel.create({
      sesionId,
      rol: "assistant",
      contenido: respuesta,
      tokensUsados,
    });

    res.status(201).json({ success: true, data: mensajeIA });
  } catch (error) {
    next(error);
  }
};