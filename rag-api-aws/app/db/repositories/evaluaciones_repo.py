"""
app/db/repositories/evaluaciones_repo.py
Acceso a datos: evaluaciones, detalle_evaluacion, errores_detectados,
recomendaciones_solucion y resolución de categorias_error por slug.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.evaluaciones import (
    Evaluacion,
    DetalleEvaluacion,
    ErrorDetectado,
    RecomendacionSolucion,
)
from app.db.models.preguntas import CategoriaError
from app.db.models.tecnologias import Rubrica

logger = logging.getLogger(__name__)


# ── Evaluación principal ──────────────────────────────────────────────────────

async def guardar_evaluacion(
    db: AsyncSession,
    sesion_id: UUID,
    puntaje_total: float,
    feedback_general: str,
    # Los 5 pilares
    puntaje_javascript: Optional[float] = None,
    puntaje_arquitectura: Optional[float] = None,
    puntaje_buenas_practicas: Optional[float] = None,
    puntaje_comunicacion: Optional[float] = None,
    puntaje_resolucion: Optional[float] = None,
    # Clasificación
    nivel_candidato: Optional[str] = None,
    apto_para_contratacion: Optional[bool] = None,
    resumen_para_reclutador: Optional[str] = None,
    # Narrativo
    fortalezas: Optional[str] = None,
    areas_mejora: Optional[str] = None,
    # Metadata
    modelo_ia_usado: Optional[str] = None,
    generado_por_ia: bool = True,
) -> Evaluacion:
    evaluacion = Evaluacion(
        sesion_id=sesion_id,
        puntaje_total=puntaje_total,
        puntaje_javascript=puntaje_javascript,
        puntaje_arquitectura=puntaje_arquitectura,
        puntaje_buenas_practicas=puntaje_buenas_practicas,
        puntaje_comunicacion=puntaje_comunicacion,
        puntaje_resolucion=puntaje_resolucion,
        nivel_candidato=nivel_candidato,
        apto_para_contratacion=apto_para_contratacion,
        feedback_general=feedback_general,
        resumen_para_reclutador=resumen_para_reclutador,
        fortalezas=fortalezas,
        areas_mejora=areas_mejora,
        modelo_ia_usado=modelo_ia_usado,
        generado_por_ia=generado_por_ia,
    )
    db.add(evaluacion)
    await db.flush()
    logger.debug(
        "Evaluación guardada id=%s puntaje=%.1f nivel=%s",
        evaluacion.id, puntaje_total, nivel_candidato,
    )
    return evaluacion


# ── Detalle por rúbrica ───────────────────────────────────────────────────────

async def guardar_detalle_rubrica(
    db: AsyncSession,
    evaluacion_id: int,
    rubrica_id: int,
    puntaje: float,
    comentario: Optional[str] = None,
) -> DetalleEvaluacion:
    detalle = DetalleEvaluacion(
        evaluacion_id=evaluacion_id,
        rubrica_id=rubrica_id,
        puntaje=puntaje,
        comentario=comentario,
    )
    db.add(detalle)
    await db.flush()
    return detalle


# ── Errores detectados ────────────────────────────────────────────────────────

async def guardar_error_detectado(
    db: AsyncSession,
    sesion_id: UUID,
    categoria_error_id: int,
    descripcion: str,
    severidad: str = "medio",
    es_error_conceptual: bool = False,
    envio_codigo_id: Optional[int] = None,
    linea_codigo: Optional[int] = None,
    fragmento_codigo: Optional[str] = None,
    codigo_corregido: Optional[str] = None,
    explicacion_ia: Optional[str] = None,
) -> ErrorDetectado:
    error = ErrorDetectado(
        sesion_id=sesion_id,
        envio_codigo_id=envio_codigo_id,
        categoria_error_id=categoria_error_id,
        descripcion=descripcion,
        severidad=severidad,
        es_error_conceptual=es_error_conceptual,
        linea_codigo=linea_codigo,
        fragmento_codigo=fragmento_codigo,
        codigo_corregido=codigo_corregido,
        explicacion_ia=explicacion_ia,
    )
    db.add(error)
    await db.flush()
    return error


# ── Recomendaciones ───────────────────────────────────────────────────────────

async def guardar_recomendacion(
    db: AsyncSession,
    evaluacion_id: int,
    tipo: str,
    titulo: str,
    descripcion: str,
    prioridad: str = "media",
    orden: int = 0,
    codigo_ejemplo: Optional[str] = None,
    recurso_url: Optional[str] = None,
    recurso_titulo: Optional[str] = None,
    categoria_error_id: Optional[int] = None,
) -> RecomendacionSolucion:
    rec = RecomendacionSolucion(
        evaluacion_id=evaluacion_id,
        tipo=tipo,
        titulo=titulo[:200],
        descripcion=descripcion,
        prioridad=prioridad,
        orden=orden,
        codigo_ejemplo=codigo_ejemplo,
        recurso_url=recurso_url,
        recurso_titulo=recurso_titulo,
        categoria_error_id=categoria_error_id,
    )
    db.add(rec)
    await db.flush()
    return rec


# ── Resolución de categoría por slug ─────────────────────────────────────────

async def get_categoria_error_id(
    db: AsyncSession, slug: str
) -> Optional[int]:
    """
    Resuelve el id de categorias_error a partir del slug del LLM.
    Retorna None si no se encuentra (el caller debe usar un fallback).
    """
    if not slug:
        return None
    result = await db.execute(
        select(CategoriaError.id).where(
            CategoriaError.slug == slug,
            CategoriaError.activo == True,
        )
    )
    row = result.scalar_one_or_none()
    return row