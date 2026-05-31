"""
app/services/rag/rag_service.py

Orquestador RAG puro: retriever + prompt + LLM.
Sin lógica de negocio ni persistencia — eso va en generacion/ y evaluacion/.
"""

import random
import logging
from typing import Optional

from fastapi import Request

from app.services.llm.client import llm_client
from app.services.llm.prompts.preguntas_prompts import build_question_prompt
from app.services.llm.prompts.evaluacion_prompts import build_code_analysis_prompt
from app.services.llm.parser import parse_llm_json

logger = logging.getLogger(__name__)


class RAGService:
    """
    Orquesta el pipeline RAG:
      1. Obtiene el retriever de app.state (ya conectado al arranque)
      2. Busca fragmentos relevantes en OpenSearch
      3. Construye el prompt con el contexto
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
        Busca fragmentos relevantes en OpenSearch para la query dada.
        Retorna string vacío si el retriever no está disponible.
        """
        retriever = self._get_retriever()
        if not retriever:
            return ""

        try:
            contexto = await retriever.buscar(
                query=query,
                framework=framework,
                top_k=top_k,
            )
            logger.debug("RAG: %d chars de contexto recuperados", len(contexto))
            return contexto
        except Exception as exc:
            logger.error("Error en búsqueda RAG: %s", exc)
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
        """
        # Query aleatoria para diversidad semántica en OpenSearch
        query = _build_pregunta_query(framework)
        contexto_rag = await self.recuperar_contexto(query=query, framework=framework)

        messages = build_question_prompt(
            contexto_rag=contexto_rag,
            framework=framework,
            contexto_adaptativo=contexto_adaptativo,
        )

        raw = await llm_client.chat(messages=messages)
        resultado = parse_llm_json(raw, fallback_key="pregunta_practica")
        logger.info("✅ Pregunta generada para %s", framework)
        return resultado

    async def analizar_codigo(
        self,
        codigo: str,
        framework: str,
        contexto_proyecto: str = "",
    ) -> dict:
        """
        Pipeline completo para analizar código de un candidato.

        Args:
            codigo:            Código enviado por el usuario.
            framework:         Tecnología objetivo.
            contexto_proyecto: Archivos adicionales del IDE.

        Returns:
            Dict con la estructura RespuestaAnalisisCodigo del LLM.
        """
        query = f"buenas prácticas {framework} code review patrones arquitectura"
        contexto_rag = await self.recuperar_contexto(query=query, framework=framework)

        messages = build_code_analysis_prompt(
            codigo=codigo,
            framework=framework,
            contexto_proyecto=contexto_proyecto,
            contexto_rag=contexto_rag,
        )

        raw = await llm_client.chat(
            messages=messages,
            temperature=0.3,   # Más determinista para análisis
        )
        resultado = parse_llm_json(raw, fallback_key="calificacion_general")
        logger.info("✅ Código analizado para framework=%s", framework)
        return resultado


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────────────────────

_QUERIES_POR_FRAMEWORK: dict[str, list[str]] = {
    "Vue.js":     [
        "composables reactividad Composition API",
        "Pinia store gestión de estado",
        "Vue Router guards navegación",
        "componentes asíncronos Suspense",
        "performance optimización watchers computed",
    ],
    "Next.js":    [
        "Server Components App Router streaming",
        "ISR revalidación caching estratégico",
        "middleware autenticación rutas protegidas",
        "Server Actions formularios mutaciones",
        "optimización Core Web Vitals performance",
    ],
    "React":      [
        "hooks personalizados patrones avanzados",
        "Context API gestión estado global",
        "React Query server state caching",
        "optimización renders memo useCallback",
        "Suspense concurrent features",
    ],
    "TypeScript": [
        "generics utility types avanzados",
        "discriminated unions type narrowing",
        "mapped types conditional types",
        "inferencia tipos hooks React",
        "template literal types rutas API",
    ],
    "JavaScript": [
        "closures scope cadena de prototipos",
        "Promises async await manejo errores",
        "event loop microtasks macrotasks",
        "Proxy Reflect patrones metaprogramación",
        "generators iteradores programación funcional",
    ],
    "CSS":        [
        "CSS Grid layout áreas nombradas",
        "custom properties temas dinámicos",
        "animaciones performance transform",
        "container queries responsive design",
        "accesibilidad contraste focus",
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