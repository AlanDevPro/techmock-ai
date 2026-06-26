// models/estadisticasUsuario.model.js
//import { db } from "../config/database.js";
//
//export const EstadisticasUsuarioModel = {
//  async findByUsuarioId(usuarioId) {
//    const result = await db.query(
//      "SELECT * FROM estadisticas_usuario WHERE usuario_id = $1",
//      [usuarioId]
//    );
//    return result.rows[0] || null;
//  },
//
//  async initIfNotExists(usuarioId) {
//    const result = await db.query(`
//      INSERT INTO estadisticas_usuario (usuario_id)
//      VALUES ($1)
//      ON CONFLICT (usuario_id) DO NOTHING
//      RETURNING *
//    `, [usuarioId]);
//    return result.rows[0] || null;
//  },
//
//  /**
//   * Recalcula todas las estadísticas del usuario desde cero.
//   * Se llama al finalizar una sesión.
//   */
//  async recalcular(usuarioId) {
//    const result = await db.query(`
//      UPDATE estadisticas_usuario SET
//        total_entrevistas        = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1),
//        entrevistas_finalizadas  = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1 AND estado = 'finalizada'),
//        entrevistas_abandonadas  = (SELECT COUNT(*) FROM sesiones_entrevista WHERE usuario_id = $1 AND estado = 'abandonada'),
//        puntaje_promedio         = (
//          SELECT ROUND(AVG(ev.puntaje_total)::numeric, 2)
//          FROM evaluaciones ev
//          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
//          WHERE s.usuario_id = $1
//        ),
//        mejor_puntaje            = (
//          SELECT MAX(ev.puntaje_total)
//          FROM evaluaciones ev
//          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
//          WHERE s.usuario_id = $1
//        ),
//        peor_puntaje             = (
//          SELECT MIN(ev.puntaje_total)
//          FROM evaluaciones ev
//          JOIN sesiones_entrevista s ON s.id = ev.sesion_id
//          WHERE s.usuario_id = $1
//        ),
//        tiempo_promedio_segundos = (
//          SELECT ROUND(AVG(duracion_segundos))
//          FROM sesiones_entrevista
//          WHERE usuario_id = $1 AND estado = 'finalizada' AND duracion_segundos IS NOT NULL
//        ),
//        tecnologia_favorita_id   = (
//          SELECT tecnologia_id FROM sesiones_entrevista
//          WHERE usuario_id = $1
//          GROUP BY tecnologia_id
//          ORDER BY COUNT(*) DESC
//          LIMIT 1
//        ),
//        ultima_entrevista_fecha  = (
//          SELECT MAX(fecha_inicio) FROM sesiones_entrevista WHERE usuario_id = $1
//        ),
//        fecha_actualizacion      = NOW()
//      WHERE usuario_id = $1
//      RETURNING *
//    `, [usuarioId]);
//    return result.rows[0] || null;
//  },
//
//  async getDashboardAdmin() {
//    const result = await db.query(`
//      SELECT
//        COUNT(DISTINCT u.id)                                          AS total_developers,
//        COUNT(DISTINCT s.id)                                          AS total_sesiones,
//        COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'finalizada')  AS sesiones_finalizadas,
//        ROUND(AVG(ev.puntaje_total)::numeric, 2)                      AS puntaje_promedio_global,
//        COUNT(DISTINCT s.id) FILTER (WHERE s.fecha_inicio >= NOW() - INTERVAL '30 days') AS sesiones_ultimo_mes
//      FROM usuarios u
//      LEFT JOIN sesiones_entrevista s  ON s.usuario_id    = u.id
//      LEFT JOIN evaluaciones ev        ON ev.sesion_id    = s.id
//      WHERE u.rol = 'developer'
//    `);
//    return result.rows[0];
//  },
//};




















// 📁 src/models/estadisticasUsuario.model.js
import { db } from '../config/database.js';

export class EstadisticasUsuarioModel {
    
