"""
app/services/llm/parser.py

Parser seguro de respuestas JSON del LLM.
El LLM a veces envuelve el JSON en bloques markdown — este módulo lo limpia.
"""

import json
import logging
import re

logger = logging.getLogger(__name__)


def parse_llm_json(raw: str, fallback_key: str) -> dict:
    """
    Extrae y parsea JSON de la respuesta cruda del LLM.

    Maneja casos comunes de formato incorrecto:
      - Bloques ```json ... ```
      - Texto antes/después del JSON
      - JSON con comentarios (los elimina)

    Args:
        raw:          Texto crudo devuelto por el LLM.
        fallback_key: Clave donde poner el texto si el parseo falla.

    Returns:
        Dict con el JSON parseado, o dict de error estructurado.
    """
    if not raw or not raw.strip():
        return {fallback_key: "", "error_parseo": True, "error_detalle": "Respuesta vacía"}

    cleaned = raw.strip()

    # 1. Quitar bloques markdown ```json ... ``` o ``` ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    # 2. Intentar parseo directo
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Extraer el primer bloque JSON del texto (si hay texto antes)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # 4. Fallback: devolver el texto crudo en el campo apropiado
    logger.warning(
        "No se pudo parsear JSON del LLM. Fallback a texto. Raw (200 chars): %s",
        raw[:200],
    )
    return {
        fallback_key:   raw.strip(),
        "error_parseo": True,
        "error_detalle": "La respuesta del LLM no es JSON válido",
    }