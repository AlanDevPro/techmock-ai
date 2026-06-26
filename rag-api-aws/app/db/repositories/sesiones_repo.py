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
from app.db.models.evaluaciones import Evaluacion, ErrorDetectado, DetalleEvaluacion

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
    """
    Crea una nueva sesión de entrevista.

    Args:
        db: Sesión asíncrona de base de datos
        usuario_id: UUID del usuario (puede ser None para invitados)
        tecnologia_id: ID de la tecnología (Vue.js, React, etc.)
        nivel_id: ID del nivel de dificultad
        pregunta_id: ID de la pregunta asignada
        fue_adaptativa: Si la pregunta fue generada adaptativamente
        sesion_anterior_id: Sesión previa para trazabilidad adaptativa
        ip_usuario: IP del usuario
        user_agent: User agent del navegador

    Returns:
        SesionEntrevista: La sesión creada
    """
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
    logger.debug("Sesión creada id=%s adaptativa=%s", sesion.id, fue_adaptativa)
    return sesion


async def get_sesion_por_id(db: AsyncSession, sesion_id: UUID):
    """
    Obtiene una sesión por su ID con carga básica de relaciones.
    """
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
    """
    Carga la sesión con su pregunta y tecnología (para /sesion/{id}/pregunta).
    """
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
    
    ✅ MEJORA CRÍTICA: Eager loading de la relación rubrica dentro de detalles
    para evitar el error MissingGreenlet (lazy loading en contexto asíncrono).
    
    Relaciones cargadas:
        - tecnologia
        - nivel
        - pregunta
        - evaluacion -> recomendaciones
        - evaluacion -> detalles -> rubrica  (¡CRÍTICO para evitar MissingGreenlet!)
        - errores_detectados -> categoria_error
    """
    from app.db.models.evaluaciones import DetalleEvaluacion
    
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            # Relaciones directas
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.pregunta),
            
            # Evaluación con sus relaciones anidadas
            selectinload(SesionEntrevista.evaluacion).selectinload(
                Evaluacion.recomendaciones
            ),
            
            # ✅ CRÍTICO: Cargar detalles y su relación rubrica de forma anticipada
            selectinload(SesionEntrevista.evaluacion)
            .selectinload(Evaluacion.detalles)
            .selectinload(DetalleEvaluacion.rubrica),  # ← SOLUCIONA MissingGreenlet
            
            # Errores detectados con su categoría
            selectinload(SesionEntrevista.errores_detectados).selectinload(
                ErrorDetectado.categoria_error
            ),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    
    sesion = result.scalar_one_or_none()
    
    if sesion:
        logger.debug(
            "Sesión cargada con detalles - ID: %s, Estado: %s, "
            "Evaluación: %s, Detalles: %d, Errores: %d",
            sesion.id,
            sesion.estado,
            sesion.evaluacion.id if sesion.evaluacion else None,
            len(sesion.evaluacion.detalles) if sesion.evaluacion and sesion.evaluacion.detalles else 0,
            len(sesion.errores_detectados) if sesion.errores_detectados else 0,
        )
    
    return sesion


async def get_sesiones_recientes_usuario(
    db: AsyncSession,
    usuario_id: UUID,
    limit: int = 10,
) -> list[SesionEntrevista]:
    """
    Sesiones recientes con su evaluación (para historial del reclutador).
    """
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

    Args:
        db: Sesión asíncrona de base de datos
        sesion_id: UUID de la sesión a finalizar
        estado: Estado final ('completada' o 'tiempo_agotado')

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
    
    updated = result.rowcount > 0
    if updated:
        logger.info("✅ Sesión %s finalizada con estado '%s'", sesion_id, estado)
    else:
        logger.debug("Sesión %s ya estaba finalizada o no existe", sesion_id)
    
    return updated


async def iniciar_sesion(
    db: AsyncSession,
    sesion_id: UUID,
    pregunta_id: int
) -> Optional[SesionEntrevista]:
    """
    Inicia una sesión que estaba en estado 'pendiente_pregunta'.
    Establece la pregunta y cambia el estado a 'en_progreso'.
    
    Args:
        db: Sesión asíncrona de base de datos
        sesion_id: UUID de la sesión
        pregunta_id: ID de la pregunta asignada
    
    Returns:
        SesionEntrevista: La sesión actualizada
    """
    sesion = await db.get(SesionEntrevista, sesion_id)
    
    if not sesion:
        logger.error("❌ Sesión no encontrada: %s", sesion_id)
        return None
    
    sesion.estado = "en_progreso"
    sesion.fecha_inicio = datetime.now(timezone.utc)
    sesion.pregunta_id = pregunta_id
    
    await db.flush()
    
    logger.info("🚀 Sesión iniciada - ID: %s, Pregunta: %d", sesion_id, pregunta_id)
    return sesion


async def get_envios_codigo_sesion(
    db: AsyncSession,
    sesion_id: UUID,
    limit: int = 10,
) -> list[EnvioCodigo]:
    """
    Obtiene los envíos de código de una sesión.
    
    Args:
        db: Sesión asíncrona de base de datos
        sesion_id: UUID de la sesión
        limit: Límite de resultados
    
    Returns:
        Lista de envíos de código ordenados por fecha descendente
    """
    result = await db.execute(
        select(EnvioCodigo)
        .where(EnvioCodigo.sesion_id == sesion_id)
        .order_by(EnvioCodigo.fecha.desc())
        .limit(limit)
    )
    return list(result.scalars().all())