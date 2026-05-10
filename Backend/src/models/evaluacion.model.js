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
};