"""
app/api/routes/perfil_tecnico.py

Endpoints del perfil técnico del usuario (developer).

ENDPOINTS:
  GET /usuario/{usuario_id}/perfil      → scores históricos + nivel actual
  GET /usuario/{usuario_id}/debilidades → áreas donde falla, para mostrar en dashboard
  GET /usuario/{usuario_id}/fortalezas  → áreas donde destaca
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_current_user_id
from app.db.repositories import perfil_repo
from app.schemas.perfil import (
    PerfilTecnicoResponse,
    DebilidadResponse,
    FortalezaResponse,
    ScoresPilaresHistoricos,
)

router = APIRouter(prefix="/usuario", tags=["Perfil Técnico"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /usuario/{usuario_id}/perfil
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{usuario_id}/perfil",
    response_model=PerfilTecnicoResponse,
    summary="Scores históricos y nivel técnico actual del usuario",
)
async def obtener_perfil_tecnico(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(require_current_user_id),
):
    """
    Retorna el perfil técnico agregado del usuario:
      - Scores por pilar (javascript, arquitectura, buenas_practicas, etc.)
      - Consistencia y tendencia (mejorando/estable/bajando)
      - Nivel actual (descartado → destacado)
      - Estadísticas de sesiones completadas/abandonadas

    Solo el propio usuario o un admin/reclutador puede ver este perfil.
    """
    perfil = await perfil_repo.get_perfil_por_usuario(db, usuario_id)
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil técnico no encontrado. El usuario aún no tiene sesiones completadas.",
        )

    estadisticas = await perfil_repo.get_estadisticas_usuario(db, usuario_id)

    return PerfilTecnicoResponse(
        usuario_id=str(usuario_id),
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
        total_sesiones=perfil.total_sesiones or 0,
        sesiones_completadas=perfil.sesiones_completadas or 0,
        sesiones_abandonadas=perfil.sesiones_abandonadas or 0,
        mejor_tecnologia=perfil.mejor_tecnologia.nombre if perfil.mejor_tecnologia else None,
        peor_tecnologia=perfil.peor_tecnologia.nombre if perfil.peor_tecnologia else None,
        # Estadísticas adicionales de la tabla estadisticas_usuario
        racha_actual=estadisticas.racha_actual if estadisticas else 0,
        ultima_entrevista_fecha=estadisticas.ultima_entrevista_fecha if estadisticas else None,
        actualizado_en=perfil.actualizado_en,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /usuario/{usuario_id}/debilidades
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{usuario_id}/debilidades",
    response_model=list[DebilidadResponse],
    summary="Áreas técnicas donde el usuario falla consistentemente",
)
async def obtener_debilidades(
    usuario_id: UUID,
    solo_requiere_practica: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(require_current_user_id),
):
    """
    Retorna las debilidades del usuario ordenadas por impacto descendente.

    El parámetro `solo_requiere_practica=true` (default) filtra solo
    las debilidades donde `requiere_practica = TRUE`, que son las que
    el sistema adaptativo usa para generar preguntas enfocadas.

    Usado por:
      - Dashboard del developer para ver su plan de mejora
      - Sistema adaptativo para generar preguntas enfocadas
    """
    perfil = await perfil_repo.get_perfil_por_usuario(db, usuario_id)
    if not perfil:
        return []

    debilidades = await perfil_repo.get_debilidades_usuario(
        db=db,
        perfil_id=perfil.id,
        solo_requiere_practica=solo_requiere_practica,
    )

    return [
        DebilidadResponse(
            categoria_slug=d.categoria_error.slug if d.categoria_error else "",
            categoria_nombre=d.categoria_error.nombre if d.categoria_error else "",
            tipo_error=d.categoria_error.tipo if d.categoria_error else "",
            descripcion=d.descripcion,
            veces_fallada=d.veces_fallada,
            impacto=float(d.impacto or 0),
            requiere_practica=d.requiere_practica,
        )
        for d in debilidades
    ]


# ─────────────────────────────────────────────────────────────────────────────
# GET /usuario/{usuario_id}/fortalezas
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{usuario_id}/fortalezas",
    response_model=list[FortalezaResponse],
    summary="Áreas técnicas donde el usuario destaca consistentemente",
)
async def obtener_fortalezas(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(require_current_user_id),
):
    """
    Retorna las fortalezas del usuario ordenadas por confianza descendente.

    Usado por:
      - Dashboard del developer para ver sus puntos fuertes
      - Vista del reclutador para evaluar el perfil del candidato
    """
    perfil = await perfil_repo.get_perfil_por_usuario(db, usuario_id)
    if not perfil:
        return []

    fortalezas = await perfil_repo.get_fortalezas_usuario(db, perfil.id)

    return [
        FortalezaResponse(
            categoria_slug=f.categoria_error.slug if f.categoria_error else "",
            categoria_nombre=f.categoria_error.nombre if f.categoria_error else "",
            tipo_error=f.categoria_error.tipo if f.categoria_error else "",
            descripcion=f.descripcion,
            veces_demostrada=f.veces_demostrada,
            confianza=float(f.confianza or 0),
        )
        for f in fortalezas
    ]