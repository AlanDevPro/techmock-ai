// controllers/sesionEntrevista.controller.js
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { PreguntaModel } from "../models/pregunta.model.js";
import { TecnologiaModel } from "../models/tecnologia.model.js";
import { NivelDificultadModel } from "../models/nivelDificultad.model.js";
import { evaluarSesion } from "../services/evaluacion.service.js";
import { recalcularEstadisticas } from "../services/estadisticas.service.js";

// POST /api/v1/sesiones
export const crearSesion = async (req, res, next) => {
  try {
    const { tecnologia_id, nivel_id, tiempo_limite_segundos } = req.body;

    const tecnologia = await TecnologiaModel.findById(tecnologia_id);
    if (!tecnologia) {
      return res.status(404).json({ success: false, error: "Tecnología no encontrada" });
    }

    const nivel = await NivelDificultadModel.findById(nivel_id);
    if (!nivel) {
      return res.status(404).json({ success: false, error: "Nivel no encontrado" });
    }

    // Buscar pregunta aleatoria para esa tecnología y nivel
    const pregunta = await PreguntaModel.getAleatoriaPorTecnologiaNivel(tecnologia_id, nivel_id);
    if (!pregunta) {
      return res.status(404).json({
        success: false,
        error: "No hay preguntas disponibles para esta tecnología y nivel",
      });
    }

    const sesion = await SesionEntrevistaModel.create({
      usuarioId: req.usuario.id,
      tecnologiaId: tecnologia_id,
      nivelId: nivel_id,
      preguntaId: pregunta.id,
      tiempoLimiteSegundos: tiempo_limite_segundos ?? 3600,
      ipUsuario: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ success: true, data: { ...sesion, pregunta } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/sesiones/historial
export const getHistorial = async (req, res, next) => {
  try {
    const sesiones = await SesionEntrevistaModel.getHistorialByUsuario(req.usuario.id);
    res.json({ success: true, data: sesiones });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/sesiones/:id
export const getSesion = async (req, res, next) => {
  try {
    const sesion = await SesionEntrevistaModel.findById(req.params.id);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    // Verificar que la sesión pertenece al usuario (o es admin)
    if (sesion.usuario_id !== req.usuario.id && req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    res.json({ success: true, data: sesion });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/sesiones/:id/finalizar
export const finalizarSesion = async (req, res, next) => {
  try {
    const sesion = await SesionEntrevistaModel.findById(req.params.id);
    if (!sesion) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    if (sesion.usuario_id !== req.usuario.id) {
      return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    if (sesion.estado !== "en_progreso") {
      return res.status(400).json({ success: false, error: "La sesión no está en progreso" });
    }

    const sesionFinalizada = await SesionEntrevistaModel.finalizar(req.params.id);

    // Disparar evaluación IA y recalcular estadísticas en background
    evaluarSesion(req.params.id).catch(console.error);
    recalcularEstadisticas(req.usuario.id).catch(console.error);

    res.json({ success: true, data: sesionFinalizada });
  } catch (error) {
    next(error);
  }
};