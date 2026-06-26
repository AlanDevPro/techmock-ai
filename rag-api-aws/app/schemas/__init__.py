"""
app/schemas/__init__.py

Re-exporta todos los schemas Pydantic para facilitar importaciones.
"""

from app.schemas.preguntas import (
    RespuestaPregunta,
    SesionIniciadaResponse,
    SolicitudSesionAdaptativa,
)
from app.schemas.evaluaciones import (
    SolicitudFinalizarCodigo,
    RespuestaAnalisisCodigo,
    CalificacionGeneral,
    ErrorDetectado,
    Recomendacion,
    EvaluacionTecnica,
    RecomendacionSolucion,
)
from app.schemas.perfil import (
    FortalezaSchema,
    DebilidadSchema,
    PerfilTecnicoResponse,
    EstadisticasUsuarioResponse,
    CandidatoReclutadorView,
    DebilidadUsuarioResponse,
    FortalezaUsuarioResponse,
)

__all__ = [
    # preguntas
    "RespuestaPregunta",
    "SesionIniciadaResponse",
    "SolicitudSesionAdaptativa",
    # evaluaciones
    "SolicitudFinalizarCodigo",
    "RespuestaAnalisisCodigo",
    "CalificacionGeneral",
    "ErrorDetectado",
    "Recomendacion",
    "EvaluacionTecnica",
    "RecomendacionSolucion",
    # perfil
    "FortalezaSchema",
    "DebilidadSchema",
    "PerfilTecnicoResponse",
    "EstadisticasUsuarioResponse",
    "CandidatoReclutadorView",
    "DebilidadUsuarioResponse",
    "FortalezaUsuarioResponse",
]