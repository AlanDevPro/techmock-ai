"""
app/services/llm/prompts/evaluacion_prompts.py

Prompts para análisis y evaluación de código del candidato.

MEJORAS v2:
  - Instrucciones específicas por framework para evitar análisis cruzado
    (ej: evaluar Vue como Next.js)
  - System prompt dinámico que inyecta el contexto exacto del framework
  - Filtrado inteligente de archivos del proyecto
  - Límites de tamaño para evitar prompts excesivos
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Límites para evitar prompts demasiado largos
MAX_CODE_LENGTH    = 10_000   # Máximo de caracteres del código principal
MAX_CONTEXT_LENGTH = 5_000    # Máximo del contexto del proyecto (archivos filtrados)
MAX_RAG_LENGTH     = 3_000    # Máximo del contexto RAG

# Extensiones de archivos relevantes para análisis de código
RELEVANT_EXTENSIONS = {
    ".vue", ".js", ".ts", ".jsx", ".tsx",      # Frontend
    ".html", ".css", ".scss", ".sass",          # Estilos
    ".json",                                    # Configuración importante
    ".py", ".java", ".go", ".rs",              # Backend
}

# Archivos a ignorar (no relevantes para evaluación de código)
IGNORED_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".env", ".env.local", ".env.production",
    "README.md", "CHANGELOG.md", "LICENSE",
    "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
    "vite.config.ts", "webpack.config.js",
    ".gitignore", ".dockerignore",
}

# Patrones de directorios a ignorar (por nombre)
IGNORED_DIRECTORIES = {
    "node_modules", "dist", "build", ".next", ".nuxt",
    ".git", ".vscode", ".idea", "__pycache__", "venv",
    "env", "coverage", ".cache",
}

# ─────────────────────────────────────────────────────────────────────────────
# INSTRUCCIONES ESPECÍFICAS POR FRAMEWORK
# Evita que el LLM evalúe Vue como Next.js (o viceversa) cuando el
# contexto RAG recuperado no fue perfectamente filtrado.
# ─────────────────────────────────────────────────────────────────────────────

_INSTRUCCIONES_ESPECIFICAS: dict[str, str] = {
    "Vue.js": (
        "El código es Vue.js (v3). Evalúa específicamente:\n"
        "- Uso de Composition API: setup(), ref(), reactive(), computed(), watch()\n"
        "- Ciclo de vida: onMounted, onUnmounted, onBeforeMount\n"
        "- Directivas: v-if, v-for, v-model, v-bind, v-on y sus modificadores\n"
        "- Props, emits y defineProps/defineEmits (script setup)\n"
        "- Slots (default, named, scoped)\n"
        "- Pinia o Vuex para gestión de estado\n"
        "- Vue Router: rutas, guards, navegación programática\n"
        "- Componentes asíncronos, defineAsyncComponent\n"
        "NO evalúes como si fuera React, Next.js ni ningún otro framework."
    ),
    "React": (
        "El código es React. Evalúa específicamente:\n"
        "- Hooks: useState, useEffect, useContext, useReducer, useMemo, useCallback, useRef\n"
        "- Hooks personalizados (custom hooks)\n"
        "- Manejo de estado: Context API, Redux Toolkit, Zustand\n"
        "- Optimización: React.memo, useMemo, useCallback, lazy/Suspense\n"
        "- Componentes funcionales y su ciclo de vida con hooks\n"
        "- Patrones: compound components, render props, HOC\n"
        "- React Router v6: routes, loaders, actions\n"
        "NO evalúes como si fuera Vue.js, Next.js ni ningún otro framework."
    ),
    "Next.js": (
        "El código es Next.js (App Router). Evalúa específicamente:\n"
        "- Server Components vs Client Components ('use client')\n"
        "- App Router: layouts, pages, loading, error boundaries\n"
        "- Server Actions y form handling\n"
        "- Estrategias de cache: ISR, SSG, SSR, revalidatePath/Tag\n"
        "- Middleware y rutas protegidas\n"
        "- Optimización: Image, Font, Script (next/)\n"
        "- Core Web Vitals: LCP, CLS, FID\n"
        "NO evalúes como si fuera React puro, Vue.js ni ningún otro framework."
    ),
    "TypeScript": (
        "El código es TypeScript. Evalúa específicamente:\n"
        "- Tipado estricto: interfaces, types, enums\n"
        "- Generics y utility types: Partial, Required, Pick, Omit, Record\n"
        "- Discriminated unions y type narrowing\n"
        "- Mapped types y conditional types\n"
        "- Inferencia de tipos y uso de 'as const'\n"
        "- Decoradores y metadata reflection\n"
        "- Integración con frameworks (React hooks tipados, etc.)\n"
        "NO ignores errores de tipado ni uses 'any' sin justificación."
    ),
    "JavaScript": (
        "El código es JavaScript vanilla. Evalúa específicamente:\n"
        "- Closures, scope y cadena de prototipos\n"
        "- Promises, async/await y manejo de errores asíncronos\n"
        "- Event loop: microtasks vs macrotasks\n"
        "- Destructuring, spread/rest, optional chaining, nullish coalescing\n"
        "- Módulos ES (import/export)\n"
        "- Inmutabilidad y programación funcional\n"
        "- Proxy, Reflect y metaprogramación\n"
        "NO asumas que hay un framework; evalúa JS puro."
    ),
    "CSS": (
        "El código es CSS. Evalúa específicamente:\n"
        "- CSS Grid y Flexbox: uso correcto y layouts responsivos\n"
        "- Custom properties (variables CSS) y theming\n"
        "- Animaciones y transiciones performantes (transform, opacity)\n"
        "- Container queries y responsive design moderno\n"
        "- Accesibilidad: contraste, focus-visible, prefers-reduced-motion\n"
        "- BEM u otra metodología de nomenclatura\n"
        "- Especificidad y cascada\n"
        "NO evalúes JavaScript ni lógica de negocio, solo CSS."
    ),
}

_INSTRUCCION_GENERICA = (
    "Evalúa el código según las buenas prácticas generales de desarrollo frontend: "
    "legibilidad, mantenibilidad, performance, manejo de errores y arquitectura limpia."
)

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT BASE
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_TEMPLATE = """\
Eres un revisor de código senior especializado en {framework}.

