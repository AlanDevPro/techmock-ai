"""
app/services/rag/rag_service.py

Orquestador RAG puro: retriever + prompt + LLM.
Sin lógica de negocio ni persistencia — eso va en generacion/ y evaluacion/.

MEJORAS v2:
  - Captura LLMRateLimitError y la convierte en HTTPException 429 legible
  - Logs de duración para detectar cuellos de botella
  - Soporte para pasar archivos del proyecto para filtrado inteligente
  - Logs detallados del tamaño del prompt para debugging
  - Reporte de archivos filtrados y sus tamaños
  - Verificación explícita del framework en toda la cadena RAG
"""

import logging
import random
import time
from typing import Optional

from fastapi import HTTPException, Request, status

from app.services.llm.client import LLMRateLimitError, llm_client
from app.services.llm.prompts.preguntas_prompts import build_question_prompt
from app.services.llm.prompts.evaluacion_prompts import build_code_analysis_prompt
from app.services.llm.parser import parse_llm_json

logger = logging.getLogger(__name__)


class RAGService:
    """
    Orquesta el pipeline RAG:
      1. Obtiene el retriever de app.state (ya conectado al arranque)
      2. Busca fragmentos relevantes en OpenSearch FILTRADOS POR FRAMEWORK
      3. Construye el prompt con el contexto específico del framework
      4. Llama al LLM y parsea la respuesta
    """

    def __init__(self, request: Optional[Request] = None):
        self._request = request

    def _get_retriever(self):
        """
        Obtiene el VectorStoreRetriever desde app.state.
        Retorna None si no está disponible (RAG degradado).
        """
        if self._request and hasattr(self._request.app.state, "vector_store"):
            return self._request.app.state.vector_store
        logger.warning("⚠️  vector_store no disponible en app.state — RAG desactivado")
        return None

    async def recuperar_contexto(
        self,
        query: str,
        framework: Optional[str] = None,
        top_k: int = 5,
    ) -> str:
        """
        Busca fragmentos relevantes en OpenSearch para la query dada,
        FILTRANDO por framework para evitar contaminación cruzada.
        Retorna string vacío si el retriever no está disponible.
        """
        retriever = self._get_retriever()
        if not retriever:
            return ""

        # ── Log de verificación del framework en la búsqueda RAG ──────────
        logger.info("🔍 [RAG] Buscando contexto:")
        logger.info("   - Framework: %s", framework or "genérico")
        logger.info("   - Query: %s", query)
        logger.info("   - Top K: %d", top_k)

        try:
            t0 = time.perf_counter()
            contexto = await retriever.buscar(
                query=query,
                framework=framework,  # ← FILTRO OBLIGATORIO POR FRAMEWORK
                top_k=top_k,
            )
            elapsed = time.perf_counter() - t0
            logger.info(
                "✅ [RAG] Búsqueda OK | framework=%s | chars=%d | %.2fs",
                framework, len(contexto), elapsed,
            )
            if not contexto:
                logger.warning(
                    "⚠️ [RAG] Sin resultados para framework='%s'. "
                    "Verifica que el retriever filtre por metadata.framework en OpenSearch.",
                    framework,
                )
            return contexto
        except Exception as exc:
            logger.error("❌ [RAG] Error en búsqueda RAG: %s", exc)
            return ""

    async def generar_pregunta(
        self,
        framework: str,
        contexto_adaptativo: Optional[str] = None,
    ) -> dict:
        """
        Pipeline completo para generar una pregunta de entrevista.

        Args:
            framework:           Tecnología objetivo ("Vue.js", "React", etc.)
            contexto_adaptativo: Texto con debilidades del usuario para preguntas adaptativas.

        Returns:
            Dict con la estructura RespuestaPregunta del LLM.

        Raises:
            HTTPException 429: si Groq está en rate limit tras todos los reintentos.
        """
        logger.info("📝 [generar_pregunta] Framework: %s", framework)

        query        = _build_pregunta_query(framework)
        contexto_rag = await self.recuperar_contexto(query=query, framework=framework)

        messages = build_question_prompt(
            contexto_rag=contexto_rag,
            framework=framework,
            contexto_adaptativo=contexto_adaptativo,
        )

        try:
            t0  = time.perf_counter()
            raw = await llm_client.chat(messages=messages)
            logger.info(
                "✅ Pregunta generada | framework=%s | %.2fs",
                framework, time.perf_counter() - t0,
            )
        except LLMRateLimitError as exc:
            logger.warning("🚨 Rate limit al generar pregunta: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="El servicio de IA está temporalmente saturado. "
                       "Intenta de nuevo en unos segundos.",
            ) from exc

        resultado = parse_llm_json(raw, fallback_key="pregunta_practica")
        return resultado

    async def analizar_codigo(
        self,
        codigo: str,
        framework: str,
        contexto_proyecto: str = "",
        files: Optional[dict[str, str]] = None,
    ) -> dict:
        """
        Pipeline completo para analizar código de un candidato.

        Args:
            codigo:            Código enviado por el usuario.
            framework:         Tecnología objetivo (ej: "Vue.js", "React").
            contexto_proyecto: Archivos adicionales del IDE (string ya formateado).
            files:             Diccionario de archivos del proyecto para filtrado inteligente.

        Returns:
            Dict con la estructura RespuestaAnalisisCodigo del LLM.

        Raises:
            HTTPException 429: si Groq está en rate limit tras todos los reintentos.
        """
        # =====================================================================
        # 1. LOG DE ENTRADA — QUÉ RECIBIMOS
        # =====================================================================
        logger.info("=" * 80)
        logger.info("🔍 RAGService.analizar_codigo - INICIO")
        logger.info("📋 Framework: '%s'", framework)
        logger.info("📝 Longitud código principal: %d caracteres", len(codigo))
        logger.info("📦 Contexto proyecto (pre-formateado): %d caracteres", len(contexto_proyecto))
        logger.info("📂 Archivos recibidos: %d", len(files) if files else 0)

        # ── Guardia crítica: el framework no debe estar vacío ──────────────
        if not framework or not framework.strip():
            logger.error("❌ FRAMEWORK VACÍO — usando 'JavaScript' como fallback")
            framework = "JavaScript"

        # =====================================================================
        # 2. LOG DETALLADO DE ARCHIVOS RECIBIDOS
        # =====================================================================
        if files:
            logger.info("-" * 60)
            logger.info("📋 ARCHIVOS RECIBIDOS DEL FRONTEND:")

            total_files_size = 0
            file_list = []

            for path, content in files.items():
                size = len(content)
                total_files_size += size
                file_list.append((path, size))

            file_list.sort(key=lambda x: x[1], reverse=True)

            for path, size in file_list[:20]:
                size_kb = size / 1024
                if size > 10000:
                    logger.warning("   ⚠️ %s: %d chars (%.1f KB) - ¡MUY GRANDE!", path, size, size_kb)
                elif size > 5000:
                    logger.warning("   ⚠️ %s: %d chars (%.1f KB) - Grande", path, size, size_kb)
                else:
                    logger.info("   📄 %s: %d chars (%.1f KB)", path, size, size_kb)

            if len(file_list) > 20:
                logger.info("   ... y %d archivos más", len(file_list) - 20)

            logger.info("📊 TOTAL ARCHIVOS: %d", len(file_list))
            logger.info(
                "📊 TAMAÑO TOTAL ARCHIVOS: %d caracteres (%.1f KB)",
                total_files_size, total_files_size / 1024,
            )

            large_files = [(p, s) for p, s in file_list if s > 10000]
            if large_files:
                logger.warning("=" * 60)
                logger.warning("⚠️ ARCHIVOS PROBLEMÁTICOS DETECTADOS (>10KB):")
                for path, size in large_files:
                    logger.warning("   🔴 %s: %d caracteres", path, size)
                logger.warning("⚠️ Estos archivos serán TRUNCADOS o IGNORADOS en el prompt")
                logger.warning("=" * 60)

            suspicious = [
                p for p in files.keys()
                if any(x in p.lower() for x in ["node_modules", "dist", "build", ".git", "lock"])
            ]
            if suspicious:
                logger.warning(
                    "⚠️ ARCHIVOS SOSPECHOSOS (posiblemente irrelevantes): %d",
                    len(suspicious),
                )
                for path in suspicious[:10]:
                    logger.warning("   ⚠️ %s", path)
        else:
            logger.info("📂 No se recibieron archivos del frontend")

        # =====================================================================
        # 3. BÚSQUEDA RAG — FILTRADA POR FRAMEWORK
        # =====================================================================
        query = f"buenas prácticas {framework} code review patrones arquitectura"
        logger.info("-" * 60)
        logger.info("📚 [RAG] Query construida para framework '%s': %s", framework, query)

        contexto_rag = await self.recuperar_contexto(
            query=query,
            framework=framework,  # ← CRÍTICO: filtra resultados por framework
        )
        logger.info("📚 [RAG] Contexto RAG obtenido: %d caracteres", len(contexto_rag))

        if not contexto_rag:
            logger.warning(
                "⚠️ [RAG] Contexto vacío para '%s'. El análisis se basará solo en el código.",
                framework,
            )

        # =====================================================================
        # 4. CONSTRUCCIÓN DEL PROMPT — CON INSTRUCCIONES ESPECÍFICAS DEL FRAMEWORK
        # =====================================================================
        logger.info("-" * 60)
        logger.info(
            "📝 Construyendo prompt específico para %s "
            "(con filtrado inteligente de archivos)...",
            framework,
        )

        prompt_messages = build_code_analysis_prompt(
            codigo=codigo,
            framework=framework,
            contexto_proyecto=contexto_proyecto,
            contexto_rag=contexto_rag,
            files=files,
        )

        # =====================================================================
        # 5. LOG DEL TAMAÑO DEL PROMPT — CRÍTICO PARA DEBUG
        # =====================================================================
        logger.info("-" * 60)
        logger.info("📊 ANÁLISIS DE TAMAÑO DEL PROMPT:")

        total_size = 0
        for msg in prompt_messages:
            role    = msg.get("role", "unknown")
            content = msg.get("content", "")
            size    = len(content)
            total_size += size

            if size > 10000:
                logger.warning("   ⚠️ Mensaje %s: %d caracteres (%.1f KB) - MUY GRANDE", role, size, size / 1024)
            elif size > 5000:
                logger.warning("   ⚠️ Mensaje %s: %d caracteres (%.1f KB) - Grande", role, size, size / 1024)
            else:
                logger.info("   ✅ Mensaje %s: %d caracteres (%.1f KB)", role, size, size / 1024)

        logger.info("📊 TOTAL PROMPT: %d caracteres (%.1f KB)", total_size, total_size / 1024)

        if total_size > 50000:
            logger.error("=" * 60)
            logger.error("❌ PROMPT DEMASIADO GRANDE: %d caracteres", total_size)
            logger.error("📌 Estimado: ~%.0f tokens", total_size / 4)
            logger.error("🛠️ SOLUCIONES:")
            logger.error("   1. Filtrar más archivos en el frontend (node_modules, dist, etc.)")
            logger.error("   2. Reducir el tamaño de truncamiento de archivos")
            logger.error("   3. Usar un modelo con mayor contexto (llama-3.1-8b-instant)")
            logger.error("=" * 60)
        elif total_size > 30000:
            logger.warning("⚠️ PROMPT GRANDE: %d caracteres (~%.0f tokens)", total_size, total_size / 4)
            logger.warning("   Puede funcionar pero está cerca del límite")
        else:
            logger.info("✅ Tamaño del prompt dentro de límites aceptables")

        if prompt_messages:
            user_content = prompt_messages[-1].get("content", "")
            preview = user_content[:500].replace("\n", " ")
            logger.info("📄 PREVIEW del prompt: %s...", preview)

        # =====================================================================
        # 6. LLAMA AL LLM
        # =====================================================================
        try:
            t0 = time.perf_counter()
            logger.info("-" * 60)
            logger.info("🤖 Enviando prompt a LLM (framework=%s)...", framework)

            raw = await llm_client.chat(messages=prompt_messages, temperature=0.3)

            elapsed = time.perf_counter() - t0
            logger.info("✅ Respuesta recibida en %.2f segundos", elapsed)
            logger.info("📊 Longitud respuesta: %d caracteres", len(raw))

        except LLMRateLimitError as exc:
            logger.error("=" * 60)
            logger.error("🚨 RATE LIMIT EXCEDIDO: %s", exc)
            logger.error("⏳ Espera unos segundos antes de reintentar")
            logger.error("=" * 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="El servicio de IA está temporalmente saturado. "
                       "Intenta de nuevo en unos segundos.",
            ) from exc

        except Exception as exc:
            logger.error("=" * 60)
            logger.error("❌ ERROR INESPERADO EN LLM: %s", type(exc).__name__)
            logger.error("Mensaje: %s", exc)
            logger.error("=" * 60)
            raise

        # =====================================================================
        # 7. PARSEO DE LA RESPUESTA
        # =====================================================================
        logger.info("-" * 60)
        logger.info("📊 Parseando respuesta JSON del LLM...")

        try:
            resultado = parse_llm_json(raw, fallback_key="calificacion_general")
            logger.info("✅ JSON parseado exitosamente")
        except Exception as exc:
            logger.error("❌ Error parseando JSON: %s", exc)
            logger.error("Raw response (primeros 500 chars): %s", raw[:500])
            raise

        # =====================================================================
        # 8. LOG DEL RESULTADO
        # =====================================================================
        if resultado and "calificacion_general" in resultado:
            calif = resultado["calificacion_general"]
            logger.info("-" * 60)
            logger.info("📊 RESUMEN DEL RESULTADO (framework=%s):", framework)
            logger.info("   ⭐ Puntaje: %s", calif.get("puntaje", "N/A"))
            logger.info("   🏆 Nivel: %s", calif.get("nivel", "N/A"))
            logger.info("   ✅ Apto contratación: %s", calif.get("apto_para_contratacion", "N/A"))
            logger.info("   📝 Nivel candidato: %s", calif.get("nivel_candidato", "N/A"))

            if "pilares_tecnicos" in resultado:
                pilares = resultado["pilares_tecnicos"]
                logger.info("   📊 Pilares técnicos:")
                for key, value in pilares.items():
                    logger.info("      - %s: %s", key, value)

        logger.info("=" * 80)
        logger.info("✅ RAGService.analizar_codigo - COMPLETADO EXITOSAMENTE (framework=%s)", framework)
        logger.info("=" * 80)

        return resultado


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────────────────────