    static async recalcular(usuarioId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Obtener todas las sesiones completadas
            const sesionesQuery = `
                SELECT 
                    s.id,
                    s.duracion_segundos,
                    e.puntaje_total,
                    s.fecha_inicio
                FROM sesiones_entrevista s
                LEFT JOIN evaluaciones e ON e.sesion_id = s.id
                WHERE s.usuario_id = $1 
                    AND s.estado = 'completada'
                    AND s.fecha_inicio >= NOW() - INTERVAL '30 days'
            `;
            const sesionesResult = await client.query(sesionesQuery, [usuarioId]);
            const sesiones = sesionesResult.rows;
            
            // 2. Calcular estadísticas
            const total = sesiones.length;
            const puntajes = sesiones.map(s => s.puntaje_total).filter(p => p !== null);
            const promedio = puntajes.length > 0 
                ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length 
                : 0;
            const mejor = puntajes.length > 0 ? Math.max(...puntajes) : 0;
            const peor = puntajes.length > 0 ? Math.min(...puntajes) : 0;
            const tiempoPromedio = sesiones
                .map(s => s.duracion_segundos)
                .filter(d => d !== null)
                .reduce((a, b) => a + b, 0) / (sesiones.length || 1);
            
            // 3. Calcular racha (días consecutivos con sesiones)
            const racha = await this.calcularRacha(usuarioId, client);
            
            // 4. Última sesión
            const ultima = sesiones.length > 0 
                ? sesiones.sort((a, b) => b.fecha_inicio - a.fecha_inicio)[0].fecha_inicio 
                : null;
            
            // 5. Tecnología favorita
            const techFavQuery = `
                SELECT tecnologia_id, COUNT(*) as count
                FROM sesiones_entrevista
                WHERE usuario_id = $1 AND estado = 'completada'
                GROUP BY tecnologia_id
                ORDER BY count DESC
                LIMIT 1
            `;
            const techFavResult = await client.query(techFavQuery, [usuarioId]);
            const tecnologiaFavorita = techFavResult.rows[0]?.tecnologia_id || null;
            
            // 6. Insertar/Actualizar estadísticas
            const upsertQuery = `
                INSERT INTO estadisticas_usuario (
                    usuario_id,
                    total_entrevistas,
                    entrevistas_finalizadas,
                    puntaje_promedio,
                    mejor_puntaje,
                    peor_puntaje,
                    tiempo_promedio_segundos,
                    racha_actual,
                    racha_maxima,
                    ultima_entrevista_fecha,
                    tecnologia_favorita_id,
                    fecha_actualizacion
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (usuario_id) 
                DO UPDATE SET
                    total_entrevistas = EXCLUDED.total_entrevistas,
                    entrevistas_finalizadas = EXCLUDED.entrevistas_finalizadas,
                    puntaje_promedio = EXCLUDED.puntaje_promedio,
                    mejor_puntaje = EXCLUDED.mejor_puntaje,
                    peor_puntaje = EXCLUDED.peor_puntaje,
                    tiempo_promedio_segundos = EXCLUDED.tiempo_promedio_segundos,
                    racha_actual = EXCLUDED.racha_actual,
                    racha_maxima = EXCLUDED.racha_maxima,
                    ultima_entrevista_fecha = EXCLUDED.ultima_entrevista_fecha,
                    tecnologia_favorita_id = EXCLUDED.tecnologia_favorita_id,
                    fecha_actualizacion = NOW()
                RETURNING *
            `;
            
            const result = await client.query(upsertQuery, [
                usuarioId,
                total,
                total, // entrevistas_finalizadas (todas completadas)
                promedio,
                mejor,
                peor,
                tiempoPromedio,
                racha.actual,
                racha.maxima,
                ultima,
                tecnologiaFavorita
            ]);
            
            await client.query('COMMIT');
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error en recalcular:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    static async calcularRacha(usuarioId, client) {
        // Obtener fechas de sesiones completadas en los últimos 30 días
        const query = `
            SELECT DISTINCT DATE(fecha_inicio) as fecha
            FROM sesiones_entrevista
            WHERE usuario_id = $1 
                AND estado = 'completada'
                AND fecha_inicio >= NOW() - INTERVAL '30 days'
            ORDER BY fecha DESC
        `;
        const result = await client.query(query, [usuarioId]);
        const fechas = result.rows.map(r => new Date(r.fecha));
        
        if (fechas.length === 0) {
            return { actual: 0, maxima: 0 };
        }
        
        // Calcular racha actual
        let rachaActual = 0;
        let rachaMaxima = 0;
        let rachaTemp = 0;
        let fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        
        // Verificar si hay sesión hoy
        const hoy = fechas.some(f => 
            f.getFullYear() === fechaActual.getFullYear() &&
            f.getMonth() === fechaActual.getMonth() &&
            f.getDate() === fechaActual.getDate()
        );
        
        if (hoy) {
            rachaActual = 1;
            // Verificar días consecutivos hacia atrás
            let fechaCheck = new Date(fechaActual);
            fechaCheck.setDate(fechaCheck.getDate() - 1);
            
            while (true) {
                const existe = fechas.some(f =>
                    f.getFullYear() === fechaCheck.getFullYear() &&
                    f.getMonth() === fechaCheck.getMonth() &&
                    f.getDate() === fechaCheck.getDate()
                );
                if (!existe) break;
                rachaActual++;
                fechaCheck.setDate(fechaCheck.getDate() - 1);
            }
        }
        
        // Calcular racha máxima (más simple: contar días consecutivos)
        const fechasSet = new Set(fechas.map(f => f.toDateString()));
        let temp = 0;
        let max = 0;
        let fechaInicio = new Date(fechas[fechas.length - 1]);
        
        for (let d = new Date(fechaInicio); d <= new Date(); d.setDate(d.getDate() + 1)) {
            if (fechasSet.has(d.toDateString())) {
                temp++;
                max = Math.max(max, temp);
            } else {
                temp = 0;
            }
        }
        
        return { actual: rachaActual, maxima: max };
    }
}