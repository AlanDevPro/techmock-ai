-- =====================================================================
-- MIGRACIÓN 001: EMPRESA
-- =====================================================================

CREATE TABLE IF NOT EXISTS empresa (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url TEXT,
    descripcion TEXT,
    sitio_web VARCHAR(200),
    email_contacto VARCHAR(150),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