⚠️ FRAMEWORK OBJETIVO: {framework}
{instruccion_especifica}

REGLAS GENERALES:
1. Usa slugs de categoría: consumo_apis, manejo_estado, async_await, componentes_props, css_layout, typescript_tipos, inmutabilidad, optimizacion_renders, arquitectura_general
2. Clasifica error por impacto: critico|alto|medio|bajo
3. Clasifica candidato: descartado|revisar|promisorio|recomendado|destacado
4. Responde SOLO con JSON válido, sin markdown, sin backticks, sin texto antes o después.

JSON esperado:
{{
  "calificacion_general": {{
    "nivel": "string",
    "nivel_candidato": "string",
    "puntaje": 0-100,
    "apto_para_contratacion": true/false,
    "resumen": "string",
    "resumen_para_reclutador": "string"
  }},
  "pilares_tecnicos": {{
    "puntaje_javascript": 0-100,
    "puntaje_arquitectura": 0-100,
    "puntaje_buenas_practicas": 0-100,
    "puntaje_comunicacion": 0-100,
    "puntaje_resolucion": 0-100
  }},
  "errores": [
    {{
      "categoria_slug": "string",
      "tipo": "string",
      "descripcion": "string",
      "impacto": "critico|alto|medio|bajo",
      "es_conceptual": false,
      "linea_aproximada": null,
      "fragmento_codigo": null,
      "codigo_corregido": null,
      "explicacion_ia": "string"
    }}
  ],
  "buenas_practicas": ["string"],
  "malas_practicas": ["string"],
  "recomendaciones": [
    {{
      "tipo": "codigo|concepto|recurso|patron",
      "titulo": "string",
      "descripcion": "string",
      "codigo_ejemplo": null,
      "recurso_url": null,
      "recurso_titulo": null,
      "prioridad": "alta|media|baja",
      "orden": 0,
      "categoria_slug": null
    }}
  ],
  "evaluacion_tecnica": {{
    "manejo_estado": "string",
    "legibilidad": "string",
    "arquitectura": "string",
    "performance": "string",
    "comunicacion": "string"
  }}
}}
"""


def _build_system_prompt(framework: str) -> str:
    """
    Construye el system prompt con instrucciones específicas del framework.
    Garantiza que el LLM no confunda Vue con Next.js ni ningún otro par.
    """
    instruccion = _INSTRUCCIONES_ESPECIFICAS.get(framework, _INSTRUCCION_GENERICA)
    return _SYSTEM_TEMPLATE.format(
        framework=framework,
        instruccion_especifica=instruccion,
    )


# ─────────────────────────────────────────────────────────────────────────────
# FILTRADO DE ARCHIVOS
# ─────────────────────────────────────────────────────────────────────────────

def _should_ignore_path(path: str) -> bool:
    """Verifica si un archivo o directorio debe ser ignorado."""
    path_parts = path.replace("\\", "/").split("/")
    for part in path_parts:
        if part in IGNORED_DIRECTORIES:
            return True
    filename = path_parts[-1]
    return filename in IGNORED_FILES


def _filter_relevant_files(files: dict[str, str]) -> dict[str, str]:
    """
    Filtra solo los archivos relevantes para evaluación de código.
    Excluye lock files, configs de build, directorios ignorados, etc.
    """
    if not files:
        return {}

    logger.info("-" * 60)
    logger.info("🔍 FILTRANDO ARCHIVOS DEL PROYECTO")
    logger.info("📂 Total archivos recibidos: %d", len(files))

    filtered: dict[str, str] = {}
    ignored_count      = 0
    large_files_count  = 0

    for path, content in files.items():
        if _should_ignore_path(path):
            logger.debug("   ❌ IGNORADO (directorio/archivo): %s", path)
            ignored_count += 1
            continue

        ext = os.path.splitext(path)[1].lower()
        if ext not in RELEVANT_EXTENSIONS and ext != "":
            logger.debug("   ❌ IGNORADO (extensión %s): %s", ext, path)
            ignored_count += 1
            continue

        content_length = len(content)
        if content_length > 10_000:
            logger.warning("   ⚠️ ARCHIVO GRANDE: %s - %d caracteres", path, content_length)
            large_files_count += 1
            content = content[:5_000] + "\n... [archivo truncado por tamaño]"

        filtered[path] = content
        logger.info("   ✅ INCLUIDO: %s (%d caracteres)", path, len(content))

    logger.info("-" * 60)
    logger.info("📊 RESUMEN FILTRADO:")
    logger.info("   - Archivos incluidos: %d", len(filtered))
    logger.info("   - Archivos ignorados: %d", ignored_count)
    logger.info("   - Archivos grandes (>10KB): %d", large_files_count)
    logger.info("-" * 60)

    return filtered


def _truncate_context(context: str, max_length: int, label: str) -> str:
    """Trunca contexto si es demasiado largo."""
    if len(context) > max_length:
        logger.warning(
            "⚠️ %s truncado de %d a %d caracteres",
            label, len(context), max_length,
        )
        return context[:max_length] + "\n... [contexto truncado]"
    return context


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def build_code_analysis_prompt(
    codigo: str,
    framework: str,
    contexto_proyecto: str = "",
    contexto_rag: str = "",
    files: dict[str, str] | None = None,
) -> list[dict]:
    """
    Construye los mensajes para analizar código de un candidato.

    Garantías:
    - El system prompt incluye instrucciones ESPECÍFICAS del framework.
    - El contexto RAG viene ya filtrado por framework desde el retriever.
    - Los archivos del proyecto se filtran por extensión/directorio relevante.
    - El prompt total se mantiene dentro de los límites del LLM.
    """
    logger.info("=" * 80)
    logger.info("📊 [PROMPT BUILD] INICIANDO CONSTRUCCIÓN")
    logger.info("🔧 Framework: %s", framework)
    logger.info("📝 Código length: %d caracteres", len(codigo))
    logger.info(
        "📚 Contexto RAG length: %d caracteres",
        len(contexto_rag) if contexto_rag else 0,
    )
    logger.info(
        "📁 Contexto proyecto (pre-filtrado): %d caracteres",
        len(contexto_proyecto) if contexto_proyecto else 0,
    )

    if files:
        logger.info("📂 Archivos recibidos: %d", len(files))

        ext_summary: dict[str, int] = {}
        for path in files:
            ext = os.path.splitext(path)[1].lower() or "sin_ext"
            ext_summary[ext] = ext_summary.get(ext, 0) + 1

        logger.info("📊 Resumen por extensión:")
        for ext, count in sorted(ext_summary.items(), key=lambda x: x[1], reverse=True)[:10]:
            logger.info("   - %s: %d archivos", ext, count)

        logger.info("📋 Lista de archivos (primeros 15):")
        for i, path in enumerate(list(files.keys())[:15]):
            logger.info("   %2d. %s (%d chars)", i + 1, path, len(files[path]))
        if len(files) > 15:
            logger.info("   ... y %d archivos más", len(files) - 15)

    logger.info("=" * 80)

    # ── 1. Limitar y limpiar código principal ─────────────────────────────
    codigo_limpio = codigo.strip()
    if len(codigo_limpio) > MAX_CODE_LENGTH:
        codigo_limpio = codigo_limpio[:MAX_CODE_LENGTH] + "\n... [código truncado]"
        logger.warning(
            "⚠️ Código truncado de %d a %d caracteres",
            len(codigo), MAX_CODE_LENGTH,
        )

    # ── 2. Filtrar archivos del proyecto si se pasaron ────────────────────
    contexto_proyecto_filtrado = contexto_proyecto
    if files:
        filtered_files = _filter_relevant_files(files)
        if filtered_files:
            context_parts = []
            for path, content in filtered_files.items():
                if len(content) > 3_000:
                    content = content[:3_000] + "\n... [archivo truncado]"
                context_parts.append(f"### Archivo: {path}\n```\n{content}\n```")
            contexto_proyecto_filtrado = "\n\n".join(context_parts)
            logger.info(
                "📁 Contexto proyecto construido con %d archivos, %d caracteres",
                len(filtered_files), len(contexto_proyecto_filtrado),
            )
        else:
            logger.warning("⚠️ No se encontraron archivos relevantes después del filtrado")
            contexto_proyecto_filtrado = ""

    # ── 3. Limitar contexto RAG ───────────────────────────────────────────
    if contexto_rag and len(contexto_rag) > MAX_RAG_LENGTH:
        contexto_rag = _truncate_context(contexto_rag, MAX_RAG_LENGTH, "Contexto RAG")

    # ── 4. Construir context block ────────────────────────────────────────
    context_parts = []
    if contexto_rag:
        context_parts.append(f"BUENAS PRÁCTICAS DE {framework.upper()}:\n---\n{contexto_rag}\n---")
        logger.info("📚 Contexto RAG incluido: %d caracteres", len(contexto_rag))

    if contexto_proyecto_filtrado:
        context_parts.append(f"ARCHIVOS DEL PROYECTO:\n---\n{contexto_proyecto_filtrado}\n---")
        logger.info("📁 Contexto proyecto incluido: %d caracteres", len(contexto_proyecto_filtrado))

    context_block = "\n\n".join(context_parts)

    # ── 5. Limitar contexto total ─────────────────────────────────────────
    if len(context_block) > MAX_CONTEXT_LENGTH:
        context_block = _truncate_context(context_block, MAX_CONTEXT_LENGTH, "Contexto total")

    # ── 6. Construir mensajes ─────────────────────────────────────────────
    # System prompt con instrucciones ESPECÍFICAS del framework
    system = _build_system_prompt(framework)

    lang_tag = framework.lower().replace(".", "").replace(" ", "")

    user_content = f"""\
{context_block}

CÓDIGO DEL CANDIDATO A EVALUAR ({framework}):
```{lang_tag}
{codigo_limpio}
```

Analiza este código de {framework} y responde SOLO con el JSON solicitado.
Recuerda: evalúa ÚNICAMENTE bajo la óptica de {framework}, no de otros frameworks.
"""

    logger.info("✅ [PROMPT BUILD] Prompt construido exitosamente")
    logger.info("   - System prompt: %d caracteres", len(system))
    logger.info("   - User content: %d caracteres", len(user_content))
    logger.info("   - Framework en system prompt: %s", framework)
    logger.info("=" * 80)

    return [
        {"role": "system", "content": system},
        {"role": "user",   "content": user_content.strip()},
    ]