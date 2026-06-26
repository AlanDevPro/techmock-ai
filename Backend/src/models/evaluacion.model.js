// 📁 models/evaluacion.model.js
import { db } from "../config/database.js";

export const EvaluacionModel = {
  /**
   * Todas las evaluaciones para el panel admin/reclutador.
   * Trae el nombre/apellido del developer (vía sesiones_entrevista -> usuarios)
   * y la tecnología evaluada, porque el controller espera ev.nombre / ev.apellido
   * para construir usuario_nombre y usuario_initials.
   */
  async getAllAnalytics() {
    const result = await db.query(`
      SELECT
        ev.id,
        ev.sesion_id,
        ev.puntaje_total,
        ev.puntaje_javascript,
        ev.puntaje_arquitectura,
        ev.puntaje_buenas_practicas,
        ev.puntaje_comunicacion,
        ev.puntaje_resolucion,
        ev.nivel_candidato,
        ev.apto_para_contratacion,
        ev.feedback_general,
        ev.fortalezas,
        ev.areas_mejora,
        ev.resumen_para_reclutador,
        ev.generado_por_ia,
        ev.modelo_ia_usado,
        ev.tokens_evaluacion,
        ev.fecha,

        u.id   AS usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.avatar_url,

        s.tecnologia_id,
        t.nombre AS tecnologia_nombre,
        s.nivel_id,
        nd.nombre AS nivel_nombre

      FROM evaluaciones ev
      JOIN sesiones_entrevista s ON s.id = ev.sesion_id
      JOIN usuarios u            ON u.id = s.usuario_id
      LEFT JOIN tecnologias t        ON t.id = s.tecnologia_id
      LEFT JOIN niveles_dificultad nd ON nd.id = s.nivel_id

      ORDER BY ev.fecha DESC
    `);

    return result.rows;
  },

  async getById(id) {
    const result = await db.query(
      `SELECT * FROM evaluaciones WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getBySesionId(sesionId) {
    const result = await db.query(
      `SELECT * FROM evaluaciones WHERE sesion_id = $1`,
      [sesionId]
    );
    return result.rows[0] || null;
  },

  /**
   * Crea una evaluación completa para una sesión.
   * sesion_id es UNIQUE en la tabla -> una evaluación por sesión.
   */
  async create({
    sesionId,
    puntajeTotal,
    puntajeJavascript,
    puntajeArquitectura,
    puntajeBuenasPracticas,
    puntajeComunicacion,
    puntajeResolucion,
    nivelCandidato,
    aptoParaContratacion,
    feedbackGeneral,
    fortalezas,
    areasMejora,
    resumenParaReclutador,
    generadoPorIa = true,
    modeloIaUsado,
    tokensEvaluacion,
  }) {
    const result = await db.query(
      `
      INSERT INTO evaluaciones (
        sesion_id, puntaje_total, puntaje_javascript, puntaje_arquitectura,
        puntaje_buenas_practicas, puntaje_comunicacion, puntaje_resolucion,
        nivel_candidato, apto_para_contratacion, feedback_general,
        fortalezas, areas_mejora, resumen_para_reclutador,
        generado_por_ia, modelo_ia_usado, tokens_evaluacion
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
      `,
      [
        sesionId,
        puntajeTotal,
        puntajeJavascript,
        puntajeArquitectura,
        puntajeBuenasPracticas,
        puntajeComunicacion,
        puntajeResolucion,
        nivelCandidato,
        aptoParaContratacion,
        feedbackGeneral,
        fortalezas,
        areasMejora,
        resumenParaReclutador,
        generadoPorIa,
        modeloIaUsado,
        tokensEvaluacion,
      ]
    );
    return result.rows[0];
  },
};