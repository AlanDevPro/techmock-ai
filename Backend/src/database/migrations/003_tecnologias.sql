-- =====================================================================
-- MIGRACIÓN 003: TECNOLOGÍAS
-- =====================================================================

CREATE TABLE IF NOT EXISTS tecnologias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    version_actual VARCHAR(20),
    icono_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
