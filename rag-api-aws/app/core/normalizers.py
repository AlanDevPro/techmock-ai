"""
app/core/normalizers.py

Funciones de normalización y construcción de contexto reutilizables.
Sin dependencias de FastAPI ni de la BD — lógica pura de transformación.

Incluye:
  - construir_contexto_proyecto   → formatea archivos del IDE para el prompt LLM
  - normalizar_framework          → slug URL → nombre canónico
  - puntaje_a_nivel_candidato     → float → nivel BD ('recomendado', etc.)
  - puntaje_a_nivel_texto         → float → label UI ('Bueno', etc.)
  - normalizar_severidad          → string crudo → severidad validada
  - limpiar_codigo                → elimina ruido del código antes de mandarlo al LLM
"""

from __future__ import annotations

from typing import Any


# ──────────────────────────────────────────────────────────────
# FRAMEWORK
# ──────────────────────────────────────────────────────────────

# Mapa canónico. Sincronizado con settings.TECH_SLUGS.
_FRAMEWORK_MAP: dict[str, str] = {
    "vue":        "Vue.js",
    "vuejs":      "Vue.js",
    "next":       "Next.js",
    "nextjs":     "Next.js",
    "react":      "React",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "css":        "CSS",
    "nodejs":     "Node.js",
    "node":       "Node.js",
}


def normalizar_framework(slug: str) -> str | None:
    """
    Convierte un slug de URL al nombre canónico del framework.
    Retorna None si el slug no está registrado.

    >>> normalizar_framework("vuejs")   # → "Vue.js"
    >>> normalizar_framework("unknown") # → None
    """
    return _FRAMEWORK_MAP.get(slug.strip().lower())


def normalizar_framework_o_default(slug: str, default: str = "general") -> str:
    """
    Igual que normalizar_framework, pero retorna `default` en vez de None.
    Útil en servicios donde el framework es opcional.
    """
    return _FRAMEWORK_MAP.get(slug.strip().lower(), default)


# ──────────────────────────────────────────────────────────────
# PUNTAJES → NIVELES
# ──────────────────────────────────────────────────────────────

def puntaje_a_nivel_candidato(puntaje: float) -> str:
    """
    Convierte un puntaje numérico (0-100) al nivel de candidato
    almacenado en la tabla `evaluaciones.nivel_candidato`.

    Escala:
      ≥ 90 → destacado
      ≥ 75 → recomendado
      ≥ 60 → promisorio
      ≥ 40 → revisar
       < 40 → descartado

    >>> puntaje_a_nivel_candidato(82)  # → "recomendado"
    """
    if puntaje >= 90:
        return "destacado"
    if puntaje >= 75:
        return "recomendado"
    if puntaje >= 60:
        return "promisorio"
    if puntaje >= 40:
        return "revisar"
    return "descartado"


def puntaje_a_nivel_texto(puntaje: float) -> str:
    """
    Convierte un puntaje numérico (0-100) a la etiqueta legible
    mostrada en el frontend del candidato.

    Escala:
      ≥ 90 → Excelente
      ≥ 75 → Bueno
      ≥ 60 → Regular
      ≥ 40 → Deficiente
       < 40 → Crítico

    >>> puntaje_a_nivel_texto(78)  # → "Bueno"
    """
    if puntaje >= 90:
        return "Excelente"
    if puntaje >= 75:
        return "Bueno"
    if puntaje >= 60:
        return "Regular"
    if puntaje >= 40:
        return "Deficiente"
    return "Crítico"


def puntaje_a_apto(puntaje: float, umbral: float = 60.0) -> bool:
    """
    Determina si un candidato es apto para contratación basado en el puntaje.
    Umbral configurable (default 60).
    """
    return puntaje >= umbral


# ──────────────────────────────────────────────────────────────
# SEVERIDAD
# ──────────────────────────────────────────────────────────────

_SEVERIDAD_VALIDA = {"bajo", "medio", "alto", "critico"}
_SEVERIDAD_ALIAS: dict[str, str] = {
    # Inglés → español (por si el LLM responde en inglés)
    "low":      "bajo",
    "medium":   "medio",
    "high":     "alto",
    "critical": "critico",
    # Variantes ortográficas
    "crítico":  "critico",
}


def normalizar_severidad(valor: str, default: str = "medio") -> str:
    """
    Normaliza un string de severidad al conjunto válido de la BD.
    Acepta español e inglés; retorna `default` si no reconoce el valor.

    Conjunto válido: bajo | medio | alto | critico

    >>> normalizar_severidad("high")     # → "alto"
    >>> normalizar_severidad("CRITICAL") # → "critico"
    >>> normalizar_severidad("unknown")  # → "medio"
    """
    normalizado = valor.strip().lower()
    normalizado = _SEVERIDAD_ALIAS.get(normalizado, normalizado)
    return normalizado if normalizado in _SEVERIDAD_VALIDA else default


# ──────────────────────────────────────────────────────────────
# CONTEXTO DE PROYECTO (IDE multi-archivo)
# ──────────────────────────────────────────────────────────────

# Extensiones de archivo a incluir en el contexto del prompt
_EXTENSIONES_RELEVANTES = {
    ".vue", ".jsx", ".tsx", ".ts", ".js", ".css", ".scss",
    ".json", ".md", ".html", ".py",
}

# Archivos que nunca deben incluirse (configuración, lockfiles, etc.)
_ARCHIVOS_EXCLUIDOS = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".gitignore", ".eslintignore", ".prettierignore",
}

# Límite de caracteres por archivo para no inflar el prompt
_MAX_CHARS_POR_ARCHIVO = 3_000

