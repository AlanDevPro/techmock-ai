-- =====================================================================
-- MIGRACIÓN 016: REFRESH TOKENS
-- =====================================================================

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
