// services/estadisticas.service.js
//import { EstadisticasUsuarioModel } from "../models/estadisticasUsuario.model.js";
//
///**
// * Recalcula todas las estadísticas agregadas de un usuario.
// * Se llama al finalizar una sesión y después de guardar una evaluación.
// */
//export async function recalcularEstadisticas(usuarioId) {
//  console.log(`📈 [STATS] Recalculando estadísticas para usuario: ${usuarioId}`);
//  try {
//    const stats = await EstadisticasUsuarioModel.recalcular(usuarioId);
//    console.log(`✅ [STATS] Estadísticas actualizadas:`, {
//      total_entrevistas:       stats.total_entrevistas,
//      entrevistas_finalizadas: stats.entrevistas_finalizadas,
//      puntaje_promedio:        stats.puntaje_promedio,
//      mejor_puntaje:           stats.mejor_puntaje,
//    });
//    return stats;
//  } catch (error) {
//    console.error(`❌ [STATS] Error al recalcular estadísticas:`, error.message);
//    throw error;
//  }
//}




// 📁 src/services/estadisticas.service.js
import { db } from '../config/database.js';
import { EstadisticasUsuarioModel } from '../models/estadisticasUsuario.model.js';

export class EstadisticasService {
    
    /**
     * Obtiene las estadísticas generales de un usuario
     * Esta es la versión que usa tu frontend
     */
    static async obtenerEstadisticasGenerales(userId) {
        try {
            const query = `
                SELECT 
                    eu.racha_actual,
                    eu.total_entrevistas,
                    eu.entrevistas_finalizadas,
                    eu.entrevistas_abandonadas,
                    eu.puntaje_promedio,
                    eu.mejor_puntaje,
                    eu.peor_puntaje,
                    eu.tiempo_promedio_segundos,
                    eu.racha_actual,
                    eu.racha_maxima,
                    eu.ultima_entrevista_fecha,
                    pt.consistencia,
                    pt.tendencia,
                    pt.nivel_actual,
                    pt.score_global
                FROM estadisticas_usuario eu
                LEFT JOIN perfil_tecnico_usuario pt ON pt.usuario_id = eu.usuario_id
                WHERE eu.usuario_id = $1
            `;
            const result = await pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                // Si no hay estadísticas, devolver valores por defecto
                return {
                    racha_actual: 0,
                    total_entrevistas: 0,
                    entrevistas_finalizadas: 0,
                    entrevistas_abandonadas: 0,
                    puntaje_promedio: 0,
                    mejor_puntaje: 0,
                    peor_puntaje: 0,
                    tiempo_promedio_segundos: 0,
                    racha_maxima: 0,
                    ultima_entrevista_fecha: null,
                    consistencia: 0,
                    tendencia: '→',
                    nivel_actual: 'revisar',
                    score_global: 0
                };
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en obtenerEstadisticasGenerales:', error);
            throw error;
        }
    }
    
    /**
     * Calcula la tendencia del usuario basado en las últimas 5 sesiones
     */
    static async calcularTendencia(userId) {
        try {
            const query = `
                SELECT e.puntaje_total
                FROM sesiones_entrevista s
                JOIN evaluaciones e ON e.sesion_id = s.id
                WHERE s.usuario_id = $1 
                    AND s.estado = 'completada'
                    AND e.puntaje_total IS NOT NULL
                ORDER BY s.fecha_inicio DESC
                LIMIT 5
            `;
            const result = await pool.query(query, [userId]);
            const scores = result.rows.map(r => r.puntaje_total);
            
            if (scores.length < 3) return '→';
            
            // Calcular tendencia simple
            const first = scores.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
            const last = scores.slice(-2).reduce((a, b) => a + b, 0) / 2;
            const diff = last - first;
            
            if (diff > 5) return '↑';
            if (diff < -5) return '↓';
            return '→';
        } catch (error) {
            console.error('❌ Error en calcularTendencia:', error);
            return '→';
        }
    }
    
    /**
     * Calcula la consistencia del usuario (desviación estándar inversa)
     * 100 - (desviación estándar * 10) = consistencia
     */
    static async calcularConsistencia(userId) {
        try {
            const query = `
                SELECT e.puntaje_total
                FROM sesiones_entrevista s
                JOIN evaluaciones e ON e.sesion_id = s.id
                WHERE s.usuario_id = $1 
                    AND s.estado = 'completada'
                    AND e.puntaje_total IS NOT NULL
                ORDER BY s.fecha_inicio DESC
                LIMIT 10
            `;
            const result = await pool.query(query, [userId]);
            const scores = result.rows.map(r => r.puntaje_total);
            
            if (scores.length < 2) return 0;
            
            // Calcular desviación estándar
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            
            // Consistencia = 100 - (desviación * 10), mínimo 0
            const consistencia = Math.max(0, 100 - (stdDev * 10));
            return Math.round(consistencia);
        } catch (error) {
            console.error('❌ Error en calcularConsistencia:', error);
            return 0;
        }
    }
    