# Máximo de archivos adicionales a incluir (aparte del archivo activo)
_MAX_ARCHIVOS_CONTEXTO = 5


def construir_contexto_proyecto(
    active_file: str,
    files: dict[str, str],
    framework: str = "",
    max_chars_por_archivo: int = _MAX_CHARS_POR_ARCHIVO,
    max_archivos: int = _MAX_ARCHIVOS_CONTEXTO,
) -> str:
    """
    Formatea los archivos del IDE en un bloque de texto para el prompt del LLM.

    Estrategia:
      1. El archivo activo SIEMPRE se incluye primero (es el código que se evalúa)
      2. Archivos adicionales se incluyen hasta el límite `max_archivos`
      3. Cada archivo se trunca a `max_chars_por_archivo` si es muy largo
      4. Se omiten lockfiles, archivos ignorados y extensiones irrelevantes

    Args:
        active_file: Nombre del archivo abierto en el IDE.
        files:       Mapa {nombre_archivo: contenido} de todo el proyecto.
        framework:   Nombre del framework (para el encabezado del contexto).
        max_chars_por_archivo: Límite de caracteres por archivo.
        max_archivos: Máximo de archivos adicionales.

    Returns:
        String multilínea con el contexto, o "" si no hay archivos adicionales.
    """
    if not files:
        return ""

    secciones: list[str] = []
    archivos_procesados = 0

    # ── 1. Archivo activo primero ───────────────────────────────────────
    if active_file and active_file in files:
        contenido = files[active_file]
        if contenido and contenido.strip():
            truncado = _truncar_contenido(contenido, max_chars_por_archivo)
            secciones.append(f"### Archivo activo: {active_file}\n```\n{truncado}\n```")
            archivos_procesados += 1

    # ── 2. Archivos adicionales ─────────────────────────────────────────
    for nombre, contenido in files.items():
        if archivos_procesados > max_archivos:
            break
        if nombre == active_file:
            continue
        if not _es_archivo_relevante(nombre):
            continue
        if not contenido or not contenido.strip():
            continue

        truncado = _truncar_contenido(contenido, max_chars_por_archivo)
        secciones.append(f"### {nombre}\n```\n{truncado}\n```")
        archivos_procesados += 1

    if not secciones:
        return ""

    encabezado = f"## Contexto del proyecto{f' ({framework})' if framework else ''}"
    return encabezado + "\n\n" + "\n\n".join(secciones)


def _es_archivo_relevante(nombre: str) -> bool:
    """Retorna True si el archivo debe incluirse en el contexto del prompt."""
    if nombre in _ARCHIVOS_EXCLUIDOS:
        return False
    extension = "." + nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""
    return extension in _EXTENSIONES_RELEVANTES


def _truncar_contenido(contenido: str, max_chars: int) -> str:
    """Trunca el contenido al límite indicado, agregando indicador si fue cortado."""
    if len(contenido) <= max_chars:
        return contenido
    return contenido[:max_chars] + f"\n... [truncado a {max_chars} caracteres]"


# ──────────────────────────────────────────────────────────────
# LIMPIEZA DE CÓDIGO
# ──────────────────────────────────────────────────────────────

def limpiar_codigo(codigo: str, max_lineas: int = 500) -> str:
    """
    Limpia el código antes de enviarlo al LLM.

    Operaciones:
      - Elimina líneas en blanco excesivas (más de 2 consecutivas)
      - Trunca al número máximo de líneas para evitar prompts gigantes
      - Elimina caracteres de control excepto newlines y tabs

    Args:
        codigo:    Código a limpiar.
        max_lineas: Límite de líneas (las líneas adicionales se descartan).

    Returns:
        Código limpio.
    """
    if not codigo:
        return ""

    # Eliminar caracteres de control excepto \n y \t
    limpio = "".join(
        c for c in codigo if c >= " " or c in ("\n", "\t")
    )

    # Colapsar más de 2 líneas en blanco consecutivas
    lineas = limpio.split("\n")
    resultado: list[str] = []
    blancos_consecutivos = 0

    for linea in lineas:
        if linea.strip() == "":
            blancos_consecutivos += 1
            if blancos_consecutivos <= 2:
                resultado.append(linea)
        else:
            blancos_consecutivos = 0
            resultado.append(linea)

    # Truncar al límite de líneas
    if len(resultado) > max_lineas:
        resultado = resultado[:max_lineas]
        resultado.append(f"... [código truncado a {max_lineas} líneas]")

    return "\n".join(resultado)


# ──────────────────────────────────────────────────────────────
# UTILS GENERALES
# ──────────────────────────────────────────────────────────────

def safe_float(valor: Any, default: float = 0.0) -> float:
    """
    Convierte un valor a float de forma segura.
    Retorna `default` si la conversión falla (None, "", valores inválidos).

    Uso:
        score = safe_float(orm_row.score_global)
    """
    if valor is None:
        return default
    try:
        return float(valor)
    except (TypeError, ValueError):
        return default


def safe_int(valor: Any, default: int = 0) -> int:
    """
    Convierte un valor a int de forma segura.
    Útil para convertir valores de ORM que pueden ser None.
    """
    if valor is None:
        return default
    try:
        return int(valor)
    except (TypeError, ValueError):
        return default


def truncar_texto(texto: str | None, max_chars: int = 500) -> str:
    """
    Trunca un texto largo para vistas de resumen.
    Retorna "" si el texto es None o vacío.
    """
    if not texto:
        return ""
    if len(texto) <= max_chars:
        return texto
    return texto[:max_chars].rstrip() + "…"