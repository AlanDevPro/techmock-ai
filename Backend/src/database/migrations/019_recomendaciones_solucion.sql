-- =====================================================================
-- MIGRACIÓN 019: RECOMENDACIONES DE SOLUCIÓN
-- Sugerencias concretas que la IA genera al finalizar una evaluación.
-- Visible en el panel de entrevistas del desarrollador.
--
-- tipo:
--   'codigo'    → muestra un código_ejemplo de cómo hacerlo bien
--   'concepto'  → explica el concepto que debe reforzar
--   'recurso'   → link a documentación oficial, artículo, video
--   'patron'    → describe un patrón de diseño/arquitectura a aplicar
--
-- prioridad: 'alta' | 'media' | 'baja'
-- orden: para mostrar las recomendaciones en secuencia lógica
-- =====================================================================

CREATE TABLE IF NOT EXISTS recomendaciones_solucion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,

    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('codigo', 'concepto', 'recurso', 'patron')),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,

    codigo_ejemplo TEXT,          -- para tipo 'codigo'
    recurso_url VARCHAR(500),     -- para tipo 'recurso'
    recurso_titulo VARCHAR(200),  -- para tipo 'recurso'

    categoria_error_id INT,       -- error que motivó esta recomendación

    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    orden INT DEFAULT 0,

    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

CREATE INDEX idx_recomendaciones_evaluacion ON recomendaciones_solucion(evaluacion_id);
CREATE INDEX idx_recomendaciones_prioridad  ON recomendaciones_solucion(prioridad);
