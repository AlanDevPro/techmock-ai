-- =====================================================================
-- TABLA DE CONTROL DE MIGRACIONES
-- Registra qué migraciones ya fueron ejecutadas para evitar
-- re-ejecutar scripts en despliegues posteriores.
-- =====================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    id           SERIAL PRIMARY KEY,
    filename     VARCHAR(255) UNIQUE NOT NULL,
    executed_at  TIMESTAMP DEFAULT NOW()
);