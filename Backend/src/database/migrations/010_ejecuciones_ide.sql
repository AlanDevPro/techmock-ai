-- =====================================================================
-- MIGRACIÓN 010: EJECUCIONES IDE (Kubernetes runner)
-- =====================================================================

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
    FOREIGN KEY (envio_codigo_id) REFERENCES envios_codigo(id)
);
