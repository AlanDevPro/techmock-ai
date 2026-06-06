"""
app/api/routes/evaluacion_codigo.py

ARQUITECTURA DE SEGURIDAD:
  - JWT solo en login y creación de sesión (asocia usuario_id ↔ sesion_id en BD)
  - POST /finalizar  → público, usuario_id se resuelve desde sesion.usuario_id en BD
  - GET  /resultado  → público, cualquiera con sesion_id puede ver (debug/admin)
  - GET  /analisis   → público, cualquiera con sesion_id puede ver (frontend)

  El control de acceso real está en la BD: la sesión YA tiene usuario_id
  desde el momento en que se creó con JWT. No hace falta re-validar aquí.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
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

router = APIRouter(prefix="/codigo", tags=["Evaluación de Código"])

# Mapeo slug URL → nombre canónico
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
    return FRAMEWORK_MAP.get(framework_raw.strip().lower(), framework_raw.strip())


def _puntaje_a_nivel_texto(puntaje: float) -> str:
    if puntaje >= 90: return "Excelente"
    if puntaje >= 75: return "Bueno"
    if puntaje >= 60: return "Regular"
    if puntaje >= 40: return "Deficiente"
    return "Crítico"


# ─────────────────────────────────────────────────────────────────────────────
# POST /codigo/finalizar  ← SIN JWT
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/finalizar",
    response_model=RespuestaAnalisisCodigo,
    summary="Finaliza la sesión: guarda el código, evalúa con IA y persiste todo",
)
async def finalizar_codigo(
    data: SolicitudFinalizarCodigo,
    request: Request,
    db: AsyncSession = Depends(get_db),
    # ← SIN require_current_user_id. usuario_id viene de sesion.usuario_id en BD.
):
    """
    Endpoint único de cierre de sesión. Se invoca cuando:
    - El candidato presiona "Enviar solución", o
    - El frontend detecta que el tiempo se agotó.

    No requiere JWT. El usuario_id se obtiene de sesion.usuario_id en BD,
    garantizando que la evaluación siempre queda asociada al dueño correcto.

    Flujo interno:
      1. Valida longitud del código
      2. Construye contexto multi-archivo del IDE
      3. RAG recupera fragmentos de buenas prácticas
      4. LLM evalúa el código y retorna los 5 pilares técnicos
      5. Persiste código, evaluación, errores y recomendaciones en BD
      6. Actualiza perfil técnico del usuario (desde sesion.usuario_id)
      7. Marca la sesión como completada (o tiempo_agotado)

    Body esperado:
    {
      "sesion_id":     "uuid requerido",
      "codigo":        "string requerido",
      "lenguaje":      "vue | react | next | typescript | ...",
      "motivo_cierre": "enviado | tiempo_agotado",
      "active_file":   "App.vue",
      "files":         {"App.vue": "...", "store.js": "..."}
    }
    """
    if len(data.codigo) > settings.MAX_CODIGO_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Código excede el límite de {settings.MAX_CODIGO_LENGTH} caracteres.",
        )

    framework = _normalizar_framework(data.lenguaje)

    contexto_proyecto = construir_contexto_proyecto(
        active_file=data.active_file or "",
        files=data.files or {},
        framework=framework,
    )

    service = CodigoService(db=db, request=request)
    return await service.finalizar_y_evaluar(
        sesion_id=data.sesion_id,
        codigo=data.codigo,
        framework=framework,
        contexto_proyecto=contexto_proyecto,
        motivo_cierre=data.motivo_cierre,
        usuario_id=None,  # ← el service lo resuelve desde sesion.usuario_id en BD
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
    # ← SIN require_current_user_id.
):
    """
    Retorna los datos crudos de BD.
    Público: cualquiera con el sesion_id puede consultar.
    Usar solo para debug y panel de administración.
    El frontend debe usar GET /codigo/sesion/{id}/analisis en su lugar.
    """
    sesion_uuid = _parse_uuid(sesion_id)
    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)

    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada.",
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
    # ← SIN require_current_user_id.
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
    sesion_uuid = _parse_uuid(sesion_id)
    sesion = await sesiones_repo.get_sesion_con_detalles(db, sesion_uuid)

    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada.",
        )

    evaluacion = sesion.evaluacion
    puntaje = float(evaluacion.puntaje_total) if evaluacion and evaluacion.puntaje_total else 0.0

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

    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        recomendaciones = sorted(
            [
                {
                    "tipo":           r.tipo,
                    "mensaje":        r.titulo,
                    "solucion":       r.descripcion,
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

    fortalezas   = [f.strip() for f in (evaluacion.fortalezas or "").split("\n") if f.strip()]
    areas_mejora = [a.strip() for a in (evaluacion.areas_mejora or "").split("\n") if a.strip()]

    pilares = {
        "javascript":       float(evaluacion.puntaje_javascript or 0),
        "arquitectura":     float(evaluacion.puntaje_arquitectura or 0),
        "buenas_practicas": float(evaluacion.puntaje_buenas_practicas or 0),
        "comunicacion":     float(evaluacion.puntaje_comunicacion or 0),
        "resolucion":       float(evaluacion.puntaje_resolucion or 0),
    } if evaluacion else {}

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


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sesion_id debe ser un UUID válido.",
        )