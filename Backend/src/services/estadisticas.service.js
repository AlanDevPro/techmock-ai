// services/estadisticas.service.js
import { EstadisticasUsuarioModel } from "../models/estadisticasUsuario.model.js";

/**
 * Recalcula todas las estadísticas agregadas de un usuario.
 * Se llama al finalizar una sesión y después de guardar una evaluación.
 */
export async function recalcularEstadisticas(usuarioId) {
  console.log(`📈 [STATS] Recalculando estadísticas para usuario: ${usuarioId}`);
  try {
    const stats = await EstadisticasUsuarioModel.recalcular(usuarioId);
    console.log(`✅ [STATS] Estadísticas actualizadas:`, {
      total_entrevistas:       stats.total_entrevistas,
      entrevistas_finalizadas: stats.entrevistas_finalizadas,
      puntaje_promedio:        stats.puntaje_promedio,
      mejor_puntaje:           stats.mejor_puntaje,
    });
    return stats;
  } catch (error) {
    console.error(`❌ [STATS] Error al recalcular estadísticas:`, error.message);
    throw error;
  }
}