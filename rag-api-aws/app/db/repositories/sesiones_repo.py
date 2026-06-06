"""
app/db/repositories/sesiones_repo.py
Acceso a datos: sesiones_entrevista.
"""

import logging
import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.sesiones import SesionEntrevista, EnvioCodigo
from app.db.models.evaluaciones import Evaluacion, ErrorDetectado

logger = logging.getLogger(__name__)


async def crear_sesion(
    db: AsyncSession,
    usuario_id: Optional[UUID],
    tecnologia_id: int,
    nivel_id: int,
    pregunta_id: int,
    fue_adaptativa: bool = False,
    sesion_anterior_id: Optional[UUID] = None,
    ip_usuario: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> SesionEntrevista:
    sesion = SesionEntrevista(
        id=uuid_lib.uuid4(),
        usuario_id=usuario_id,
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        pregunta_id=pregunta_id,
        estado="pendiente_pregunta",
        fue_adaptativa=fue_adaptativa,
        sesion_anterior_id=sesion_anterior_id,
        ip_usuario=ip_usuario,
        user_agent=user_agent,
    )
    db.add(sesion)
    await db.flush()
    logger.debug(
        "Sesión creada id=%s adaptativa=%s", sesion.id, fue_adaptativa
    )
    return sesion


async def get_sesion_por_id(db: AsyncSession, sesion_id: UUID):
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.evaluacion),
            selectinload(SesionEntrevista.errores_detectados),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    return result.scalar_one_or_none()


async def get_sesion_con_pregunta(
    db: AsyncSession, sesion_id: UUID
) -> Optional[SesionEntrevista]:
    """Carga la sesión con su pregunta y tecnología (para /sesion/{id}/pregunta)."""
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.pregunta),
            selectinload(SesionEntrevista.tecnologia),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    return result.scalar_one_or_none()


async def get_sesion_con_detalles(
    db: AsyncSession, sesion_id: UUID
) -> Optional[SesionEntrevista]:
    """
    Carga la sesión con todas sus relaciones para el endpoint /analisis.
    Eager loading de: evaluacion → recomendaciones + detalles,
    errores_detectados → categoria_error, tecnologia.
    """
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.pregunta),
            selectinload(SesionEntrevista.evaluacion).selectinload(
                Evaluacion.recomendaciones
            ),
            selectinload(SesionEntrevista.evaluacion).selectinload(
                Evaluacion.detalles
            ),
            selectinload(SesionEntrevista.errores_detectados).selectinload(
                ErrorDetectado.categoria_error
            ),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    return result.scalar_one_or_none()


async def get_sesiones_recientes_usuario(
    db: AsyncSession,
    usuario_id: UUID,
    limit: int = 10,
) -> list[SesionEntrevista]:
    """Sesiones recientes con su evaluación (para historial del reclutador)."""
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.evaluacion),
        )
        .where(SesionEntrevista.usuario_id == usuario_id)
        .order_by(SesionEntrevista.fecha_inicio.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


_ESTADOS_FINALES = {"completada", "tiempo_agotado"}


async def finalizar_sesion(
    db: AsyncSession,
    sesion_id: UUID,
    estado: str = "completada",
) -> bool:
    """
    Finaliza sesión de forma idempotente y atómica.

    Returns:
        True  -> si realmente se actualizó
        False -> si ya estaba finalizada (no hace nada)
    """

    result = await db.execute(
        update(SesionEntrevista)
        .where(
            SesionEntrevista.id == sesion_id,
            SesionEntrevista.estado.notin_(_ESTADOS_FINALES)  # 🔒 LOCK LÓGICO
        )
        .values(
            estado=estado,
            fecha_fin=datetime.now(timezone.utc),
        )
    )

    await db.flush()

    return result.rowcount > 0



async def iniciar_sesion(
    db,
    sesion_id,
    pregunta_id
):

    sesion = await db.get(
        SesionEntrevista,
        sesion_id
    )

    sesion.estado = "en_progreso"

    sesion.fecha_inicio = datetime.utcnow()

    sesion.pregunta_id = pregunta_id

    await db.flush()

    return sesion