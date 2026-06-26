-- =====================================================================
-- MIGRACIÓN 022: VISTA PANEL DEL RECLUTADOR
-- Consolida en una sola consulta toda la información que un reclutador
-- o admin necesita para evaluar y comparar candidatos.
-- Solo muestra developers activos que tienen perfil técnico calculado.
-- =====================================================================

CREATE OR REPLACE VIEW vista_candidatos_reclutador AS
SELECT
    u.id                        AS usuario_id,
    u.nombre,
    u.apellido,
    u.email,
    u.github_url,
    u.linkedin_url,

    -- Perfil técnico histórico
    p.score_global,
    p.score_javascript,
    p.score_arquitectura,
    p.score_buenas_practicas,
    p.score_comunicacion,
    p.consistencia,
    p.tendencia,
    p.nivel_actual,

    -- Actividad
    p.total_sesiones,
    p.sesiones_completadas,
    e.racha_actual,
    e.ultima_entrevista_fecha,

    -- Última evaluación
    ev.feedback_general,
    ev.resumen_para_reclutador,
    ev.apto_para_contratacion,

    -- Stack
    t_mejor.nombre              AS mejor_tecnologia,
    t_peor.nombre               AS peor_tecnologia

FROM usuarios u
JOIN perfil_tecnico_usuario p   ON p.usuario_id  = u.id
LEFT JOIN estadisticas_usuario e ON e.usuario_id  = u.id
LEFT JOIN evaluaciones ev        ON ev.id         = p.ultima_evaluacion_id
LEFT JOIN tecnologias t_mejor    ON t_mejor.id    = p.mejor_tecnologia_id
LEFT JOIN tecnologias t_peor     ON t_peor.id     = p.peor_tecnologia_id
WHERE u.rol    = 'developer'
  AND u.activo = TRUE;
