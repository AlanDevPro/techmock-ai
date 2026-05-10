// services/notificacion.service.js
import { NotificacionModel } from "../models/notificacion.model.js";

/**
 * Crea una notificación persistente en base de datos.
 * Llamada desde evaluacion.service y admin.controller.
 */
export async function crearNotificacion({ usuarioId, tipo, titulo, mensaje, urlAccion }) {
  console.log(`🔔 [NOTIF] Creando notificación para usuario ${usuarioId}: ${titulo}`);
  try {
    const notificacion = await NotificacionModel.create({
      usuarioId,
      tipo,
      titulo,
      mensaje:    mensaje ?? null,
      urlAccion:  urlAccion ?? null,
    });
    console.log(`✅ [NOTIF] Notificación creada con id: ${notificacion.id}`);
    return notificacion;
  } catch (error) {
    // Las notificaciones no deben bloquear el flujo principal
    console.error(`❌ [NOTIF] Error al crear notificación:`, error.message);
  }
}