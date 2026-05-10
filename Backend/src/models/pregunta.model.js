// models/pregunta.model.js
import { db } from "../config/database.js";

export const PreguntaModel = {
  async findById(id) {
    const result = await db.query(
      "SELECT * FROM preguntas WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtiene una pregunta aleatoria según tecnología y nivel.
   * Usada por ia.service.js al crear una sesión.
   */
  async getAleatoriaPorTecnologiaNivel(tecnologiaId, nivelId) {
    const result = await db.query(`
      SELECT * FROM preguntas
      WHERE tecnologia_id = $1
        AND nivel_id      = $2
        AND activa        = TRUE
      ORDER BY RANDOM()
      LIMIT 1
    `, [tecnologiaId, nivelId]);
    return result.rows[0] || null;
  },

  // ── ADMIN ──────────────────────────────────────────────────────────────

  async getAll() {
    const result = await db.query(`
      SELECT p.*, t.nombre AS tecnologia, n.nombre AS nivel
      FROM preguntas p
      JOIN tecnologias t       ON t.id = p.tecnologia_id
      JOIN niveles_dificultad n ON n.id = p.nivel_id
      ORDER BY p.fecha_creacion DESC
    `);
    return result.rows;
  },

  async create({ tecnologiaId, nivelId, titulo, enunciado, tipo, tiempoEstimadoMin, generadaPorIa, promptContexto, creadaPor }) {
    const result = await db.query(`
      INSERT INTO preguntas
        (tecnologia_id, nivel_id, titulo, enunciado, tipo, tiempo_estimado_min, generada_por_ia, prompt_contexto, creada_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [tecnologiaId, nivelId, titulo, enunciado, tipo, tiempoEstimadoMin ?? 30, generadaPorIa ?? false, promptContexto ?? null, creadaPor ?? null]);
    return result.rows[0];
  },

  async update(id, fields) {
    const { titulo, enunciado, tipo, tiempoEstimadoMin, activa } = fields;
    const result = await db.query(`
      UPDATE preguntas SET
        titulo               = COALESCE($2, titulo),
        enunciado            = COALESCE($3, enunciado),
        tipo                 = COALESCE($4, tipo),
        tiempo_estimado_min  = COALESCE($5, tiempo_estimado_min),
        activa               = COALESCE($6, activa)
      WHERE id = $1
      RETURNING *
    `, [id, titulo, enunciado, tipo, tiempoEstimadoMin, activa]);
    return result.rows[0] || null;
  },

  async softDelete(id) {
    const result = await db.query(
      "UPDATE preguntas SET activa = FALSE WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  },
};