_QUERIES_POR_FRAMEWORK: dict[str, list[str]] = {
    "Vue.js":     [
        "composables reactividad Composition API Vue 3",
        "Pinia store gestión de estado Vue",
        "Vue Router guards navegación",
        "componentes asíncronos Suspense Vue",
        "performance optimización watchers computed Vue",
    ],
    "Next.js":    [
        "Server Components App Router streaming Next.js",
        "ISR revalidación caching estratégico Next.js",
        "middleware autenticación rutas protegidas Next.js",
        "Server Actions formularios mutaciones Next.js",
        "optimización Core Web Vitals performance Next.js",
    ],
    "React":      [
        "hooks personalizados patrones avanzados React",
        "Context API gestión estado global React",
        "React Query server state caching",
        "optimización renders memo useCallback React",
        "Suspense concurrent features React",
    ],
    "TypeScript": [
        "generics utility types avanzados TypeScript",
        "discriminated unions type narrowing TypeScript",
        "mapped types conditional types TypeScript",
        "inferencia tipos hooks React TypeScript",
        "template literal types rutas API TypeScript",
    ],
    "JavaScript": [
        "closures scope cadena de prototipos JavaScript",
        "Promises async await manejo errores JavaScript",
        "event loop microtasks macrotasks JavaScript",
        "Proxy Reflect patrones metaprogramación JavaScript",
        "generators iteradores programación funcional JavaScript",
    ],
    "CSS":        [
        "CSS Grid layout áreas nombradas",
        "custom properties temas dinámicos CSS",
        "animaciones performance transform CSS",
        "container queries responsive design CSS",
        "accesibilidad contraste focus CSS",
    ],
}

_QUERY_GENERICA = [
    "patrones arquitectura frontend buenas prácticas",
    "performance optimización código producción",
    "clean code principios SOLID frontend",
]


def _build_pregunta_query(framework: str) -> str:
    """Selecciona una query aleatoria para diversidad semántica."""
    queries = _QUERIES_POR_FRAMEWORK.get(framework, _QUERY_GENERICA)
    return random.choice(queries)