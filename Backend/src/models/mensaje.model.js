// models/mensaje.model.js
import { db } from "../config/database.js";

export const MensajeModel = {
  async getBySesion(sesionId) {
    const result = await db.query(
      "SELECT * FROM mensajes WHERE sesion_id = $1 ORDER BY fecha ASC",
      [sesionId]
    );
    return result.rows;
  },

  async create({ sesionId, rol, contenido, tokensUsados }) {
    const result = await db.query(`
      INSERT INTO mensajes (sesion_id, rol, contenido, tokens_usados)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [sesionId, rol, contenido, tokensUsados ?? null]);
    return result.rows[0];
  },
};