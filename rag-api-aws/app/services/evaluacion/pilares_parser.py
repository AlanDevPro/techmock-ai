"""
app/services/evaluacion/pilares_parser.py

Parsea la respuesta del LLM y extrae los 5 pilares técnicos
que se guardan como columnas separadas en la tabla `evaluaciones`.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_PILARES = [
    "puntaje_javascript",
    "puntaje_arquitectura",
    "puntaje_buenas_practicas",
    "puntaje_comunicacion",
    "puntaje_resolucion",
]


def _normalize_score(value: float) -> float:
    """
    Normaliza el puntaje a escala 0-100.
    
    Si el valor viene en escala 0-10, lo convierte a 0-100.
    Si ya está en escala 0-100, lo mantiene.
    """
    # Si viene en escala 0-10, lo convertimos a 0-100
    if value <= 10:
        return value * 10
    return value


def _clamp(value: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Limita el valor dentro del rango [min_val, max_val]"""
    return max(min_val, min(max_val, value))


class PilaresParser:
    """
    Extrae y valida los puntajes por pilar de la respuesta LLM.

    Fuente primaria:  resultado["pilares_tecnicos"]
    Fuente secundaria: resultado["calificacion_general"]["puntaje"] (fallback proporcional)
    """

    @staticmethod
    def parsear(resultado_llm: dict) -> dict:
        """
        Extrae los 5 pilares del resultado del LLM.

        Returns:
            Dict con keys: puntaje_javascript, puntaje_arquitectura,
            puntaje_buenas_practicas, puntaje_comunicacion, puntaje_resolucion.
            Todos los valores son float entre 0 y 100, o None si no disponibles.
        """
        pilares_raw = resultado_llm.get("pilares_tecnicos", {})
        puntaje_total = float(
            resultado_llm.get("calificacion_general", {}).get("puntaje", 0) or 0
        )

        pilares: dict[str, Optional[float]] = {}

        for pilar in _PILARES:
            valor = pilares_raw.get(pilar)
            if valor is not None:
                try:
                    # Normalizar y luego limitar al rango
                    normalized = _normalize_score(float(valor))
                    pilares[pilar] = _clamp(normalized)
                except (ValueError, TypeError):
                    pilares[pilar] = None
            else:
                # NO inventar valores si el LLM no los envía
                pilares[pilar] = None

        missing = [k for k, v in pilares.items() if v is None]
        if missing:
            logger.debug("Pilares sin valor del LLM: %s", missing)

        return pilares