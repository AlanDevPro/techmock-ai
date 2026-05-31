"""
app/db/repositories/codigo_repo.py
Acceso a datos: envios_codigo.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.sesiones import EnvioCodigo

logger = logging.getLogger(__name__)


async def guardar_envio_codigo(
    db: AsyncSession,
    sesion_id: UUID,
    lenguaje: str,
    codigo: str,
    es_envio_final: bool = False,
    version: int = 1,
) -> EnvioCodigo:
    envio = EnvioCodigo(
        sesion_id=sesion_id,
        lenguaje=lenguaje,
        codigo=codigo,
        es_envio_final=es_envio_final,
        version=version,
    )
    db.add(envio)
    await db.flush()
    logger.debug(
        "EnvioCodigo guardado id=%s sesion=%s final=%s",
        envio.id, sesion_id, es_envio_final,
    )
    return envio