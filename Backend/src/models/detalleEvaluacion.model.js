// models/detalleEvaluacion.model.js
import { db } from "../config/database.js";

export const DetalleEvaluacionModel = {
  async getByEvaluacion(evaluacionId) {
    const result = await db.query(`
      SELECT d.*, r.nombre AS rubrica_nombre, r.peso_porcentual
      FROM detalle_evaluacion d
      JOIN rubricas r ON r.id = d.rubrica_id
      WHERE d.evaluacion_id = $1
      ORDER BY r.id ASC
    `, [evaluacionId]);
    return result.rows;
  },

  /**
   * Inserta múltiples detalles en una sola transacción.
   * detalles: [{ rubricaId, puntaje, comentario }]
   */
  async createMany(evaluacionId, detalles) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const inserted = [];
      for (const d of detalles) {
        const r = await client.query(`
          INSERT INTO detalle_evaluacion (evaluacion_id, rubrica_id, puntaje, comentario)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (evaluacion_id, rubrica_id) DO UPDATE SET
            puntaje    = EXCLUDED.puntaje,
            comentario = EXCLUDED.comentario
          RETURNING *
        `, [evaluacionId, d.rubricaId, d.puntaje, d.comentario ?? null]);
        inserted.push(r.rows[0]);
      }
      await client.query("COMMIT");
      return inserted;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};