// 📁 models/detalleEvaluacion.model.js
import { db } from "../config/database.js";

export const DetalleEvaluacionModel = {
  /**
   * Detalle por rúbrica de una evaluación específica.
   * La tabla real es "detalle_evaluacion" (singular), no "detalles_evaluacion".
   * Hace join con rubricas para traer nombre y peso_porcentual,
   * útil para mostrar el desglose en el panel admin.
   */
  async getByEvaluacion(evaluacionId) {
    const result = await db.query(
      `
      SELECT
        de.id,
        de.evaluacion_id,
        de.rubrica_id,
        de.puntaje,
        de.comentario,
        r.nombre          AS rubrica_nombre,
        r.descripcion     AS rubrica_descripcion,
        r.peso_porcentual AS rubrica_peso
      FROM detalle_evaluacion de
      JOIN rubricas r ON r.id = de.rubrica_id
      WHERE de.evaluacion_id = $1
      ORDER BY r.peso_porcentual DESC
      `,
      [evaluacionId]
    );
    return result.rows;
  },

  /**
   * Crea o actualiza el puntaje de una rúbrica para una evaluación.
   * Aprovecha el UNIQUE (evaluacion_id, rubrica_id) del esquema.
   */
  async upsert({ evaluacionId, rubricaId, puntaje, comentario }) {
    const result = await db.query(
      `
      INSERT INTO detalle_evaluacion (evaluacion_id, rubrica_id, puntaje, comentario)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (evaluacion_id, rubrica_id) DO UPDATE SET
        puntaje    = EXCLUDED.puntaje,
        comentario = EXCLUDED.comentario
      RETURNING *
      `,
      [evaluacionId, rubricaId, puntaje, comentario]
    );
    return result.rows[0];
  },

  async deleteByEvaluacion(evaluacionId) {
    await db.query(
      `DELETE FROM detalle_evaluacion WHERE evaluacion_id = $1`,
      [evaluacionId]
    );
  },
};