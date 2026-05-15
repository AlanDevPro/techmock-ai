// models/evaluacion.model.js
import { db } from "../config/database.js";

export const EvaluacionModel = {
  async findBySesion(sesionId) {
    const result = await db.query(
      "SELECT * FROM evaluaciones WHERE sesion_id = $1",
      [sesionId]
    );
    return result.rows[0] || null;
  },

  async create({ sesionId, puntajeTotal, feedbackGeneral, fortalezas,AreasMejora, sugerenciasRecursos, modeloIaUsado, tokensEvaluacion }) {
    const result = await db.query(`
      INSERT INTO evaluaciones
        (sesion_id, puntaje_total, feedback_general, fortalezas, areas_mejora, sugerencias_recursos,
         generado_por_ia, modelo_ia_usado, tokens_evaluacion)
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8)
      RETURNING *
    `, [sesionId, puntajeTotal, feedbackGeneral, fortalezas,AreasMejora, sugerenciasRecursos, modeloIaUsado, tokensEvaluacion]);
    return result.rows[0];
  },

  async getAllAnalytics() {
  const result = await db.query(`
    SELECT
      e.id,
      e.sesion_id,

      e.puntaje_total::float,
      e.feedback_general,
      e.fortalezas,
      e.areas_mejora,
      e.sugerencias_recursos,

      e.generado_por_ia,
      e.modelo_ia_usado,
      e.tokens_evaluacion,

      e.fecha,

      u.nombre,
      u.apellido,

      t.nombre AS tecnologia,
      n.nombre AS nivel

    FROM evaluaciones e

    JOIN sesiones_entrevista s
      ON s.id = e.sesion_id

    JOIN usuarios u
      ON u.id = s.usuario_id

    JOIN tecnologias t
      ON t.id = s.tecnologia_id

    JOIN niveles_dificultad n
      ON n.id = s.nivel_id

    ORDER BY e.fecha DESC
  `);

  return result.rows;
},
};