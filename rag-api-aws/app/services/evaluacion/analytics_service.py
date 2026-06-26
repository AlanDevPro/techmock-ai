"""
app/services/evaluacion/analytics_service.py

Persiste métricas de evaluación técnica en la tabla detalle_evaluacion
y genera estadísticas agregadas.

Convierte automáticamente evaluaciones textuales del LLM a puntajes
numéricos 0-100 para almacenamiento en BD.
"""

import logging
import re
from typing import Any, Dict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models.evaluaciones import DetalleEvaluacion, Evaluacion
from app.db.models.sesiones import SesionEntrevista
from app.db.models.tecnologias import Rubrica

logger = logging.getLogger(__name__)

# Mapeo: clave del dict evaluacion_tecnica → nombre de rúbrica en BD
_RUBRICA_MAP: dict[str, str] = {
    "manejo_estado": "manejo_estado",
    "legibilidad":   "legibilidad",
    "arquitectura":  "arquitectura",
    "performance":   "performance",
    "comunicacion":  "comunicacion",
}

# Mapeo cualitativo → puntaje numérico (escala 0-100)
_CUALITATIVO_TO_SCORE: dict[str, int] = {
    # Sobresaliente
    "excelente":       100,
    "sobresaliente":    95,
    "muy bueno":        90,
    "bueno":            85,
    # Aceptable
    "aceptable":        75,
    "satisfactorio":    70,
    "suficiente":       65,
    "regular":          60,
    # Mejorable
    "mejorable":        50,
    "insuficiente":     45,
    # Deficiente
    "deficiente":       40,
    "malo":             30,
    "pésimo":           20,
    "critico":          10,
    "nulo":              0,
    # Frases negativas comunes del LLM
    "no se observa":    30,
    "falta":            25,
    "ausencia":         20,
    "incorrecto":       15,
    "erróneo":          10,
}


def _cualitativo_a_score(texto: str) -> float:
    """
    Convierte evaluación textual a puntaje numérico 0-100.

    Estrategias (en orden de precedencia):
      1. Búsqueda de palabras clave cualitativas definidas en _CUALITATIVO_TO_SCORE
      2. Extracción del primer número del texto (con conversión de escala 0-10 → 0-100)
      3. Valor neutro por defecto: 50

    Args:
        texto: Evaluación textual generada por el LLM.

    Returns:
        Puntaje numérico en rango [0.0, 100.0].
    """
    if not texto:
        return 50.0

    texto_lower = texto.lower()
    logger.debug("Procesando texto para puntaje: '%s'", texto[:120])

    # ── Estrategia 1: palabras clave ──────────────────────────────────────────
    for patron, score in _CUALITATIVO_TO_SCORE.items():
        if patron in texto_lower:
            logger.debug("Match cualitativo: '%s' → %d", patron, score)
            return float(score)

    # ── Estrategia 2: extraer número ──────────────────────────────────────────
    numeros = re.findall(r"\d+(?:\.\d+)?", texto_lower)
    if numeros:
        score = float(numeros[0])
        if score <= 10:
            # Probablemente escala 0-10; convertir a 0-100
            score *= 10
            logger.debug("Conversión 0-10 → 0-100: resultado %.1f", score)
        score = max(0.0, min(100.0, score))
        logger.debug("Número extraído: %.1f", score)
        return score

    # ── Estrategia 3: fallback ────────────────────────────────────────────────
    logger.debug("Sin match en '%s...' — usando 50 por defecto", texto[:60])
    return 50.0


