-- =====================================================================
-- MIGRACIÓN 004: NIVELES DE DIFICULTAD
-- =====================================================================

CREATE TABLE IF NOT EXISTS niveles_dificultad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    descripcion TEXT,
    multiplicador_puntaje DECIMAL(3,2) DEFAULT 1.0
);
