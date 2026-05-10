// models/estadisticasUsuario.model.js
import { db } from "../config/database.js";

export const EstadisticasUsuarioModel = {
  async findByUsuarioId(usuarioId) {
    const result = await db.query(
      "SELECT * FROM estadisticas_usuario WHERE usuario_id = $1",
      [usuarioId]
    );
    return result.rows[0] || null;
  },

  async initIfNotExists(usuarioId) {
    const result = await db.query(`
      INSERT INTO estadisticas_usuario (usuario_id)
      VALUES ($1)
      ON CONFLICT (usuario_id) DO NOTHING
      RETURNING *
    `, [usuarioId]);
    return result.rows[0] || null;
  },

  /**
   * Recalcula todas las estadísticas del usuario desde cero.
   * Se llama al finalizar una sesión.
   */
  async recalcular(usuarioId) {
    const result = await db.query(`
      UPDATE estadisticas_usuario SET
        total_entrevistas        = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1),
        entrevistas_finalizadas  = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1 AND estado = 'finalizada'),
        entrevistas_abandonadas  = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1 AND estado = 'abandonada'),
        puntaje_promedio         = (
          SELECT ROUND(AVG(ev.puntaje_total)::numeric, 2)
          FROM evaluaciones ev
          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
          WHERE s.usuario_id = $1
        ),
        mejor_puntaje            = (
          SELECT MAX(ev.puntaje_total)
          FROM evaluaciones ev
          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
          WHERE s.usuario_id = $1
        ),
        peor_puntaje             = (
          SELECT MIN(ev.puntaje_total)
          FROM evaluaciones ev
          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
          WHERE s.usuario_id = $1
        ),
        tiempo_promedio_segundos = (
          SELECT ROUND(AVG(duracion_segundos))
          FROM sesiones_entrevista
          WHERE usuario_id = $1 AND estado = 'finalizada' AND duracion_segundos IS NOT NULL
        ),
        tecnologia_favorita_id   = (
          SELECT tecnologia_id FROM sesiones_entrevista
          WHERE usuario_id = $1
          GROUP BY tecnologia_id
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        ultima_entrevista_fecha  = (
          SELECT MAX(fecha_inicio) FROM sesiones_entrevista WHERE usuario_id = $1
        ),
        fecha_actualizacion      = NOW()
      WHERE usuario_id = $1
      RETURNING *
    `, [usuarioId]);
    return result.rows[0] || null;
  },

  async getDashboardAdmin() {
    const result = await db.query(`
      SELECT
        COUNT(DISTINCT u.id)                                          AS total_developers,
        COUNT(DISTINCT s.id)                                          AS total_sesiones,
        COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'finalizada')  AS sesiones_finalizadas,
        ROUND(AVG(ev.puntaje_total)::numeric, 2)                      AS puntaje_promedio_global,
        COUNT(DISTINCT s.id) FILTER (WHERE s.fecha_inicio >= NOW() - INTERVAL '30 days') AS sesiones_ultimo_mes
      FROM usuarios u
      LEFT JOIN sesiones_entrevista s  ON s.usuario_id    = u.id
      LEFT JOIN evaluaciones ev        ON ev.sesion_id    = s.id
      WHERE u.rol = 'developer'
    `);
    return result.rows[0];
  },
};