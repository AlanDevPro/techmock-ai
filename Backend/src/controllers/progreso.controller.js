// src/controllers/progreso.controller.js
import { ProgresoService } from '../services/progreso.service.js';

/**
 * Obtiene el progreso completo del usuario para TODAS las tecnologías activas
 * Incluye tecnologías sin progreso (con valores en 0 y arrays vacíos)
 */
export const obtenerProgresoCompleto = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;  // Usando req.usuario (como en tu código)
        
        // Obtener todas las tecnologías con progreso (o sin él)
        const tecnologias = await ProgresoService.obtenerProgresoCompleto(usuarioId);
        
        // Obtener estadísticas generales
        const estadisticas = await ProgresoService.getEstadisticasGenerales(usuarioId);
        
        // Determinar nivel global y tendencia
        const nivel_global = estadisticas.nivel_actual || 'revisar';
        const tendencia_global = estadisticas.tendencia || '→';
        
        res.json({
            success: true,
            data: {
                tecnologias: tecnologias,
                estadisticas: estadisticas,
                nivel_global: nivel_global,
                tendencia_global: tendencia_global
            }
        });
    } catch (error) {
        console.error('Error en obtenerProgresoCompleto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el progreso',
            message: error.message
        });
    }
};

/**
 * Obtiene el progreso de una tecnología específica por slug
 */
export const obtenerProgresoTecnologia = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { slug } = req.params;
        
        const data = await ProgresoService.obtenerProgresoTecnologia(usuarioId, slug);
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error en obtenerProgresoTecnologia:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el progreso de la tecnología',
            message: error.message
        });
    }
};

/**
 * Obtiene estadísticas generales del usuario
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        const estadisticas = await ProgresoService.getEstadisticasGenerales(usuarioId);
        
        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('Error en obtenerEstadisticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas',
            message: error.message
        });
    }
};

/**
 * Obtiene el resumen de todas las tecnologías del usuario
 */
export const getTodasTecnologias = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const tecnologiasResult = await db.query(`
            SELECT 
                t.id,
                t.nombre,
                t.slug,
                t.icono_url,
                t.tipo,
                COUNT(s.id) as total_sesiones
            FROM tecnologias t
            LEFT JOIN sesiones_entrevista s ON s.tecnologia_id = t.id 
                AND s.usuario_id = $1 
                AND s.estado = 'completada'
            WHERE t.activo = TRUE
            GROUP BY t.id, t.nombre, t.slug, t.icono_url, t.tipo
            ORDER BY t.nombre
        `, [usuarioId]);
        const tecnologias = tecnologiasResult.rows;

        const resultado = await Promise.all(tecnologias.map(async (tech) => {
            // Calcular score promedio
            const scoresResult = await db.query(`
                SELECT AVG(e.puntaje_total) as promedio
                FROM sesiones_entrevista s
                JOIN evaluaciones e ON e.sesion_id = s.id
                WHERE s.usuario_id = $1 
                    AND s.tecnologia_id = $2
                    AND s.estado = 'completada'
            `, [usuarioId, tech.id]);
            
            const avgScore = scoresResult.rows[0]?.promedio || 0;

            return {
                id: tech.id,
                nombre: tech.nombre,
                slug: tech.slug,
                icono: tech.icono_url,
                score: Math.round(avgScore),
                sesiones: parseInt(tech.total_sesiones) || 0,
                tipo: tech.tipo
            };
        }));

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('Error en getTodasTecnologias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el resumen de tecnologías',
            error: error.message
        });
    }
};

/**
 * Obtiene sesiones recientes del usuario
 */
export const getSesionesRecientes = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const limit = parseInt(req.query.limit) || 10;

        const sesionesResult = await db.query(`
            SELECT 
                s.id,
                s.fecha_inicio,
                s.duracion_segundos,
                s.fue_adaptativa,
                s.estado,
                t.nombre as tecnologia_nombre,
                t.slug as tecnologia_slug,
                p.titulo as pregunta_titulo,
                p.enunciado as pregunta_enunciado,
                p.tipo as pregunta_tipo,
                e.puntaje_total,
                e.nivel_candidato,
                e.feedback_general
            FROM sesiones_entrevista s
            LEFT JOIN tecnologias t ON t.id = s.tecnologia_id
            LEFT JOIN preguntas p ON p.id = s.pregunta_id
            LEFT JOIN evaluaciones e ON e.sesion_id = s.id
            WHERE s.usuario_id = $1
            ORDER BY s.fecha_inicio DESC
            LIMIT $2
        `, [usuarioId, limit]);

        res.json({
            success: true,
            data: sesionesResult.rows
        });

    } catch (error) {
        console.error('Error en getSesionesRecientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las sesiones recientes',
            error: error.message
        });
    }
};

/**
 * Obtiene estadísticas globales del usuario
 */
export const getEstadisticasGlobales = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const perfilResult = await db.query(`
            SELECT 
                consistencia,
                tendencia,
                nivel_actual,
                score_global
            FROM perfil_tecnico_usuario 
            WHERE usuario_id = $1
        `, [usuarioId]);
        const perfil = perfilResult.rows[0];

        const estadisticasResult = await db.query(`
            SELECT 
                racha_actual,
                total_entrevistas,
                entrevistas_finalizadas
            FROM estadisticas_usuario 
            WHERE usuario_id = $1
        `, [usuarioId]);
        const estadisticas = estadisticasResult.rows[0];

        res.json({
            success: true,
            data: {
                racha: estadisticas?.racha_actual || 0,
                total_sesiones: estadisticas?.total_entrevistas || 0,
                sesiones_completadas: estadisticas?.entrevistas_finalizadas || 0,
                consistencia: perfil?.consistencia || 0,
                tendencia: perfil?.tendencia || 'estable',
                nivel: perfil?.nivel_actual || 'revisar',
                score_global: perfil?.score_global || 0
            }
        });

    } catch (error) {
        console.error('Error en getEstadisticasGlobales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas globales',
            error: error.message
        });
    }
};