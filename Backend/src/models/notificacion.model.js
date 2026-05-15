// models/notificacion.model.js
import { db } from "../config/database.js";

export const NotificacionModel = {
  async getByUsuario(usuarioId) {
    const result = await db.query(
      "SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha_creacion DESC",
      [usuarioId]
    );
    return result.rows;
  },

  async marcarLeida(id, usuarioId) {
    const result = await db.query(`
      UPDATE notificaciones SET leida = TRUE
      WHERE id = $1 AND usuario_id = $2
      RETURNING *
    `, [id, usuarioId]);
    return result.rows[0] || null;
  },

  async create({ usuarioId, tipo, titulo, mensaje, urlAccion }) {
    const result = await db.query(`
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, url_accion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [usuarioId, tipo, titulo, mensaje ?? null, urlAccion ?? null]);
    return result.rows[0];
  },
};