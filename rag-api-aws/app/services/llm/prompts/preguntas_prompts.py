"""
app/services/llm/prompts/preguntas_prompts.py

Prompts para generación de preguntas de entrevista.
Incluye sistema de escenarios rotativos para forzar diversidad.
"""

import random
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT BASE
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM = """\
Eres un entrevistador técnico senior especializado en desarrollo frontend \
con más de 10 años de experiencia evaluando candidatos en empresas como \
Mercado Libre, Nubank, Rappi y startups de Series B/C.

Tu tarea es generar UNA sola pregunta técnica práctica de nivel junior-intermedio \
para evaluar conocimientos de {framework}.

REGLAS ESTRICTAS DE DIVERSIDAD:
1. NUNCA generes preguntas sobre: Todo List, CRUD básico, contador de clicks, \
   lista de compras, formulario de registro simple.
2. El escenario elegido para esta sesión es: {escenario}
3. Prioriza escenarios reales: dashboards, sistemas de pagos, autenticación, \
   performance, optimización, arquitectura de componentes.
4. La pregunta debe evaluar comprensión profunda, no memorización.
5. Incluye código base o contexto de negocio real.
6. Responder ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown.

{bloque_adaptativo}

FORMATO DE RESPUESTA (JSON estricto):
{{
  "pregunta_practica": "Descripción completa del problema. Mínimo 3 oraciones. \
Incluye contexto de negocio real.",
  "contexto_adicional": "Código base, estructura inicial o restricciones técnicas.",
  "criterios_evaluacion": [
    "Criterio específico 1",
    "Criterio específico 2",
    "Criterio específico 3"
  ],
  "tipo": "live_coding",
  "nivel_dificultad": "Junior | Intermedio | Senior",
  "tiempo_estimado": "20-30 minutos",
  "conceptos_clave": ["concepto1", "concepto2"],
  "categorias_error_objetivo": ["slug_categoria1", "slug_categoria2"]
}}
"""

# ─────────────────────────────────────────────────────────────────────────────
# ESCENARIOS POR FRAMEWORK
# ─────────────────────────────────────────────────────────────────────────────

_ESCENARIOS: dict[str, list[str]] = {
    "Vue.js": [
        "sistema de notificaciones en tiempo real con composables",
        "componente de búsqueda con debounce y cancelación de requests",
        "gestión de permisos de usuario con Pinia y guards de ruta",
        "formulario multi-paso con validación por etapas",
        "tabla de datos con filtros, paginación y ordenamiento reactivo",
        "sistema de caché local con watchEffect",
        "componente de upload de archivos con progreso y preview",
        "carrito de compras con estado persistente entre sesiones",
        "dashboard de métricas con actualizaciones periódicas",
    ],
    "Next.js": [
        "página de producto con ISR y revalidación bajo demanda",
        "sistema de autenticación con middleware y cookies HttpOnly",
        "dashboard con Server Components y streaming parcial",
        "API Route con rate limiting y validación de esquema",
        "optimización de Core Web Vitals en página de listado",
        "carrito persistente con Server Actions y optimistic updates",
        "panel de administración con rutas protegidas por roles",
        "integración de pagos con webhook y manejo de estados",
    ],
    "React": [
        "hook personalizado para manejo de formularios complejos",
        "sistema de notificaciones con Context y portal",
        "componente de infinite scroll con Intersection Observer",
        "optimización de re-renders con memo, useMemo y useCallback",
        "gestión de estado del servidor con React Query",
        "drag and drop de elementos con estado compartido",
        "sistema de permisos basado en roles con Context",
        "dashboard de tiempo real con WebSockets",
    ],
    "TypeScript": [
        "sistema de tipos para respuestas de API con generics",
        "utility types para transformación de objetos de dominio",
        "discriminated unions para manejo de estados de UI",
        "tipos condicionales para biblioteca de componentes",
        "inferencia de tipos en hooks genéricos de React",
        "mapped types para formularios dinámicos",
        "template literal types para rutas de API tipadas",
    ],
    "JavaScript": [
        "implementación de Promise.all con control de concurrencia",
        "sistema de eventos (EventEmitter) desde cero",
        "debounce y throttle para optimización de UI",
        "generators e iteradores para paginación lazy",
        "Proxy para validación y observación de objetos",
        "Web Workers para cálculos pesados sin bloquear UI",
        "implementación de pipe/compose funcional",
    ],
    "CSS": [
        "sistema de diseño con custom properties y temas dinámicos",
        "layout complejo con CSS Grid y áreas nombradas",
        "animaciones de rendimiento con transform y will-change",
        "componentes responsive sin media queries (container queries)",
        "accesibilidad visual: contraste, focus, reducción de movimiento",
        "clamp() y funciones matemáticas para tipografía fluida",
    ],
}

