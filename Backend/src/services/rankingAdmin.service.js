import { db } from "../config/database.js";

/**
 * Servicio para la gestión de rankings de candidatos
 * Adaptado al esquema de base de datos con tabla 'usuarios'
 */
export const RankingService = {
  /**
   * Obtener ranking de candidatos con filtros
   * USANDO LA VISTA vista_candidatos_reclutador
   */
  async obtenerCandidatos(filtros = {}) {
    const { tecnologia_id, nivel } = filtros;
    const params = [];
    let paramIndex = 1;

    let whereClause = 'WHERE 1=1';

    // ✅ Ahora este filtro funcionará perfectamente porque el ID existe en la vista
    if (tecnologia_id) {
      whereClause += ` AND mejor_tecnologia_id = $${paramIndex}`;
      params.push(parseInt(tecnologia_id));
      paramIndex++;
    }

    if (nivel) {
      whereClause += ` AND nivel_actual = $${paramIndex}`;
      params.push(nivel);
      paramIndex++;
    }

    const query = `
      SELECT 
        usuario_id,
        nombre,
        apellido,
        email,
        github_url,
        linkedin_url,
        score_global,
        score_javascript,
        score_arquitectura,
        score_buenas_practicas,
        score_comunicacion,
        consistencia,
        tendencia,
        nivel_actual,
        total_sesiones,
        sesiones_completadas,
        racha_actual,
        ultima_entrevista_fecha,
        feedback_general,
        resumen_para_reclutador,
        apto_para_contratacion,
        mejor_tecnologia,
        mejor_tecnologia_id,
        peor_tecnologia,
        peor_tecnologia_id
      FROM vista_candidatos_reclutador
      ${whereClause}
      ORDER BY score_global DESC NULLS LAST
    `;

    try {
      console.log(`📊 [RankingService] Ejecutando consulta:`, query, params);
      const { rows } = await db.query(query, params);

      return rows.map((row) => ({
        usuario_id: row.usuario_id,
        nombre: row.nombre,
        apellido: row.apellido || '',
        email: row.email,
        github_url: row.github_url,
        linkedin_url: row.linkedin_url,
        score_global: Number(row.score_global || 0),
        score_javascript: Number(row.score_javascript || 0),
        score_arquitectura: Number(row.score_arquitectura || 0),
        score_buenas_practicas: Number(row.score_buenas_practicas || 0),
        score_comunicacion: Number(row.score_comunicacion || 0),
        score_resolucion: 0, 
        consistencia: Number(row.consistencia || 0),
        tendencia: row.tendencia || 'estable',
        nivel_actual: row.nivel_actual || 'revisar',
        total_sesiones: row.total_sesiones || 0,
        sesiones_completadas: row.sesiones_completadas || 0,
        sesiones_abandonadas: (row.total_sesiones || 0) - (row.sesiones_completadas || 0),
        racha_actual: row.racha_actual || 0,
        ultima_entrevista_fecha: row.ultima_entrevista_fecha || null,
        feedback_general: row.feedback_general || '',
        resumen_para_reclutador: row.resumen_para_reclutador || '',
        apto_para_contratacion: row.apto_para_contratacion || false,
        mejor_tecnologia: row.mejor_tecnologia || 'N/A',
        peor_tecnologia: row.peor_tecnologia || 'N/A',
      }));
    } catch (error) {
      console.error('[RankingService.obtenerCandidatos] Error:', error);
      throw new Error(`Error al obtener candidatos: ${error.message}`);
    }
  },

  /**
   * Obtener detalle completo de un candidato
   */
  async obtenerDetalle(usuario_id) {
    try {
      // 1. Obtener la información base
      const baseQuery = `
        SELECT 
          u.id,
          u.nombre,
          u.apellido,
          u.email,
          u.telefono,
          u.github_url,
          u.linkedin_url,
          u.avatar_url,
          ptu.id AS perfil_id,
          ptu.score_global,
          ptu.score_javascript,
          ptu.score_arquitectura,
          ptu.score_buenas_practicas,
          ptu.score_comunicacion,
          ptu.score_resolucion,
          ptu.consistencia,
          ptu.tendencia,
          ptu.nivel_actual,
          ptu.total_sesiones,
          ptu.sesiones_completadas,
          eu.racha_actual,
          eu.ultima_entrevista_fecha,
          t_mejor.nombre AS mejor_tecnologia,
          t_peor.nombre AS peor_tecnologia
        FROM usuarios u
        LEFT JOIN perfil_tecnico_usuario ptu ON u.id = ptu.usuario_id
        LEFT JOIN estadisticas_usuario eu ON u.id = eu.usuario_id
        LEFT JOIN tecnologias t_mejor ON ptu.mejor_tecnologia_id = t_mejor.id
        LEFT JOIN tecnologias t_peor ON ptu.peor_tecnologia_id = t_peor.id
        WHERE u.id = $1 AND u.rol = 'developer'
      `;

      const { rows: userRows } = await db.query(baseQuery, [usuario_id]);

      if (userRows.length === 0) return null;

      const user = userRows[0];
      const perfil_id = user.perfil_id;

      // 2. Obtener la última evaluación
      const evaluacionResult = await db.query(`
        SELECT 
          ev.id,
          ev.feedback_general,
          ev.resumen_para_reclutador,
          ev.apto_para_contratacion
        FROM evaluaciones ev
        INNER JOIN sesiones_entrevista se ON se.id = ev.sesion_id
        WHERE se.usuario_id = $1
        ORDER BY ev.fecha DESC
        LIMIT 1
      `, [usuario_id]);

      // 3. Obtener fortalezas, debilidades y sesión
      const [fortalezasResult, debilidadesResult, sesionResult] = await Promise.all([
        db.query(`
          SELECT f.descripcion, f.veces_demostrada, f.confianza, c.nombre AS categoria
          FROM fortalezas_usuario f
          LEFT JOIN categorias_error c ON f.categoria_error_id = c.id
          WHERE f.perfil_id = $1
        `, [perfil_id]),

        db.query(`
          SELECT d.descripcion, d.veces_fallada, d.impacto, d.requiere_practica, c.nombre AS categoria
          FROM debilidades_usuario d
          LEFT JOIN categorias_error c ON d.categoria_error_id = c.id
          WHERE d.perfil_id = $1
        `, [perfil_id]),

        db.query(`
          SELECT id, fue_adaptativa
          FROM sesiones_entrevista
          WHERE usuario_id = $1
          ORDER BY fecha_inicio DESC
          LIMIT 1
        `, [usuario_id])
      ]);

      const ultimaEvaluacion = evaluacionResult.rows[0] || null;
      const ultimaSesion = sesionResult.rows[0] || null;

      // 4. Obtener recomendaciones
      let recomendaciones = [];
      if (ultimaEvaluacion) {
        const { rows } = await db.query(`
          SELECT tipo, titulo, descripcion, prioridad, recurso_url
          FROM recomendaciones_solucion
          WHERE evaluacion_id = $1
          ORDER BY orden ASC
        `, [ultimaEvaluacion.id]);
        recomendaciones = rows;
      }

      // 5. Obtener errores recientes
      let errores_recientes = [];
      if (ultimaSesion) {
        const { rows } = await db.query(`
          SELECT e.descripcion, e.severidad, e.es_error_conceptual AS es_conceptual, c.nombre AS categoria
          FROM errores_detectados e
          LEFT JOIN categorias_error c ON e.categoria_error_id = c.id
          WHERE e.sesion_id = $1
          ORDER BY e.detectado_en DESC
          LIMIT 5
        `, [ultimaSesion.id]);
        errores_recientes = rows;
      }

      // 6. Retornar objeto estructurado
      return {
        usuario_id: user.id,
        nombre: user.nombre,
        apellido: user.apellido || '',
        email: user.email,
        telefono: user.telefono,
        github_url: user.github_url,
        linkedin_url: user.linkedin_url,
        avatar_url: user.avatar_url,
        score_global: Number(user.score_global || 0),
        score_javascript: Number(user.score_javascript || 0),
        score_arquitectura: Number(user.score_arquitectura || 0),
        score_buenas_practicas: Number(user.score_buenas_practicas || 0),
        score_comunicacion: Number(user.score_comunicacion || 0),
        score_resolucion: Number(user.score_resolucion || 0),
        consistencia: Number(user.consistencia || 0),
        tendencia: user.tendencia || 'estable',
        nivel_actual: user.nivel_actual || 'revisar',
        total_sesiones: user.total_sesiones || 0,
        sesiones_completadas: user.sesiones_completadas || 0,
        sesiones_abandonadas: (user.total_sesiones || 0) - (user.sesiones_completadas || 0),
        racha_actual: user.racha_actual || 0,
        ultima_entrevista: user.ultima_entrevista_fecha,
        feedback_general: ultimaEvaluacion?.feedback_general || '',
        resumen_para_reclutador: ultimaEvaluacion?.resumen_para_reclutador || '',
        apto_para_contratacion: ultimaEvaluacion?.apto_para_contratacion || false,
        mejor_tecnologia: user.mejor_tecnologia || 'N/A',
        peor_tecnologia: user.peor_tecnologia || 'N/A',
        fortalezas: fortalezasResult.rows.map(f => ({
          ...f,
          confianza: Number(f.confianza || 0.5)
        })),
        debilidades: debilidadesResult.rows.map(d => ({
          ...d,
          impacto: Number(d.impacto || 0.5)
        })),
        errores_recientes,
        recomendaciones,
        fue_adaptativa_ultima: ultimaSesion?.fue_adaptativa || false,
      };
    } catch (error) {
      console.error('[RankingService.obtenerDetalle] Error:', error);
      throw new Error(`Error al obtener detalle del candidato: ${error.message}`);
    }
  },

  /**
   * Obtener listado de tecnologías para filtros
   */
  async obtenerTecnologias() {
    const query = `
      SELECT id, nombre, slug, icono_url, tipo
      FROM tecnologias
      WHERE activo = true
      ORDER BY nombre ASC
    `;

    try {
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('[RankingService.obtenerTecnologias] Error:', error);
      throw new Error(`Error al obtener tecnologías: ${error.message}`);
    }
  },

  /**
   * Registrar un contacto de reclutamiento
   */
  async registrarContacto(admin_id, developer_id, asunto, mensaje) {
    try {
      const { rows } = await db.query(
        `SELECT id FROM usuarios WHERE id = $1 AND rol = 'developer' AND activo = true`,
        [developer_id]
      );

      if (rows.length === 0) {
        throw new Error('Candidato no encontrado');
      }

      const query = `
        INSERT INTO contactos_reclutamiento (
          admin_id,
          developer_id,
          asunto,
          mensaje,
          estado,
          fecha_envio
        ) VALUES ($1, $2, $3, $4, 'enviado', NOW())
        RETURNING id
      `;

      await db.query(query, [admin_id, developer_id, asunto, mensaje]);
      return true;
    } catch (error) {
      console.error('[RankingService.registrarContacto] Error:', error);
      throw new Error(`Error al registrar contacto: ${error.message}`);
    }
  }
};