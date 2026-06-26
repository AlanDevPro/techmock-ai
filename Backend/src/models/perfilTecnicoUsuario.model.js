// 📁 src/models/perfilTecnicoUsuario.model.js (CREAR)
import pool from '../config/database.js';

export class PerfilTecnicoUsuario {
    static async findByUserId(userId) {
        const query = `
            SELECT * FROM perfil_tecnico_usuario 
            WHERE usuario_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
    
    static async actualizarPerfil(userId, data) {
        const query = `
            INSERT INTO perfil_tecnico_usuario (
                usuario_id,
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
                actualizado_en
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (usuario_id) 
            DO UPDATE SET
                score_global = EXCLUDED.score_global,
                score_javascript = EXCLUDED.score_javascript,
                score_arquitectura = EXCLUDED.score_arquitectura,
                score_buenas_practicas = EXCLUDED.score_buenas_practicas,
                score_comunicacion = EXCLUDED.score_comunicacion,
                score_resolucion = EXCLUDED.score_resolucion,
                consistencia = EXCLUDED.consistencia,
                tendencia = EXCLUDED.tendencia,
                nivel_actual = EXCLUDED.nivel_actual,
                total_sesiones = EXCLUDED.total_sesiones,
                sesiones_completadas = EXCLUDED.sesiones_completadas,
                actualizado_en = NOW()
        `;
        await pool.query(query, [
            userId,
            data.score_global || 0,
            data.score_javascript || 0,
            data.score_arquitectura || 0,
            data.score_buenas_practicas || 0,
            data.score_comunicacion || 0,
            data.score_resolucion || 0,
            data.consistencia || 0,
            data.tendencia || 'estable',
            data.nivel_actual || 'revisar',
            data.total_sesiones || 0,
            data.sesiones_completadas || 0
        ]);
    }
}