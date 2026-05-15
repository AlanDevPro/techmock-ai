// models/enviosCodigo.model.js
import { db } from "../config/database.js";

export const EnviosCodigoModel = {
  async getBySesion(sesionId) {
    const result = await db.query(
      "SELECT * FROM envios_codigo WHERE sesion_id = $1 ORDER BY version ASC",
      [sesionId]
    );
    return result.rows;
  },

  async getUltimoBySesion(sesionId) {
    const result = await db.query(
      "SELECT * FROM envios_codigo WHERE sesion_id = $1 ORDER BY version DESC LIMIT 1",
      [sesionId]
    );
    return result.rows[0] || null;
  },

  async create({ sesionId, lenguaje, codigo, esEnvioFinal }) {
    // Calcular número de versión automáticamente
    const versionResult = await db.query(
      "SELECT COALESCE(MAX(version), 0) + 1 AS siguiente FROM envios_codigo WHERE sesion_id = $1",
      [sesionId]
    );
    const version = versionResult.rows[0].siguiente;

    const result = await db.query(`
      INSERT INTO envios_codigo (sesion_id, lenguaje, codigo, es_envio_final, version)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [sesionId, lenguaje, codigo, esEnvioFinal ?? false, version]);
    return result.rows[0];
  },
};