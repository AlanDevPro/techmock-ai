// 📁 src/controllers/profile.controller.js
import { db } from '../config/database.js';

export const getPerfilCompleto = async (req, res) => {
  try {
    const userId = req.usuario.id;

    // 1. Obtener datos del usuario - ✅ CON CAMPOS COMPLETOS
    const usuarioResult = await db.query(`
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido, 
        u.email, 
        u.rol, 
        u.avatar_url, 
        u.github_url, 
        u.linkedin_url, 
        u.telefono,
        u.bio,
        u.website,
        u.location,
        u.twitter,
        u.activo, 
        u.email_verificado, 
        u.fecha_creacion, 
        u.ultimo_acceso, 
        u.ultimo_login,
        COALESCE(array_agg(DISTINCT ap.provider) FILTER (WHERE ap.provider IS NOT NULL), '{}') as providers
      FROM usuarios u
      LEFT JOIN auth_providers ap ON ap.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // ✅ VERIFICAR SI EL USUARIO TIENE SESIONES COMPLETADAS
    const sesionesExistentes = await db.query(`
      SELECT COUNT(*) as total
      FROM sesiones_entrevista
      WHERE usuario_id = $1 AND estado = 'completada'
    `, [userId]);

    const tieneSesiones = parseInt(sesionesExistentes.rows[0]?.total || 0) > 0;

    // 2. Obtener estadísticas (solo si tiene sesiones)
    let estadisticas = {};
    if (tieneSesiones) {
      const estadisticasResult = await db.query(`
        SELECT 
          total_entrevistas,
          entrevistas_finalizadas,
          entrevistas_abandonadas,
          puntaje_promedio,
          mejor_puntaje,
          peor_puntaje,
          tiempo_promedio_segundos,
          t.nombre as tecnologia_favorita,
          racha_actual,
          racha_maxima,
          ultima_entrevista_fecha
        FROM estadisticas_usuario eu
        LEFT JOIN tecnologias t ON t.id = eu.tecnologia_favorita_id
        WHERE eu.usuario_id = $1
      `, [userId]);
      estadisticas = estadisticasResult.rows[0] || {};
    }

    // 3. Obtener perfil técnico (solo si tiene sesiones)
    let perfil = {};
    if (tieneSesiones) {
      const perfilResult = await db.query(`
        SELECT 
          score_global,
          score_javascript,
          score_arquitectura,
          score_buenas_practicas,
          score_comunicacion,
          score_resolucion,
          consistencia,
          tendencia,
          nivel_actual,
          total_sesiones,
          sesiones_completadas,
          sesiones_abandonadas,
          t1.nombre as mejor_tecnologia,
          t2.nombre as peor_tecnologia
        FROM perfil_tecnico_usuario pt
        LEFT JOIN tecnologias t1 ON t1.id = pt.mejor_tecnologia_id
        LEFT JOIN tecnologias t2 ON t2.id = pt.peor_tecnologia_id
        WHERE pt.usuario_id = $1
      `, [userId]);
      perfil = perfilResult.rows[0] || {};
    }

    // 4. Obtener sesiones recientes (siempre, pero puede estar vacío)
    const sesionesResult = await db.query(`
      SELECT 
        s.id,
        t.nombre as tecnologia,
        s.tecnologia_id,
        nd.nombre as nivel,
        p.titulo as pregunta,
        p.id as pregunta_id,
        s.estado,
        s.fecha_inicio,
        s.duracion_segundos,
        e.puntaje_total as puntaje,
        e.nivel_candidato,
        e.feedback_general
      FROM sesiones_entrevista s
      JOIN tecnologias t ON t.id = s.tecnologia_id
      JOIN niveles_dificultad nd ON nd.id = s.nivel_id
      JOIN preguntas p ON p.id = s.pregunta_id
      LEFT JOIN evaluaciones e ON e.sesion_id = s.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_inicio DESC
      LIMIT 10
    `, [userId]);

    // 5. Obtener notificaciones
    const notificacionesResult = await db.query(`
      SELECT 
        id, tipo, titulo, mensaje, leida, url_accion, fecha_creacion
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY fecha_creacion DESC
      LIMIT 10
    `, [userId]);

    // ─── Armar respuesta ───
    const usuario = usuarioResult.rows[0];

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre || '',
          apellido: usuario.apellido || '',
          email: usuario.email,
          rol: usuario.rol,
          avatar_url: usuario.avatar_url,
          github_url: usuario.github_url,
          linkedin_url: usuario.linkedin_url,
          telefono: usuario.telefono,
          bio: usuario.bio || '',
          website: usuario.website || '',
          location: usuario.location || '',
          twitter: usuario.twitter || '',
          activo: usuario.activo,
          email_verificado: usuario.email_verificado,
          fecha_creacion: usuario.fecha_creacion,
          ultimo_acceso: usuario.ultimo_acceso,
          ultimo_login: usuario.ultimo_login,
          providers: usuario.providers || []
        },
        estadisticas: {
          total_entrevistas: tieneSesiones ? parseInt(estadisticas.total_entrevistas) || 0 : 0,
          entrevistas_finalizadas: tieneSesiones ? parseInt(estadisticas.entrevistas_finalizadas) || 0 : 0,
          entrevistas_abandonadas: tieneSesiones ? parseInt(estadisticas.entrevistas_abandonadas) || 0 : 0,
          puntaje_promedio: tieneSesiones && estadisticas.puntaje_promedio ? parseFloat(estadisticas.puntaje_promedio) : null,
          mejor_puntaje: tieneSesiones && estadisticas.mejor_puntaje ? parseFloat(estadisticas.mejor_puntaje) : null,
          peor_puntaje: tieneSesiones && estadisticas.peor_puntaje ? parseFloat(estadisticas.peor_puntaje) : null,
          tiempo_promedio_segundos: tieneSesiones && estadisticas.tiempo_promedio_segundos ? parseInt(estadisticas.tiempo_promedio_segundos) : null,
          tecnologia_favorita: tieneSesiones ? estadisticas.tecnologia_favorita || null : null,
          racha_actual: tieneSesiones ? parseInt(estadisticas.racha_actual) || 0 : 0,
          racha_maxima: tieneSesiones ? parseInt(estadisticas.racha_maxima) || 0 : 0,
          ultima_entrevista_fecha: tieneSesiones ? estadisticas.ultima_entrevista_fecha || null : null
        },
        perfil_tecnico: {
          score_global: tieneSesiones ? parseFloat(perfil.score_global) || 0 : 0,
          score_javascript: tieneSesiones ? parseFloat(perfil.score_javascript) || 0 : 0,
          score_arquitectura: tieneSesiones ? parseFloat(perfil.score_arquitectura) || 0 : 0,
          score_buenas_practicas: tieneSesiones ? parseFloat(perfil.score_buenas_practicas) || 0 : 0,
          score_comunicacion: tieneSesiones ? parseFloat(perfil.score_comunicacion) || 0 : 0,
          score_resolucion: tieneSesiones ? parseFloat(perfil.score_resolucion) || 0 : 0,
          consistencia: tieneSesiones ? parseFloat(perfil.consistencia) || 0 : 0,
          tendencia: tieneSesiones ? perfil.tendencia || '→' : '→',
          nivel_actual: tieneSesiones ? perfil.nivel_actual || 'revisar' : 'revisar',
          total_sesiones: tieneSesiones ? parseInt(perfil.total_sesiones) || 0 : 0,
          sesiones_completadas: tieneSesiones ? parseInt(perfil.sesiones_completadas) || 0 : 0,
          sesiones_abandonadas: tieneSesiones ? parseInt(perfil.sesiones_abandonadas) || 0 : 0,
          mejor_tecnologia: tieneSesiones ? perfil.mejor_tecnologia || null : null,
          peor_tecnologia: tieneSesiones ? perfil.peor_tecnologia || null : null
        },
        sesiones_recientes: sesionesResult.rows.map(s => ({
          id: s.id,
          tecnologia: s.tecnologia,
          tecnologia_id: s.tecnologia_id,
          nivel: s.nivel,
          pregunta: s.pregunta,
          pregunta_id: s.pregunta_id,
          estado: s.estado,
          fecha_inicio: s.fecha_inicio,
          duracion_segundos: s.duracion_segundos ? parseInt(s.duracion_segundos) : null,
          puntaje: s.puntaje ? parseFloat(s.puntaje) : null,
          nivel_candidato: s.nivel_candidato,
          feedback_general: s.feedback_general
        })),
        notificaciones: notificacionesResult.rows.map(n => ({
          id: n.id,
          tipo: n.tipo,
          titulo: n.titulo,
          mensaje: n.mensaje,
          leida: n.leida,
          url_accion: n.url_accion,
          fecha_creacion: n.fecha_creacion
        }))
      }
    });

  } catch (error) {
    console.error('Error en getPerfilCompleto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil',
      error: error.message
    });
  }
};

export const getEstadisticas = async (req, res) => {
  try {
    const userId = req.usuario.id;

    // ✅ Verificar si tiene sesiones
    const sesionesExistentes = await db.query(`
      SELECT COUNT(*) as total
      FROM sesiones_entrevista
      WHERE usuario_id = $1 AND estado = 'completada'
    `, [userId]);

    const tieneSesiones = parseInt(sesionesExistentes.rows[0]?.total || 0) > 0;

    if (!tieneSesiones) {
      return res.json({
        success: true,
        data: {
          total_entrevistas: 0,
          entrevistas_finalizadas: 0,
          entrevistas_abandonadas: 0,
          puntaje_promedio: null,
          mejor_puntaje: null,
          peor_puntaje: null,
          tiempo_promedio_segundos: null,
          tecnologia_favorita: null,
          racha_actual: 0,
          racha_maxima: 0,
          ultima_entrevista_fecha: null
        }
      });
    }

    const result = await db.query(`
      SELECT 
        total_entrevistas,
        entrevistas_finalizadas,
        entrevistas_abandonadas,
        puntaje_promedio,
        mejor_puntaje,
        peor_puntaje,
        tiempo_promedio_segundos,
        t.nombre as tecnologia_favorita,
        racha_actual,
        racha_maxima,
        ultima_entrevista_fecha
      FROM estadisticas_usuario eu
      LEFT JOIN tecnologias t ON t.id = eu.tecnologia_favorita_id
      WHERE eu.usuario_id = $1
    `, [userId]);

    const stats = result.rows[0] || {};
    res.json({
      success: true,
      data: {
        total_entrevistas: parseInt(stats.total_entrevistas) || 0,
        entrevistas_finalizadas: parseInt(stats.entrevistas_finalizadas) || 0,
        entrevistas_abandonadas: parseInt(stats.entrevistas_abandonadas) || 0,
        puntaje_promedio: stats.puntaje_promedio ? parseFloat(stats.puntaje_promedio) : null,
        mejor_puntaje: stats.mejor_puntaje ? parseFloat(stats.mejor_puntaje) : null,
        peor_puntaje: stats.peor_puntaje ? parseFloat(stats.peor_puntaje) : null,
        tiempo_promedio_segundos: stats.tiempo_promedio_segundos ? parseInt(stats.tiempo_promedio_segundos) : null,
        tecnologia_favorita: stats.tecnologia_favorita || null,
        racha_actual: parseInt(stats.racha_actual) || 0,
        racha_maxima: parseInt(stats.racha_maxima) || 0,
        ultima_entrevista_fecha: stats.ultima_entrevista_fecha || null
      }
    });

  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

export const getPerfilTecnico = async (req, res) => {
  try {
    const userId = req.usuario.id;

    // ✅ Verificar si tiene sesiones
    const sesionesExistentes = await db.query(`
      SELECT COUNT(*) as total
      FROM sesiones_entrevista
      WHERE usuario_id = $1 AND estado = 'completada'
    `, [userId]);

    const tieneSesiones = parseInt(sesionesExistentes.rows[0]?.total || 0) > 0;

    if (!tieneSesiones) {
      return res.json({
        success: true,
        data: {
          score_global: 0,
          score_javascript: 0,
          score_arquitectura: 0,
          score_buenas_practicas: 0,
          score_comunicacion: 0,
          score_resolucion: 0,
          consistencia: 0,
          tendencia: '→',
          nivel_actual: 'revisar',
          total_sesiones: 0,
          sesiones_completadas: 0,
          sesiones_abandonadas: 0,
          mejor_tecnologia: null,
          peor_tecnologia: null
        }
      });
    }

    const result = await db.query(`
      SELECT 
        score_global,
        score_javascript,
        score_arquitectura,
        score_buenas_practicas,
        score_comunicacion,
        score_resolucion,
        consistencia,
        tendencia,
        nivel_actual,
        total_sesiones,
        sesiones_completadas,
        sesiones_abandonadas,
        t1.nombre as mejor_tecnologia,
        t2.nombre as peor_tecnologia
      FROM perfil_tecnico_usuario pt
      LEFT JOIN tecnologias t1 ON t1.id = pt.mejor_tecnologia_id
      LEFT JOIN tecnologias t2 ON t2.id = pt.peor_tecnologia_id
      WHERE pt.usuario_id = $1
    `, [userId]);

    const perfil = result.rows[0] || {};
    res.json({
      success: true,
      data: {
        score_global: parseFloat(perfil.score_global) || 0,
        score_javascript: parseFloat(perfil.score_javascript) || 0,
        score_arquitectura: parseFloat(perfil.score_arquitectura) || 0,
        score_buenas_practicas: parseFloat(perfil.score_buenas_practicas) || 0,
        score_comunicacion: parseFloat(perfil.score_comunicacion) || 0,
        score_resolucion: parseFloat(perfil.score_resolucion) || 0,
        consistencia: parseFloat(perfil.consistencia) || 0,
        tendencia: perfil.tendencia || '→',
        nivel_actual: perfil.nivel_actual || 'revisar',
        total_sesiones: parseInt(perfil.total_sesiones) || 0,
        sesiones_completadas: parseInt(perfil.sesiones_completadas) || 0,
        sesiones_abandonadas: parseInt(perfil.sesiones_abandonadas) || 0,
        mejor_tecnologia: perfil.mejor_tecnologia || null,
        peor_tecnologia: perfil.peor_tecnologia || null
      }
    });

  } catch (error) {
    console.error('Error en getPerfilTecnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil técnico',
      error: error.message
    });
  }
};

export const getSesionesRecientes = async (req, res) => {
  try {
    const userId = req.usuario.id;
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(`
      SELECT 
        s.id,
        t.nombre as tecnologia,
        s.tecnologia_id,
        nd.nombre as nivel,
        p.titulo as pregunta,
        p.id as pregunta_id,
        s.estado,
        s.fecha_inicio,
        s.duracion_segundos,
        e.puntaje_total as puntaje,
        e.nivel_candidato,
        e.feedback_general
      FROM sesiones_entrevista s
      JOIN tecnologias t ON t.id = s.tecnologia_id
      JOIN niveles_dificultad nd ON nd.id = s.nivel_id
      JOIN preguntas p ON p.id = s.pregunta_id
      LEFT JOIN evaluaciones e ON e.sesion_id = s.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_inicio DESC
      LIMIT $2
    `, [userId, limit]);

    res.json({
      success: true,
      data: result.rows.map(s => ({
        id: s.id,
        tecnologia: s.tecnologia,
        tecnologia_id: s.tecnologia_id,
        nivel: s.nivel,
        pregunta: s.pregunta,
        pregunta_id: s.pregunta_id,
        estado: s.estado,
        fecha_inicio: s.fecha_inicio,
        duracion_segundos: s.duracion_segundos ? parseInt(s.duracion_segundos) : null,
        puntaje: s.puntaje ? parseFloat(s.puntaje) : null,
        nivel_candidato: s.nivel_candidato,
        feedback_general: s.feedback_general
      }))
    });

  } catch (error) {
    console.error('Error en getSesionesRecientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones recientes',
      error: error.message
    });
  }
};

export const getNotificaciones = async (req, res) => {
  try {
    const userId = req.usuario.id;

    const result = await db.query(`
      SELECT 
        id, tipo, titulo, mensaje, leida, url_accion, fecha_creacion
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY fecha_creacion DESC
      LIMIT 20
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error en getNotificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
};

export const marcarNotificacionLeida = async (req, res) => {
  try {
    const userId = req.usuario.id;
    const { id } = req.params;

    await db.query(`
      UPDATE notificaciones
      SET leida = true
      WHERE id = $1 AND usuario_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('Error en marcarNotificacionLeida:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación',
      error: error.message
    });
  }
};

export const marcarTodasNotificacionesLeidas = async (req, res) => {
  try {
    const userId = req.usuario.id;

    await db.query(`
      UPDATE notificaciones
      SET leida = true
      WHERE usuario_id = $1 AND leida = false
    `, [userId]);

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });

  } catch (error) {
    console.error('Error en marcarTodasNotificacionesLeidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones',
      error: error.message
    });
  }
};