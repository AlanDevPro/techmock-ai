-- =====================================================================
-- MIGRACIÓN 021: FORTALEZAS Y DEBILIDADES DEL USUARIO
-- Alimentan el perfil técnico con categorías específicas de acierto
-- y fallo. Son las tablas que controlan qué preguntas adaptativas
-- se generan en la siguiente sesión.
--
-- FORTALEZAS: categorías donde el usuario demuestra dominio consistente.
--   confianza (0.0 - 1.0): sube con más sesiones que lo confirman.
--
-- DEBILIDADES: categorías donde el usuario falla consistentemente.
--   impacto (0.0 - 1.0): qué tanto afecta al score global.
--   requiere_practica: flag para el motor adaptativo; cuando TRUE la IA
--     generará una pregunta enfocada en esa debilidad.
-- =====================================================================

-- -----------------------------------------------------------------------
-- FORTALEZAS
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fortalezas_usuario (
    id SERIAL PRIMARY KEY,
    perfil_id INT NOT NULL,
    categoria_error_id INT NOT NULL,

    descripcion VARCHAR(200),
    veces_demostrada INT DEFAULT 1,
    confianza DECIMAL(3,2) DEFAULT 0.5,

    UNIQUE (perfil_id, categoria_error_id),
    FOREIGN KEY (perfil_id) REFERENCES perfil_tecnico_usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

-- -----------------------------------------------------------------------
-- DEBILIDADES
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debilidades_usuario (
    id SERIAL PRIMARY KEY,
    perfil_id INT NOT NULL,
    categoria_error_id INT NOT NULL,

    descripcion VARCHAR(200),
    veces_fallada INT DEFAULT 1,
    impacto DECIMAL(3,2) DEFAULT 0.5,
    requiere_practica BOOLEAN DEFAULT TRUE,

    UNIQUE (perfil_id, categoria_error_id),
    FOREIGN KEY (perfil_id) REFERENCES perfil_tecnico_usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

CREATE INDEX idx_debilidades_perfil    ON debilidades_usuario(perfil_id);
CREATE INDEX idx_debilidades_practica  ON debilidades_usuario(requiere_practica)
    WHERE requiere_practica = TRUE;