    /**
     * RECALCULAR TODAS LAS ESTADÍSTICAS
     * Esta función integra la lógica anterior que tenías
     * Se llama al finalizar una sesión
     */
    static async recalcularEstadisticas(usuarioId) {
        console.log(`📈 [STATS] Recalculando estadísticas para usuario: ${usuarioId}`);
        try {
            // 1. Recalcular usando el modelo existente
            const stats = await EstadisticasUsuarioModel.recalcular(usuarioId);
            
            console.log(`✅ [STATS] Estadísticas actualizadas:`, {
                total_entrevistas: stats.total_entrevistas,
                entrevistas_finalizadas: stats.entrevistas_finalizadas,
                puntaje_promedio: stats.puntaje_promedio,
                mejor_puntaje: stats.mejor_puntaje,
                racha_actual: stats.racha_actual
            });
            
            // 2. Actualizar campos adicionales en perfil_tecnico_usuario
            await this.actualizarPerfilTecnico(usuarioId);
            
            return stats;
        } catch (error) {
            console.error(`❌ [STATS] Error al recalcular estadísticas:`, error.message);
            throw error;
        }
    }
    
    /**
     * Actualiza el perfil técnico del usuario
     */
    static async actualizarPerfilTecnico(userId) {
        try {
            // Calcular tendencia
            const tendencia = await this.calcularTendencia(userId);
            
            // Calcular consistencia
            const consistencia = await this.calcularConsistencia(userId);
            
            // Obtener estadísticas generales
            const stats = await this.obtenerEstadisticasGenerales(userId);
            
            // Determinar nivel del candidato basado en el score promedio
            const nivel = this.determinarNivel(stats.puntaje_promedio || 0);
            
            // Actualizar perfil técnico
            const query = `
                INSERT INTO perfil_tecnico_usuario (
                    usuario_id,
                    score_global,
                    consistencia,
                    tendencia,
                    nivel_actual,
                    total_sesiones,
                    sesiones_completadas,
                    actualizado_en
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (usuario_id) 
                DO UPDATE SET
                    score_global = EXCLUDED.score_global,
                    consistencia = EXCLUDED.consistencia,
                    tendencia = EXCLUDED.tendencia,
                    nivel_actual = EXCLUDED.nivel_actual,
                    total_sesiones = EXCLUDED.total_sesiones,
                    sesiones_completadas = EXCLUDED.sesiones_completadas,
                    actualizado_en = NOW()
            `;
            
            await pool.query(query, [
                userId,
                stats.puntaje_promedio || 0,
                consistencia,
                tendencia,
                nivel,
                stats.total_entrevistas || 0,
                stats.entrevistas_finalizadas || 0
            ]);
            
            console.log(`✅ [STATS] Perfil técnico actualizado para usuario: ${userId}`);
        } catch (error) {
            console.error(`❌ [STATS] Error al actualizar perfil técnico:`, error.message);
            throw error;
        }
    }
    
    /**
     * Determina el nivel del candidato basado en el score
     */
    static determinarNivel(score) {
        if (score >= 85) return 'destacado';
        if (score >= 70) return 'recomendado';
        if (score >= 55) return 'promisorio';
        if (score >= 40) return 'revisar';
        return 'descartado';
    }
    
    /**
     * Obtiene estadísticas detalladas para un usuario
     * Versión mejorada con más información
     */
    static async obtenerEstadisticasDetalladas(userId) {
        try {
            const stats = await this.obtenerEstadisticasGenerales(userId);
            const tendencia = await this.calcularTendencia(userId);
            const consistencia = await this.calcularConsistencia(userId);
            
            // Obtener tecnologías más usadas
            const techQuery = `
                SELECT 
                    t.nombre,
                    t.slug,
                    COUNT(s.id) as total_sesiones,
                    AVG(e.puntaje_total) as promedio
                FROM sesiones_entrevista s
                JOIN tecnologias t ON t.id = s.tecnologia_id
                JOIN evaluaciones e ON e.sesion_id = s.id
                WHERE s.usuario_id = $1 AND s.estado = 'completada'
                GROUP BY t.id, t.nombre, t.slug
                ORDER BY total_sesiones DESC
                LIMIT 3
            `;
            const techResult = await pool.query(techQuery, [userId]);
            
            return {
                ...stats,
                tendencia,
                consistencia,
                tecnologias_principales: techResult.rows,
                nivel: this.determinarNivel(stats.puntaje_promedio || 0)
            };
        } catch (error) {
            console.error('❌ Error en obtenerEstadisticasDetalladas:', error);
            throw error;
        }
    }
}

// ─── Función exportada para compatibilidad con la versión anterior ──────────

/**
 * Función exportada para mantener compatibilidad con el código existente
 * que usa la función 'recalcularEstadisticas' directamente
 */
export async function recalcularEstadisticas(usuarioId) {
    return EstadisticasService.recalcularEstadisticas(usuarioId);
}

// También exportamos una instancia del servicio para usar como objeto
export default EstadisticasService;