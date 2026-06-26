-- =====================================================================
-- MIGRACIÓN 018: ERRORES DETECTADOS
-- Registro granular de cada error identificado por la IA durante
-- una sesión. Es la tabla clave que alimenta el sistema adaptativo.
--
-- La IA analiza código y mensajes y registra aquí cada error encontrado
-- con su severidad, contexto en el código y la explicación generada.
--
-- severidad: 'bajo' | 'medio' | 'alto' | 'critico'
-- es_error_conceptual se copia de categorias_error.tipo al insertar
--   (redundancia intencional para evitar JOINs en la lógica adaptativa)
-- =====================================================================

CREATE TABLE IF NOT EXISTS errores_detectados (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    envio_codigo_id BIGINT,       -- versión del código donde ocurrió; NULL si es error en chat
    categoria_error_id INT NOT NULL,

    descripcion TEXT NOT NULL,
    severidad VARCHAR(20) NOT NULL DEFAULT 'medio' CHECK (
        severidad IN ('bajo', 'medio', 'alto', 'critico')
    ),
    es_error_conceptual BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contexto en el código
    linea_codigo INT,
    fragmento_codigo TEXT,
    codigo_corregido TEXT,

    -- Análisis de la IA
    explicacion_ia TEXT,
    detectado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE,
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id),
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

CREATE INDEX idx_errores_sesion     ON errores_detectados(sesion_id);
CREATE INDEX idx_errores_categoria  ON errores_detectados(categoria_error_id);
CREATE INDEX idx_errores_severidad  ON errores_detectados(severidad);
