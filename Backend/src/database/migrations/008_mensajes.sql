-- =====================================================================
-- MIGRACIÓN 008: MENSAJES
-- =====================================================================

CREATE TABLE IF NOT EXISTS mensajes (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    rol VARCHAR(10) NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    tokens_usados INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);
