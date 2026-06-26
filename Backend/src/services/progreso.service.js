// src/services/progreso.service.js
import { db } from '../config/database.js';  // ✅ Importación nombrada

export class ProgresoService {
    
    /**
     * Obtiene el progreso completo del usuario para TODAS las tecnologías activas
     */
    static async obtenerProgresoCompleto(usuarioId) {
        const sql = `
            SELECT 
                t.id,
                t.nombre,
                t.slug,
                t.icono_url,
                
                -- Score global (0 si no hay sesiones)
                COALESCE(
                    (SELECT AVG(e.puntaje_total) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_global,
                
                -- Score por pilares (0 si no hay sesiones)
                COALESCE(
                    (SELECT AVG(e.puntaje_javascript) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_javascript,
                
                COALESCE(
                    (SELECT AVG(e.puntaje_arquitectura) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_arquitectura,
                
                COALESCE(
                    (SELECT AVG(e.puntaje_buenas_practicas) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_buenas_practicas,
                
                COALESCE(
                    (SELECT AVG(e.puntaje_comunicacion) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_comunicacion,
                
                COALESCE(
                    (SELECT AVG(e.puntaje_resolucion) 
                     FROM sesiones_entrevista s 
                     LEFT JOIN evaluaciones e ON e.sesion_id = s.id 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS score_resolucion,
                
                -- Consistencia (0 si no hay sesiones)
                COALESCE(
                    (SELECT AVG(pt.consistencia) 
                     FROM perfil_tecnico_usuario pt
                     WHERE pt.usuario_id = $1 
                       AND pt.mejor_tecnologia_id = t.id
                    ), 0
                ) AS consistencia,
                
                -- Tendencia (por defecto '→' si no hay datos)
                COALESCE(
                    (SELECT pt.tendencia 
                     FROM perfil_tecnico_usuario pt
                     WHERE pt.usuario_id = $1 
                       AND pt.mejor_tecnologia_id = t.id
                    ), '→'
                ) AS tendencia,
                
                -- Sesiones completadas
                COALESCE(
                    (SELECT COUNT(*) 
                     FROM sesiones_entrevista s 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id 
                       AND s.estado = 'completada'
                    ), 0
                ) AS sesiones_completadas,
                
                -- Sesiones totales
                COALESCE(
                    (SELECT COUNT(*) 
                     FROM sesiones_entrevista s 
                     WHERE s.usuario_id = $1 
                       AND s.tecnologia_id = t.id
                    ), 0
                ) AS total_sesiones
                
            FROM tecnologias t
            WHERE t.activo = TRUE
            ORDER BY t.nombre
        `;
        
        const result = await db.query(sql, [usuarioId]);  // ✅ Usar db en lugar de pool
        
        // Procesar cada tecnología para obtener datos adicionales
        const tecnologias = [];
        for (const tech of result.rows) {
            const pilares = this.getPilares(tech);
            const sessions = await this.getSessionsByTech(usuarioId, tech.id);
            const errores = await this.getErrorsByTech(usuarioId, tech.id);
            const recomendaciones = await this.getRecommendationsByTech(usuarioId, tech.id);
            const fortalezas = await this.getFortalezas(usuarioId);
            const debilidades = await this.getDebilidades(usuarioId);
            
            tecnologias.push({
                id: tech.id,
                nombre: tech.nombre,
                slug: tech.slug,
                icono_url: tech.icono_url,
                score_global: Math.round(tech.score_global * 100) / 100 || 0,
                sesiones_completadas: parseInt(tech.sesiones_completadas) || 0,
                total_sesiones: parseInt(tech.total_sesiones) || 0,
                consistencia: Math.round(tech.consistencia * 100) / 100 || 0,
                tendencia: tech.tendencia || '→',
                pilares: pilares,
                sessions: sessions || [],
                errores: errores || [],
                recomendaciones: recomendaciones || [],
                fortalezas: fortalezas || [],
                debilidades: debilidades || []
            });
        }
        
        return tecnologias;
    }
    
    /**
     * Helper para obtener pilares con valores por defecto
     */
    static getPilares(tech) {
        return [
            { label: 'JavaScript', key: 'javascript', score: Math.round(tech.score_javascript * 100) / 100 || 0 },
            { label: 'Arquitectura', key: 'arquitectura', score: Math.round(tech.score_arquitectura * 100) / 100 || 0 },
            { label: 'Buenas prácticas', key: 'buenas_practicas', score: Math.round(tech.score_buenas_practicas * 100) / 100 || 0 },
            { label: 'Comunicación', key: 'comunicacion', score: Math.round(tech.score_comunicacion * 100) / 100 || 0 },
            { label: 'Resolución', key: 'resolucion', score: Math.round(tech.score_resolucion * 100) / 100 || 0 },
        ];
    }
    