class AnalyticsService:
    """
    Persiste rúbricas técnicas y genera estadísticas históricas de usuarios.
    """

    async def guardar_evaluacion_tecnica(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        evaluacion_tecnica: Dict[str, Any],
    ) -> None:
        """
        Persiste cada dimensión técnica como DetalleEvaluacion.

        Convierte automáticamente evaluaciones textuales del LLM a puntaje
        numérico antes de guardar.

        Args:
            db:                  Sesión de base de datos.
            evaluacion_id:       ID de la evaluación principal.
            evaluacion_tecnica:  Diccionario con evaluaciones por dimensión.
                                 Ejemplo:
                                 {
                                   "manejo_estado": "No se observa un manejo adecuado",
                                   "legibilidad":   "Bueno, código claro",
                                   "arquitectura":  "Regular",
                                   "performance":   "Aceptable"
                                 }
        """
        if not evaluacion_tecnica:
            logger.info("📋 Sin evaluación técnica para evaluacion_id=%s", evaluacion_id)
            return

        logger.info("=" * 60)
        logger.info("📊 GUARDANDO RÚBRICAS — evaluacion_id=%s | dimensiones=%d",
                    evaluacion_id, len(evaluacion_tecnica))
        logger.info("=" * 60)

        guardados = 0
        errores   = 0

        for campo, valor in evaluacion_tecnica.items():
            rubrica_nombre = _RUBRICA_MAP.get(campo)
            if not rubrica_nombre:
                logger.warning("⚠️ Campo '%s' sin mapeo a rúbrica — ignorado", campo)
                continue

            logger.debug("Procesando campo: %s → rúbrica: %s", campo, rubrica_nombre)

            try:
                rubrica = await self._get_or_create_rubrica(db, rubrica_nombre)

                puntaje = _cualitativo_a_score(str(valor)) if valor else 50.0
                logger.info("📊 %s → %.1f/100  (%s...)", rubrica_nombre, puntaje, str(valor)[:60])

                detalle = DetalleEvaluacion(
                    evaluacion_id=evaluacion_id,
                    rubrica_id=rubrica.id,
                    puntaje=puntaje,
                    comentario=str(valor) if valor else None,
                )
                db.add(detalle)
                guardados += 1

            except Exception as exc:
                errores += 1
                logger.error(
                    "❌ Error guardando rúbrica '%s' (evaluacion_id=%s): %s",
                    campo, evaluacion_id, exc, exc_info=True,
                )
                # No re-lanzar; continuar con las demás dimensiones

        logger.info("=" * 60)
        logger.info("📊 RÚBRICAS — Guardadas: %d | Errores: %d | Total: %d",
                    guardados, errores, len(evaluacion_tecnica))
        logger.info("=" * 60)

        if guardados > 0:
            try:
                await db.flush()
                logger.info("✅ Flush de rúbricas OK para evaluacion_id=%s", evaluacion_id)
            except Exception as exc:
                logger.error("❌ Error en flush de rúbricas: %s", exc)
                raise  # Re-lanzar para que el caller maneje el rollback
        else:
            logger.warning("⚠️ Sin rúbricas guardadas para evaluacion_id=%s", evaluacion_id)

    async def get_resumen_usuario(
        self,
        db: AsyncSession,
        usuario_id: UUID,
    ) -> Dict[str, Any]:
        """
        Resumen de rendimiento histórico del usuario.

        Returns:
            Dict con: total_sesiones, puntaje_promedio, puntaje_maximo, puntaje_minimo
        """
        logger.info("📊 Obteniendo resumen histórico para usuario: %s", usuario_id)

        result = await db.execute(
            select(
                func.count(SesionEntrevista.id).label("total"),
                func.avg(Evaluacion.puntaje_total).label("promedio"),
                func.max(Evaluacion.puntaje_total).label("maximo"),
                func.min(Evaluacion.puntaje_total).label("minimo"),
            )
            .join(Evaluacion, Evaluacion.sesion_id == SesionEntrevista.id)
            .where(SesionEntrevista.usuario_id == usuario_id)
        )
        row = result.one_or_none()

        if not row or not row.total:
            logger.info("Usuario %s sin sesiones completadas", usuario_id)
            return {"total_sesiones": 0, "puntaje_promedio": 0}

        resumen = {
            "total_sesiones":   row.total,
            "puntaje_promedio": round(float(row.promedio or 0), 1),
            "puntaje_maximo":   round(float(row.maximo or 0), 1),
            "puntaje_minimo":   round(float(row.minimo or 0), 1),
        }
        logger.info("📊 Resumen usuario %s: %s", usuario_id, resumen)
        return resumen

    async def _get_or_create_rubrica(self, db: AsyncSession, nombre: str) -> Rubrica:
        """
        Obtiene una rúbrica por nombre o la crea si no existe.

        Args:
            db:     Sesión de base de datos.
            nombre: Nombre de la rúbrica (ej: "manejo_estado").

        Returns:
            Instancia Rubrica (existente o recién creada).
        """
        result = await db.execute(select(Rubrica).where(Rubrica.nombre == nombre))
        rubrica = result.scalar_one_or_none()

        if not rubrica:
            logger.info("🆕 Creando rúbrica: %s", nombre)
            rubrica = Rubrica(
                nombre=nombre,
                descripcion=f"Rúbrica para evaluar {nombre.replace('_', ' ')}",
                peso_porcentual=25.0,  # 4 rúbricas principales = 100%
                activa=True,
            )
            db.add(rubrica)
            await db.flush()
            logger.info("✅ Rúbrica creada: %s (id=%s)", nombre, rubrica.id)
        else:
            logger.debug("✅ Rúbrica existente: %s (id=%s)", nombre, rubrica.id)

        return rubrica


# ─────────────────────────────────────────────────────────────────────────────
# UTILIDAD DE PRUEBA (ejecutar con: python -m app.services.evaluacion.analytics_service)
# ─────────────────────────────────────────────────────────────────────────────

def _test_conversion_puntajes() -> None:  # pragma: no cover
    """Verifica la conversión de texto a puntaje en consola."""
    casos = [
        ("Excelente trabajo",                   100),
        ("Muy bueno",                             90),
        ("Bueno",                                 85),
        ("Regular",                               60),
        ("Deficiente",                            40),
        ("No se observa manejo de estado",        30),
        ("Falta documentación",                   25),
        ("Pésimo",                                20),
        ("Critico",                               10),
        ("Tiene un 75% de eficiencia",            75),
        ("Puntaje: 8/10",                         80),
        ("Calificación 6.5",                      65),
        ("Texto sin números ni palabras clave",   50),
    ]

    print("\n🧪 Prueba de conversión de puntajes:")
    print("=" * 65)
    for texto, esperado in casos:
        resultado = _cualitativo_a_score(texto)
        estado = "✅" if resultado == esperado else "❌"
        print(f"{estado} '{texto[:45]:<45}' → {resultado:>5.1f}  (esperado: {esperado})")
    print("=" * 65)


if __name__ == "__main__":
    _test_conversion_puntajes()