"""
app/services/generacion/adaptativo_service.py

Sistema adaptativo: consulta las debilidades del usuario para
generar preguntas enfocadas en sus áreas de falla.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import perfil_repo, sesiones_repo

logger = logging.getLogger(__name__)


class AdaptativoService:
    """
    Consulta perfil_tecnico_usuario → debilidades_usuario
    y construye el contexto adaptativo que se inyecta en el prompt.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def construir_contexto_adaptativo(
        self,
        usuario_id: UUID,
    ) -> Optional[dict]:
        """
        Construye el contexto adaptativo del usuario para la generación de preguntas.

        Flujo:
          1. Obtiene el perfil técnico del usuario
          2. Consulta sus debilidades con requiere_practica=True
          3. Construye un texto descriptivo para el prompt

        Returns:
            Dict con "texto" y "sesion_anterior_id", o None si no hay historial.
        """
        try:
            perfil = await perfil_repo.get_perfil_por_usuario(self.db, usuario_id)
            if not perfil:
                return None

            debilidades = await perfil_repo.get_debilidades_usuario(
                db=self.db,
                perfil_id=perfil.id,
                solo_requiere_practica=True,
            )

            if not debilidades:
                return None

            # Construir texto descriptivo para el prompt
            lineas = []
            for d in debilidades[:5]:   # Máximo 5 debilidades por sesión
                categoria = d.categoria_error.nombre if d.categoria_error else "área desconocida"
                tipo      = d.categoria_error.tipo if d.categoria_error else "experiencia"
                lineas.append(
                    f"- {categoria} (tipo: {tipo}, "
                    f"veces fallada: {d.veces_fallada}, "
                    f"impacto: {float(d.impacto or 0):.1f}): {d.descripcion or ''}"
                )

            texto = "El usuario ha tenido dificultades en:\n" + "\n".join(lineas)

            # Obtener la sesión más reciente para trazabilidad
            sesiones = await sesiones_repo.get_sesiones_recientes_usuario(
                db=self.db,
                usuario_id=usuario_id,
                limit=1,
            )
            sesion_anterior_id = sesiones[0].id if sesiones else None

            logger.info(
                "Contexto adaptativo construido: %d debilidades para usuario=%s",
                len(debilidades), usuario_id,
            )

            return {
                "texto":             texto,
                "sesion_anterior_id": sesion_anterior_id,
                "n_debilidades":     len(debilidades),
            }

        except Exception as exc:
            logger.error("Error construyendo contexto adaptativo: %s", exc)
            return None

    async def registrar_debilidades_sesion(
        self,
        usuario_id: UUID,
        sesion_id: UUID,
        errores: list[dict],
    ) -> None:
        """
        Actualiza debilidades_usuario con los errores detectados en la sesión.
        Se llama después de persistir la evaluación.

        Args:
            usuario_id: UUID del usuario.
            sesion_id:  UUID de la sesión completada.
            errores:    Lista de errores del resultado del LLM.
        """
        try:
            perfil = await perfil_repo.get_perfil_por_usuario(self.db, usuario_id)
            if not perfil:
                logger.debug("Sin perfil para usuario %s — saltando debilidades", usuario_id)
                return

            for error in errores:
                categoria_slug = error.get("categoria_slug")
                if not categoria_slug:
                    continue

                impacto = _severidad_a_impacto(error.get("impacto", "medio"))

                await perfil_repo.upsert_debilidad(
                    db=self.db,
                    perfil_id=perfil.id,
                    categoria_slug=categoria_slug,
                    descripcion=error.get("descripcion", ""),
                    impacto=impacto,
                )

            logger.info(
                "Debilidades actualizadas: %d errores para usuario=%s",
                len(errores), usuario_id,
            )

        except Exception as exc:
            logger.error("Error registrando debilidades: %s", exc)


def _severidad_a_impacto(severidad: str) -> float:
    """Convierte la severidad del LLM a un valor de impacto 0.0-1.0."""
    return {
        "critico": 1.0,
        "alto":    0.75,
        "medio":   0.5,
        "bajo":    0.25,
    }.get(severidad.lower(), 0.5)