    /**
     * Obtiene sesiones recientes de una tecnología específica
     */
    static async getSessionsByTech(usuarioId, tecnologiaId) {
        const query = `
            SELECT 
                s.id,
                s.fecha_inicio,
                s.duracion_segundos,
                s.fue_adaptativa,
                p.tipo,
                p.enunciado,
                e.puntaje_total,
                e.nivel_candidato
            FROM sesiones_entrevista s
            JOIN preguntas p ON p.id = s.pregunta_id
            JOIN evaluaciones e ON e.sesion_id = s.id
            WHERE s.usuario_id = $1 
                AND s.tecnologia_id = $2
                AND s.estado = 'completada'
            ORDER BY s.fecha_inicio DESC
            LIMIT 10
        `;
        const result = await db.query(query, [usuarioId, tecnologiaId]);  // ✅ Usar db
        
        return result.rows.map(s => ({
            id: s.id,
            fecha: new Date(s.fecha_inicio).toLocaleDateString('es-ES', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            }),
            tipo: s.tipo || 'General',
            duracion: s.duracion_segundos ? `${Math.floor(s.duracion_segundos / 60)} min` : 'N/A',
            puntaje: Math.round(s.puntaje_total || 0),
            nivel_candidato: s.nivel_candidato || 'revisar',
            fue_adaptativa: s.fue_adaptativa || false,
            pregunta: s.enunciado || '',
            pregunta_resumen: s.enunciado ? s.enunciado.substring(0, 80) + '...' : 'Sin descripción'
        }));
    }
    
    /**
     * Obtiene errores detectados para una tecnología específica
     */
    static async getErrorsByTech(usuarioId, tecnologiaId) {
        const query = `
            SELECT 
                ce.nombre as categoria,
                ed.severidad,
                ed.descripcion,
                COUNT(ed.id) as veces
            FROM errores_detectados ed
            JOIN categorias_error ce ON ce.id = ed.categoria_error_id
            JOIN sesiones_entrevista s ON s.id = ed.sesion_id
            WHERE s.usuario_id = $1 
                AND s.tecnologia_id = $2
            GROUP BY ce.nombre, ed.severidad, ed.descripcion
            ORDER BY veces DESC
            LIMIT 10
        `;
        const result = await db.query(query, [usuarioId, tecnologiaId]);  // ✅ Usar db
        
        return result.rows.map(e => ({
            categoria: e.categoria,
            severidad: e.severidad || 'medio',
            descripcion: e.descripcion,
            veces: parseInt(e.veces)
        }));
    }
    
    /**
     * Obtiene recomendaciones de la última evaluación
     */
    static async getRecommendationsByTech(usuarioId, tecnologiaId) {
        const query = `
            SELECT 
                rs.tipo,
                rs.titulo,
                rs.descripcion,
                rs.prioridad,
                rs.codigo_ejemplo,
                rs.recurso_url
            FROM recomendaciones_solucion rs
            JOIN evaluaciones e ON e.id = rs.evaluacion_id
            JOIN sesiones_entrevista s ON s.id = e.sesion_id
            WHERE s.usuario_id = $1 
                AND s.tecnologia_id = $2
            ORDER BY e.fecha DESC, rs.orden ASC
            LIMIT 5
        `;
        const result = await db.query(query, [usuarioId, tecnologiaId]);  // ✅ Usar db
        
        return result.rows.map(r => ({
            tipo: r.tipo || 'concepto',
            titulo: r.titulo || 'Recomendación',
            descripcion: r.descripcion || 'Sin descripción',
            prioridad: r.prioridad || 'media',
            ...(r.codigo_ejemplo && { codigo_ejemplo: r.codigo_ejemplo }),
            ...(r.recurso_url && { recurso_url: r.recurso_url })
        }));
    }
    
    /**
     * Obtiene fortalezas del usuario
     */
    static async getFortalezas(usuarioId) {
        const query = `
            SELECT 
                ce.nombre
            FROM fortalezas_usuario fu
            JOIN categorias_error ce ON ce.id = fu.categoria_error_id
            JOIN perfil_tecnico_usuario pt ON pt.id = fu.perfil_id
            WHERE pt.usuario_id = $1
            ORDER BY fu.confianza DESC
            LIMIT 10
        `;
        const result = await db.query(query, [usuarioId]);  // ✅ Usar db
        return result.rows.map(f => f.nombre);
    }
    
    /**
     * Obtiene debilidades del usuario
     */
    static async getDebilidades(usuarioId) {
        const query = `
            SELECT 
                ce.nombre
            FROM debilidades_usuario du
            JOIN categorias_error ce ON ce.id = du.categoria_error_id
            JOIN perfil_tecnico_usuario pt ON pt.id = du.perfil_id
            WHERE pt.usuario_id = $1
            ORDER BY du.impacto DESC
            LIMIT 10
        `;
        const result = await db.query(query, [usuarioId]);  // ✅ Usar db
        return result.rows.map(d => d.nombre);
    }
    
    /**
     * Obtiene estadísticas generales del usuario
     */
    static async getEstadisticasGenerales(usuarioId) {
        const query = `
            SELECT 
                COALESCE(eu.racha_actual, 0) AS racha_actual,
                COALESCE(eu.total_entrevistas, 0) AS total_entrevistas,
                COALESCE(eu.entrevistas_finalizadas, 0) AS entrevistas_finalizadas,
                COALESCE(eu.puntaje_promedio, 0) AS puntaje_promedio,
                COALESCE(pt.consistencia, 0) AS consistencia,
                COALESCE(pt.tendencia, '→') AS tendencia,
                COALESCE(pt.nivel_actual, 'revisar') AS nivel_actual
            FROM estadisticas_usuario eu
            LEFT JOIN perfil_tecnico_usuario pt ON pt.usuario_id = eu.usuario_id
            WHERE eu.usuario_id = $1
        `;
        const result = await db.query(query, [usuarioId]);  // ✅ Usar db
        
        if (result.rows.length === 0) {
            return {
                racha_actual: 0,
                total_entrevistas: 0,
                entrevistas_finalizadas: 0,
                puntaje_promedio: 0,
                consistencia: 0,
                tendencia: '→',
                nivel_actual: 'revisar'
            };
        }
        
        return result.rows[0];
    }
}