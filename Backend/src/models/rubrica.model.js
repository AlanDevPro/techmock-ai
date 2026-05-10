// models/rubrica.model.js
import { db } from "../config/database.js";

export const RubricaModel = {
  async getActivas() {
    const result = await db.query(
      "SELECT * FROM rubricas WHERE activa = TRUE ORDER BY id ASC"
    );
    return result.rows;
  },

  async getAll() {
    const result = await db.query("SELECT * FROM rubricas ORDER BY id ASC");
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      "SELECT * FROM rubricas WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ nombre, descripcion, pesoPorcentual }) {
    const result = await db.query(`
      INSERT INTO rubricas (nombre, descripcion, peso_porcentual)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [nombre, descripcion, pesoPorcentual]);
    return result.rows[0];
  },

  async update(id, { nombre, descripcion, pesoPorcentual, activa }) {
    const result = await db.query(`
      UPDATE rubricas SET
        nombre           = COALESCE($2, nombre),
        descripcion      = COALESCE($3, descripcion),
        peso_porcentual  = COALESCE($4, peso_porcentual),
        activa           = COALESCE($5, activa)
      WHERE id = $1
      RETURNING *
    `, [id, nombre, descripcion, pesoPorcentual, activa]);
    return result.rows[0] || null;
  },
};