_ESCENARIOS_GENERICOS = [
    "optimización de performance en un módulo existente",
    "refactorización de código legacy a patrones modernos",
    "arquitectura de componentes para un sistema empresarial",
]

_CONCEPTOS_BASE: dict[str, list[str]] = {
    "Vue.js":     ["reactividad", "composables", "Pinia", "Vue Router", "lifecycle hooks",
                   "provide/inject", "computed", "watchers", "Composition API"],
    "Next.js":    ["Server Components", "App Router", "ISR", "middleware", "Server Actions",
                   "Route Handlers", "streaming", "Image optimization", "caching"],
    "React":      ["hooks", "Context API", "React Query", "portals", "Suspense",
                   "memo/useMemo/useCallback", "refs", "reducers", "custom hooks"],
    "TypeScript": ["generics", "utility types", "discriminated unions", "decoradores",
                   "mapped types", "conditional types", "infer"],
    "JavaScript": ["closures", "Promises", "async/await", "generators", "Proxy",
                   "WeakMap", "event loop", "módulos ES"],
    "CSS":        ["custom properties", "Grid", "Flexbox", "animaciones",
                   "container queries", "layers", "clamp()", "accesibilidad"],
}


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PÚBLICA
# ─────────────────────────────────────────────────────────────────────────────

def build_question_prompt(
    contexto_rag: str,
    framework: str,
    contexto_adaptativo: Optional[str] = None,
) -> list[dict]:
    """
    Construye los mensajes para generar una pregunta de entrevista.

    Args:
        contexto_rag:        Fragmentos de documentación del retriever.
        framework:           Tecnología objetivo ("Vue.js", "React", etc.)
        contexto_adaptativo: Texto con debilidades del usuario (sistema adaptativo).

    Returns:
        Lista de mensajes [system, user] para el LLM.
    """
    escenarios = _ESCENARIOS.get(framework, _ESCENARIOS_GENERICOS)
    escenario  = random.choice(escenarios)

    conceptos  = _extraer_conceptos(contexto_rag, framework)
    concepto   = random.choice(conceptos)

    # Bloque adaptativo opcional
    bloque_adaptativo = ""
    if contexto_adaptativo:
        bloque_adaptativo = (
            "CONTEXTO ADAPTATIVO — Este usuario ha fallado en estas áreas previas:\n"
            f"{contexto_adaptativo}\n"
            "Genera una pregunta que refuerce específicamente estas debilidades."
        )

    system = _SYSTEM.format(
        framework=framework,
        escenario=escenario,
        bloque_adaptativo=bloque_adaptativo,
    )

    user_content = f"""
DOCUMENTACIÓN DE REFERENCIA ({framework}):
---
{contexto_rag or "Sin contexto RAG. Usa tu conocimiento del framework."}
---

INSTRUCCIONES:
- Escenario seleccionado: {escenario}
- Concepto a evaluar: {concepto}
- El candidato busca trabajo como desarrollador frontend junior-intermedio.

Genera UNA sola pregunta técnica práctica sobre {framework}.
Responde SOLO con el JSON. Sin texto adicional, sin markdown.
"""

    return [
        {"role": "system", "content": system},
        {"role": "user",   "content": user_content.strip()},
    ]


def _extraer_conceptos(contexto_rag: str, framework: str) -> list[str]:
    """Extrae conceptos del contexto RAG o usa la lista base."""
    import re
    if contexto_rag and len(contexto_rag) > 100:
        headers = re.findall(r"##+ (.+)", contexto_rag)
        if headers:
            return headers[:8]
    return _CONCEPTOS_BASE.get(framework, ["patrones avanzados", "performance"])