-- =====================================================================
-- PLATAFORMA DE ENTREVISTAS TÉCNICAS CON IA ADAPTATIVA
-- Esquema profesional completo
-- =====================================================================

-- =====================================================================
-- TABLAS EXISTENTES (sin cambios o con modificaciones menores)
-- =====================================================================

CREATE TABLE empresa (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url TEXT,
    descripcion TEXT,
    sitio_web VARCHAR(200),
    email_contacto VARCHAR(150),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('developer', 'admin', 'reclutador')),
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

CREATE TABLE auth_providers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_uid TEXT,
    password_hash TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_uid),
    UNIQUE(user_id, provider),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

ALTER TABLE auth_providers
ADD CONSTRAINT provider_password_logic
CHECK (
    (provider = 'password' AND password_hash IS NOT NULL)
    OR (provider != 'password' AND password_hash IS NULL)
);

CREATE TABLE refresh_tokens (
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

CREATE TABLE tecnologias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    version_actual VARCHAR(20),
    icono_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE niveles_dificultad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    descripcion TEXT,
    multiplicador_puntaje DECIMAL(3,2) DEFAULT 1.0
);

CREATE TABLE rubricas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    peso_porcentual DECIMAL(5,2) NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);

-- =====================================================================
-- NUEVA: CATEGORÍAS DE ERROR
-- Permite clasificar los errores detectados en el código del usuario
-- para que el sistema de IA sea adaptativo.
-- tipos: 'conceptual' (grave) | 'experiencia' (normal en junior)
-- Ejemplos de nombre: 'consumo_apis', 'manejo_estado', 'async_await',
--   'componentes_react', 'css_layout', 'typescript_tipos', etc.
-- =====================================================================

CREATE TABLE categorias_error (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT,
    -- 'conceptual' = error de fundamentos (grave, descalifica)
    -- 'experiencia' = error de práctica (normal en junior, mejorable)
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('conceptual', 'experiencia')),
    tecnologia_id INT,  -- NULL = aplica a todas las tecnologías
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id)
);

-- Datos de ejemplo para categorías de error
-- INSERT INTO categorias_error (nombre, slug, tipo) VALUES
--   ('Consumo de APIs', 'consumo_apis', 'experiencia'),
--   ('Manejo de estado', 'manejo_estado', 'experiencia'),
--   ('Async/Await y Promesas', 'async_await', 'conceptual'),
--   ('Componentes y props', 'componentes_props', 'conceptual'),
--   ('CSS Layout (Flex/Grid)', 'css_layout', 'experiencia'),
--   ('TypeScript tipos básicos', 'typescript_tipos', 'experiencia'),
--   ('Inmutabilidad de datos', 'inmutabilidad', 'conceptual'),
--   ('Optimización de renders', 'optimizacion_renders', 'experiencia');

-- =====================================================================
-- MODIFICADA: PREGUNTAS
-- Se añaden campos para el sistema adaptativo:
--   - categorias_error_objetivo: JSON array de slugs de errores que
--     esta pregunta está diseñada a evaluar/reforzar
--   - sesion_origen_id: referencia a la sesión que generó esta pregunta
--     (trazabilidad de por qué la IA generó esta pregunta)
--   - contexto_adaptativo: JSON con los errores del usuario que motivaron
--     la generación de esta pregunta
-- =====================================================================

CREATE TABLE preguntas (
    id SERIAL PRIMARY KEY,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    enunciado TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('live_coding', 'teoria', 'debugging', 'arquitectura', 'optimizacion')),
    tiempo_estimado_min INT DEFAULT 30,
    activa BOOLEAN DEFAULT TRUE,
    generada_por_ia BOOLEAN DEFAULT FALSE,
    prompt_contexto TEXT,

    -- NUEVO: Para sistema adaptativo
    -- Array JSON de slugs: ["consumo_apis", "async_await"]
    categorias_error_objetivo JSONB DEFAULT '[]',
    -- Referencia a la sesión que motivó la generación de esta pregunta
    sesion_origen_id UUID,
    -- Contexto que usó la IA para generar esta pregunta adaptativa
    contexto_adaptativo JSONB,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creada_por UUID,

    FOREIGN KEY (tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (nivel_id) REFERENCES niveles_dificultad(id),
    FOREIGN KEY (creada_por) REFERENCES usuarios(id)
);

