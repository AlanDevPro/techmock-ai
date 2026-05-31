"""
app/api/routes/evaluacion_codigo.py

Endpoints de evaluación y análisis de código del candidato.

ENDPOINTS:
  POST /codigo/analizar              → analiza código con RAG + LLM, persiste resultado
  POST /codigo/borrador              → autosave del editor (no bloqueante)
  GET  /codigo/sesion/{id}/resultado → resultado crudo (debug/admin)
  GET  /codigo/sesion/{id}/analisis  → análisis formateado para el frontend
"""

import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.core.config import settings
from app.core.normalizers import construir_contexto_proyecto
from app.schemas.evaluaciones import (
    RespuestaAnalisisCodigo,
    SolicitudAnalisisCodigo,
    RespuestaAutosave,
)
from app.services.evaluacion.codigo_service import CodigoService
from app.db.repositories import sesiones_repo, evaluaciones_repo, codigo_repo

router = APIRouter(prefix="/codigo", tags=["Evaluación de Código"])

# Mapeo slug URL → nombre canónico (igual que en generacion_preguntas)
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


def _normalizar_framework(framework_raw: str) -> str:
    """Normaliza o retorna el valor original si no está en el mapa."""
    return FRAMEWORK_MAP.get(framework_raw.strip().lower(), framework_raw.strip())


def _puntaje_a_nivel_candidato(puntaje: float) -> str:
    """Convierte puntaje 0-100 al nivel de candidato del esquema de BD."""
    if puntaje >= 90: return "destacado"
    if puntaje >= 75: return "recomendado"
    if puntaje >= 60: return "promisorio"
    if puntaje >= 40: return "revisar"
    return "descartado"


def _puntaje_a_nivel_texto(puntaje: float) -> str:
    """Versión legible del nivel para el frontend."""
    if puntaje >= 90: return "Excelente"
    if puntaje >= 75: return "Bueno"
    if puntaje >= 60: return "Regular"
    if puntaje >= 40: return "Deficiente"
    return "Crítico"


# ─────────────────────────────────────────────────────────────────────────────
# POST /codigo/analizar
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analizar",
    response_model=RespuestaAnalisisCodigo,
    summary="Analiza el código del candidato con RAG + LLM",
)
async def analizar_codigo(
    data: SolicitudAnalisisCodigo,
    request: Request,
    db: AsyncSession = Depends(get_db),
    usuario_id: Optional[UUID] = Depends(get_current_user_id),
):
    """
    Analiza el código enviado por el candidato.

    Flujo interno:
      1. Valida longitud del código
      2. Construye contexto multi-archivo del IDE
      3. RAG recupera fragmentos de buenas prácticas
      4. LLM evalúa el código y retorna los 5 pilares técnicos
      5. Persiste evaluación completa en BD si hay sesion_id
      6. Actualiza perfil técnico del usuario

    Body esperado:
    {
      "codigo":      "string requerido",
      "framework":   "vue | react | next | typescript | ...",
      "sesion_id":   "uuid opcional",
      "active_file": "App.vue",
      "files":       {"App.vue": "contenido", "store.js": "contenido"}
    }
    """
    if len(data.codigo) > settings.MAX_CODIGO_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Código excede el límite de {settings.MAX_CODIGO_LENGTH} caracteres.",
        )

    framework = _normalizar_framework(data.framework)

    contexto_proyecto = construir_contexto_proyecto(
        active_file=data.active_file or "",
        files=data.files or {},
        framework=framework,
    )

    service = CodigoService(db=db, request=request)
    resultado = await service.analizar_y_persistir(
        codigo=data.codigo,
        framework=framework,
        contexto_proyecto=contexto_proyecto,
        sesion_id=data.sesion_id,
        usuario_id=usuario_id,
    )
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# POST /codigo/borrador
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/borrador",
    response_model=RespuestaAutosave,
    summary="Guarda un borrador del código (autosave del IDE)",
)
async def guardar_borrador(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Persiste un snapshot del código sin marcarlo como envío final.
    No bloquea al IDE si falla — siempre retorna ok/not_ok.
    """
    sesion_id_str = data.get("sesion_id", "").strip()
    codigo        = data.get("codigo", "").strip()
    active_file   = data.get("active_file", "borrador")

    if not sesion_id_str or not codigo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'sesion_id' y 'codigo' son requeridos.",
        )

    try:
        sesion_id = UUID(sesion_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sesion_id debe ser un UUID válido.",
        )

    try:
        sesion = await sesiones_repo.get_sesion_por_id(db, sesion_id)
        if not sesion:
            return RespuestaAutosave(ok=False, detail="Sesión no encontrada.")

        await codigo_repo.guardar_envio_codigo(
            db=db,
            sesion_id=sesion_id,
            lenguaje=active_file,
            codigo=codigo,
            es_envio_final=False,
        )
        return RespuestaAutosave(ok=True)

    except Exception as exc:
        print(f"⚠️  Error autosave (no bloqueante): {exc}")
        return RespuestaAutosave(ok=False, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# GET /codigo/sesion/{sesion_id}/resultado
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
    Retorna los datos crudos de BD de la sesión.
    Usar solo para debug y panel de administración.
    El frontend debe usar GET /codigo/sesion/{id}/analisis en su lugar.
    """
    try:
        sesion_uuid = UUID(sesion_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sesion_id debe ser un UUID válido.",
        )

    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)
    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada.",
        )
    return sesion


