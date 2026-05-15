import { db } from "../config/database.js";

export const TecnologiaModel = {
  async getActivas() {
    const result = await db.query(`
      SELECT 
        t.*,
        COUNT(DISTINCT s.id) AS sesiones,
        COALESCE(AVG(e.puntaje_total), 0) AS avg_score
      FROM tecnologias t
      LEFT JOIN sesiones_entrevista s 
        ON s.tecnologia_id = t.id
      LEFT JOIN evaluaciones e 
        ON e.sesion_id = s.id
      WHERE t.activo = TRUE
      GROUP BY t.id
      ORDER BY t.nombre ASC
    `);

    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      "SELECT * FROM tecnologias WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },
};