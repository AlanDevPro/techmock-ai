// models/contactoReclutamiento.model.js
import { db } from "../config/database.js";

export const ContactoReclutamientoModel = {
  async getAll() {
    const result = await db.query(`
      SELECT
        c.*,
        a.nombre || ' ' || COALESCE(a.apellido,'') AS admin_nombre,
        d.nombre || ' ' || COALESCE(d.apellido,'') AS developer_nombre,
        d.email AS developer_email
      FROM contactos_reclutamiento c
      JOIN usuarios a ON a.id = c.admin_id
      JOIN usuarios d ON d.id = c.developer_id
      ORDER BY c.fecha_envio DESC
    `);
    return result.rows;
  },

  async create({ adminId, developerId, sesionEntrevistaId, asunto, mensaje }) {
    const result = await db.query(`
      INSERT INTO contactos_reclutamiento
        (admin_id, developer_id, sesion_entrevista_id, asunto, mensaje)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [adminId, developerId, sesionEntrevistaId ?? null, asunto, mensaje]);
    return result.rows[0];
  },
};