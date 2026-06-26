-- =====================================================================
-- MIGRACIÓN 011: EVALUACIONES
-- Scores por pilar técnico, clasificación del candidato y campos
-- para el panel del reclutador.
-- Pilares: javascript, arquitectura, buenas_practicas, comunicacion,
--          resolucion_problemas.
-- Niveles: descartado | revisar | promisorio | recomendado | destacado
-- =====================================================================

CREATE TABLE IF NOT EXISTS evaluaciones (
    id SERIAL PRIMARY KEY,
    sesion_id UUID UNIQUE NOT NULL,

    -- Score global (0-100)
    puntaje_total DECIMAL(5,2),

    -- Scores por pilar (0-100 cada uno)
    puntaje_javascript DECIMAL(5,2),
    puntaje_arquitectura DECIMAL(5,2),
    puntaje_buenas_practicas DECIMAL(5,2),
    puntaje_comunicacion DECIMAL(5,2),
    puntaje_resolucion DECIMAL(5,2),

    -- Clasificación del candidato
    nivel_candidato VARCHAR(20) CHECK (
        nivel_candidato IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),
    apto_para_contratacion BOOLEAN,

    -- Feedback narrativo
    feedback_general TEXT NOT NULL,
    fortalezas TEXT,
    areas_mejora TEXT,
    resumen_para_reclutador TEXT,

    -- Metadata de generación
    generado_por_ia BOOLEAN DEFAULT TRUE,
    modelo_ia_usado VARCHAR(100),
    tokens_evaluacion INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

CREATE INDEX idx_eval_nivel_candidato ON evaluaciones(nivel_candidato);
CREATE INDEX idx_eval_apto ON evaluaciones(apto_para_contratacion);
