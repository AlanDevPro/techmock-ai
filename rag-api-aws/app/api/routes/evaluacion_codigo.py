"""
app/api/routes/evaluacion_codigo.py

ARQUITECTURA DE SEGURIDAD:
  - JWT solo en login y creación de sesión (asocia usuario_id ↔ sesion_id en BD)
  - POST /finalizar  → público, usuario_id se resuelve desde sesion.usuario_id en BD
  - GET  /resultado  → público, cualquiera con sesion_id puede ver (debug/admin)
  - GET  /analisis   → público, cualquiera con sesion_id puede ver (frontend)

  El control de acceso real está en la BD: la sesión YA tiene usuario_id
  desde el momento en que se creó con JWT. No hace falta re-validar aquí.

MEJORAS v2:
  - Log explícito del framework antes y después de normalizar
  - Advertencia si el framework normalizado no coincide con ninguna entrada conocida
"""

import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.core.normalizers import construir_contexto_proyecto
from app.schemas.evaluaciones import (
    RespuestaAnalisisCodigo,
    SolicitudFinalizarCodigo,
)
from app.services.evaluacion.codigo_service import CodigoService
from app.db.repositories import sesiones_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/codigo", tags=["Evaluación de Código"])

# Mapeo slug URL → nombre canónico del framework
FRAMEWORK_MAP: dict[str, str] = {
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

# Conjunto de frameworks conocidos (para advertir si llega uno desconocido)
_FRAMEWORKS_CONOCIDOS = set(FRAMEWORK_MAP.values())


def _normalizar_framework(framework_raw: str) -> str:
    """
    Normaliza el nombre del framework con logs de depuración.
    Si el framework no está en el mapeo, lo devuelve tal cual (capitalizado)
    y emite una advertencia para que el dev lo agregue al mapeo.
    """
    original   = framework_raw.strip()
    normalized = FRAMEWORK_MAP.get(original.lower(), original)

    if original.lower() in FRAMEWORK_MAP:
        logger.info(
            "🔧 Framework normalizado: '%s' → '%s'", original, normalized
        )
    else:
        # El frontend envió algo que no está en FRAMEWORK_MAP
        logger.warning(
            "⚠️ Framework '%s' NO está en FRAMEWORK_MAP — "
            "se usará tal cual: '%s'. "
            "Si este framework es válido, agrégalo a FRAMEWORK_MAP.",
            original, normalized,
        )

    if normalized not in _FRAMEWORKS_CONOCIDOS:
        logger.warning(
            "⚠️ Framework resultante '%s' no tiene instrucciones específicas en "
            "evaluacion_prompts._INSTRUCCIONES_ESPECIFICAS. "
            "El LLM usará las instrucciones genéricas.",
            normalized,
        )

    return normalized


def _puntaje_a_nivel_texto(puntaje: float) -> str:
    """Convierte puntaje numérico a nivel textual."""
    if puntaje >= 90: return "Excelente"
    if puntaje >= 75: return "Bueno"
    if puntaje >= 60: return "Regular"
    if puntaje >= 40: return "Deficiente"
    return "Crítico"


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────────────────────

async def _log_request_details(request: Request, data: SolicitudFinalizarCodigo) -> None:
    """Registra detalles de la request para debugging."""
    framework_norm = _normalizar_framework(data.lenguaje)
    logger.info("=" * 60)
    logger.info("📨 NUEVA SOLICITUD A /codigo/finalizar")
    logger.info("🌐 IP Cliente: %s", request.client.host if request.client else "Unknown")
    logger.info("🔧 Framework recibido (raw): '%s'", data.lenguaje)
    logger.info("🔄 Framework normalizado:    '%s'", framework_norm)
    logger.info("🆔 Sesion ID: %s", data.sesion_id)
    logger.info("📝 Longitud código: %d caracteres", len(data.codigo))
    logger.info("📁 Archivo activo: %s", data.active_file or "Ninguno")
    logger.info("📂 Archivos adjuntos: %d", len(data.files) if data.files else 0)
    logger.info("🏁 Motivo cierre: %s", data.motivo_cierre)
    if data.files:
        file_list = list(data.files.keys())[:5]
        logger.info("📄 Archivos: %s", ", ".join(file_list))
        if len(data.files) > 5:
            logger.info("   ... y %d más", len(data.files) - 5)
    logger.info("-" * 60)


def _parse_uuid(value: str) -> UUID:
    """Valida y convierte string a UUID con log de error."""
    try:
        return UUID(value)
    except ValueError:
        logger.error("❌ UUID inválido recibido: %s", value)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error":    "UUID_INVÁLIDO",
                "message":  "sesion_id debe ser un UUID válido.",
                "received": value,
            },
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /codigo/finalizar  ← SIN JWT
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/finalizar",
    response_model=RespuestaAnalisisCodigo,
    summary="Finaliza la sesión: guarda el código, evalúa con IA y persiste todo",
    status_code=status.HTTP_200_OK,
)
async def finalizar_codigo(
    data: SolicitudFinalizarCodigo,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint único de cierre de sesión. Se invoca cuando:
    - El candidato presiona "Enviar solución", o
    - El frontend detecta que el tiempo se agotó.

    No requiere JWT. El usuario_id se obtiene de sesion.usuario_id en BD,
    garantizando que la evaluación siempre queda asociada al dueño correcto.

    Flujo interno:
      1. Valida longitud del código
      2. Normaliza el framework y verifica que sea conocido
      3. Construye contexto multi-archivo del IDE
      4. RAG recupera fragmentos de buenas prácticas FILTRADOS POR FRAMEWORK
      5. LLM evalúa el código con instrucciones ESPECÍFICAS del framework
      6. Persiste código, evaluación, errores y recomendaciones en BD
      7. Actualiza perfil técnico del usuario (desde sesion.usuario_id)
      8. Marca la sesión como completada (o tiempo_agotado)

    Raises:
        HTTPException 413: Si el código excede el tamaño máximo
        HTTPException 404: Si la sesión no existe
        HTTPException 429: Si el LLM está saturado
    """
    await _log_request_details(request, data)

    # ── Validación 1: Longitud del código ──────────────────────────────────
    if len(data.codigo) > settings.MAX_CODIGO_LENGTH:
        logger.error(
            "❌ Código excede límite: %d > %d",
            len(data.codigo), settings.MAX_CODIGO_LENGTH,
        )
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error":          "CÓDIGO_DEMASIADO_LARGO",
                "message":        f"El código excede el límite máximo de {settings.MAX_CODIGO_LENGTH} caracteres.",
                "max_length":     settings.MAX_CODIGO_LENGTH,
                "current_length": len(data.codigo),
            },
        )

    # ── Validación 2: Formato de sesion_id ─────────────────────────────────
    try:
        sesion_uuid = UUID(data.sesion_id)
        logger.debug("✅ Sesion ID válido: %s", sesion_uuid)
    except ValueError:
        logger.error("❌ Sesion ID inválido: %s", data.sesion_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error":    "UUID_INVÁLIDO",
                "message":  "El sesion_id debe ser un UUID válido.",
                "received": data.sesion_id,
            },
        )

    # ── Validación 3: Código no vacío ──────────────────────────────────────
    if not data.codigo or not data.codigo.strip():
        logger.error("❌ Código vacío recibido")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error":   "CÓDIGO_VACÍO",
                "message": "El campo 'codigo' no puede estar vacío.",
            },
        )

    # ── Procesamiento principal ─────────────────────────────────────────────
    try:
        # Normalizar framework con logs completos
        framework = _normalizar_framework(data.lenguaje)
        logger.info("🔧 Framework listo para el pipeline: '%s'", framework)

        logger.debug("📁 Construyendo contexto del proyecto...")
        contexto_proyecto = construir_contexto_proyecto(
            active_file=data.active_file or "",
            files=data.files or {},
            framework=framework,
        )
        logger.debug("✅ Contexto construido: %d caracteres", len(contexto_proyecto))

        logger.info("🚀 Iniciando pipeline de evaluación (framework='%s')...", framework)
        service = CodigoService(db=db, request=request)

        resultado = await service.finalizar_y_evaluar(
            sesion_id=data.sesion_id,
            codigo=data.codigo,
            framework=framework,              # ← ya normalizado y verificado
            contexto_proyecto=contexto_proyecto,
            motivo_cierre=data.motivo_cierre,
            usuario_id=None,
            files=data.files,
        )

        logger.info("✅ Evaluación completada exitosamente (framework='%s')", framework)

        cal = resultado.calificacion_general
        if isinstance(cal, dict):
            logger.info("📊 Resultado — Puntaje: %s | Nivel: %s", cal.get("puntaje", "N/A"), cal.get("nivel", "N/A"))
        else:
            logger.info(
                "📊 Resultado — Puntaje: %s | Nivel: %s",
                getattr(cal, "puntaje", "N/A"),
                getattr(cal, "nivel", "N/A"),
            )

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 60)
        logger.error("❌ ERROR INESPERADO EN /codigo/finalizar")
        logger.error("Tipo: %s", type(e).__name__)
        logger.error("Mensaje: %s", str(e))
        logger.error("Stack trace:", exc_info=True)
        logger.error("=" * 60)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error":   "ERROR_INTERNO",
                "message": "Ocurrió un error interno al procesar la evaluación.",
                "type":    type(e).__name__,
            },
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /codigo/sesion/{sesion_id}/resultado  ← SIN JWT (debug/admin)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/sesion/{sesion_id}/resultado",
    summary="Resultado crudo de una sesión (formato ORM, para admin/debug)",
)
async def obtener_resultado_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna los datos crudos de BD.
    Público: cualquiera con el sesion_id puede consultar.
    Usar solo para debug y panel de administración.
    El frontend debe usar GET /codigo/sesion/{id}/analisis en su lugar.
    """
    logger.info("📊 Solicitando resultado crudo para sesión: %s", sesion_id)

    sesion_uuid = _parse_uuid(sesion_id)
    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)

    if not sesion:
        logger.warning("⚠️ Sesión no encontrada: %s", sesion_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":   "SESIÓN_NO_ENCONTRADA",
                "message": f"No se encontró la sesión con ID: {sesion_id}",
            },
        )

    logger.info("✅ Sesión encontrada — Estado: %s", sesion.estado)
    if sesion.evaluacion:
        logger.info(
            "   Evaluación ID: %s — Puntaje: %s",
            sesion.evaluacion.id,
            sesion.evaluacion.puntaje_total,
        )

    return sesion