-- =====================================================================
-- MODIFICADA: SESIONES DE ENTREVISTA
-- Se añaden campos para trazabilidad del sistema adaptativo:
--   - fue_adaptativa: indica si la pregunta fue generada adaptativamente
--   - sesion_anterior_id: referencia a la sesión previa del usuario
--     (para saber de qué errores se adaptó)
-- =====================================================================

CREATE TABLE sesiones_entrevista (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    estado VARCHAR(30) DEFAULT 'en_progreso' CHECK (
        estado IN ('en_progreso', 'completada', 'abandonada', 'tiempo_agotado')
    ),

    -- NUEVO: trazabilidad adaptativa
    fue_adaptativa BOOLEAN DEFAULT FALSE,
    sesion_anterior_id UUID,  -- sesión de la que se tomaron los errores

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
    FOREIGN KEY (sesion_anterior_id) REFERENCES sesiones_entrevista(id)
);

CREATE TABLE mensajes (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    rol VARCHAR(10) NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    tokens_usados INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

CREATE TABLE envios_codigo (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    lenguaje VARCHAR(50) NOT NULL,
    codigo TEXT NOT NULL,
    es_envio_final BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

CREATE TABLE ejecuciones_ide (
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
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id)
);

-- =====================================================================
-- NUEVA: ERRORES DETECTADOS
-- Registro granular de cada error identificado por la IA durante
-- la sesión. Es la tabla clave para el sistema adaptativo.
-- La IA analiza el código y los mensajes y registra aquí cada error.
-- =====================================================================

CREATE TABLE errores_detectados (
    id BIGSERIAL PRIMARY KEY,
    sesion_id UUID NOT NULL,
    envio_codigo_id BIGINT,  -- en qué versión del código ocurrió (puede ser NULL si es error conceptual en chat)
    categoria_error_id INT NOT NULL,

    -- Descripción específica del error en esta sesión
    descripcion TEXT NOT NULL,
    -- 'bajo' | 'medio' | 'alto' | 'critico'
    severidad VARCHAR(20) NOT NULL DEFAULT 'medio' CHECK (
        severidad IN ('bajo', 'medio', 'alto', 'critico')
    ),
    -- ¿Es un error de concepto (grave) o de práctica (mejorable)?
    es_error_conceptual BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contexto del error en el código
    linea_codigo INT,
    fragmento_codigo TEXT,  -- el fragmento exacto con el error
    codigo_corregido TEXT,  -- cómo debería haberse escrito

    -- Detalle de la IA
    explicacion_ia TEXT,    -- por qué es un error
    detectado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE,
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id),
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

-- =====================================================================
-- MODIFICADA: EVALUACIONES
-- Se añaden scores por pilar técnico (como describe el contexto),
-- indicador de aptitud para contratación, y nivel del candidato.
-- =====================================================================

CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,
    sesion_id UUID UNIQUE NOT NULL,

    -- Score global
    puntaje_total DECIMAL(5,2),

    -- Scores por pilar (0-100 cada uno)
    puntaje_javascript DECIMAL(5,2),       -- Dominio del lenguaje base
    puntaje_arquitectura DECIMAL(5,2),     -- Estructura de componentes, separación de responsabilidades
    puntaje_buenas_practicas DECIMAL(5,2), -- Clean code, naming, inmutabilidad
    puntaje_comunicacion DECIMAL(5,2),     -- Cómo explica su proceso (pensamiento en voz alta)
    puntaje_resolucion DECIMAL(5,2),       -- Cómo maneja el bloqueo, sabe buscar en docs

    -- Clasificación del candidato según el contexto de contratación
    -- 'descartado' | 'revisar' | 'promisorio' | 'recomendado' | 'destacado'
    nivel_candidato VARCHAR(20) CHECK (
        nivel_candidato IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),
    -- Flag directo para el reclutador/admin
    apto_para_contratacion BOOLEAN,

    -- Feedback narrativo (visible en el panel del usuario)
    feedback_general TEXT NOT NULL,
    fortalezas TEXT,      -- Qué hizo bien
    areas_mejora TEXT,    -- Qué debe mejorar
    -- NUEVO: Lo que el reclutador necesita saber
    resumen_para_reclutador TEXT,

    -- Metadata de generación
    generado_por_ia BOOLEAN DEFAULT TRUE,
    modelo_ia_usado VARCHAR(100),
    tokens_evaluacion INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sesion_id) REFERENCES sesiones_entrevista(id) ON DELETE CASCADE
);

