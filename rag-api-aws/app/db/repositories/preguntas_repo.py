"""
app/db/repositories/preguntas_repo.py
Acceso a datos: preguntas, categorias_error.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.preguntas import Pregunta, CategoriaError

logger = logging.getLogger(__name__)


async def crear_pregunta(
    db: AsyncSession,
    tecnologia_id: int,
    nivel_id: int,
    titulo: str,
    enunciado: str,
    tipo: str,
    generada_por_ia: bool = True,
    prompt_contexto: str = "",
    creada_por: Optional[UUID] = None,
    categorias_error_objetivo: Optional[list] = None,
    sesion_origen_id: Optional[UUID] = None,
    contexto_adaptativo: Optional[dict] = None,
    tiempo_estimado_min: int = 30,
) -> Pregunta:
    pregunta = Pregunta(
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        titulo=titulo[:300],
        enunciado=enunciado,
        tipo=tipo,
        generada_por_ia=generada_por_ia,
        prompt_contexto=prompt_contexto or None,
        creada_por=creada_por,
        categorias_error_objetivo=categorias_error_objetivo or [],
        sesion_origen_id=sesion_origen_id,
        contexto_adaptativo=contexto_adaptativo,
        tiempo_estimado_min=tiempo_estimado_min,
    )
    db.add(pregunta)
    await db.flush()
    logger.debug("Pregunta creada id=%s tipo=%s", pregunta.id, tipo)
    return pregunta


async def get_pregunta_por_id(
    db: AsyncSession, pregunta_id: int
) -> Optional[Pregunta]:
    result = await db.execute(
        select(Pregunta).where(Pregunta.id == pregunta_id)
    )
    return result.scalar_one_or_none()


async def get_categoria_por_slug(
    db: AsyncSession, slug: str
) -> Optional[CategoriaError]:
    if not slug:
        return None
    result = await db.execute(
        select(CategoriaError).where(
            CategoriaError.slug == slug,
            CategoriaError.activo == True,
        )
    )
    return result.scalar_one_or_none()


async def listar_categorias_activas(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
) -> list[CategoriaError]:
    query = select(CategoriaError).where(CategoriaError.activo == True)
    if tecnologia_id:
        query = query.where(
            (CategoriaError.tecnologia_id == tecnologia_id)
            | (CategoriaError.tecnologia_id == None)
        )
    result = await db.execute(query.order_by(CategoriaError.nombre))
    return list(result.scalars().all())