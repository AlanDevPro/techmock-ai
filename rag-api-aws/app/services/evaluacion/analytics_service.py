"""
app/services/evaluacion/analytics_service.py

Persiste métricas de evaluación técnica en la tabla detalle_evaluacion
y genera estadísticas agregadas.
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models.evaluaciones import DetalleEvaluacion, Evaluacion
from app.db.models.sesiones import SesionEntrevista
from app.db.models.tecnologias import Rubrica

logger = logging.getLogger(__name__)

# Mapeo: clave del dict evaluacion_tecnica → nombre de rúbrica en BD
_RUBRICA_MAP = {
    "manejo_estado": "manejo_estado",
    "legibilidad":   "legibilidad",
    "arquitectura":  "arquitectura",
    "performance":   "performance",
}


class AnalyticsService:

    async def guardar_evaluacion_tecnica(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        evaluacion_tecnica: Dict[str, Any],
    ) -> None:
        """
        Persiste cada dimensión técnica como DetalleEvaluacion.
        Crea la Rubrica si no existe (upsert ligero).
        """
        for campo, valor in evaluacion_tecnica.items():
            rubrica_nombre = _RUBRICA_MAP.get(campo)
            if not rubrica_nombre:
                logger.debug("Campo técnico no mapeado a rúbrica: %s", campo)
                continue

            try:
                rubrica = await self._get_or_create_rubrica(db, rubrica_nombre)
                detalle = DetalleEvaluacion(
                    evaluacion_id=evaluacion_id,
                    rubrica_id=rubrica.id,
                    comentario=str(valor) if valor else None,
                    puntaje=None,
                )
                db.add(detalle)

            except Exception as exc:
                logger.error(
                    "Error guardando detalle '%s' para evaluacion_id=%s: %s",
                    campo, evaluacion_id, exc,
                )

        try:
            await db.flush()
            logger.debug(
                "%d detalles técnicos guardados para evaluacion_id=%s",
                len(evaluacion_tecnica), evaluacion_id,
            )
        except Exception as exc:
            logger.error("Error en flush de evaluación técnica: %s", exc)

    async def get_resumen_usuario(
        self,
        db: AsyncSession,
        usuario_id: UUID,
    ) -> Dict[str, Any]:
        """Resumen de rendimiento histórico del usuario."""
        result = await db.execute(
            select(
                func.count(SesionEntrevista.id).label("total"),
                func.avg(Evaluacion.puntaje_total).label("promedio"),
                func.max(Evaluacion.puntaje_total).label("maximo"),
                func.min(Evaluacion.puntaje_total).label("minimo"),
            )
            .join(Evaluacion, Evaluacion.sesion_id == SesionEntrevista.id)
            .where(SesionEntrevista.usuario_id == usuario_id)
        )
        row = result.one_or_none()

        if not row or not row.total:
            return {"total_sesiones": 0, "puntaje_promedio": 0}

        return {
            "total_sesiones":    row.total,
            "puntaje_promedio":  round(float(row.promedio or 0), 1),
            "puntaje_maximo":    round(float(row.maximo or 0), 1),
            "puntaje_minimo":    round(float(row.minimo or 0), 1),
        }

    async def _get_or_create_rubrica(self, db: AsyncSession, nombre: str) -> Rubrica:
        result = await db.execute(select(Rubrica).where(Rubrica.nombre == nombre))
        rubrica = result.scalar_one_or_none()

        if not rubrica:
            rubrica = Rubrica(
                nombre=nombre,
                peso_porcentual=25.0,   # Peso por defecto: 4 rúbricas = 100%
                activa=True,
            )
            db.add(rubrica)
            await db.flush()
            logger.info("Rúbrica creada: %s (id=%s)", nombre, rubrica.id)

        return rubrica