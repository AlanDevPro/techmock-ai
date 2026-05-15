import { db } from "../config/database.js";

export const DashboardModel = {

  async getStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE activo = true) AS active_users,
        (
          SELECT COUNT(*)
          FROM sesiones_entrevista
          WHERE DATE(fecha_inicio) = CURRENT_DATE
        ) AS today_interviews,
        (
          SELECT COUNT(*)
          FROM preguntas
        ) AS questions_count,
        (
          SELECT ROUND(AVG(puntaje_total)::numeric, 2)::float
          FROM evaluaciones
        ) AS average_score
      FROM usuarios
      WHERE rol = 'developer'
    `);
    return result.rows[0];
  },

  async getRecentSessions() {
    const result = await db.query(`
      SELECT
        s.id,
        CONCAT(u.nombre, ' ', u.apellido) AS user_name,
        CONCAT(
          LEFT(u.nombre,1),
          LEFT(u.apellido,1)
        ) AS initials,
        t.nombre AS tech,
        n.nombre AS level,
        ev.puntaje_total::float AS score,
        s.estado,
        s.fecha_inicio
      FROM sesiones_entrevista s
      JOIN usuarios u
        ON u.id = s.usuario_id
      JOIN tecnologias t
        ON t.id = s.tecnologia_id
      JOIN niveles_dificultad n
        ON n.id = s.nivel_id
      LEFT JOIN evaluaciones ev
        ON ev.sesion_id = s.id
      ORDER BY s.fecha_inicio DESC
      LIMIT 10
    `);
    return result.rows;
  },

  async getTopTechnologies() {
    const result = await db.query(`
      SELECT
        t.nombre,
        COUNT(s.id) AS sessions,
        ROUND(AVG(ev.puntaje_total)::numeric, 2) AS avg
      FROM tecnologias t
      LEFT JOIN sesiones_entrevista s
        ON s.tecnologia_id = t.id
      LEFT JOIN evaluaciones ev
        ON ev.sesion_id = s.id
      GROUP BY t.id
      ORDER BY sessions DESC
      LIMIT 5
    `);
    return result.rows;
  },

  // 🆕 ENDPOINT 1: Reclutamiento reciente
  async getRecentRecruitment() {
    const result = await db.query(`
      SELECT
        c.id,
        CONCAT(u.nombre, ' ', u.apellido) AS developer,
        LEFT(u.nombre,1) || LEFT(u.apellido,1) AS initials,
        c.asunto,
        c.estado,
        c.fecha_envio,
        CASE 
          WHEN c.fecha_envio >= NOW() - INTERVAL '1 hour' THEN 'hace ' || EXTRACT(HOUR FROM (NOW() - c.fecha_envio)) || ' h'
          WHEN c.fecha_envio >= NOW() - INTERVAL '1 day' THEN 'hace ' || EXTRACT(HOUR FROM (NOW() - c.fecha_envio)) || ' h'
          ELSE 'hace ' || EXTRACT(DAY FROM (NOW() - c.fecha_envio)) || ' días'
        END AS time_ago
      FROM contactos_reclutamiento c
      JOIN usuarios u
        ON u.id = c.developer_id
      ORDER BY c.fecha_envio DESC
      LIMIT 5
    `);
    return result.rows;
  },

  // 🆕 ENDPOINT 2: Notificaciones recientes por usuario
  async getRecentNotifications(usuarioId) {
    const result = await db.query(`
      SELECT
        id,
        tipo,
        titulo,
        mensaje,
        leida,
        url_accion,
        fecha_creacion,
        CASE 
          WHEN fecha_creacion >= NOW() - INTERVAL '1 hour' THEN 'hace ' || EXTRACT(HOUR FROM (NOW() - fecha_creacion)) || ' h'
          WHEN fecha_creacion >= NOW() - INTERVAL '1 day' THEN 'hace ' || EXTRACT(HOUR FROM (NOW() - fecha_creacion)) || ' h'
          ELSE 'hace ' || EXTRACT(DAY FROM (NOW() - fecha_creacion)) || ' días'
        END AS time_ago
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY fecha_creacion DESC
      LIMIT 5
    `, [usuarioId]);
    return result.rows;
  },

  // 🆕 EXTRA: Dashboard completo para admin (una sola llamada)
  async getAdminDashboard() {
    const [stats, recentSessions, topTechs, recentRecruitment] = await Promise.all([
      this.getStats(),
      this.getRecentSessions(),
      this.getTopTechnologies(),
      this.getRecentRecruitment()
    ]);

    return {
      stats,
      recent_sessions: recentSessions,
      top_technologies: topTechs,
      recent_recruitment: recentRecruitment
    };
  },

  // 🆕 EXTRA: Dashboard completo para developer
  async getDeveloperDashboard(usuarioId) {
    const [stats, recentSessions, notifications] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total_entrevistas,
          COUNT(*) FILTER (WHERE estado = 'completada') AS completadas,
          ROUND(AVG(ev.puntaje_total)::numeric, 2) AS promedio_puntaje,
          MAX(ev.puntaje_total)::float AS mejor_puntaje
        FROM sesiones_entrevista s
        LEFT JOIN evaluaciones ev ON ev.sesion_id = s.id
        WHERE s.usuario_id = $1
      `, [usuarioId]),
      this.getRecentSessionsByUser(usuarioId),
      this.getRecentNotifications(usuarioId)
    ]);

    return {
      stats: stats.rows[0],
      recent_sessions: recentSessions,
      recent_notifications: notifications
    };
  },

  // Helper para sesiones recientes de un usuario específico
  async getRecentSessionsByUser(usuarioId) {
    const result = await db.query(`
      SELECT
        s.id,
        t.nombre AS tech,
        n.nombre AS level,
        ev.puntaje_total::float AS score,
        s.estado,
        s.fecha_inicio,
        s.duracion_segundos
      FROM sesiones_entrevista s
      JOIN tecnologias t ON t.id = s.tecnologia_id
      JOIN niveles_dificultad n ON n.id = s.nivel_id
      LEFT JOIN evaluaciones ev ON ev.sesion_id = s.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_inicio DESC
      LIMIT 5
    `, [usuarioId]);
    return result.rows;
  }
};