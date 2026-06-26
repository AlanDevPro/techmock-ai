-- =====================================================================
-- MIGRACIÓN 006: RÚBRICAS
-- =====================================================================

CREATE TABLE IF NOT EXISTS rubricas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    peso_porcentual DECIMAL(5,2) NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);
