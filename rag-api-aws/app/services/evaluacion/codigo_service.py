"""
app/services/evaluacion/codigo_service.py

Orquesta el pipeline completo de cierre de sesión:
  guardar código → evaluar con IA → persistir en BD → actualizar perfil → finalizar sesión.

Flujo único: 1 sesión → 1 envío → 1 evaluación.
No existen borradores ni versiones parciales.

MEJORAS:
  - Protección contra doble submit: si la sesión ya está completada, retorna
    el resultado existente en lugar de re-evaluar (evita doble gasto de tokens)
  - Logs de duración en cada etapa del pipeline
"""

import logging
import time
from typing import Literal, Optional
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

MotivoCierre = Literal["enviado", "tiempo_agotado"]

# Estados que indican que la sesión ya fue procesada (no re-evaluar)
_ESTADOS_FINALES = {"completada", "tiempo_agotado"}

_ESTADO_POR_MOTIVO: dict[str, str] = {
    "enviado":        "completada",
    "tiempo_agotado": "tiempo_agotado",
}


class CodigoService:
    """
    Orquesta el pipeline completo de evaluación al cierre de sesión:
      1. Guarda el código final
      2. RAG recupera buenas prácticas relevantes
      3. LLM analiza el código y retorna evaluación estructurada
      4. Parsea los 5 pilares técnicos
      5. Persiste todo en BD (envío, evaluación, errores, recomendaciones)
      6. Actualiza perfil técnico y debilidades del usuario
      7. Marca la sesión con el estado final correspondiente
    """

    def __init__(self, db: AsyncSession, request: Request):
        self.db         = db
        self.rag        = RAGService(request=request)
        self.analytics  = AnalyticsService()
        self.adaptativo = AdaptativoService(db=db)

    async def finalizar_y_evaluar(
        self,
        sesion_id: str,
        codigo: str,
        framework: str,
        contexto_proyecto: str = "",
        motivo_cierre: MotivoCierre = "enviado",
        usuario_id: Optional[UUID] = None,
    ) -> RespuestaAnalisisCodigo:
        """
        Pipeline completo de cierre de sesión.

        Args:
            sesion_id:         UUID de la sesión activa.
            codigo:            Código final del candidato.
            framework:         Tecnología ("Vue.js", "React", etc.).
            contexto_proyecto: Archivos adicionales del IDE.
            motivo_cierre:     "enviado" | "tiempo_agotado".
            usuario_id:        Opcional. Si es None se resuelve desde sesion.usuario_id.

        Returns:
            RespuestaAnalisisCodigo lista para el frontend.

        Raises:
            ValueError:        Si la sesión no existe.
            HTTPException 429: Si el LLM está saturado (propagado desde RAGService).
        """
        t_total    = time.perf_counter()
        sesion_uuid = UUID(sesion_id)
        estado_final = _ESTADO_POR_MOTIVO.get(motivo_cierre, "completada")

        logger.info(
            "🚀 Iniciando cierre | sesion=%s | framework=%s | motivo=%s",
            sesion_uuid, framework, motivo_cierre,
        )

        # ── Cargar sesión ─────────────────────────────────────────────────────
        sesion = await sesiones_repo.get_sesion_por_id(self.db, sesion_uuid)
        if not sesion:
            raise ValueError(f"Sesión {sesion_uuid} no encontrada.")

        # ── Protección contra doble submit ────────────────────────────────────
        # Si la sesión ya fue procesada, devolvemos lo que hay en BD
        # en lugar de volver a gastar tokens en el LLM.
        if sesion.estado in _ESTADOS_FINALES and sesion.evaluacion:
            logger.warning(
                "⚠️  Doble submit detectado | sesion=%s | estado=%s — "
                "retornando evaluación existente sin re-evaluar.",
                sesion_uuid, sesion.estado,
            )
            return _construir_respuesta_desde_bd(sesion)

        # Resolver usuario_id desde BD si no llegó por JWT
        uid = usuario_id or sesion.usuario_id

        # ── 1. Guardar código final ───────────────────────────────────────────
        t0    = time.perf_counter()
        envio = await codigo_repo.guardar_envio_codigo(
            db=self.db,
            sesion_id=sesion_uuid,
            lenguaje=framework,
            codigo=codigo,
            es_envio_final=True,
        )
        logger.debug("📝 Código guardado en %.2fs", time.perf_counter() - t0)

        # ── 2. RAG + LLM ──────────────────────────────────────────────────────
        # HTTPException 429 se propaga hacia arriba si Groq está en rate limit
        t0           = time.perf_counter()
        resultado_llm = await self.rag.analizar_codigo(
            codigo=codigo,
            framework=framework,
            contexto_proyecto=contexto_proyecto,
        )
        logger.info("🤖 LLM completado en %.2fs", time.perf_counter() - t0)

        # ── 3. Parsear pilares técnicos ───────────────────────────────────────
        pilares = PilaresParser.parsear(resultado_llm)

        # ── 4. Persistir evaluación completa ──────────────────────────────────
        t0         = time.perf_counter()
        evaluacion = await self._guardar_evaluacion(
            sesion_uuid=sesion_uuid,
            resultado_llm=resultado_llm,
            pilares=pilares,
        )
        try:
            await self._guardar_errores(
                sesion_uuid=sesion_uuid,
                envio_id=envio.id,
                errores=resultado_llm.get("errores", []),
            )
        except Exception as e:
            logger.error("❌ Error guardando errores: %s", e)

        try:
            await self._guardar_recomendaciones(
                evaluacion_id=evaluacion.id,
                recomendaciones=resultado_llm.get("recomendaciones", []),
            )
        except Exception as e:
            logger.error("❌ Error guardando recomendaciones: %s", e)

        try:
            await self._guardar_rubricas(
                evaluacion_id=evaluacion.id,
                evaluacion_tecnica=resultado_llm.get("evaluacion_tecnica", {}),
            )
        except Exception as e:
            logger.error("❌ Error guardando rúbricas: %s", e)



        logger.debug("💾 Persistencia completada en %.2fs", time.perf_counter() - t0)

        # ── 5. Actualizar perfil del usuario ──────────────────────────────────
        if uid:
            t0     = time.perf_counter()
            errores = resultado_llm.get("errores", [])
            if errores:
                await self.adaptativo.registrar_debilidades_sesion(
                    usuario_id=uid,
                    sesion_id=sesion_uuid,
                    errores=errores,
                )
            await perfil_repo.actualizar_estadisticas_usuario(self.db, uid)
            await perfil_repo.actualizar_perfil_tecnico(self.db, uid)
            logger.debug(
                "👤 Perfil usuario actualizado en %.2fs", time.perf_counter() - t0,
            )

        # ── 6. Finalizar sesión ───────────────────────────────────────────────
        await sesiones_repo.finalizar_sesion(self.db, sesion_uuid, estado=estado_final)

        logger.info(
            "✅ Sesión %s cerrada con estado '%s' | pipeline total=%.2fs",
            sesion_uuid, estado_final, time.perf_counter() - t_total,
        )

        return _construir_respuesta(resultado_llm, pilares)

    # ── Helpers privados de persistencia ──────────────────────────────────────

    async def _guardar_evaluacion(
        self,
        sesion_uuid: UUID,
        resultado_llm: dict,
        pilares: dict,
    ):
        cal = resultado_llm.get("calificacion_general", {})
        import re
    
        def _safe_float(value, default=0.0):
            try:
                if value is None:
                    return default
    
                if isinstance(value, (int, float)):
                    return float(value)
    
                text = str(value)
    
                match = re.search(r"\d+(\.\d+)?", text)
                if not match:
                    return default
    
                return float(match.group())
    
            except Exception:
                return default
    
        # ✅ FIX 3: cambio solicitado
        raw_puntaje = cal.get("puntaje")
        puntaje = _safe_float(raw_puntaje, default=0.0)
    
        # ✅ FIX 4: validación de consistencia
        if puntaje > 100:
            logger.warning("⚠️ Puntaje fuera de rango (>100): %s", puntaje)
            puntaje = 100.0
    
        return await evaluaciones_repo.guardar_evaluacion(
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



    async def _guardar_errores(
        self,
        sesion_uuid: UUID,
        envio_id: UUID,
        errores: list[dict],
    ) -> None:
        for error in errores:
            try:
                categoria_id = await evaluaciones_repo.get_categoria_error_id(
                    db=self.db,
                    slug=error.get("categoria_slug", ""),
                )

                if not categoria_id:
                    logger.warning(
                        "⚠️ Categoría de error no encontrada | slug=%s | sesion=%s",
                        error.get("categoria_slug"), sesion_uuid,
                    )
                    continue  # <- clave: no contaminar datos



                linea_raw = error.get("linea_aproximada")
                linea     = int(linea_raw) if linea_raw and str(linea_raw).isdigit() else None

                await evaluaciones_repo.guardar_error_detectado(
                    db=self.db,
                    sesion_id=sesion_uuid,
                    envio_codigo_id=envio_id,
                    categoria_error_id=categoria_id,
                    descripcion=error.get("descripcion", "Sin descripción"),
                    severidad=error.get("impacto", "medio"),
                    es_error_conceptual=error.get("es_conceptual", False),
                    linea_codigo=linea,
                    fragmento_codigo=error.get("fragmento_codigo"),
                    codigo_corregido=error.get("codigo_corregido"),
                    explicacion_ia=error.get("explicacion_ia"),
                )
            except Exception as exc:
                logger.warning("⚠️  Error guardando error detectado: %s", exc)

    async def _guardar_recomendaciones(
        self,
        evaluacion_id: int,
        recomendaciones: list[dict],
    ) -> None:
        for idx, rec in enumerate(recomendaciones):
            try:
                categoria_id = await evaluaciones_repo.get_categoria_error_id(
                    db=self.db,
                    slug=rec.get("categoria_slug", ""),
                )
                await evaluaciones_repo.guardar_recomendacion(
                    db=self.db,
                    evaluacion_id=evaluacion_id,
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
                logger.warning("⚠️  Error guardando recomendación: %s", exc)

    async def _guardar_rubricas(
        self,
        evaluacion_id: int,
        evaluacion_tecnica: dict,
    ) -> None:
        if evaluacion_tecnica:
            await self.analytics.guardar_evaluacion_tecnica(
                db=self.db,
                evaluacion_id=evaluacion_id,
                evaluacion_tecnica=evaluacion_tecnica,
            )


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE CONSTRUCCIÓN DE RESPUESTA
# ─────────────────────────────────────────────────────────────────────────────

def _construir_respuesta(resultado_llm: dict, pilares: dict) -> RespuestaAnalisisCodigo:
    """Construye RespuestaAnalisisCodigo desde el resultado fresco del LLM."""
    cal = resultado_llm.get("calificacion_general", {})

    recomendaciones = sorted(
        resultado_llm.get("recomendaciones", []),
        key=lambda r: r.get("orden", 99),
    )

    return RespuestaAnalisisCodigo(
        calificacion_general={
            "nivel":                   cal.get("nivel", "Regular"),
            "nivel_candidato":         cal.get("nivel_candidato"),
            "puntaje": round(float(cal.get("puntaje") or 0), 1),
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


def _construir_respuesta_desde_bd(sesion) -> RespuestaAnalisisCodigo:
    """
    Construye RespuestaAnalisisCodigo desde datos ya persistidos en BD.
    Se usa cuando se detecta un doble submit para no re-evaluar.
    """
    evaluacion = sesion.evaluacion
    puntaje    = float(evaluacion.puntaje_total) if evaluacion and evaluacion.puntaje_total else 0.0

    def _nivel(p: float) -> str:
        if p >= 90: return "Excelente"
        if p >= 75: return "Bueno"
        if p >= 60: return "Regular"
        if p >= 40: return "Deficiente"
        return "Crítico"

    pilares = {
        "javascript":       float(evaluacion.puntaje_javascript or 0),
        "arquitectura":     float(evaluacion.puntaje_arquitectura or 0),
        "buenas_practicas": float(evaluacion.puntaje_buenas_practicas or 0),
        "comunicacion":     float(evaluacion.puntaje_comunicacion or 0),
        "resolucion":       float(evaluacion.puntaje_resolucion or 0),
    } if evaluacion else {}

    errores = [
        {
            "tipo":             e.categoria_error.nombre if e.categoria_error else "general",
            "categoria_slug":   e.categoria_error.slug if e.categoria_error else None,
            "descripcion":      e.descripcion,
            "impacto":          e.severidad,
            "es_conceptual":    e.es_error_conceptual,
            "linea_aproximada": e.linea_codigo,
            "fragmento_codigo": e.fragmento_codigo,
            "codigo_corregido": e.codigo_corregido,
            "explicacion_ia":   e.explicacion_ia,
        }
        for e in (sesion.errores_detectados or [])
    ]

    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        recomendaciones = sorted(
            [
                {
                    "tipo":           r.tipo,
                    "mensaje":        r.titulo,
                    "solucion":       r.descripcion,
                    "codigo_ejemplo": r.codigo_ejemplo,
                    "recurso_url":    r.recurso_url,
                    "recurso_titulo": r.recurso_titulo,
                    "prioridad":      r.prioridad,
                    "orden":          r.orden,
                }
                for r in evaluacion.recomendaciones
            ],
            key=lambda x: x["orden"],
        )

    fortalezas   = [f.strip() for f in (evaluacion.fortalezas or "").split("\n") if f.strip()]
    areas_mejora = [a.strip() for a in (evaluacion.areas_mejora or "").split("\n") if a.strip()]

    return RespuestaAnalisisCodigo(
        calificacion_general={
            "nivel":                   _nivel(puntaje),
            "nivel_candidato":         evaluacion.nivel_candidato if evaluacion else None,
            "puntaje":                 int(puntaje),
            "apto_para_contratacion":  evaluacion.apto_para_contratacion if evaluacion else None,
            "resumen":                 evaluacion.feedback_general if evaluacion else "Sin evaluación",
            "resumen_para_reclutador": evaluacion.resumen_para_reclutador if evaluacion else None,
        },
        pilares_tecnicos=pilares,
        errores=errores,
        buenas_practicas=fortalezas,
        malas_practicas=areas_mejora,
        recomendaciones=recomendaciones,
        detalle_rubricas=[],
    )



