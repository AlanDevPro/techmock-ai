"""
app/services/generacion/pregunta_service.py

Orquesta generación de preguntas: RAG + LLM + persistencia en BD.
Consulta debilidades del usuario para preguntas adaptativas.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.repositories import tecnologias_repo, preguntas_repo, sesiones_repo, perfil_repo
from app.schemas.preguntas import RespuestaPregunta, SesionIniciadaResponse
from app.services.rag.rag_service import RAGService
from app.services.generacion.adaptativo_service import AdaptativoService

logger = logging.getLogger(__name__)

TECH_SLUGS: dict[str, str] = settings.TECH_SLUGS
NIVEL_DEFAULT: str = settings.NIVEL_DEFAULT


class PreguntaService:
    """
    Orquesta el pipeline completo de generación de preguntas:
      1. Consulta debilidades del usuario (sistema adaptativo)
      2. RAG recupera contexto relevante
      3. LLM genera la pregunta
      4. Persiste pregunta + sesión en BD
    """

    def __init__(self, db: AsyncSession, request: Request):
        self.db      = db
        self.rag     = RAGService(request=request)
        self.adaptativo = AdaptativoService(db=db)

    async def generar_y_persistir(
        self,
        framework: str,
        usuario_id: Optional[UUID] = None,
    ) -> RespuestaPregunta:
        """
        Pipeline completo de generación de preguntas.

        Args:
            framework:  Nombre canónico del framework ("Vue.js", "React", etc.)
            usuario_id: UUID del usuario autenticado (para sistema adaptativo).

        Returns:
            RespuestaPregunta con la pregunta generada y sesion_id.
        """
        logger.info("Generando pregunta: framework=%s usuario=%s", framework, usuario_id)

        # ── 1. Contexto adaptativo (si el usuario tiene historial) ────────────
        contexto_adaptativo = None
        fue_adaptativa      = False
        sesion_anterior_id  = None

        if usuario_id:
            ctx = await self.adaptativo.construir_contexto_adaptativo(usuario_id)
            if ctx:
                contexto_adaptativo = ctx["texto"]
                fue_adaptativa      = True
                sesion_anterior_id  = ctx.get("sesion_anterior_id")

        # ── 2. RAG + LLM ──────────────────────────────────────────────────────
        resultado_llm = await self.rag.generar_pregunta(
            framework=framework,
            contexto_adaptativo=contexto_adaptativo,
        )

        # ── 3. Persistencia ───────────────────────────────────────────────────
        sesion_id = await self._persistir(
            framework=framework,
            resultado_llm=resultado_llm,
            usuario_id=usuario_id,
            fue_adaptativa=fue_adaptativa,
            sesion_anterior_id=sesion_anterior_id,
            contexto_adaptativo={"texto": contexto_adaptativo} if contexto_adaptativo else None,
        )

        return RespuestaPregunta(
            sesion_id=str(sesion_id) if sesion_id else None,
            framework=framework,
            pregunta_practica=resultado_llm.get("pregunta_practica", ""),
            titulo=resultado_llm.get("pregunta_practica", "")[:100],
            tipo=resultado_llm.get("tipo", "live_coding"),
            tiempo_estimado_min=_parse_tiempo(resultado_llm.get("tiempo_estimado", "30")),
            criterios_evaluacion=resultado_llm.get("criterios_evaluacion", []),
            conceptos_clave=resultado_llm.get("conceptos_clave", []),
            nivel_dificultad=resultado_llm.get("nivel_dificultad", "Junior"),
            fue_adaptativa=fue_adaptativa,
            categorias_error_objetivo=resultado_llm.get("categorias_error_objetivo", []),
            contexto_adicional=resultado_llm.get("contexto_adicional"),
        )

    async def iniciar_sesion_rapida(
        self,
        framework: str,
        usuario_id: Optional[UUID] = None,
    ) -> SesionIniciadaResponse:
        """
        Crea la sesión en BD con pregunta placeholder (<100ms).
        La pregunta real se genera después bajo demanda.
        """
        slug       = TECH_SLUGS.get(framework)
        tecnologia = await tecnologias_repo.get_tecnologia_por_slug(self.db, slug)
        nivel      = await tecnologias_repo.get_nivel_por_nombre(self.db, NIVEL_DEFAULT)

        if not tecnologia or not nivel:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tecnología '{framework}' o nivel '{NIVEL_DEFAULT}' no en BD.",
            )

        pregunta = await preguntas_repo.crear_pregunta(
            db=self.db,
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            titulo="Cargando pregunta...",
            enunciado="La pregunta se generará en el IDE.",
            tipo="live_coding",
            generada_por_ia=True,
            prompt_contexto="",
            creada_por=usuario_id,
        )

        sesion = await sesiones_repo.crear_sesion(
            db=self.db,
            usuario_id=usuario_id,
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            pregunta_id=pregunta.id,
            fue_adaptativa=False,
        )

        logger.info("✅ Sesión rápida creada: %s (%s)", sesion.id, framework)

        return SesionIniciadaResponse(
            sesion_id=str(sesion.id),
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            framework=framework,
        )

    # ── Helpers privados ──────────────────────────────────────────────────────

    async def _persistir(
        self,
        framework: str,
        resultado_llm: dict,
        usuario_id: Optional[UUID],
        fue_adaptativa: bool,
        sesion_anterior_id,
        contexto_adaptativo: Optional[dict],
    ) -> Optional[UUID]:
        """Persiste pregunta y sesión. No bloquea si falla."""
        try:
            slug       = TECH_SLUGS.get(framework)
            tecnologia = await tecnologias_repo.get_tecnologia_por_slug(self.db, slug)
            nivel      = await tecnologias_repo.get_nivel_por_nombre(self.db, NIVEL_DEFAULT)

            if not tecnologia or not nivel:
                logger.warning("Tecnología '%s' o nivel '%s' no en BD.", slug, NIVEL_DEFAULT)
                return None

            enunciado = resultado_llm.get("pregunta_practica", "Sin enunciado")
            pregunta  = await preguntas_repo.crear_pregunta(
                db=self.db,
                tecnologia_id=tecnologia.id,
                nivel_id=nivel.id,
                titulo=enunciado[:100],
                enunciado=enunciado,
                tipo=resultado_llm.get("tipo", "live_coding"),
                generada_por_ia=True,
                prompt_contexto="",
                creada_por=usuario_id,
                categorias_error_objetivo=resultado_llm.get("categorias_error_objetivo", []),
                contexto_adaptativo=contexto_adaptativo,
            )

            if not usuario_id:
                return None

            sesion = await sesiones_repo.crear_sesion(
                db=self.db,
                usuario_id=usuario_id,
                tecnologia_id=tecnologia.id,
                nivel_id=nivel.id,
                pregunta_id=pregunta.id,
                fue_adaptativa=fue_adaptativa,
                sesion_anterior_id=sesion_anterior_id,
            )

            logger.info("✅ Pregunta y sesión persistidas: %s", sesion.id)
            return sesion.id

        except Exception as exc:
            logger.error("Error persistiendo pregunta/sesión (no bloqueante): %s", exc)
            return None


def _parse_tiempo(tiempo_str: str) -> int:
    """Extrae el primer número del string de tiempo estimado."""
    import re
    match = re.search(r"\d+", str(tiempo_str))
    return int(match.group()) if match else 30