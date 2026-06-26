-- =====================================================================
-- MIGRACIÓN 017: CATEGORÍAS DE ERROR
-- Clasificación de los errores que la IA puede detectar en el código
-- del usuario. Base del sistema adaptativo.
--
-- tipo:
--   'conceptual'  → error de fundamentos (grave, puede descalificar)
--   'experiencia' → error de práctica (normal en junior, mejorable)
--
-- tecnologia_id NULL = aplica a todas las tecnologías (ej. inmutabilidad,
--   async/await). Cuando no es NULL, es específico del stack (ej. hooks
--   de React, tipos de TypeScript).
-- =====================================================================

CREATE TABLE IF NOT EXISTS categorias_error (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('conceptual', 'experiencia')),
    tecnologia_id INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id)
);

-- -----------------------------------------------------------------------
-- Seed inicial — categorías transversales (tecnologia_id = NULL)
-- -----------------------------------------------------------------------
INSERT INTO categorias_error (nombre, slug, tipo) VALUES
    ('Async/Await y Promesas',      'async_await',          'conceptual'),
    ('Componentes y props',         'componentes_props',    'conceptual'),
    ('Inmutabilidad de datos',      'inmutabilidad',        'conceptual'),
    ('Consumo de APIs',             'consumo_apis',         'experiencia'),
    ('Manejo de estado',            'manejo_estado',        'experiencia'),
    ('CSS Layout (Flex/Grid)',       'css_layout',           'experiencia'),
    ('TypeScript tipos básicos',    'typescript_tipos',     'experiencia'),
    ('Optimización de renders',     'optimizacion_renders', 'experiencia');