CREATE TABLE detalle_evaluacion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,
    rubrica_id INT NOT NULL,
    puntaje DECIMAL(5,2) NOT NULL,
    comentario TEXT,
    UNIQUE (evaluacion_id, rubrica_id),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (rubrica_id) REFERENCES rubricas(id)
);

-- =====================================================================
-- NUEVA: RECOMENDACIONES DE SOLUCIÓN
-- Sugerencias concretas de la IA sobre cómo el usuario debería
-- haber resuelto el problema. Visible en el panel de entrevistas.
-- tipos: 'codigo' | 'concepto' | 'recurso' | 'patron'
-- prioridad: 'alta' | 'media' | 'baja'
-- =====================================================================

CREATE TABLE recomendaciones_solucion (
    id SERIAL PRIMARY KEY,
    evaluacion_id INT NOT NULL,

    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('codigo', 'concepto', 'recurso', 'patron')),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,

    -- Para tipo 'codigo': ejemplo de cómo debería haberse escrito
    codigo_ejemplo TEXT,
    -- Para tipo 'recurso': link a documentación, artículo, etc.
    recurso_url VARCHAR(500),
    recurso_titulo VARCHAR(200),

    -- Relacionado al error que motivó esta recomendación
    categoria_error_id INT,

    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    orden INT DEFAULT 0,  -- Para mostrarlas en orden lógico

    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

-- =====================================================================
-- NUEVA: PERFIL TÉCNICO DEL USUARIO
-- Agregación histórica del desempeño del usuario.
-- Es la tabla que un reclutador/admin consulta para decidir contratar.
-- Se recalcula tras cada sesión completada.
-- =====================================================================

CREATE TABLE perfil_tecnico_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE NOT NULL,

    -- Scores globales históricos (promedio ponderado de todas las sesiones)
    score_global DECIMAL(5,2) DEFAULT 0,
    score_javascript DECIMAL(5,2) DEFAULT 0,
    score_arquitectura DECIMAL(5,2) DEFAULT 0,
    score_buenas_practicas DECIMAL(5,2) DEFAULT 0,
    score_comunicacion DECIMAL(5,2) DEFAULT 0,
    score_resolucion DECIMAL(5,2) DEFAULT 0,

    -- Consistencia: qué tan estable es el desempeño entre sesiones
    -- Alta consistencia = confiable. Calculado como 100 - desviación estándar de puntajes
    consistencia DECIMAL(5,2) DEFAULT 0,

    -- Tendencia: '↑ mejorando' | '→ estable' | '↓ bajando'
    tendencia VARCHAR(20) DEFAULT 'estable',

    -- Clasificación actual (igual que en evaluaciones, pero histórica)
    nivel_actual VARCHAR(20) CHECK (
        nivel_actual IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')
    ),

    -- Conteos para estadísticas
    total_sesiones INT DEFAULT 0,
    sesiones_completadas INT DEFAULT 0,
    sesiones_abandonadas INT DEFAULT 0,

    -- Tecnología donde mejor/peor desempeño (FK a tecnologias)
    mejor_tecnologia_id INT,
    peor_tecnologia_id INT,

    -- Fecha de la última evaluación que actualizó este perfil
    ultima_evaluacion_id INT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (mejor_tecnologia_id) REFERENCES tecnologias(id),
    FOREIGN KEY (peor_tecnologia_id) REFERENCES tecnologias(id)
);

