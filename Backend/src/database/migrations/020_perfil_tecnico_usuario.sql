-- =====================================================================
-- MIGRACIÓN 020: PERFIL TÉCNICO DEL USUARIO
-- Agregación histórica del desempeño del usuario a través de todas
-- sus sesiones completadas. Se recalcula tras cada evaluación.
-- Es la tabla principal que consultan reclutadores y admins.
--
-- consistencia: 100 - desviación estándar de los puntajes históricos.
--   Alta consistencia = candidato confiable y predecible.
-- tendencia: calculada comparando últimas 3 sesiones vs anteriores.
-- ultima_evaluacion_id: FK diferida (evaluaciones aún no existe al
--   crear esta tabla — se resuelve con ALTER TABLE al final).
-- =====================================================================

CREATE TABLE IF NOT EXISTS perfil_tecnico_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE NOT NULL,

    -- Scores históricos (promedio ponderado de todas las sesiones)
    score_global DECIMAL(5,2) DEFAULT 0,
    score_javascript DECIMAL(5,2) DEFAULT 0,
    score_arquitectura DECIMAL(5,2) DEFAULT 0,
    score_buenas_practicas DECIMAL(5,2) DEFAULT 0,
    score_comunicacion DECIMAL(5,2) DEFAULT 0,
    score_resolucion DECIMAL(5,2) DEFAULT 0,

    -- Confiabilidad del candidato
    consistencia DECIMAL(5,2) DEFAULT 0,

    -- Evolución del desempeño
    tendencia VARCHAR(20) DEFAULT 'estable',

    -- Clasificación actual
    nivel_actual VARCHAR(20) CHECK (
        nivel_actual IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),

    -- Conteos
    total_sesiones INT DEFAULT 0,
    sesiones_completadas INT DEFAULT 0,
    sesiones_abandonadas INT DEFAULT 0,

    -- Stack del candidato
    mejor_tecnologia_id INT,
    peor_tecnologia_id INT,

    -- Última evaluación que actualizó este perfil
    ultima_evaluacion_id INT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (mejor_tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (peor_tecnologia_id) REFERENCES tecnologias(id)
    -- FK ultima_evaluacion_id → evaluaciones se agrega al final de este archivo
);

CREATE INDEX idx_perfil_usuario     ON perfil_tecnico_usuario(usuario_id);
CREATE INDEX idx_perfil_score_global ON perfil_tecnico_usuario(score_global DESC);
CREATE INDEX idx_perfil_nivel        ON perfil_tecnico_usuario(nivel_actual);

-- -----------------------------------------------------------------------
-- Cierre de FK: perfil_tecnico_usuario.ultima_evaluacion_id → evaluaciones
-- (evaluaciones ya existe, creada en 011)
-- -----------------------------------------------------------------------
ALTER TABLE perfil_tecnico_usuario
    ADD CONSTRAINT fk_perfil_ultima_evaluacion
    FOREIGN KEY (ultima_evaluacion_id) REFERENCES evaluaciones(id);
