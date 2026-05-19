-- ============================================================================
-- docker/postgres/init.sql
-- Script de inicialización de TechMock AI para PostgreSQL en Docker
-- Se ejecuta AUTOMÁTICAMENTE en el primer arranque del contenedor
-- ============================================================================

-- Habilitar extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLAS INDEPENDIENTES Y DE CONFIGURACIÓN GENERAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS empresa (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url TEXT,
    descripcion TEXT,
    sitio_web VARCHAR(200),
    email_contacto VARCHAR(150),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS niveles_dificultad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    descripcion TEXT,
    multiplicador_puntaje DECIMAL(3,2) DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS rubricas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    peso_porcentual DECIMAL(5,2) NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categorias_error (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('conceptual', 'experiencia')),
    tecnologia_id INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id) ON DELETE SET NULL
);

-- ============================================================================
-- 2. GESTIÓN DE USUARIOS, AUTENTICACIÓN Y SEGURIDAD
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(20) NOT NULL CONSTRAINT usuarios_rol_check CHECK (rol IN ('developer', 'admin')),
    avatar_url TEXT,
    github_url VARCHAR(200),
    linkedin_url VARCHAR(200),
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_providers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_uid TEXT,
    password_hash TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_uid),
    UNIQUE(user_id, provider),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT provider_password_logic CHECK (
        (provider = 'password' AND password_hash IS NOT NULL) OR
        (provider != 'password' AND password_hash IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    dispositivo VARCHAR(200),
    ip VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revocado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. BANCO DE PREGUNTAS Y ARTEFACTOS ADAPTATIVOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS preguntas (
    id SERIAL PRIMARY KEY,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    enunciado TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL CONSTRAINT preguntas_tipo_check CHECK (
        tipo IN ('live_coding', 'teoria', 'debugging', 'arquitectura', 'optimizacion')
    ),
    tiempo_estimado_min INT DEFAULT 30,
    activa BOOLEAN DEFAULT TRUE,
    generada_por_ia BOOLEAN DEFAULT FALSE,
    prompt_contexto TEXT,
    categorias_error_objetivo JSONB DEFAULT '[]',
    sesion_origen_id UUID,
    contexto_adaptativo JSONB,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creada_por UUID,
    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (nivel_id) REFERENCES niveles_dificultad(id),
    FOREIGN KEY (creada_por) REFERENCES usuarios(id)
);

-- ============================================================================
-- 4. MOTOR DE SESIONES DE ENTREVISTAS E INTERACCIÓN EN VIVO
-- ============================================================================

CREATE TABLE IF NOT EXISTS sesiones_entrevista (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    estado VARCHAR(30) DEFAULT 'en_progreso' CONSTRAINT sesiones_entrevista_estado_check CHECK (
        estado IN ('en_progreso', 'completada', 'abandonada', 'tiempo_agotado')
    ),
    fue_adaptativa BOOLEAN DEFAULT FALSE,
    sesion_anterior_id UUID,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    duracion_segundos INT,
    tiempo_limite_segundos INT DEFAULT 3600,
    ip_usuario VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (nivel_id) REFERENCES niveles_dificultad(id),
    FOREIGN KEY (pregunta_id) REFERENCES preguntas(id),
    FOREIGN KEY (sesion_anterior_id) REFERENCES sesiones_entrevista(id) ON DELETE SET NULL
);

-- FK cruzada entre preguntas y sesiones
ALTER TABLE preguntas
    DROP CONSTRAINT IF EXISTS fk_preguntas_sesion_origen;

ALTER TABLE preguntas
    ADD CONSTRAINT fk_preguntas_sesion_origen
    FOREIGN KEY (sesion_origen_id) REFERENCES sesiones_entrevista(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS mensajes (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    rol VARCHAR(10) NOT NULL CONSTRAINT mensajes_rol_check CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    tokens_usados INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. ENTORNO DE EJECUCIÓN DE CÓDIGO (IDE / SANDBOX)
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS ejecuciones_ide (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    envio_codigo_id BIGINT,
    kubernetes_job_name VARCHAR(200),
    kubernetes_namespace VARCHAR(100),
    estado VARCHAR(30) DEFAULT 'pending',
    payload_enviado JSONB,
    stdout TEXT,
    stderr TEXT,
    exit_code INT,
    tiempo_ejecucion_ms INT,
    memoria_usada_mb DECIMAL(8,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completado TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id),
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. INTELIGENCIA DE EVALUACIÓN Y ANÁLISIS DE ERRORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluaciones (
    id SERIAL PRIMARY KEY,
    sesion_id UUID UNIQUE NOT NULL,
    puntaje_total DECIMAL(5,2),
    puntaje_javascript DECIMAL(5,2),
    puntaje_arquitectura DECIMAL(5,2),
    puntaje_buenas_practicas DECIMAL(5,2),
    puntaje_comunicacion DECIMAL(5,2),
    puntaje_resolucion DECIMAL(5,2),
    nivel_candidato VARCHAR(20) CONSTRAINT evaluaciones_nivel_candidato_check CHECK (
        nivel_candidato IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),
    apto_para_contratacion BOOLEAN,
    feedback_general TEXT NOT NULL,
    resumen_para_reclutador TEXT,
    fortalezas TEXT,
    areas_mejora TEXT,
    sugerencias_recursos TEXT,
    generado_por_ia BOOLEAN DEFAULT TRUE,
    modelo_ia_usado VARCHAR(100),
    tokens_evaluacion INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS detalle_evaluacion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    rubrica_id INT NOT NULL,
    puntaje DECIMAL(5,2) NOT NULL,
    comentario TEXT,
    UNIQUE (evaluacion_id, rubrica_id),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (rubrica_id) REFERENCES rubricas(id)
);

CREATE TABLE IF NOT EXISTS errores_detectados (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    envio_codigo_id BIGINT,
    categoria_error_id INT NOT NULL,
    descripcion TEXT NOT NULL,
    severidad VARCHAR(20) NOT NULL DEFAULT 'medio' CHECK (
        severidad IN ('bajo', 'medio', 'alto', 'critico')
    ),
    es_error_conceptual BOOLEAN NOT NULL DEFAULT FALSE,
    linea_codigo INT,
    fragmento_codigo TEXT,
    codigo_corregido TEXT,
    explicacion_ia TEXT,
    detectado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE,
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id) ON DELETE SET NULL,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

CREATE TABLE IF NOT EXISTS recomendaciones_solucion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('codigo', 'concepto', 'recurso', 'patron')),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    codigo_ejemplo TEXT,
    recurso_url VARCHAR(500),
    recurso_titulo VARCHAR(200),
    categoria_error_id INT,
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    orden INT DEFAULT 0,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id) ON DELETE SET NULL
);

-- ============================================================================
-- 7. ANALYTICS, HISTORIAL Y COMUNICACIÓN EMPRESARIAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS estadisticas_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE NOT NULL,
    total_entrevistas INT DEFAULT 0,
    entrevistas_finalizadas INT DEFAULT 0,
    entrevistas_abandonadas INT DEFAULT 0,
    puntaje_promedio DECIMAL(5,2),
    mejor_puntaje DECIMAL(5,2),
    peor_puntaje DECIMAL(5,2),
    tiempo_promedio_segundos INT,
    tecnologia_favorita_id INT,
    racha_actual INT DEFAULT 0,
    racha_maxima INT DEFAULT 0,
    ultima_entrevista_fecha TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnologia_favorita_id) REFERENCES tecnologias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS perfil_tecnico_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE NOT NULL,
    score_global DECIMAL(5,2) DEFAULT 0,
    score_javascript DECIMAL(5,2) DEFAULT 0,
    score_arquitectura DECIMAL(5,2) DEFAULT 0,
    score_buenas_practicas DECIMAL(5,2) DEFAULT 0,
    score_comunicacion DECIMAL(5,2) DEFAULT 0,
    score_resolucion DECIMAL(5,2) DEFAULT 0,
    consistencia DECIMAL(5,2) DEFAULT 0,
    tendencia VARCHAR(20) DEFAULT 'estable',
    nivel_actual VARCHAR(20) CHECK (
        nivel_actual IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),
    total_sesiones INT DEFAULT 0,
    sesiones_completadas INT DEFAULT 0,
    sesiones_abandonadas INT DEFAULT 0,
    mejor_tecnologia_id INT,
    peor_tecnologia_id INT,
    ultima_evaluacion_id INT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (mejor_tecnologia_id) REFERENCES tecnologias(id) ON DELETE SET NULL,
    FOREIGN KEY (peor_tecnologia_id) REFERENCES tecnologias(id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS contactos_reclutamiento (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL,
    developer_id UUID NOT NULL,
    sesion_entrevista_id UUID,
    asunto VARCHAR(300) NOT NULL,
    mensaje TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'enviado',
    respuesta_developer TEXT,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id),
    FOREIGN KEY (developer_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (sesion_entrevista_id) REFERENCES sesiones_entrevista(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    url_accion VARCHAR(300),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. ÍNDICES DE OPTIMIZACIÓN
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email         ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_users_rol           ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_auth_provider_uid   ON auth_providers(provider, provider_uid);
CREATE INDEX IF NOT EXISTS idx_auth_user_provider  ON auth_providers(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario    ON sesiones_entrevista(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado     ON sesiones_entrevista(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_anterior   ON sesiones_entrevista(sesion_anterior_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_tecnologia ON preguntas(tecnologia_id);

CREATE INDEX IF NOT EXISTS idx_errores_sesion      ON errores_detectados(sesion_id);
CREATE INDEX IF NOT EXISTS idx_errores_categoria   ON errores_detectados(categoria_error_id);
CREATE INDEX IF NOT EXISTS idx_errores_severidad   ON errores_detectados(severidad);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_eval ON recomendaciones_solucion(evaluacion_id);

CREATE INDEX IF NOT EXISTS idx_eval_nivel_candidato ON evaluaciones(nivel_candidato);
CREATE INDEX IF NOT EXISTS idx_eval_apto            ON evaluaciones(apto_para_contratacion);
CREATE INDEX IF NOT EXISTS idx_perfil_usuario       ON perfil_tecnico_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perfil_score_global  ON perfil_tecnico_usuario(score_global DESC);
CREATE INDEX IF NOT EXISTS idx_perfil_nivel         ON perfil_tecnico_usuario(nivel_actual);
CREATE INDEX IF NOT EXISTS idx_debilidades_perfil   ON debilidades_usuario(perfil_id);

CREATE INDEX IF NOT EXISTS idx_debilidades_practica
    ON debilidades_usuario(requiere_practica)
    WHERE requiere_practica = TRUE;

-- ============================================================================
-- 9. VISTAS
-- ============================================================================

CREATE OR REPLACE VIEW vista_candidatos_reclutador AS
SELECT
    u.id AS usuario_id,
    u.nombre,
    u.apellido,
    u.email,
    u.github_url,
    u.linkedin_url,
    p.score_global,
    p.score_javascript,
    p.score_arquitectura,
    p.score_buenas_practicas,
    p.score_comunicacion,
    p.consistencia,
    p.tendencia,
    p.nivel_actual,
    p.total_sesiones,
    p.sesiones_completadas,
    e.racha_actual,
    e.ultima_entrevista_fecha,
    ev.feedback_general,
    ev.resumen_para_reclutador,
    ev.apto_para_contratacion,
    t_mejor.nombre AS mejor_tecnologia,
    t_peor.nombre  AS peor_tecnologia
FROM usuarios u
JOIN perfil_tecnico_usuario p   ON p.usuario_id = u.id
LEFT JOIN estadisticas_usuario e ON e.usuario_id = u.id
LEFT JOIN evaluaciones ev        ON ev.id = p.ultima_evaluacion_id
LEFT JOIN tecnologias t_mejor    ON t_mejor.id = p.mejor_tecnologia_id
LEFT JOIN tecnologias t_peor     ON t_peor.id  = p.peor_tecnologia_id
WHERE u.rol = 'developer' AND u.activo = TRUE;

-- ============================================================================
-- 10. SEEDS INICIALES
-- ============================================================================

-- Niveles de dificultad
INSERT INTO niveles_dificultad (nombre, descripcion, multiplicador_puntaje) VALUES
    ('junior',   'Nivel básico para developers con < 2 años de experiencia',  1.0),
    ('mid',      'Nivel intermedio para developers con 2-4 años',              1.3),
    ('senior',   'Nivel avanzado para developers con > 4 años',               1.6),
    ('lead',     'Nivel experto para tech leads y arquitectos',               2.0)
ON CONFLICT DO NOTHING;

-- Tecnologías iniciales
INSERT INTO tecnologias (nombre, slug, tipo, version_actual) VALUES
    ('React',       'react',       'frontend',  '18.x'),
    ('Vue.js',      'vue',         'frontend',  '3.x'),
    ('Node.js',     'nodejs',      'backend',   '20.x'),
    ('TypeScript',  'typescript',  'language',  '5.x'),
    ('PostgreSQL',  'postgresql',  'database',  '16.x'),
    ('Python',      'python',      'backend',   '3.12'),
    ('Docker',      'docker',      'devops',    '25.x'),
    ('Kubernetes',  'kubernetes',  'devops',    '1.29')
ON CONFLICT (slug) DO NOTHING;

-- Rúbricas de evaluación
INSERT INTO rubricas (nombre, descripcion, peso_porcentual) VALUES
    ('Correctitud',        'El código produce resultados correctos',          30.0),
    ('Legibilidad',        'El código es claro y bien estructurado',          20.0),
    ('Eficiencia',         'Uso óptimo de recursos y algoritmos',             20.0),
    ('Buenas Prácticas',   'Patrones, convenciones y estándares',             15.0),
    ('Comunicación',       'Claridad al explicar el razonamiento',            15.0)
ON CONFLICT DO NOTHING;

-- Categorías de error
INSERT INTO categorias_error (nombre, slug, tipo) VALUES
    ('Consumo APIs',         'consumo_apis',         'experiencia'),
    ('Manejo Estado',        'manejo_estado',        'experiencia'),
    ('Async Await',          'async_await',          'conceptual'),
    ('Componentes Props',    'componentes_props',    'conceptual'),
    ('CSS Layout',           'css_layout',           'experiencia'),
    ('TypeScript Tipos',     'typescript_tipos',     'experiencia'),
    ('Inmutabilidad',        'inmutabilidad',        'conceptual'),
    ('Optimización Renders', 'optimizacion_renders', 'experiencia')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Fin del script de inicialización
-- ============================================================================
\echo '✅ TechMock AI database initialized successfully!'