-- =====================================================================
-- NUEVA: FORTALEZAS DEL USUARIO
-- Categorías de error donde el usuario tiene buen desempeño consistente.
-- Alimenta el perfil técnico para el reclutador.
-- =====================================================================

CREATE TABLE fortalezas_usuario (
    id SERIAL PRIMARY KEY,
    perfil_id INT NOT NULL,
    categoria_error_id INT NOT NULL,  -- La categoría en la que es bueno

    descripcion VARCHAR(200),         -- "Maneja bien async/await en React"
    veces_demostrada INT DEFAULT 1,   -- Cuántas sesiones lo demostró
    -- Confianza estadística (0.0 - 1.0). Sube con más sesiones.
    confianza DECIMAL(3,2) DEFAULT 0.5,

    UNIQUE (perfil_id, categoria_error_id),
    FOREIGN KEY (perfil_id) REFERENCES perfil_tecnico_usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

-- =====================================================================
-- NUEVA: DEBILIDADES DEL USUARIO
-- Categorías de error donde el usuario falla consistentemente.
-- Alimenta el sistema adaptativo para generar preguntas enfocadas.
-- =====================================================================

CREATE TABLE debilidades_usuario (
    id SERIAL PRIMARY KEY,
    perfil_id INT NOT NULL,
    categoria_error_id INT NOT NULL,  -- La categoría en la que falla

    descripcion VARCHAR(200),         -- "Confunde estado local vs global"
    veces_fallada INT DEFAULT 1,      -- Cuántas sesiones tuvo este error
    -- Impacto en el score (0.0 - 1.0). Alto impacto = prioridad para práctica.
    impacto DECIMAL(3,2) DEFAULT 0.5,
    -- Flag para el sistema adaptativo: generar pregunta sobre esto
    requiere_practica BOOLEAN DEFAULT TRUE,

    UNIQUE (perfil_id, categoria_error_id),
    FOREIGN KEY (perfil_id) REFERENCES perfil_tecnico_usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_error_id) REFERENCES categorias_error(id)
);

-- =====================================================================
-- MODIFICADA: ESTADÍSTICAS DEL USUARIO
-- Se mantiene igual pero se añade referencia al perfil técnico
-- =====================================================================

CREATE TABLE estadisticas_usuario (
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

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnologia_favorita_id) REFERENCES tecnologias(id)
);

CREATE TABLE contactos_reclutamiento (
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
    FOREIGN KEY (developer_id) REFERENCES usuarios(id),
    FOREIGN KEY (sesion_entrevista_id) REFERENCES sesiones_entrevista(id)
);

CREATE TABLE notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    url_accion VARCHAR(300),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =====================================================================
-- ÍNDICES (performance)
-- =====================================================================

-- Usuarios
CREATE INDEX idx_users_email ON usuarios(email);
CREATE INDEX idx_users_rol ON usuarios(rol);

-- Auth
CREATE INDEX idx_auth_provider_uid ON auth_providers(provider, provider_uid);
CREATE INDEX idx_auth_user_provider ON auth_providers(user_id, provider);

-- Sesiones
CREATE INDEX idx_sesiones_usuario ON sesiones_entrevista(usuario_id);
CREATE INDEX idx_sesiones_estado ON sesiones_entrevista(estado);
CREATE INDEX idx_sesiones_anterior ON sesiones_entrevista(sesion_anterior_id);

-- Errores detectados
CREATE INDEX idx_errores_sesion ON errores_detectados(sesion_id);
CREATE INDEX idx_errores_categoria ON errores_detectados(categoria_error_id);
CREATE INDEX idx_errores_severidad ON errores_detectados(severidad);

