-- =====================================================================
-- MIGRACIÓN 009: ENVÍOS DE CÓDIGO
-- =====================================================================

CREATE TABLE IF NOT EXISTS envios_codigo (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    lenguaje VARCHAR(50) NOT NULL,
    codigo TEXT NOT NULL,
    es_envio_final BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);
