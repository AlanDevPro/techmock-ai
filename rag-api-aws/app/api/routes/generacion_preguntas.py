"""
app/api/routes/generacion_preguntas.py

Endpoints de generación de preguntas técnicas de entrevista.

ENDPOINTS:
  GET /preguntas/generar/{framework}          → genera pregunta RAG para el framework (público)
  GET /preguntas/iniciar-sesion/{framework}   → crea sesión rápida sin generar pregunta (requiere JWT)
  GET /preguntas/sesion/{sesion_id}/pregunta  → obtiene la pregunta activa de una sesión (público)
"""

from asyncio.log import logger
import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_current_user_id
from app.core.config import settings
from app.schemas.preguntas import RespuestaPregunta, SesionCreadaResponse
from app.services.generacion.pregunta_service import PreguntaService
from app.db.repositories import sesiones_repo, tecnologias_repo

router = APIRouter(prefix="/preguntas", tags=["Generación de Preguntas"])

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


def _normalizar_framework(framework_raw: str) -> Optional[str]:
    """Normaliza el nombre del framework desde el slug de URL."""
    return FRAMEWORK_MAP.get(framework_raw.strip().lower())


# ─────────────────────────────────────────────────────────────────────────────
# 🟢 GET /preguntas/generar/{framework} - PÚBLICO (SIN JWT)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/generar/{framework}",
    response_model=RespuestaPregunta,
    summary="Genera una pregunta técnica de entrevista via RAG",
    description="Endpoint público. No requiere autenticación JWT.",
)
async def generar_pregunta(
    framework: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    logger.warning("🔥 HIT generar pregunta | framework=%s", framework)
    """
    Genera una pregunta técnica contextualizada para el framework indicado.

    Flujo interno:
      1. Normaliza el framework (vuejs → Vue.js)
      2. RAG recupera fragmentos de documentación relevantes
      3. LLM genera pregunta contextualizada y no repetitiva
      4. Persiste pregunta + sesión en BD (usuario_id = None para anónimo)

    Ejemplos:
      GET /preguntas/generar/vue
      GET /preguntas/generar/react
      GET /preguntas/generar/typescript
    """
    framework_nombre = _normalizar_framework(framework)
    if not framework_nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Framework no soportado: '{framework}'. "
                f"Disponibles: {sorted(FRAMEWORK_MAP.keys())}"
            ),
        )

    service = PreguntaService(db=db, request=request)
    resultado = await service.generar_y_persistir(
        framework=framework_nombre,
        usuario_id=None,  # 🔓 Público: sin tracking de usuario
    )
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# 🔐 GET /preguntas/iniciar-sesion/{framework} - PRIVADO (CON JWT)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/iniciar-sesion/{framework}",
    response_model=SesionCreadaResponse,
    summary="Crea una sesión vacía sin generar pregunta (respuesta < 100ms)",
    description="Endpoint privado. Requiere autenticación JWT para tracking de usuario.",
)
async def iniciar_sesion_rapida(
    framework: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    usuario_id: UUID = Depends(require_current_user_id),  # 🔒 Autenticación requerida
):
    """
    Crea la sesión en BD con una pregunta placeholder.
    El IDE solicita la pregunta real bajo demanda con GET /preguntas/generar/{framework}.

    Útil para que el IDE abra instantáneamente mientras la pregunta
    se genera en segundo plano.
    """
    framework_nombre = _normalizar_framework(framework)
    if not framework_nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Framework no soportado: '{framework}'.",
        )

    service = PreguntaService(db=db, request=request)
    resultado = await service.iniciar_sesion_rapida(
        framework=framework_nombre,
        usuario_id=usuario_id,  # 🔒 Tracking del usuario autenticado
    )
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# 🟢 GET /preguntas/sesion/{sesion_id}/pregunta - PÚBLICO (SIN JWT)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/sesion/{sesion_id}/pregunta",
    response_model=RespuestaPregunta,
    summary="Obtiene la pregunta activa de una sesión existente",
    description="Endpoint público. No requiere autenticación.",
)
async def obtener_pregunta_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna la pregunta asociada a la sesión indicada.
    Usado por el IDE para recuperar la pregunta si recarga la página.
    """
    try:
        sesion_uuid = UUID(sesion_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sesion_id debe ser un UUID válido.",
        )

    sesion = await sesiones_repo.get_sesion_con_pregunta(db, sesion_uuid)
    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada.",
        )

    if not sesion.pregunta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La sesión no tiene pregunta asociada.",
        )

    pregunta = sesion.pregunta
    return RespuestaPregunta(
        sesion_id=str(sesion.id),
        framework=sesion.tecnologia.nombre if sesion.tecnologia else "Desconocido",
        pregunta_practica=pregunta.enunciado,
        titulo=pregunta.titulo,
        tipo=pregunta.tipo,
        tiempo_estimado_min=pregunta.tiempo_estimado_min,
        fue_adaptativa=sesion.fue_adaptativa,
        categorias_error_objetivo=pregunta.categorias_error_objetivo or [],
    )