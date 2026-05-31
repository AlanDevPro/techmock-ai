"""
app/api/routes/reclutador.py

Endpoints exclusivos para reclutadores y administradores.

ENDPOINTS:
  GET /reclutador/candidatos            → lista paginada de todos los candidatos
  GET /reclutador/candidato/{id}        → perfil completo de un candidato específico
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_current_user_id
from app.db.repositories import perfil_repo, sesiones_repo, evaluaciones_repo
from app.schemas.perfil import CandidatoReclutadorView, CandidatoDetalleResponse, ScoresPilaresHistoricos

router = APIRouter(prefix="/reclutador", tags=["Reclutador / Admin"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /reclutador/candidatos
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/candidatos",
    response_model=list[CandidatoReclutadorView],
    summary="Lista paginada de candidatos con sus scores técnicos",
)
async def listar_candidatos(
    nivel: Optional[str] = Query(
        None,
        description="Filtrar por nivel: descartado | revisar | promisorio | recomendado | destacado",
    ),
    apto: Optional[bool] = Query(
        None,
        description="Filtrar por apto_para_contratacion",
    ),
    tecnologia_slug: Optional[str] = Query(
        None,
        description="Filtrar por tecnología (slug, ej: vuejs, react)",
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(require_current_user_id),
):
    """
    Retorna la lista de candidatos usando la vista `vista_candidatos_reclutador` de BD.

    Campos clave por candidato:
      - Scores técnicos (global, javascript, arquitectura, etc.)
      - Nivel actual (promisorio, recomendado, destacado, ...)
      - apto_para_contratacion
      - Estadísticas de sesiones y racha
      - Feedback de la última evaluación

    Soporta filtros por nivel, aptitud y tecnología.
    """
    candidatos = await perfil_repo.listar_candidatos_para_reclutador(
        db=db,
        nivel=nivel,
        apto=apto,
        tecnologia_slug=tecnologia_slug,
        limit=limit,
        offset=offset,
    )

    return [
        CandidatoReclutadorView(
            usuario_id=str(c.usuario_id),
            nombre=c.nombre,
            apellido=c.apellido,
            email=c.email,
            github_url=c.github_url,
            linkedin_url=c.linkedin_url,
            score_global=float(c.score_global or 0),
            score_javascript=float(c.score_javascript or 0),
            score_arquitectura=float(c.score_arquitectura or 0),
            score_buenas_practicas=float(c.score_buenas_practicas or 0),
            score_comunicacion=float(c.score_comunicacion or 0),
            consistencia=float(c.consistencia or 0),
            tendencia=c.tendencia or "estable",
            nivel_actual=c.nivel_actual,
            total_sesiones=c.total_sesiones or 0,
            sesiones_completadas=c.sesiones_completadas or 0,
            racha_actual=c.racha_actual or 0,
            ultima_entrevista_fecha=c.ultima_entrevista_fecha,
            feedback_general=c.feedback_general,
            resumen_para_reclutador=c.resumen_para_reclutador,
            apto_para_contratacion=c.apto_para_contratacion,
            mejor_tecnologia=c.mejor_tecnologia,
            peor_tecnologia=c.peor_tecnologia,
        )
        for c in candidatos
    ]


# ─────────────────────────────────────────────────────────────────────────────
# GET /reclutador/candidato/{usuario_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/candidato/{usuario_id}",
    response_model=CandidatoDetalleResponse,
    summary="Perfil técnico completo de un candidato específico",
)
async def obtener_candidato(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(require_current_user_id),
):
    """
    Retorna el perfil técnico completo de un candidato para que el reclutador
    tome una decisión informada:

      - Scores por pilar (históricos)
      - Fortalezas y debilidades identificadas
      - Historial de sesiones recientes con sus evaluaciones
      - Últimas recomendaciones generadas por la IA
    """
    perfil = await perfil_repo.get_perfil_completo_candidato(db, usuario_id)
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato no encontrado o sin sesiones completadas.",
        )

    # Historial de sesiones recientes (últimas 10)
    sesiones_recientes = await sesiones_repo.get_sesiones_recientes_usuario(
        db=db,
        usuario_id=usuario_id,
        limit=10,
    )

    historial = [
        {
            "sesion_id":          str(s.id),
            "tecnologia":         s.tecnologia.nombre if s.tecnologia else "Desconocida",
            "fecha":              s.fecha_inicio,
            "estado":             s.estado,
            "fue_adaptativa":     s.fue_adaptativa,
            "puntaje_total":      float(s.evaluacion.puntaje_total) if s.evaluacion and s.evaluacion.puntaje_total else None,
            "nivel_candidato":    s.evaluacion.nivel_candidato if s.evaluacion else None,
            "apto":               s.evaluacion.apto_para_contratacion if s.evaluacion else None,
        }
        for s in sesiones_recientes
    ]

    # Debilidades activas (requiere_practica=True)
    debilidades = await perfil_repo.get_debilidades_usuario(
        db=db,
        perfil_id=perfil.id,
        solo_requiere_practica=True,
    )

    # Fortalezas con mayor confianza
    fortalezas = await perfil_repo.get_fortalezas_usuario(db, perfil.id)

    return CandidatoDetalleResponse(
        usuario_id=str(usuario_id),
        # Scores
        scores=ScoresPilaresHistoricos(
        global_=float(perfil.score_global or 0),
        javascript=float(perfil.score_javascript or 0),
        arquitectura=float(perfil.score_arquitectura or 0),
        buenas_practicas=float(perfil.score_buenas_practicas or 0),
        comunicacion=float(perfil.score_comunicacion or 0),
        resolucion=float(perfil.score_resolucion or 0),
        consistencia=float(perfil.consistencia or 0),
        ),
        consistencia=float(perfil.consistencia or 0),
        tendencia=perfil.tendencia or "estable",
        nivel_actual=perfil.nivel_actual,
        # Fortalezas
        fortalezas=[
            {
                "categoria": f.categoria_error.nombre if f.categoria_error else "",
                "veces_demostrada": f.veces_demostrada,
                "confianza": float(f.confianza or 0),
            }
            for f in fortalezas
        ],
        # Debilidades
        debilidades=[
            {
                "categoria":        d.categoria_error.nombre if d.categoria_error else "",
                "tipo":             d.categoria_error.tipo if d.categoria_error else "",
                "veces_fallada":    d.veces_fallada,
                "impacto":          float(d.impacto or 0),
                "requiere_practica": d.requiere_practica,
            }
            for d in debilidades
        ],
        # Historial
        historial_sesiones=historial,
        total_sesiones=perfil.total_sesiones or 0,
        sesiones_completadas=perfil.sesiones_completadas or 0,
    )