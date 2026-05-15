// models/sesionEntrevista.model.js

import { db } from "../config/database.js";

export const SesionEntrevistaModel = {

  // ─────────────────────────────────────────────────────────────
  // OBTENER SESIÓN POR ID
  // ─────────────────────────────────────────────────────────────
  async findById(id) {
    const result = await db.query(`
      SELECT
        s.*,

        t.nombre AS tecnologia_nombre,

        n.nombre AS nivel_nombre,

        p.titulo AS pregunta_titulo,
        p.enunciado AS pregunta_enunciado,
        p.tipo AS pregunta_tipo,
        p.tiempo_estimado_min,

        -- ✅ FIX PROFESIONAL:
        -- PostgreSQL devuelve DECIMAL como string.
        -- Convertimos a FLOAT directamente en SQL.
        ev.puntaje_total::float AS puntaje_total

      FROM sesiones_entrevista s

      JOIN tecnologias t
        ON t.id = s.tecnologia_id

      JOIN niveles_dificultad n
        ON n.id = s.nivel_id

      JOIN preguntas p
        ON p.id = s.pregunta_id

      LEFT JOIN evaluaciones ev
        ON ev.sesion_id = s.id

      WHERE s.id = $1
    `, [id]);

    return result.rows[0] || null;
  },

  // ─────────────────────────────────────────────────────────────
  // CREAR SESIÓN
  // ─────────────────────────────────────────────────────────────
  async create({
    usuarioId,
    tecnologiaId,
    nivelId,
    preguntaId,
    tiempoLimiteSegundos,
    ipUsuario,
    userAgent,
  }) {

    const result = await db.query(`
      INSERT INTO sesiones_entrevista
      (
        usuario_id,
        tecnologia_id,
        nivel_id,
        pregunta_id,
        tiempo_limite_segundos,
        ip_usuario,
        user_agent
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)

      RETURNING *
    `, [
      usuarioId,
      tecnologiaId,
      nivelId,
      preguntaId,
      tiempoLimiteSegundos ?? 3600,
      ipUsuario ?? null,
      userAgent ?? null,
    ]);

    return result.rows[0];
  },

  // ─────────────────────────────────────────────────────────────
  // FINALIZAR SESIÓN
  // ─────────────────────────────────────────────────────────────
  async finalizar(id) {

    const result = await db.query(`
      UPDATE sesiones_entrevista
      SET
        estado = 'completada',
        fecha_fin = NOW(),
        duracion_segundos =
          EXTRACT(EPOCH FROM (NOW() - fecha_inicio))::INT

      WHERE id = $1
      AND estado = 'en_progreso'

      RETURNING *
    `, [id]);

    return result.rows[0] || null;
  },

  // ─────────────────────────────────────────────────────────────
  // HISTORIAL POR USUARIO
  // ─────────────────────────────────────────────────────────────
  async getHistorialByUsuario(usuarioId) {

    const result = await db.query(`
      SELECT
        s.id,
        s.estado,
        s.fecha_inicio,
        s.fecha_fin,
        s.duracion_segundos,
        s.tiempo_limite_segundos,
        s.ip_usuario,

        t.nombre AS tecnologia,
        t.icono_url,

        n.nombre AS nivel,

        p.titulo AS pregunta_titulo,

        -- ✅ FIX PROFESIONAL
        ev.puntaje_total::float AS puntaje_total

      FROM sesiones_entrevista s

      JOIN tecnologias t
        ON t.id = s.tecnologia_id

      JOIN niveles_dificultad n
        ON n.id = s.nivel_id

      JOIN preguntas p
        ON p.id = s.pregunta_id

      LEFT JOIN evaluaciones ev
        ON ev.sesion_id = s.id

      WHERE s.usuario_id = $1

      ORDER BY s.fecha_inicio DESC
    `, [usuarioId]);

    return result.rows;
  },

  // ─────────────────────────────────────────────────────────────
  // HISTORIAL GLOBAL ADMIN
  // ─────────────────────────────────────────────────────────────
  async getHistorialGlobal({
    limit = 50,
    offset = 0,
  } = {}) {

    const result = await db.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.tecnologia_id,
        s.nivel_id,
        s.pregunta_id,

        s.estado,

        s.fecha_inicio,
        s.fecha_fin,

        s.duracion_segundos,
        s.tiempo_limite_segundos,

        s.ip_usuario,
        s.user_agent,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido,

        t.nombre AS tecnologia_nombre,
        t.icono_url,

        n.nombre AS nivel_nombre,

        p.titulo AS pregunta_titulo,

        -- ✅ FIX PROFESIONAL IMPORTANTE
        -- DECIMAL -> FLOAT
        -- Evita errores con toFixed() en frontend
        ev.puntaje_total::float AS puntaje_total

      FROM sesiones_entrevista s

      JOIN usuarios u
        ON u.id = s.usuario_id

      JOIN tecnologias t
        ON t.id = s.tecnologia_id

      JOIN niveles_dificultad n
        ON n.id = s.nivel_id

      JOIN preguntas p
        ON p.id = s.pregunta_id

      LEFT JOIN evaluaciones ev
        ON ev.sesion_id = s.id

      ORDER BY s.fecha_inicio DESC

      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  },
};