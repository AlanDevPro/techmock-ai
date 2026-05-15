// models/nivelDificultad.model.js
import { db } from "../config/database.js";

export const NivelDificultadModel = {
  async getAll() {
    const result = await db.query(
      "SELECT * FROM niveles_dificultad ORDER BY multiplicador_puntaje ASC"
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      "SELECT * FROM niveles_dificultad WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },
};