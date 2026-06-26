-- =====================================================================
-- MIGRACIÓN 005: PREGUNTAS
-- Incluye campos para el sistema adaptativo:
--   - categorias_error_objetivo: slugs de errores que evalúa esta pregunta
--   - sesion_origen_id: sesión que motivó la generación adaptativa
--   - contexto_adaptativo: contexto JSON usado por la IA al generarla
-- NOTA: sesion_origen_id referencia sesiones_entrevista (creada en 007).
--       La FK se agrega en 007 para respetar el orden de dependencias.
-- =====================================================================

CREATE TABLE IF NOT EXISTS preguntas (
    id SERIAL PRIMARY KEY,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    enunciado TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('live_coding', 'teoria', 'debugging', 'arquitectura', 'optimizacion')),
    tiempo_estimado_min INT DEFAULT 30,
    activa BOOLEAN DEFAULT TRUE,
    generada_por_ia BOOLEAN DEFAULT FALSE,
    prompt_contexto TEXT,

    -- Sistema adaptativo
    categorias_error_objetivo JSONB DEFAULT '[]',
    sesion_origen_id UUID,       -- FK añadida en 007_sesiones_entrevista.sql
    contexto_adaptativo JSONB,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creada_por UUID,

    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (nivel_id) REFERENCES niveles_dificultad(id),
    FOREIGN KEY (creada_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_preguntas_tecnologia ON preguntas(tecnologia_id);
-- idx_preguntas_adaptativas se crea en 007 junto con la FK
