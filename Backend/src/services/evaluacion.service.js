// services/evaluacion.service.js
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { EnviosCodigoModel } from "../models/enviosCodigo.model.js";
import { EvaluacionModel } from "../models/evaluacion.model.js";
import { DetalleEvaluacionModel } from "../models/detalleEvaluacion.model.js";
import { RubricaModel } from "../models/rubrica.model.js";
import { evaluarCodigoConIA } from "./ia.service.js";
import { recalcularEstadisticas } from "./estadisticas.service.js";
import { crearNotificacion } from "./notificacion.service.js";

/**
 * Orquesta la evaluación completa de una sesión:
 * 1. Obtiene el último código enviado
 * 2. Llama a la IA con las rúbricas activas
 * 3. Guarda evaluación + detalles en PostgreSQL
 * 4. Recalcula estadísticas del usuario
 * 5. Notifica al usuario
 */
export async function evaluarSesion(sesionId) {
  console.log(`📊 [EVALUACION] Iniciando evaluación para sesión: ${sesionId}`);

  try {
    // 1. Obtener datos completos de la sesión
    const sesion = await SesionEntrevistaModel.findById(sesionId);
    if (!sesion) throw new Error(`Sesión ${sesionId} no encontrada`);

    // 2. Obtener el último código enviado
    const ultimoCodigo = await EnviosCodigoModel.getUltimoBySesion(sesionId);
    if (!ultimoCodigo) {
      console.warn(`⚠️ [EVALUACION] Sesión ${sesionId} sin código enviado — evaluación omitida`);
      return null;
    }

    // 3. Obtener rúbricas activas para la evaluación
    const rubricas = await RubricaModel.getActivas();
    if (rubricas.length === 0) throw new Error("No hay rúbricas activas configuradas");

    // 4. Evaluar con IA
    console.log(`🤖 [EVALUACION] Llamando a IA para sesión ${sesionId}...`);
    const { evaluacion: resultadoIA, tokensUsados, modeloUsado } = await evaluarCodigoConIA({
      sesion,
      codigo: ultimoCodigo.codigo,
      lenguaje: ultimoCodigo.lenguaje,
      rubricas,
    });

    // 5. Guardar evaluación principal
    const evaluacionGuardada = await EvaluacionModel.create({
      sesionId,
      puntajeTotal:        resultadoIA.puntaje_total,
      feedbackGeneral:     resultadoIA.feedback_general,
      fortalezas:          resultadoIA.fortalezas,
      AreasMejora:         resultadoIA.areas_mejora,
      sugerenciasRecursos: resultadoIA.sugerencias_recursos,
      modeloIaUsado:       modeloUsado,
      tokensEvaluacion:    tokensUsados,
    });

    // 6. Guardar detalles por rúbrica
    const detalles = resultadoIA.detalles.map((d) => {
      const rubrica = rubricas.find((r) => r.nombre === d.rubrica_nombre);
      return {
        rubricaId:  rubrica?.id,
        puntaje:    d.puntaje,
        comentario: d.comentario,
      };
    }).filter((d) => d.rubricaId); // descartar si no matchea

    await DetalleEvaluacionModel.createMany(evaluacionGuardada.id, detalles);

    console.log(`✅ [EVALUACION] Evaluación guardada con puntaje: ${resultadoIA.puntaje_total}`);

    // 7. Recalcular estadísticas del usuario
    await recalcularEstadisticas(sesion.usuario_id);

    // 8. Notificar al usuario
    await crearNotificacion({
      usuarioId:  sesion.usuario_id,
      tipo:       "evaluacion_lista",
      titulo:     "Tu evaluación está lista",
      mensaje:    `Obtuviste ${resultadoIA.puntaje_total} puntos en tu entrevista de ${sesion.tecnologia_nombre}`,
      urlAccion:  `/evaluaciones/${sesionId}`,
    });

    return evaluacionGuardada;
  } catch (error) {
    console.error(`❌ [EVALUACION] Error al evaluar sesión ${sesionId}:`, error.message);
    throw error;
  }
}