# ─────────────────────────────────────────────────────────────────────────────
# GET /codigo/sesion/{sesion_id}/analisis
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

    Incluye los 5 pilares técnicos almacenados en la tabla evaluaciones:
      - puntaje_javascript
      - puntaje_arquitectura
      - puntaje_buenas_practicas
      - puntaje_comunicacion
      - puntaje_resolucion
    """
    try:
        sesion_uuid = UUID(sesion_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sesion_id debe ser un UUID válido.",
        )

    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)
    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada.",
        )

    evaluacion = sesion.evaluacion
    puntaje    = float(evaluacion.puntaje_total) if evaluacion and evaluacion.puntaje_total else 0.0

    # ── Errores detectados ────────────────────────────────────────────────
    errores = [
        {
            "tipo":              e.categoria_error.nombre if e.categoria_error else "general",
            "categoria_slug":    e.categoria_error.slug if e.categoria_error else None,
            "descripcion":       e.descripcion,
            "impacto":           e.severidad,
            "es_conceptual":     e.es_error_conceptual,
            "linea_aproximada":  e.linea_codigo,
            "fragmento_codigo":  e.fragmento_codigo,
            "codigo_corregido":  e.codigo_corregido,
            "explicacion_ia":    e.explicacion_ia,
        }
        for e in (sesion.errores_detectados or [])
    ]

    # ── Recomendaciones ───────────────────────────────────────────────────
    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        recomendaciones = sorted(
            [
                {
                    "tipo":          r.tipo,
                    "mensaje":       r.titulo,
                    "solucion":      r.descripcion,
                    "codigo_ejemplo": r.codigo_ejemplo,
                    "recurso_url":   r.recurso_url,
                    "recurso_titulo": r.recurso_titulo,
                    "prioridad":     r.prioridad,
                    "orden":         r.orden,
                }
                for r in evaluacion.recomendaciones
            ],
            key=lambda x: x["orden"],
        )

    # ── Fortalezas y áreas de mejora ──────────────────────────────────────
    fortalezas   = [f.strip() for f in (evaluacion.fortalezas or "").split("\n") if f.strip()]
    areas_mejora = [a.strip() for a in (evaluacion.areas_mejora or "").split("\n") if a.strip()]

    # ── Pilares técnicos (columnas directas de evaluaciones) ──────────────
    pilares = {
        "javascript":       float(evaluacion.puntaje_javascript or 0),
        "arquitectura":     float(evaluacion.puntaje_arquitectura or 0),
        "buenas_practicas": float(evaluacion.puntaje_buenas_practicas or 0),
        "comunicacion":     float(evaluacion.puntaje_comunicacion or 0),
        "resolucion":       float(evaluacion.puntaje_resolucion or 0),
    } if evaluacion else {}

    # ── Detalle por rúbrica (tabla detalle_evaluacion) ────────────────────
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

    return RespuestaAnalisisCodigo(
        calificacion_general={
            "nivel":                _puntaje_a_nivel_texto(puntaje),
            "nivel_candidato":      evaluacion.nivel_candidato if evaluacion else None,
            "puntaje":              int(puntaje),
            "apto_para_contratacion": evaluacion.apto_para_contratacion if evaluacion else None,
            "resumen":              evaluacion.feedback_general if evaluacion else "Sin evaluación",
            "resumen_para_reclutador": evaluacion.resumen_para_reclutador if evaluacion else None,
        },
        pilares_tecnicos=pilares,
        errores=errores,
        buenas_practicas=fortalezas,
        malas_practicas=areas_mejora,
        recomendaciones=recomendaciones,
        detalle_rubricas=detalle_rubricas,
    )