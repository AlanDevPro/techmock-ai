-- =====================================================================
-- MIGRACIÓN 012: DETALLE DE EVALUACIÓN (score por rúbrica)
-- =====================================================================

CREATE TABLE IF NOT EXISTS detalle_evaluacion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    rubrica_id INT NOT NULL,
    puntaje DECIMAL(5,2) NOT NULL,
    comentario TEXT,
    UNIQUE (evaluacion_id, rubrica_id),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (rubrica_id) REFERENCES rubricas(id)
);
