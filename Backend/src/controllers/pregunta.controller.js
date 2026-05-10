// controllers/pregunta.controller.js
import { PreguntaModel } from "../models/pregunta.model.js";

// GET /api/v1/admin/preguntas
export const getPreguntas = async (req, res, next) => {
  try {
    const preguntas = await PreguntaModel.getAll();
    res.json({ success: true, data: preguntas });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/preguntas
export const crearPregunta = async (req, res, next) => {
  try {
    const {
      tecnologia_id, nivel_id, titulo, enunciado,
      tipo, tiempo_estimado_min, prompt_contexto,
    } = req.body;

    const pregunta = await PreguntaModel.create({
      tecnologiaId: tecnologia_id,
      nivelId: nivel_id,
      titulo,
      enunciado,
      tipo,
      tiempoEstimadoMin: tiempo_estimado_min,
      generadaPorIa: false,
      promptContexto: prompt_contexto,
      creadaPor: req.usuario.id,
    });

    res.status(201).json({ success: true, data: pregunta });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/admin/preguntas/:id
export const actualizarPregunta = async (req, res, next) => {
  try {
    const { titulo, enunciado, tipo, tiempo_estimado_min, activa } = req.body;
    const pregunta = await PreguntaModel.update(req.params.id, {
      titulo, enunciado, tipo,
      tiempoEstimadoMin: tiempo_estimado_min,
      activa,
    });
    if (!pregunta) {
      return res.status(404).json({ success: false, error: "Pregunta no encontrada" });
    }
    res.json({ success: true, data: pregunta });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/admin/preguntas/:id
export const eliminarPregunta = async (req, res, next) => {
  try {
    const pregunta = await PreguntaModel.softDelete(req.params.id);
    if (!pregunta) {
      return res.status(404).json({ success: false, error: "Pregunta no encontrada" });
    }
    res.json({ success: true, message: "Pregunta desactivada correctamente" });
  } catch (error) {
    next(error);
  }
};