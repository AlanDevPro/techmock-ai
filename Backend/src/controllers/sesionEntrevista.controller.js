// controllers/sesionEntrevista.controller.js
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { PreguntaModel } from "../models/pregunta.model.js";
import { TecnologiaModel } from "../models/tecnologia.model.js";
import { NivelDificultadModel } from "../models/nivelDificultad.model.js";
import { evaluarSesion } from "../services/evaluacion.service.js";
import { recalcularEstadisticas } from "../services/estadisticas.service.js";
 // 🆕 importar servicio IA

// POST /api/v1/sesiones
export const crearSesion = async (req, res, next) => {
  try {
    const { tecnologia_id, nivel_id, tiempo_limite_segundos } = req.body;

    // Validar que existen tecnología y nivel
    const tecnologia = await TecnologiaModel.findById(tecnologia_id);
    if (!tecnologia) {
      return res.status(404).json({ success: false, error: "Tecnología no encontrada" });
    }

    const nivel = await NivelDificultadModel.findById(nivel_id);
    if (!nivel) {
      return res.status(404).json({ success: false, error: "Nivel no encontrado" });
    }

    // 🆕 PASO 1: Intentar obtener pregunta generada por IA primero.
    // Si el servicio IA falla o no está disponible, caemos al banco de preguntas
    // existente como fallback. Esto garantiza disponibilidad siempre.
    let pregunta = null;
    let preguntaGeneradaPorIa = false;

    try {
      const preguntaIA = await generarPreguntaIA({
        tecnologia,
        nivel,
        usuarioId: req.usuario.id,
      });

      if (preguntaIA) {
        // Persistir la pregunta generada por IA en la BD para historial y reutilización
        pregunta = await PreguntaModel.create({
          tecnologiaId: tecnologia_id,
          nivelId: nivel_id,
          titulo: preguntaIA.titulo,
          enunciado: preguntaIA.enunciado,
          tipo: preguntaIA.tipo ?? "practica",
          tiempoEstimadoMin: preguntaIA.tiempo_estimado_min ?? 30,
          generadaPorIa: true,
          promptContexto: preguntaIA.prompt_contexto ?? null,
          creadaPor: null, // generada por sistema, no por un admin
        });
        preguntaGeneradaPorIa = true;
      }
    } catch (iaError) {
      // IA no disponible: loguear y continuar con fallback
      console.error("[crearSesion] Error generando pregunta con IA, usando fallback:", iaError.message);
    }

    // 🆕 PASO 2: Fallback — banco de preguntas existente en BD
    if (!pregunta) {
      pregunta = await PreguntaModel.getAleatoriaPorTecnologiaNivel(tecnologia_id, nivel_id);
    }

    if (!pregunta) {
      return res.status(404).json({
        success: false,
        error: "No hay preguntas disponibles para esta tecnología y nivel. Intenta más tarde.",
      });
    }

    // PASO 3: Crear la sesión vinculando la pregunta (IA o banco)
    const sesion = await SesionEntrevistaModel.create({
      usuarioId: req.usuario.id,
      tecnologiaId: tecnologia_id,
      nivelId: nivel_id,
      preguntaId: pregunta.id,
      tiempoLimiteSegundos: tiempo_limite_segundos ?? 3600,
      ipUsuario: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: {
        ...sesion,
        pregunta,
        pregunta_generada_por_ia: preguntaGeneradaPorIa,
        // 🆕 El frontend usa fecha_inicio para arrancar el cronómetro
        fecha_inicio: sesion.fecha_inicio,
        tiempo_limite_segundos: sesion.tiempo_limite_segundos,
      },
    });
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



// GET /api/v1/sesiones/admin/historial
export const getHistorialGlobal = async (req, res, next) => {
  try {

    // opcional: seguridad admin
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Acceso denegado"
      });
    }

    const sesiones =
      await SesionEntrevistaModel.getHistorialGlobal();

    res.json({
      success: true,
      data: sesiones
    });

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

    // 🆕 Lanzar evaluación IA y recalcular estadísticas en background (fire & forget).
    // El frontend debe hacer polling a GET /api/v1/evaluaciones/:sesionId
    // hasta que el estado deje de ser 404 (evaluación lista).
    evaluarSesion(req.params.id).catch((err) =>
      console.error(`[finalizarSesion] Error evaluando sesión ${req.params.id}:`, err)
    );
    recalcularEstadisticas(req.usuario.id).catch((err) =>
      console.error(`[finalizarSesion] Error recalculando stats usuario ${req.usuario.id}:`, err)
    );

    res.json({
      success: true,
      data: {
        ...sesionFinalizada,
        // 🆕 Información explícita para el frontend sobre qué esperar a continuación
        evaluacion_estado: "procesando",
        evaluacion_url: `/api/v1/evaluaciones/${req.params.id}`,
        mensaje: "Sesión finalizada. La evaluación estará disponible en unos momentos.",
      },
    });
  } catch (error) {
    next(error);
  }
};