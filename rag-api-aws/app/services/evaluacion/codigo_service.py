"""
app/services/evaluacion/codigo_service.py

Orquesta el pipeline completo de cierre de sesión:
  guardar código → evaluar con IA → persistir en BD → actualizar perfil → finalizar sesión.

Flujo único: 1 sesión → 1 envío → 1 evaluación.
No existen borradores ni versiones parciales.

MEJORAS v2:
  - Logs explícitos de verificación del framework en cada paso
  - Guardia defensiva si el framework llega vacío
"""

import logging
import re
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

_ESTADOS_FINALES = {"completada", "tiempo_agotado"}

_ESTADO_POR_MOTIVO: dict[str, str] = {
    "enviado":        "completada",
    "tiempo_agotado": "tiempo_agotado",
}


class CodigoService:
    """
    Orquesta el pipeline completo de evaluación al cierre de sesión:
      1. Guarda el código final
      2. RAG recupera buenas prácticas FILTRADAS POR FRAMEWORK
      3. LLM analiza el código bajo la óptica del framework correcto
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
        files: Optional[dict[str, str]] = None,
    ) -> RespuestaAnalisisCodigo:
        """
        Pipeline completo de cierre de sesión.

        Args:
            sesion_id:         UUID de la sesión activa.
            codigo:            Código final del candidato.
            framework:         Tecnología ("Vue.js", "React", etc.) — DEBE estar normalizado.
            contexto_proyecto: Archivos adicionales del IDE (contexto ya construido).
            motivo_cierre:     "enviado" | "tiempo_agotado".
            usuario_id:        Opcional. Si es None se resuelve desde sesion.usuario_id.
            files:             Diccionario de archivos del proyecto para filtrado en RAG.

        Returns:
            RespuestaAnalisisCodigo lista para el frontend.

        Raises:
            ValueError:        Si la sesión no existe.
            HTTPException 429: Si el LLM está saturado (propagado desde RAGService).
        """
        t_total      = time.perf_counter()
        sesion_uuid  = UUID(sesion_id)
        estado_final = _ESTADO_POR_MOTIVO.get(motivo_cierre, "completada")

        logger.info("=" * 80)
        logger.info("🚀 INICIANDO CIERRE DE SESIÓN")
        logger.info("📋 Sesion ID:  %s", sesion_uuid)
        logger.info("🔧 Framework:  '%s'", framework)   # ← siempre visible
        logger.info("📝 Motivo:     %s", motivo_cierre)
        logger.info("👤 Usuario ID: %s", usuario_id)
        logger.info("📂 Archivos:   %d", len(files) if files else 0)
        logger.info("=" * 80)

        # ── Guardia defensiva: framework no debe llegar vacío ─────────────
        if not framework or not framework.strip():
            logger.error(
                "❌ Framework vacío en finalizar_y_evaluar — "
                "usando 'JavaScript' como fallback de emergencia"
            )
            framework = "JavaScript"

        logger.info("✅ Framework confirmado para el pipeline: '%s'", framework)

        # ── Cargar sesión ─────────────────────────────────────────────────
        sesion = await sesiones_repo.get_sesion_por_id(self.db, sesion_uuid)
        if not sesion:
            logger.error("❌ Sesión %s no encontrada", sesion_uuid)
            raise ValueError(f"Sesión {sesion_uuid} no encontrada.")

        logger.info("✅ Sesión cargada — Estado actual: %s", sesion.estado)

        # ── Protección contra doble submit ────────────────────────────────
        if sesion.estado in _ESTADOS_FINALES and sesion.evaluacion:
            logger.warning(
                "⚠️  DOBLE SUBMIT DETECTADO | sesion=%s | estado=%s — "
                "retornando evaluación existente sin re-evaluar.",
                sesion_uuid, sesion.estado,
            )
            return _construir_respuesta_desde_bd(sesion)

        uid = usuario_id or sesion.usuario_id
        logger.info("👤 Usuario efectivo: %s", uid)

        # ── 1. Guardar código final ───────────────────────────────────────
        t0 = time.perf_counter()
        logger.info("📝 [1/7] Guardando código final...")
        envio = await codigo_repo.guardar_envio_codigo(
            db=self.db,
            sesion_id=sesion_uuid,
            lenguaje=framework,
            codigo=codigo,
            es_envio_final=True,
        )
        logger.info("✅ Código guardado — Envio ID: %s (%.2fs)", envio.id, time.perf_counter() - t0)

        # ── 2. RAG + LLM — framework explícito en cada llamada ───────────
        t0 = time.perf_counter()
        logger.info("🤖 [2/7] Analizando código con IA (framework='%s')...", framework)
        resultado_llm = await self.rag.analizar_codigo(
            codigo=codigo,
            framework=framework,          # ← propagado explícitamente
            contexto_proyecto=contexto_proyecto,
            files=files,
        )
        logger.info("✅ Análisis IA completado (%.2fs)", time.perf_counter() - t0)
        logger.debug(
            "📊 LLM — Puntaje: %s",
            resultado_llm.get("calificacion_general", {}).get("puntaje"),
        )

        # ── 3. Parsear pilares técnicos ───────────────────────────────────
        logger.info("📊 [3/7] Parseando pilares técnicos...")
        pilares = PilaresParser.parsear(resultado_llm)
        logger.info("✅ Pilares: %s", {k: v for k, v in pilares.items() if v is not None})

        # ── 4. Persistir evaluación completa ──────────────────────────────
        t0 = time.perf_counter()
        logger.info("💾 [4/7] Persistiendo evaluación en BD...")

        evaluacion = await self._guardar_evaluacion(
            sesion_uuid=sesion_uuid,
            resultado_llm=resultado_llm,
            pilares=pilares,
        )
        logger.info("✅ Evaluación guardada — ID: %s", evaluacion.id)

        errores_count = 0
        try:
            errores_raw = resultado_llm.get("errores", [])
            logger.info("🐛 Guardando %d errores detectados...", len(errores_raw))
            await self._guardar_errores(
                sesion_uuid=sesion_uuid,
                envio_id=envio.id,
                errores=errores_raw,
            )
            errores_count = len(errores_raw)
        except Exception as e:
            logger.error("❌ Error guardando errores: %s", e, exc_info=True)

        recom_count = 0
        try:
            recomendaciones_raw = resultado_llm.get("recomendaciones", [])
            logger.info("📚 Guardando %d recomendaciones...", len(recomendaciones_raw))
            await self._guardar_recomendaciones(
                evaluacion_id=evaluacion.id,
                recomendaciones=recomendaciones_raw,
            )
            recom_count = len(recomendaciones_raw)
        except Exception as e:
            logger.error("❌ Error guardando recomendaciones: %s", e, exc_info=True)

        rubricas_count = 0
        try:
            evaluacion_tecnica = resultado_llm.get("evaluacion_tecnica", {})
            if evaluacion_tecnica:
                logger.info("📋 Guardando %d rúbricas técnicas...", len(evaluacion_tecnica))
                await self._guardar_rubricas(
                    evaluacion_id=evaluacion.id,
                    evaluacion_tecnica=evaluacion_tecnica,
                )
                rubricas_count = len(evaluacion_tecnica)
            else:
                logger.info("📋 Sin rúbricas técnicas para guardar")
        except Exception as e:
            logger.error("❌ Error guardando rúbricas (continuando): %s", e, exc_info=True)
            try:
                await self.db.rollback()
                logger.info("🔄 Rollback realizado tras error en rúbricas")
            except Exception:
                pass

        logger.info(
            "💾 Persistencia completada (%.2fs) — "
            "Evaluacion: %s | Errores: %d | Recom: %d | Rúbricas: %d",
            time.perf_counter() - t0,
            evaluacion.id,
            errores_count,
            recom_count,
            rubricas_count,
        )

        # ── 5. Actualizar perfil del usuario ──────────────────────────────
        if uid:
            t0 = time.perf_counter()
            logger.info("👤 [5/7] Actualizando perfil del usuario %s...", uid)
            errores_list = resultado_llm.get("errores", [])
            if errores_list:
                await self.adaptativo.registrar_debilidades_sesion(
                    usuario_id=uid,
                    sesion_id=sesion_uuid,
                    errores=errores_list,
                )
            await perfil_repo.actualizar_estadisticas_usuario(self.db, uid)
            await perfil_repo.actualizar_perfil_tecnico(self.db, uid)
            logger.info("✅ Perfil actualizado (%.2fs)", time.perf_counter() - t0)
        else:
            logger.warning("⚠️ Sin usuario_id — saltando actualización de perfil")

        # ── 6. Finalizar sesión ───────────────────────────────────────────
        logger.info("🏁 [6/7] Finalizando sesión con estado '%s'...", estado_final)
        await sesiones_repo.finalizar_sesion(self.db, sesion_uuid, estado=estado_final)
        logger.info("✅ Sesión finalizada")

        logger.info("=" * 80)
        logger.info(
            "✅ SESIÓN CERRADA EXITOSAMENTE — %.2fs total",
            time.perf_counter() - t_total,
        )
        logger.info(
            "   Sesion: %s | Framework: %s | Estado: %s | "
            "Puntaje: %s | Errores: %d | Recom: %d",
            sesion_uuid,
            framework,
            estado_final,
            resultado_llm.get("calificacion_general", {}).get("puntaje"),
            errores_count,
            recom_count,
        )
        logger.info("=" * 80)

        return _construir_respuesta(resultado_llm, pilares)

    # ── Helpers privados de persistencia ──────────────────────────────────

    async def _guardar_evaluacion(
        self,
        sesion_uuid: UUID,
        resultado_llm: dict,
        pilares: dict,
    ):
        """Guarda la evaluación principal y retorna el objeto creado."""
        cal = resultado_llm.get("calificacion_general", {})

        def _safe_float(value, default: float = 0.0) -> float:
            try:
                if value is None:
                    return default
                if isinstance(value, (int, float)):
                    return float(value)
                match = re.search(r"\d+(\.\d+)?", str(value))
                return float(match.group()) if match else default
            except Exception:
                return default

        puntaje = _safe_float(cal.get("puntaje"), default=0.0)
        if puntaje > 100:
            logger.warning("⚠️ Puntaje fuera de rango (%.2f), ajustando a 100", puntaje)
            puntaje = 100.0

        logger.debug(
            "💾 Guardando evaluación — Puntaje: %.2f | Nivel: %s",
            puntaje,
            cal.get("nivel_candidato"),
        )

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
        """Guarda los errores detectados."""
        if not errores:
            return

        guardados = 0
        saltados  = 0

        for idx, error in enumerate(errores):
            try:
                categoria_slug = error.get("categoria_slug", "")
                categoria_id = await evaluaciones_repo.get_categoria_error_id(
                    db=self.db, slug=categoria_slug,
                )

                if not categoria_id:
                    logger.warning(
                        "⚠️ Categoría no encontrada | slug=%s | idx=%d",
                        categoria_slug, idx,
                    )
                    saltados += 1
                    continue

                linea_raw = error.get("linea_aproximada")
                linea = int(linea_raw) if linea_raw and str(linea_raw).isdigit() else None

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
                guardados += 1

            except Exception as exc:
                logger.warning("⚠️ Error guardando error (idx=%d): %s", idx, exc)
                saltados += 1

        logger.info(
            "📊 Errores — Guardados: %d | Saltados: %d | Total: %d",
            guardados, saltados, len(errores),
        )

    async def _guardar_recomendaciones(
        self,
        evaluacion_id: int,
        recomendaciones: list[dict],
    ) -> None:
        """Guarda las recomendaciones."""
        if not recomendaciones:
            return

        guardados = 0

        for idx, rec in enumerate(recomendaciones):
            try:
                categoria_slug = rec.get("categoria_slug", "")
                categoria_id   = None
                if categoria_slug:
                    categoria_id = await evaluaciones_repo.get_categoria_error_id(
                        db=self.db, slug=categoria_slug,
                    )

                await evaluaciones_repo.guardar_recomendacion(
                    db=self.db,
                    evaluacion_id=evaluacion_id,
                    tipo=rec.get("tipo", "concepto"),
                    titulo=rec.get("titulo", rec.get("mensaje", "Recomendación")),
                    descripcion=rec.get("descripcion", rec.get("solucion", "")),
                    codigo_ejemplo=rec.get("codigo_ejemplo"),
                    recurso_url=rec.get("recurso_url"),
                    recurso_titulo=rec.get("recurso_titulo"),
                    categoria_error_id=categoria_id,
                    prioridad=rec.get("prioridad", "media"),
                    orden=rec.get("orden", idx),
                )
                guardados += 1

            except Exception as exc:
                logger.warning("⚠️ Error guardando recomendación (idx=%d): %s", idx, exc)

        logger.info(
            "📊 Recomendaciones — Guardadas: %d/%d", guardados, len(recomendaciones)
        )

    async def _guardar_rubricas(
        self,
        evaluacion_id: int,
        evaluacion_tecnica: dict,
    ) -> None:
        """
        Guarda las rúbricas técnicas.
        No propaga excepciones para no romper la transacción principal.
        """
        if not evaluacion_tecnica:
            return

        try:
            await self.analytics.guardar_evaluacion_tecnica(
                db=self.db,
                evaluacion_id=evaluacion_id,
                evaluacion_tecnica=evaluacion_tecnica,
            )
            logger.info("✅ Rúbricas guardadas para evaluacion_id=%s", evaluacion_id)
        except Exception as exc:
            logger.error(
                "❌ Error en _guardar_rubricas (evaluacion_id=%s): %s",
                evaluacion_id, exc, exc_info=True,
            )
            # No re-lanzar: las rúbricas son secundarias al flujo principal


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
            "puntaje":                 round(float(cal.get("puntaje") or 0), 1),
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
    Se usa en caso de doble submit para no re-evaluar.
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