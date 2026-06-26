-- =====================================================================
-- MIGRACIÓN 002: USUARIOS + AUTH_PROVIDERS (ACTUALIZADO)
-- =====================================================================

CREATE TABLE IF NOT EXISTS usuarios (
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
    ultimo_login TIMESTAMP,
    -- 🔴 NUEVAS COLUMNAS ADICIONADAS EXACTAMENTE COMO EN LA DB
    bio TEXT,
    website VARCHAR(200),
    location VARCHAR(200),
    twitter VARCHAR(100)
);

CREATE INDEX idx_users_email ON usuarios(email);
CREATE INDEX idx_users_rol ON usuarios(rol);

CREATE TABLE IF NOT EXISTS auth_providers (
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

CREATE INDEX idx_auth_provider_uid ON auth_providers(provider, provider_uid);
CREATE INDEX idx_auth_user_provider ON auth_providers(user_id, provider);