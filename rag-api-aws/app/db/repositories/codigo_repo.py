"""
app/db/repositories/codigo_repo.py

Acceso a datos: envios_codigo.

Contrato: cada sesión genera exactamente un EnvioCodigo final.
No existen borradores ni versiones parciales — esa responsabilidad
recae en el localStorage del frontend.
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
    es_envio_final: bool = True,
    version: int = 1,
) -> EnvioCodigo:
    """
    Persiste el código del candidato asociado a una sesión.

    Args:
        db:             Sesión de base de datos asíncrona.
        sesion_id:      UUID de la sesión de entrevista.
        lenguaje:       Framework o lenguaje del envío (ej. "Vue.js").
        codigo:         Código fuente del candidato.
        es_envio_final: Siempre True en el flujo normal. Reservado para uso interno.
        version:        Número de versión del envío (siempre 1 en el flujo actual).

    Returns:
        Instancia de EnvioCodigo persistida con flush.
    """
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
        "EnvioCodigo guardado | id=%s sesion=%s lenguaje=%s",
        envio.id, sesion_id, lenguaje,
    )
    return envio