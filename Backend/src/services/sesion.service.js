// services/sesion.service.js
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { EstadisticasUsuarioModel } from "../models/estadisticasUsuario.model.js";
import { evaluarSesion } from "./evaluacion.service.js";
import { crearNotificacion } from "./notificacion.service.js";

// Mapa en memoria de timeouts activos: sesionId → TimeoutHandle
const timeoutsActivos = new Map();

/**
 * Programa el cierre automático de una sesión cuando se agota el tiempo.
 * Se llama al crear una sesión.
 */
export function programarTimeoutSesion(sesionId, tiempoLimiteSegundos) {
  if (timeoutsActivos.has(sesionId)) return; // ya programado

  const ms = tiempoLimiteSegundos * 1000;

  const handle = setTimeout(async () => {
    console.log(`⏰ [SESION] Timeout alcanzado para sesión: ${sesionId}`);
    try {
      await finalizarSesionPorTimeout(sesionId);
    } catch (error) {
      console.error(`❌ [SESION] Error al finalizar por timeout:`, error.message);
    } finally {
      timeoutsActivos.delete(sesionId);
    }
  }, ms);

  timeoutsActivos.set(sesionId, handle);
  console.log(`⏱️ [SESION] Timeout programado: ${sesionId} → ${tiempoLimiteSegundos}s`);
}

/**
 * Cancela el timeout si el usuario finaliza la sesión manualmente.
 */
export function cancelarTimeoutSesion(sesionId) {
  if (timeoutsActivos.has(sesionId)) {
    clearTimeout(timeoutsActivos.get(sesionId));
    timeoutsActivos.delete(sesionId);
    console.log(`✅ [SESION] Timeout cancelado para sesión: ${sesionId}`);
  }
}

/**
 * Cierra una sesión por timeout: la marca como 'abandonada'
 * y dispara la evaluación si hay código enviado.
 */
async function finalizarSesionPorTimeout(sesionId) {
  const sesion = await SesionEntrevistaModel.findById(sesionId);
  if (!sesion || sesion.estado !== "en_progreso") return;

  // Marcar como abandonada por timeout
  await SesionEntrevistaModel.finalizar(sesionId);

  // Notificar al usuario
  await crearNotificacion({
    usuarioId:  sesion.usuario_id,
    tipo:       "sesion_timeout",
    titulo:     "Tu sesión de entrevista finalizó por tiempo",
    mensaje:    `La sesión de ${sesion.tecnologia_nombre} (${sesion.nivel_nombre}) se cerró automáticamente`,
    urlAccion:  `/sesiones/${sesionId}`,
  });

  // Intentar evaluar si hay código
  evaluarSesion(sesionId).catch((err) =>
    console.error(`❌ [SESION] Error en evaluación post-timeout:`, err.message)
  );

  console.log(`🔒 [SESION] Sesión ${sesionId} finalizada por timeout`);
}

/**
 * Devuelve cuántos segundos quedan en una sesión activa.
 * Útil para el frontend (polling o SSE).
 */
export async function getTiempoRestante(sesionId) {
  const sesion = await SesionEntrevistaModel.findById(sesionId);
  if (!sesion || sesion.estado !== "en_progreso") return 0;

  const inicio     = new Date(sesion.fecha_inicio).getTime();
  const limite     = sesion.tiempo_limite_segundos * 1000;
  const transcurrido = Date.now() - inicio;
  const restante   = Math.max(0, Math.floor((limite - transcurrido) / 1000));

  return restante;
}