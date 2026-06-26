// src/services/ranking.service.js
import { db } from '../config/database.js';  
class RankingService {
  
  /**
   * Obtiene todos los desarrolladores con su perfil técnico
   * para el panel de rankings
   */
  static async getRankingData(filters = {}) {
    const { tecnologia_id, nivel, limit = 100 } = filters;
    
    let sql = `
      SELECT 
        u.id AS usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.github_url,
        u.linkedin_url,
        u.avatar_url,
        
        -- Perfil técnico
        p.score_global,
        p.score_javascript,
        p.score_arquitectura,
        p.score_buenas_practicas,
        p.score_comunicacion,
        p.score_resolucion,
        p.consistencia,
        p.tendencia,
        p.nivel_actual,
        p.total_sesiones,
        p.sesiones_completadas,
        p.mejor_tecnologia_id,
        p.ultima_evaluacion_id,
        
        -- Tecnología actual (la que está en el perfil como mejor o la última)
        t.id AS tecnologia_id,
        t.nombre AS tecnologia_nombre,
        t.slug AS tecnologia_slug,
        t.icono_url AS tecnologia_icono,
        
        -- Última evaluación
        e.feedback_general,
        e.fortalezas,
        e.areas_mejora,
        e.resumen_para_reclutador,
        e.apto_para_contratacion,
        e.fecha AS ultima_evaluacion_fecha,
        e.nivel_candidato,
        
        -- Estadísticas
        es.racha_actual,
        es.ultima_entrevista_fecha
        
      FROM usuarios u
      INNER JOIN perfil_tecnico_usuario p ON p.usuario_id = u.id
      LEFT JOIN tecnologias t ON t.id = p.mejor_tecnologia_id
      LEFT JOIN evaluaciones e ON e.id = p.ultima_evaluacion_id
      LEFT JOIN estadisticas_usuario es ON es.usuario_id = u.id
      WHERE u.rol = 'developer' 
        AND u.activo = TRUE
        AND p.total_sesiones > 0
    `;
    
    const params = [];
    
    // Filtro por tecnología
    if (tecnologia_id) {
      sql += ` AND p.mejor_tecnologia_id = $${params.length + 1}`;
      params.push(tecnologia_id);
    }
    
    // Filtro por nivel
    if (nivel && nivel !== 'all') {
      sql += ` AND p.nivel_actual = $${params.length + 1}`;
      params.push(nivel);
    }
    
    // Ordenar por score global descendente
    sql += ` ORDER BY p.score_global DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(sql, params); 
    return result.rows;
  }
  
  /**
   * Obtiene el detalle de un candidato específico
   */
  static async getCandidateDetail(usuarioId) {
    const sql = `
      SELECT 
        u.id AS usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.github_url,
        u.linkedin_url,
        u.avatar_url,
        u.telefono,
        u.bio,
        
        p.score_global,
        p.score_javascript,
        p.score_arquitectura,
        p.score_buenas_practicas,
        p.score_comunicacion,
        p.score_resolucion,
        p.consistencia,
        p.tendencia,
        p.nivel_actual,
        p.total_sesiones,
        p.sesiones_completadas,
        
        -- Tecnologías del perfil
        t_mejor.nombre AS mejor_tecnologia,
        t_peor.nombre AS peor_tecnologia,
        
        -- Últimas sesiones
        (
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'fecha', s.fecha_inicio,
              'tipo', pr.tipo,
              'duracion', s.duracion_segundos,
              'puntaje', ev.puntaje_total,
              'nivel_candidato', ev.nivel_candidato,
              'fue_adaptativa', s.fue_adaptativa,
              'pregunta', pr.enunciado,
              'pregunta_resumen', LEFT(pr.enunciado, 100)
            )
          )
          FROM sesiones_entrevista s
          LEFT JOIN preguntas pr ON pr.id = s.pregunta_id
          LEFT JOIN evaluaciones ev ON ev.sesion_id = s.id
          WHERE s.usuario_id = u.id AND s.estado = 'completada'
          ORDER BY s.fecha_inicio DESC
          LIMIT 10
        ) AS sesiones_recientes,
        
        -- Fortalezas
        (
          SELECT json_agg(
            json_build_object(
              'categoria', ce.nombre,
              'descripcion', fu.descripcion,
              'veces', fu.veces_demostrada,
              'confianza', fu.confianza
            )
          )
          FROM fortalezas_usuario fu
          JOIN categorias_error ce ON ce.id = fu.categoria_error_id
          WHERE fu.perfil_id = p.id
        ) AS fortalezas,
        
        -- Debilidades
        (
          SELECT json_agg(
            json_build_object(
              'categoria', ce.nombre,
              'descripcion', du.descripcion,
              'veces', du.veces_fallada,
              'impacto', du.impacto
            )
          )
          FROM debilidades_usuario du
          JOIN categorias_error ce ON ce.id = du.categoria_error_id
          WHERE du.perfil_id = p.id
        ) AS debilidades,
        
        -- Errores recientes
        (
          SELECT json_agg(
            json_build_object(
              'categoria', ce.nombre,
              'severidad', ed.severidad,
              'descripcion', ed.descripcion,
              'veces', 1
            )
          )
          FROM errores_detectados ed
          JOIN categorias_error ce ON ce.id = ed.categoria_error_id
          WHERE ed.sesion_id IN (
            SELECT id FROM sesiones_entrevista 
            WHERE usuario_id = u.id 
            ORDER BY fecha_inicio DESC 
            LIMIT 5
          )
          GROUP BY ce.nombre, ed.severidad, ed.descripcion
          LIMIT 10
        ) AS errores_recientes,
        
        -- Recomendaciones de la última evaluación
        (
          SELECT json_agg(
            json_build_object(
              'tipo', rs.tipo,
              'titulo', rs.titulo,
              'descripcion', rs.descripcion,
              'prioridad', rs.prioridad,
              'codigo_ejemplo', rs.codigo_ejemplo,
              'recurso_url', rs.recurso_url
            )
          )
          FROM recomendaciones_solucion rs
          WHERE rs.evaluacion_id = p.ultima_evaluacion_id
        ) AS recomendaciones,
        
        -- Estadísticas generales
        es.racha_actual,
        es.total_entrevistas,
        es.entrevistas_finalizadas,
        es.puntaje_promedio,
        es.ultima_entrevista_fecha,
        es.tecnologia_favorita_id
        
      FROM usuarios u
      INNER JOIN perfil_tecnico_usuario p ON p.usuario_id = u.id
      LEFT JOIN tecnologias t_mejor ON t_mejor.id = p.mejor_tecnologia_id
      LEFT JOIN tecnologias t_peor ON t_peor.id = p.peor_tecnologia_id
      LEFT JOIN estadisticas_usuario es ON es.usuario_id = u.id
      WHERE u.id = $1 AND u.rol = 'developer'
    `;
    
    const result = await db.query(sql, [usuarioId]);  
    return result.rows[0];
  }
  
  /**
   * Obtiene estadísticas generales para el ranking
   */
  static async getRankingStats() {
    const sql = `
      SELECT 
        COUNT(*) AS total_candidatos,
        COUNT(CASE WHEN nivel_actual = 'destacado' THEN 1 END) AS destacados,
        COUNT(CASE WHEN nivel_actual = 'recomendado' THEN 1 END) AS recomendados,
        COUNT(CASE WHEN nivel_actual = 'promisorio' THEN 1 END) AS promisorios,
        COUNT(CASE WHEN nivel_actual = 'revisar' THEN 1 END) AS revisar,
        COUNT(CASE WHEN nivel_actual = 'descartado' THEN 1 END) AS descartados,
        AVG(score_global) AS score_promedio_global,
        AVG(consistencia) AS consistencia_promedio,
        MAX(score_global) AS score_maximo,
        MIN(score_global) AS score_minimo
      FROM perfil_tecnico_usuario
      WHERE total_sesiones > 0
    `;
    
    const result = await db.query(sql);  // ← CAMBIO: db en lugar de pool
    return result.rows[0];
  }
  
  /**
   * Obtiene el top de candidatos por tecnología
   */
  static async getTopCandidatesByTech(tecnologiaId, limit = 10) {
    const sql = `
      SELECT 
        u.id AS usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.github_url,
        u.linkedin_url,
        p.score_global,
        p.nivel_actual,
        p.consistencia,
        p.tendencia
      FROM usuarios u
      INNER JOIN perfil_tecnico_usuario p ON p.usuario_id = u.id
      WHERE u.rol = 'developer' 
        AND u.activo = TRUE
        AND p.mejor_tecnologia_id = $1
        AND p.total_sesiones > 0
      ORDER BY p.score_global DESC
      LIMIT $2
    `;
    
    const result = await db.query(sql, [tecnologiaId, limit]);  
    return result.rows;
  }
}

export default RankingService;