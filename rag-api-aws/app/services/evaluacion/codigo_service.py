"""
app/services/evaluacion/codigo_service.py

Orquesta el análisis de código: RAG + LLM + persistencia completa en BD.
Mapea la respuesta del LLM a TODAS las columnas de la tabla `evaluaciones`.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.repositories import (
    sesiones_repo,
    evaluaciones_repo,
    codigo_repo,
    perfil_repo,
)
from app.schemas.evaluaciones import RespuestaAnalisisCodigo
from app.services.rag.rag_service import RAGService
from app.services.evaluacion.pilares_parser import PilaresParser
from app.services.evaluacion.analytics_service import AnalyticsService
from app.services.generacion.adaptativo_service import AdaptativoService

logger = logging.getLogger(__name__)


class CodigoService:
    """
    Orquesta el pipeline completo de evaluación de código:
      1. RAG recupera buenas prácticas relevantes
      2. LLM analiza el código y retorna evaluación estructurada
      3. Parsea los 5 pilares técnicos
      4. Persiste todo en BD (evaluacion, errores, recomendaciones, perfil)
    """

    def __init__(self, db: AsyncSession, request: Request):
        self.db         = db
        self.rag        = RAGService(request=request)
        self.analytics  = AnalyticsService()
        self.adaptativo = AdaptativoService(db=db)

    async def analizar_y_persistir(
        self,
        codigo: str,
        framework: str,
        contexto_proyecto: str = "",
        sesion_id: Optional[str] = None,
        usuario_id: Optional[UUID] = None,
    ) -> RespuestaAnalisisCodigo:
        """
        Pipeline completo de análisis de código.

        Args:
            codigo:            Código del candidato.
            framework:         Tecnología ("Vue.js", "React", etc.)
            contexto_proyecto: Archivos adicionales del IDE.
            sesion_id:         UUID de sesión para persistir (opcional).
            usuario_id:        UUID del usuario para actualizar perfil (opcional).

        Returns:
            RespuestaAnalisisCodigo lista para el frontend.
        """
        logger.info("Analizando código: framework=%s sesion=%s", framework, sesion_id)

        # ── 1. RAG + LLM ──────────────────────────────────────────────────────
        resultado_llm = await self.rag.analizar_codigo(
            codigo=codigo,
            framework=framework,
            contexto_proyecto=contexto_proyecto,
        )

        # ── 2. Parsear pilares técnicos ───────────────────────────────────────
        pilares = PilaresParser.parsear(resultado_llm)

        # ── 3. Persistir si hay sesión ─────────────────────────────────────────
        if sesion_id:
            await self._persistir(
                sesion_id_str=sesion_id,
                codigo=codigo,
                framework=framework,
                resultado_llm=resultado_llm,
                pilares=pilares,
                usuario_id=usuario_id,
            )

        # ── 4. Construir respuesta para el frontend ───────────────────────────
        return _construir_respuesta(resultado_llm, pilares)

    # ── Helpers privados ──────────────────────────────────────────────────────

    async def _persistir(
        self,
        sesion_id_str: str,
        codigo: str,
        framework: str,
        resultado_llm: dict,
        pilares: dict,
        usuario_id: Optional[UUID],
    ) -> None:
        """Persiste la evaluación completa en BD. No bloquea si falla."""
        try:
            from uuid import UUID as _UUID
            sesion_uuid = _UUID(sesion_id_str)

            sesion = await sesiones_repo.get_sesion_por_id(self.db, sesion_uuid)
            if not sesion:
                logger.warning("Sesión %s no encontrada. Análisis no persistido.", sesion_uuid)
                return

            # Guardar código final
            envio = await codigo_repo.guardar_envio_codigo(
                db=self.db,
                sesion_id=sesion_uuid,
                lenguaje=framework,
                codigo=codigo,
                es_envio_final=True,
            )

            # Guardar evaluación con todos los pilares
            cal      = resultado_llm.get("calificacion_general", {})
            puntaje  = float(cal.get("puntaje", 0))
            evaluacion = await evaluaciones_repo.guardar_evaluacion(
                db=self.db,
                sesion_id=sesion_uuid,
                puntaje_total=puntaje,
                puntaje_javascript=pilares.get("puntaje_javascript"),
                puntaje_arquitectura=pilares.get("puntaje_arquitectura"),
                puntaje_buenas_practicas=pilares.get("puntaje_buenas_practicas"),
                puntaje_comunicacion=pilares.get("puntaje_comunicacion"),
                puntaje_resolucion=pilares.get("puntaje_resolucion"),
                nivel_candidato=cal.get("nivel_candidato"),
                apto_para_contratacion=cal.get("apto_para_contratacion"),
                feedback_general=cal.get("resumen", "Sin resumen"),
                resumen_para_reclutador=cal.get("resumen_para_reclutador"),
                fortalezas="\n".join(resultado_llm.get("buenas_practicas", [])),
                areas_mejora="\n".join(resultado_llm.get("malas_practicas", [])),
                modelo_ia_usado=settings.LLM_MODEL,
            )

            # Guardar errores detectados (con categoria_slug resuelto)
            errores = resultado_llm.get("errores", [])
            for error in errores:
                try:
                    categoria_id = await evaluaciones_repo.get_categoria_error_id(
                        db=self.db,
                        slug=error.get("categoria_slug", ""),
                    )
                    linea_raw = error.get("linea_aproximada")
                    linea     = int(linea_raw) if linea_raw and str(linea_raw).isdigit() else None

                    await evaluaciones_repo.guardar_error_detectado(
                        db=self.db,
                        sesion_id=sesion_uuid,
                        envio_codigo_id=envio.id,
                        categoria_error_id=categoria_id or 1,   # fallback a id=1
                        descripcion=error.get("descripcion", "Sin descripción"),
                        severidad=error.get("impacto", "medio"),
                        es_error_conceptual=error.get("es_conceptual", False),
                        linea_codigo=linea,
                        fragmento_codigo=error.get("fragmento_codigo"),
                        codigo_corregido=error.get("codigo_corregido"),
                        explicacion_ia=error.get("explicacion_ia"),
                    )
                except Exception as exc:
                    logger.warning("Error guardando error detectado: %s", exc)

            # Guardar recomendaciones con todos los campos de recomendaciones_solucion
            for idx, rec in enumerate(resultado_llm.get("recomendaciones", [])):
                try:
                    categoria_id = await evaluaciones_repo.get_categoria_error_id(
                        db=self.db,
                        slug=rec.get("categoria_slug", ""),
                    )
                    await evaluaciones_repo.guardar_recomendacion(
                        db=self.db,
                        evaluacion_id=evaluacion.id,
                        tipo=rec.get("tipo", "concepto"),
                        titulo=rec.get("mensaje", "Recomendación"),
                        descripcion=rec.get("solucion", ""),
                        codigo_ejemplo=rec.get("codigo_ejemplo"),
                        recurso_url=rec.get("recurso_url"),
                        recurso_titulo=rec.get("recurso_titulo"),
                        categoria_error_id=categoria_id,
                        prioridad=rec.get("prioridad", "media"),
                        orden=rec.get("orden", idx),
                    )
                except Exception as exc:
                    logger.warning("Error guardando recomendación: %s", exc)

            # Guardar dimensiones de rúbrica en detalle_evaluacion
            eval_tecnica = resultado_llm.get("evaluacion_tecnica", {})
            if eval_tecnica:
                await self.analytics.guardar_evaluacion_tecnica(
                    db=self.db,
                    evaluacion_id=evaluacion.id,
                    evaluacion_tecnica=eval_tecnica,
                )

            # Actualizar debilidades del usuario (sistema adaptativo)
            if usuario_id and errores:
                await self.adaptativo.registrar_debilidades_sesion(
                    usuario_id=usuario_id,
                    sesion_id=sesion_uuid,
                    errores=errores,
                )

            # Actualizar estadísticas y perfil del usuario
            if usuario_id or sesion.usuario_id:
                uid = usuario_id or sesion.usuario_id
                await perfil_repo.actualizar_estadisticas_usuario(self.db, uid)
                await perfil_repo.actualizar_perfil_tecnico(self.db, uid)

            await sesiones_repo.finalizar_sesion(self.db, sesion_uuid)
            logger.info("✅ Análisis persistido completo para sesión %s", sesion_uuid)

        except Exception as exc:
            logger.error("Error persistiendo análisis (no bloqueante): %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER DE CONSTRUCCIÓN DE RESPUESTA
# ─────────────────────────────────────────────────────────────────────────────

def _construir_respuesta(resultado_llm: dict, pilares: dict) -> RespuestaAnalisisCodigo:
    """Construye RespuestaAnalisisCodigo desde el resultado del LLM."""
    cal = resultado_llm.get("calificacion_general", {})

    recomendaciones = sorted(
        resultado_llm.get("recomendaciones", []),
        key=lambda r: r.get("orden", 99),
    )

    return RespuestaAnalisisCodigo(
        calificacion_general={
            "nivel":                   cal.get("nivel", "Regular"),
            "nivel_candidato":         cal.get("nivel_candidato"),
            "puntaje":                 int(cal.get("puntaje", 0)),
            "apto_para_contratacion":  cal.get("apto_para_contratacion"),
            "resumen":                 cal.get("resumen", ""),
            "resumen_para_reclutador": cal.get("resumen_para_reclutador"),
        },
        pilares_tecnicos=pilares,
        errores=resultado_llm.get("errores", []),
        buenas_practicas=resultado_llm.get("buenas_practicas", []),
        malas_practicas=resultado_llm.get("malas_practicas", []),
        recomendaciones=recomendaciones,
        evaluacion_tecnica=resultado_llm.get("evaluacion_tecnica", {}),
        detalle_rubricas=[],
    )