# ─────────────────────────────────────────────────────────────────────────────
# GET /codigo/sesion/{sesion_id}/analisis  ← SIN JWT (frontend)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/sesion/{sesion_id}/analisis",
    response_model=RespuestaAnalisisCodigo,
    summary="Análisis formateado para el frontend",
)
async def obtener_analisis_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Transforma los datos de BD al contrato estable RespuestaAnalisisCodigo.
    Este es el endpoint que DEBE usar el frontend para mostrar resultados.

    Público: el sesion_id actúa como token de acceso opaco (UUID v4).
    El usuario_id ya está grabado en la sesión desde la creación con JWT.

    Incluye los 5 pilares técnicos:
      - puntaje_javascript
      - puntaje_arquitectura
      - puntaje_buenas_practicas
      - puntaje_comunicacion
      - puntaje_resolucion
    """
    logger.info("📊 Solicitando análisis formateado para sesión: %s", sesion_id)

    sesion_uuid = _parse_uuid(sesion_id)
    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)

    if not sesion:
        logger.warning("⚠️ Sesión no encontrada para análisis: %s", sesion_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error":   "SESIÓN_NO_ENCONTRADA",
                "message": f"No se encontró la sesión con ID: {sesion_id}",
            },
        )

    evaluacion = sesion.evaluacion
    puntaje    = float(evaluacion.puntaje_total) if evaluacion and evaluacion.puntaje_total else 0.0

    logger.info(
        "✅ Sesión encontrada — Puntaje: %.2f — Estado: %s",
        puntaje, sesion.estado,
    )

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
    logger.info("🐛 Errores encontrados: %d", len(errores))

    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        recomendaciones = sorted(
            [
                {
                    "tipo":           r.tipo,
                    "titulo":         r.titulo,
                    "descripcion":    r.descripcion,
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
        logger.info("📚 Recomendaciones: %d", len(recomendaciones))

    fortalezas   = [f.strip() for f in (evaluacion.fortalezas   or "").split("\n") if f.strip()]
    areas_mejora = [a.strip() for a in (evaluacion.areas_mejora or "").split("\n") if a.strip()]
    logger.info(
        "💪 Fortalezas: %d — Áreas de mejora: %d",
        len(fortalezas), len(areas_mejora),
    )

    pilares = {
        "javascript":       float(evaluacion.puntaje_javascript      or 0),
        "arquitectura":     float(evaluacion.puntaje_arquitectura     or 0),
        "buenas_practicas": float(evaluacion.puntaje_buenas_practicas or 0),
        "comunicacion":     float(evaluacion.puntaje_comunicacion     or 0),
        "resolucion":       float(evaluacion.puntaje_resolucion       or 0),
    } if evaluacion else {}
    logger.info("📊 Pilares: %s", pilares)

    detalle_rubricas = []
    if evaluacion and evaluacion.detalles:
        detalle_rubricas = [
            {
                "rubrica":    d.rubrica.nombre if d.rubrica else "Desconocida",
                "puntaje":    float(d.puntaje),
                "comentario": d.comentario,
            }
            for d in evaluacion.detalles
        ]
        logger.info("📋 Rúbricas detalladas: %d", len(detalle_rubricas))

    response = RespuestaAnalisisCodigo(
        calificacion_general={
            "nivel":                   _puntaje_a_nivel_texto(puntaje),
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
        detalle_rubricas=detalle_rubricas,
    )

    logger.info("✅ Análisis formateado exitosamente")
    return response