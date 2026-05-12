// models/contactoReclutamiento.model.js
import { db } from "../config/database.js";

export const ContactoReclutamientoModel = {
  async getAll() {
  const result = await db.query(`
    SELECT
      c.id,
      c.asunto,
      c.mensaje,
      c.estado,
      c.respuesta_developer,
      c.fecha_envio,

      d.id AS developer_id,
      d.nombre,
      d.apellido,
      d.email AS developer_email,

      t.nombre AS tecnologia,
      n.nombre AS nivel,

      e.puntaje_total AS sesion_score

    FROM contactos_reclutamiento c

    JOIN usuarios d
      ON d.id = c.developer_id

    LEFT JOIN sesiones_entrevista s
      ON s.id = c.sesion_entrevista_id

    LEFT JOIN tecnologias t
      ON t.id = s.tecnologia_id

    LEFT JOIN niveles_dificultad n
      ON n.id = s.nivel_id

    LEFT JOIN evaluaciones e
      ON e.sesion_id = s.id

    ORDER BY c.fecha_envio DESC
  `);

  return result.rows.map((r) => ({
    id: r.id,

    developer:
      `${r.nombre} ${r.apellido ?? ""}`.trim(),

    initials:
      `${r.nombre?.[0] ?? ""}${r.apellido?.[0] ?? ""}`.toUpperCase(),

    email: r.developer_email,

    asunto: r.asunto,

    estado: r.estado,

    fecha_envio: r.fecha_envio,

    tecnologia: r.tecnologia ?? "N/A",

    nivel: r.nivel ?? "N/A",

    sesion_score: r.sesion_score,

    mensaje: r.mensaje,

    respuesta: r.respuesta_developer,
  }));
}
};