// models/tecnologia.model.js
import { db } from "../config/database.js";

export const TecnologiaModel = {
  async getActivas() {
    const result = await db.query(
      "SELECT * FROM tecnologias WHERE activo = TRUE ORDER BY nombre ASC"
    );
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