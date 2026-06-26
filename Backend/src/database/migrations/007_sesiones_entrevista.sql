-- =====================================================================
-- MIGRACIÓN 007: SESIONES DE ENTREVISTA
-- Incluye campos de trazabilidad adaptativa:
--   - fue_adaptativa: indica si la sesión usó una pregunta generada por IA
--   - sesion_anterior_id: sesión previa de la que se tomaron los errores
--
-- También cierra el ciclo de FK con preguntas:
--   - preguntas.sesion_origen_id → sesiones_entrevista(id)
-- =====================================================================

CREATE TABLE IF NOT EXISTS sesiones_entrevista (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    tecnologia_id INT NOT NULL,
    nivel_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    estado VARCHAR(30) DEFAULT 'en_progreso' CHECK (
        estado IN ('en_progreso', 'completada', 'abandonada', 'tiempo_agotado')
    ),

    -- Trazabilidad adaptativa
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
    FOREIGN KEY (sesion_anterior_id) REFERENCES sesiones_entrevista(id)
);

CREATE INDEX idx_sesiones_usuario ON sesiones_entrevista(usuario_id);
CREATE INDEX idx_sesiones_estado ON sesiones_entrevista(estado);
CREATE INDEX idx_sesiones_anterior ON sesiones_entrevista(sesion_anterior_id);

-- -----------------------------------------------------------------------
-- Cierre del ciclo de FK: preguntas.sesion_origen_id → sesiones_entrevista
-- (No se pudo declarar en 005 porque sesiones_entrevista no existía aún)
-- -----------------------------------------------------------------------

ALTER TABLE preguntas
    ADD CONSTRAINT fk_preguntas_sesion_origen
    FOREIGN KEY (sesion_origen_id) REFERENCES sesiones_entrevista(id);

CREATE INDEX idx_preguntas_adaptativas
    ON preguntas(sesion_origen_id)
    WHERE sesion_origen_id IS NOT NULL;
