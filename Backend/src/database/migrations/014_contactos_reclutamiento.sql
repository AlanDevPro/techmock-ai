-- =====================================================================
-- MIGRACIÓN 014: CONTACTOS DE RECLUTAMIENTO
-- =====================================================================

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
    FOREIGN KEY (developer_id) REFERENCES usuarios(id),
    FOREIGN KEY (sesion_entrevista_id) REFERENCES sesiones_entrevista(id)
);
