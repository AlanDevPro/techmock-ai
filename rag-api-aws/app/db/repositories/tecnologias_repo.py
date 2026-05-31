"""
app/db/repositories/tecnologias_repo.py
Acceso a datos: tecnologias, niveles_dificultad.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.tecnologias import Tecnologia, NivelDificultad

logger = logging.getLogger(__name__)


async def get_tecnologia_por_slug(
    db: AsyncSession, slug: str
) -> Optional[Tecnologia]:
    if not slug:
        return None
    result = await db.execute(
        select(Tecnologia).where(Tecnologia.slug == slug, Tecnologia.activo == True)
    )
    return result.scalar_one_or_none()


async def get_tecnologia_por_id(
    db: AsyncSession, tecnologia_id: int
) -> Optional[Tecnologia]:
    result = await db.execute(
        select(Tecnologia).where(Tecnologia.id == tecnologia_id)
    )
    return result.scalar_one_or_none()


async def get_nivel_por_nombre(
    db: AsyncSession, nombre: str
) -> Optional[NivelDificultad]:
    result = await db.execute(
        select(NivelDificultad).where(NivelDificultad.nombre == nombre)
    )
    return result.scalar_one_or_none()


async def listar_tecnologias_activas(db: AsyncSession) -> list[Tecnologia]:
    result = await db.execute(
        select(Tecnologia).where(Tecnologia.activo == True).order_by(Tecnologia.nombre)
    )
    return list(result.scalars().all())