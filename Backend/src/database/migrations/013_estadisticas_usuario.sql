-- =====================================================================
-- MIGRACIÓN 013: ESTADÍSTICAS DEL USUARIO
-- =====================================================================

CREATE TABLE IF NOT EXISTS estadisticas_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE NOT NULL,
    total_entrevistas INT DEFAULT 0,
    entrevistas_finalizadas INT DEFAULT 0,
    entrevistas_abandonadas INT DEFAULT 0,
    puntaje_promedio DECIMAL(5,2),
    mejor_puntaje DECIMAL(5,2),
    peor_puntaje DECIMAL(5,2),
    tiempo_promedio_segundos INT,
    tecnologia_favorita_id INT,
    racha_actual INT DEFAULT 0,
    racha_maxima INT DEFAULT 0,
    ultima_entrevista_fecha TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnologia_favorita_id) REFERENCES tecnologias(id)
);
