// models/empresa.model.js
import { db } from "../config/database.js";

export const EmpresaModel = {
  async getEmpresa() {
    const result = await db.query("SELECT * FROM empresa LIMIT 1");
    return result.rows[0] || null;
  },
};