-- Preguntas
CREATE INDEX idx_preguntas_tecnologia ON preguntas(tecnologia_id);
CREATE INDEX idx_preguntas_adaptativas ON preguntas(sesion_origen_id) WHERE sesion_origen_id IS NOT NULL;

-- Evaluaciones
CREATE INDEX idx_eval_nivel_candidato ON evaluaciones(nivel_candidato);
CREATE INDEX idx_eval_apto ON evaluaciones(apto_para_contratacion);

-- Perfil técnico (tabla más consultada por reclutadores)
CREATE INDEX idx_perfil_usuario ON perfil_tecnico_usuario(usuario_id);
CREATE INDEX idx_perfil_score_global ON perfil_tecnico_usuario(score_global DESC);
CREATE INDEX idx_perfil_nivel ON perfil_tecnico_usuario(nivel_actual);

-- Debilidades (tabla clave para el sistema adaptativo)
CREATE INDEX idx_debilidades_perfil ON debilidades_usuario(perfil_id);
CREATE INDEX idx_debilidades_practica ON debilidades_usuario(requiere_practica) WHERE requiere_practica = TRUE;

-- Recomendaciones
CREATE INDEX idx_recomendaciones_evaluacion ON recomendaciones_solucion(evaluacion_id);
CREATE INDEX idx_recomendaciones_prioridad ON recomendaciones_solucion(prioridad);

-- =====================================================================
-- FLUJO DEL SISTEMA ADAPTATIVO (comentario de documentación)
-- =====================================================================
--
-- 1. Usuario completa una sesión de entrevista
-- 2. La IA analiza el código y mensajes → registra en errores_detectados
-- 3. La IA genera la evaluación → registra en evaluaciones + recomendaciones_solucion
-- 4. El sistema actualiza perfil_tecnico_usuario:
--    - Recalcula scores promedio ponderados
--    - Actualiza fortalezas_usuario y debilidades_usuario
-- 5. En la siguiente sesión, el sistema consulta debilidades_usuario
--    donde requiere_practica = TRUE
-- 6. La IA genera una pregunta nueva con categorias_error_objetivo
--    apuntando a esas debilidades → la pregunta se marca fue_generada_ia = TRUE
--    y sesion_origen_id apunta a la sesión donde ocurrieron los errores
-- 7. sesiones_entrevista.fue_adaptativa = TRUE para trazabilidad
--
-- =====================================================================
-- VISTA PARA EL PANEL DEL RECLUTADOR/ADMIN (sugerida)
-- =====================================================================

CREATE OR REPLACE VIEW vista_candidatos_reclutador AS
SELECT
    u.id AS usuario_id,
    u.nombre,
    u.apellido,
    u.email,
    u.github_url,
    u.linkedin_url,

    -- Scores del perfil
    p.score_global,
    p.score_javascript,
    p.score_arquitectura,
    p.score_buenas_practicas,
    p.score_comunicacion,
    p.consistencia,
    p.tendencia,
    p.nivel_actual,

    -- Estadísticas
    p.total_sesiones,
    p.sesiones_completadas,
    e.racha_actual,
    e.ultima_entrevista_fecha,

    -- Última evaluación
    ev.feedback_general,
    ev.resumen_para_reclutador,
    ev.apto_para_contratacion,

    -- Tecnologías
    t_mejor.nombre AS mejor_tecnologia,
    t_peor.nombre AS peor_tecnologia

FROM usuarios u
JOIN perfil_tecnico_usuario p ON p.usuario_id = u.id
LEFT JOIN estadisticas_usuario e ON e.usuario_id = u.id
LEFT JOIN evaluaciones ev ON ev.id = p.ultima_evaluacion_id
LEFT JOIN tecnologias t_mejor ON t_mejor.id = p.mejor_tecnologia_id
LEFT JOIN tecnologias t_peor ON t_peor.id = p.peor_tecnologia_id
WHERE u.rol = 'developer' AND u.activo = TRUE;