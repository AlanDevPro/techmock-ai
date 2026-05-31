"""
app/db/repositories/perfil_repo.py
Acceso a datos: perfil_tecnico_usuario, fortalezas_usuario,
debilidades_usuario, estadisticas_usuario.
Incluye lógica de recálculo de scores históricos.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.perfil import (
    PerfilTecnicoUsuario,
    FortalezaUsuario,
    DebilidadUsuario,
    EstadisticasUsuario,
)
from app.db.models.evaluaciones import Evaluacion
from app.db.models.sesiones import SesionEntrevista
from app.db.models.preguntas import CategoriaError

logger = logging.getLogger(__name__)


# ── Perfil técnico ────────────────────────────────────────────────────────────

async def get_perfil_por_usuario(
    db: AsyncSession, usuario_id: UUID
) -> Optional[PerfilTecnicoUsuario]:
    result = await db.execute(
        select(PerfilTecnicoUsuario)
        .options(
            selectinload(PerfilTecnicoUsuario.mejor_tecnologia),
            selectinload(PerfilTecnicoUsuario.peor_tecnologia),
        )
        .where(PerfilTecnicoUsuario.usuario_id == usuario_id)
    )
    return result.scalar_one_or_none()


async def get_perfil_completo_candidato(
    db: AsyncSession, usuario_id: UUID
) -> Optional[PerfilTecnicoUsuario]:
    """Perfil con todas las relaciones para la vista del reclutador."""
    result = await db.execute(
        select(PerfilTecnicoUsuario)
        .options(
            selectinload(PerfilTecnicoUsuario.mejor_tecnologia),
            selectinload(PerfilTecnicoUsuario.peor_tecnologia),
            selectinload(PerfilTecnicoUsuario.fortalezas).selectinload(
                FortalezaUsuario.categoria_error
            ),
            selectinload(PerfilTecnicoUsuario.debilidades).selectinload(
                DebilidadUsuario.categoria_error
            ),
        )
        .where(PerfilTecnicoUsuario.usuario_id == usuario_id)
    )
    return result.scalar_one_or_none()


async def actualizar_perfil_tecnico(
    db: AsyncSession, usuario_id: UUID
) -> None:
    """
    Recalcula scores históricos del perfil a partir de todas las evaluaciones
    del usuario. Hace upsert en perfil_tecnico_usuario.
    """
    try:
        result = await db.execute(
            select(
                func.count(SesionEntrevista.id).label("total"),
                func.avg(Evaluacion.puntaje_total).label("avg_total"),
                func.avg(Evaluacion.puntaje_javascript).label("avg_js"),
                func.avg(Evaluacion.puntaje_arquitectura).label("avg_arq"),
                func.avg(Evaluacion.puntaje_buenas_practicas).label("avg_bp"),
                func.avg(Evaluacion.puntaje_comunicacion).label("avg_com"),
                func.avg(Evaluacion.puntaje_resolucion).label("avg_res"),
                func.stddev(Evaluacion.puntaje_total).label("stddev_total"),
            )
            .join(Evaluacion, Evaluacion.sesion_id == SesionEntrevista.id)
            .where(
                SesionEntrevista.usuario_id == usuario_id,
                SesionEntrevista.estado == "completada",
            )
        )
        row = result.one_or_none()
        if not row or not row.total:
            return

        score_global    = float(row.avg_total or 0)
        stddev          = float(row.stddev_total or 0)
        consistencia    = max(0.0, 100.0 - stddev)
        nivel_actual    = _score_a_nivel(score_global)

        # Contar completadas vs abandonadas
        cnt_completadas = await _contar_sesiones(db, usuario_id, "completada")
        cnt_abandonadas = await _contar_sesiones(db, usuario_id, "abandonada")

        # Upsert
        perfil = await get_perfil_por_usuario(db, usuario_id)
        if perfil:
            perfil.score_global           = round(score_global, 2)
            perfil.score_javascript       = round(float(row.avg_js or 0), 2)
            perfil.score_arquitectura     = round(float(row.avg_arq or 0), 2)
            perfil.score_buenas_practicas = round(float(row.avg_bp or 0), 2)
            perfil.score_comunicacion     = round(float(row.avg_com or 0), 2)
            perfil.score_resolucion       = round(float(row.avg_res or 0), 2)
            perfil.consistencia           = round(consistencia, 2)
            perfil.nivel_actual           = nivel_actual
            perfil.total_sesiones         = row.total
            perfil.sesiones_completadas   = cnt_completadas
            perfil.sesiones_abandonadas   = cnt_abandonadas
            perfil.actualizado_en         = datetime.now(timezone.utc)
        else:
            db.add(PerfilTecnicoUsuario(
                usuario_id=usuario_id,
                score_global=round(score_global, 2),
                score_javascript=round(float(row.avg_js or 0), 2),
                score_arquitectura=round(float(row.avg_arq or 0), 2),
                score_buenas_practicas=round(float(row.avg_bp or 0), 2),
                score_comunicacion=round(float(row.avg_com or 0), 2),
                score_resolucion=round(float(row.avg_res or 0), 2),
                consistencia=round(consistencia, 2),
                nivel_actual=nivel_actual,
                total_sesiones=row.total,
                sesiones_completadas=cnt_completadas,
                sesiones_abandonadas=cnt_abandonadas,
            ))

        await db.flush()
        logger.debug("Perfil técnico actualizado: usuario=%s score=%.1f", usuario_id, score_global)

    except Exception as exc:
        logger.error("Error actualizando perfil técnico %s: %s", usuario_id, exc)


# ── Fortalezas y debilidades ──────────────────────────────────────────────────

async def get_fortalezas_usuario(
    db: AsyncSession, perfil_id: int
) -> list[FortalezaUsuario]:
    result = await db.execute(
        select(FortalezaUsuario)
        .options(selectinload(FortalezaUsuario.categoria_error))
        .where(FortalezaUsuario.perfil_id == perfil_id)
        .order_by(FortalezaUsuario.confianza.desc())
    )
    return list(result.scalars().all())


async def get_debilidades_usuario(
    db: AsyncSession,
    perfil_id: int,
    solo_requiere_practica: bool = True,
) -> list[DebilidadUsuario]:
    query = (
        select(DebilidadUsuario)
        .options(selectinload(DebilidadUsuario.categoria_error))
        .where(DebilidadUsuario.perfil_id == perfil_id)
    )
    if solo_requiere_practica:
        query = query.where(DebilidadUsuario.requiere_practica == True)
    query = query.order_by(DebilidadUsuario.impacto.desc())

    result = await db.execute(query)
    return list(result.scalars().all())


async def upsert_debilidad(
    db: AsyncSession,
    perfil_id: int,
    categoria_slug: str,
    descripcion: str = "",
    impacto: float = 0.5,
) -> None:
    """
    Incrementa veces_fallada si existe, o crea la debilidad.
    Se llama después de cada análisis de código con errores.
    """
    # Resolver categoria_error_id desde el slug
    cat_result = await db.execute(
        select(CategoriaError.id).where(CategoriaError.slug == categoria_slug)
    )
    categoria_id = cat_result.scalar_one_or_none()
    if not categoria_id:
        logger.debug("Categoría '%s' no encontrada — debilidad no registrada", categoria_slug)
        return

    existing = await db.execute(
        select(DebilidadUsuario).where(
            DebilidadUsuario.perfil_id == perfil_id,
            DebilidadUsuario.categoria_error_id == categoria_id,
        )
    )
    debilidad = existing.scalar_one_or_none()

    if debilidad:
        debilidad.veces_fallada += 1
        debilidad.impacto = max(debilidad.impacto, impacto)
        if descripcion:
            debilidad.descripcion = descripcion
    else:
        db.add(DebilidadUsuario(
            perfil_id=perfil_id,
            categoria_error_id=categoria_id,
            descripcion=descripcion or None,
            veces_fallada=1,
            impacto=impacto,
            requiere_practica=True,
        ))

    await db.flush()


async def upsert_fortaleza(
    db: AsyncSession,
    perfil_id: int,
    categoria_slug: str,
    descripcion: str = "",
    incremento_confianza: float = 0.1,
) -> None:
    """
    Incrementa veces_demostrada y sube la confianza (máx 1.0).
    Se llama cuando el análisis detecta una buena práctica.
    """
    cat_result = await db.execute(
        select(CategoriaError.id).where(CategoriaError.slug == categoria_slug)
    )
    categoria_id = cat_result.scalar_one_or_none()
    if not categoria_id:
        return

    existing = await db.execute(
        select(FortalezaUsuario).where(
            FortalezaUsuario.perfil_id == perfil_id,
            FortalezaUsuario.categoria_error_id == categoria_id,
        )
    )
    fortaleza = existing.scalar_one_or_none()

    if fortaleza:
        fortaleza.veces_demostrada += 1
        fortaleza.confianza = min(1.0, float(fortaleza.confianza) + incremento_confianza)
    else:
        db.add(FortalezaUsuario(
            perfil_id=perfil_id,
            categoria_error_id=categoria_id,
            descripcion=descripcion or None,
            veces_demostrada=1,
            confianza=0.5,
        ))

    await db.flush()


# ── Estadísticas ──────────────────────────────────────────────────────────────

async def get_estadisticas_usuario(
    db: AsyncSession, usuario_id: UUID
) -> Optional[EstadisticasUsuario]:
    result = await db.execute(
        select(EstadisticasUsuario).where(
            EstadisticasUsuario.usuario_id == usuario_id
        )
    )
    return result.scalar_one_or_none()


async def actualizar_estadisticas_usuario(
    db: AsyncSession, usuario_id: UUID
) -> None:
    """
    Recalcula estadisticas_usuario desde cero a partir de las sesiones
    completadas del usuario. Hace upsert.
    """
    try:
        result = await db.execute(
            select(
                func.count(SesionEntrevista.id).label("total"),
                func.avg(Evaluacion.puntaje_total).label("promedio"),
                func.max(Evaluacion.puntaje_total).label("mejor"),
                func.min(Evaluacion.puntaje_total).label("peor"),
                func.max(SesionEntrevista.fecha_inicio).label("ultima"),
            )
            .join(Evaluacion, Evaluacion.sesion_id == SesionEntrevista.id)
            .where(
                SesionEntrevista.usuario_id == usuario_id,
                SesionEntrevista.estado == "completada",
            )
        )
        row = result.one_or_none()
        if not row:
            return

        cnt_abandon = await _contar_sesiones(db, usuario_id, "abandonada")

        stats = await get_estadisticas_usuario(db, usuario_id)
        now   = datetime.now(timezone.utc)

        if stats:
            stats.total_entrevistas       = (row.total or 0) + cnt_abandon
            stats.entrevistas_finalizadas = row.total or 0
            stats.entrevistas_abandonadas = cnt_abandon
            stats.puntaje_promedio        = round(float(row.promedio or 0), 2)
            stats.mejor_puntaje           = round(float(row.mejor or 0), 2)
            stats.peor_puntaje            = round(float(row.peor or 0), 2)
            stats.ultima_entrevista_fecha = row.ultima
            stats.fecha_actualizacion     = now
        else:
            db.add(EstadisticasUsuario(
                usuario_id=usuario_id,
                total_entrevistas=(row.total or 0) + cnt_abandon,
                entrevistas_finalizadas=row.total or 0,
                entrevistas_abandonadas=cnt_abandon,
                puntaje_promedio=round(float(row.promedio or 0), 2),
                mejor_puntaje=round(float(row.mejor or 0), 2),
                peor_puntaje=round(float(row.peor or 0), 2),
                ultima_entrevista_fecha=row.ultima,
            ))

        await db.flush()
        logger.debug("Estadísticas actualizadas: usuario=%s", usuario_id)

    except Exception as exc:
        logger.error("Error actualizando estadísticas %s: %s", usuario_id, exc)


async def listar_candidatos_para_reclutador(
    db: AsyncSession,
    nivel: Optional[str] = None,
    apto: Optional[bool] = None,
    tecnologia_slug: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Consulta la vista `vista_candidatos_reclutador` de PostgreSQL
    con filtros opcionales.
    """
    from sqlalchemy import text

    conditions = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if nivel:
        conditions.append("nivel_actual = :nivel")
        params["nivel"] = nivel
    if apto is not None:
        conditions.append("apto_para_contratacion = :apto")
        params["apto"] = apto

    where_clause = " AND ".join(conditions)

    sql = text(f"""
        SELECT *
        FROM vista_candidatos_reclutador
        WHERE {where_clause}
        ORDER BY score_global DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(sql, params)
    return result.mappings().all()


# ── Helpers privados ──────────────────────────────────────────────────────────

async def _contar_sesiones(
    db: AsyncSession, usuario_id: UUID, estado: str
) -> int:
    result = await db.execute(
        select(func.count(SesionEntrevista.id))
        .where(
            SesionEntrevista.usuario_id == usuario_id,
            SesionEntrevista.estado == estado,
        )
    )
    return result.scalar_one() or 0


def _score_a_nivel(score: float) -> str:
    if score >= 90: return "destacado"
    if score >= 75: return "recomendado"
    if score >= 60: return "promisorio"
    if score >= 40: return "revisar"
    return "descartado"