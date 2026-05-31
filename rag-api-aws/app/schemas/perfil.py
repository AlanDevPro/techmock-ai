"""
app/schemas/perfil.py

Schemas Pydantic para los endpoints de perfil técnico y reclutador.
Cubre:
  - GET /usuario/{id}/perfil
  - GET /usuario/{id}/debilidades
  - GET /usuario/{id}/fortalezas
  - GET /reclutador/candidatos
  - GET /reclutador/candidato/{id}
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────
# SUB-SCHEMAS: Fortalezas y Debilidades
# ──────────────────────────────────────────────────────────────

class CategoriaErrorResumen(BaseModel):
    """Datos mínimos de una categoría de error para embeber en perfil."""

    id: int
    nombre: str
    slug: str
    tipo: str = Field(..., description="conceptual | experiencia")


class FortalezaSchema(BaseModel):
    """
    Fortaleza del usuario en una categoría de error.
    Corresponde a una fila en `fortalezas_usuario`.
    """

    id: int
    categoria_error: CategoriaErrorResumen
    descripcion: Optional[str] = Field(
        None, description="Descripción legible (ej. 'Maneja bien async/await en React')"
    )
    veces_demostrada: int = Field(1, description="Cantidad de sesiones donde se demostró")
    confianza: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Confianza estadística (0.0 - 1.0). Sube con más sesiones.",
    )

    class Config:
        from_attributes = True


class DebilidadSchema(BaseModel):
    """
    Debilidad del usuario en una categoría de error.
    Corresponde a una fila en `debilidades_usuario`.
    """

    id: int
    categoria_error: CategoriaErrorResumen
    descripcion: Optional[str] = Field(
        None, description="Descripción legible (ej. 'Confunde estado local vs global')"
    )
    veces_fallada: int = Field(1, description="Cantidad de sesiones con este error")
    impacto: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Impacto en el score (0.0 - 1.0). Alto impacto = prioridad de práctica.",
    )
    requiere_practica: bool = Field(
        True, description="Flag para el sistema adaptativo: generar pregunta sobre esto"
    )

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /usuario/{id}/debilidades
# ──────────────────────────────────────────────────────────────

class DebilidadUsuarioResponse(BaseModel):
    """Lista de debilidades del usuario con contexto de sesiones."""

    usuario_id: UUID
    total_debilidades: int
    debilidades: List[DebilidadSchema]
    requieren_practica: int = Field(
        0, description="Cantidad de debilidades marcadas como requiere_practica=True"
    )


# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /usuario/{id}/fortalezas
# ──────────────────────────────────────────────────────────────

class FortalezaUsuarioResponse(BaseModel):
    """Lista de fortalezas del usuario."""

    usuario_id: UUID
    total_fortalezas: int
    fortalezas: List[FortalezaSchema]


# ──────────────────────────────────────────────────────────────
# SUB-SCHEMA: Scores por pilar (reutilizable en perfil y candidatos)
# ──────────────────────────────────────────────────────────────

class ScoresPilaresHistoricos(BaseModel):
    """
    Promedios históricos ponderados de los 5 pilares técnicos.
    Calculados en `perfil_tecnico_usuario`.
    """

    global_: Optional[float] = Field(None, alias="global", ge=0, le=100)
    javascript: Optional[float] = Field(None, ge=0, le=100)
    arquitectura: Optional[float] = Field(None, ge=0, le=100)
    buenas_practicas: Optional[float] = Field(None, ge=0, le=100)
    comunicacion: Optional[float] = Field(None, ge=0, le=100)
    resolucion: Optional[float] = Field(None, ge=0, le=100)
    consistencia: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Estabilidad entre sesiones (100 - desviación estándar de puntajes)",
    )

    class Config:
        populate_by_name = True


# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /usuario/{id}/perfil
# ──────────────────────────────────────────────────────────────

class PerfilTecnicoResponse(BaseModel):
    """
    Perfil técnico completo del usuario.
    Agrega scores históricos, fortalezas, debilidades y estadísticas.
    """

    # ── Identificación ─────────────────────────────────────────
    usuario_id: UUID
    nombre: str
    apellido: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

    # ── Scores históricos ──────────────────────────────────────
    scores: ScoresPilaresHistoricos

    # ── Clasificación y tendencia ──────────────────────────────
    nivel_actual: Optional[str] = Field(
        None,
        description="descartado / revisar / promisorio / recomendado / destacado",
    )
    tendencia: str = Field(
        "estable", description="↑ mejorando | → estable | ↓ bajando"
    )

    # ── Sesiones ───────────────────────────────────────────────
    total_sesiones: int = 0
    sesiones_completadas: int = 0
    sesiones_abandonadas: int = 0

    # ── Tecnologías destacadas ─────────────────────────────────
    mejor_tecnologia: Optional[str] = Field(
        None, description="Nombre de la tecnología con mejor desempeño"
    )
    peor_tecnologia: Optional[str] = Field(
        None, description="Nombre de la tecnología con peor desempeño"
    )

    # ── Fortalezas y debilidades (top N) ──────────────────────
    top_fortalezas: List[FortalezaSchema] = Field(
        default_factory=list,
        description="Las 3 fortalezas con mayor confianza estadística",
    )
    top_debilidades: List[DebilidadSchema] = Field(
        default_factory=list,
        description="Las 3 debilidades con mayor impacto en el score",
    )

    # ── Metadata ───────────────────────────────────────────────
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "usuario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "nombre": "Ana",
                "apellido": "García",
                "avatar_url": "https://cdn.example.com/avatars/ana.png",
                "github_url": "https://github.com/anagarcia",
                "linkedin_url": None,
                "scores": {
                    "global": 82.5,
                    "javascript": 85.0,
                    "arquitectura": 78.0,
                    "buenas_practicas": 80.0,
                    "comunicacion": 90.0,
                    "resolucion": 79.0,
                    "consistencia": 88.0,
                },
                "nivel_actual": "recomendado",
                "tendencia": "↑ mejorando",
                "total_sesiones": 5,
                "sesiones_completadas": 4,
                "sesiones_abandonadas": 1,
                "mejor_tecnologia": "Vue.js",
                "peor_tecnologia": "TypeScript",
                "top_fortalezas": [],
                "top_debilidades": [],
                "actualizado_en": "2025-07-01T10:30:00",
            }
        }


# ──────────────────────────────────────────────────────────────
# SUB-SCHEMA: Estadísticas básicas del usuario
# ──────────────────────────────────────────────────────────────

class EstadisticasUsuarioResponse(BaseModel):
    """
    Estadísticas de entrevistas del usuario.
    Corresponde a la tabla `estadisticas_usuario`.
    """

    usuario_id: UUID
    total_entrevistas: int = 0
    entrevistas_finalizadas: int = 0
    entrevistas_abandonadas: int = 0
    puntaje_promedio: Optional[float] = None
    mejor_puntaje: Optional[float] = None
    peor_puntaje: Optional[float] = None
    tiempo_promedio_segundos: Optional[int] = None
    tecnologia_favorita: Optional[str] = None
    racha_actual: int = 0
    racha_maxima: int = 0
    ultima_entrevista_fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /reclutador/candidatos  |  GET /reclutador/candidato/{id}
# ──────────────────────────────────────────────────────────────

class CandidatoReclutadorView(BaseModel):
    """
    Vista de un candidato para el panel de reclutador/admin.
    Refleja la vista `vista_candidatos_reclutador` de la BD.

    Incluye solo los datos necesarios para la decisión de contratación.
    """

    # ── Identificación ─────────────────────────────────────────
    usuario_id: UUID
    nombre: str
    apellido: Optional[str] = None
    email: str
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

    # ── Scores del perfil ──────────────────────────────────────
    scores: ScoresPilaresHistoricos

    # ── Clasificación ──────────────────────────────────────────
    nivel_actual: Optional[str] = Field(
        None, description="descartado / revisar / promisorio / recomendado / destacado"
    )
    tendencia: Optional[str] = Field(None, description="↑ mejorando | → estable | ↓ bajando")

    # ── Decisión de contratación ───────────────────────────────
    apto_para_contratacion: Optional[bool] = Field(
        None, description="Flag directo de la última evaluación"
    )
    resumen_para_reclutador: Optional[str] = Field(
        None, description="Párrafo ejecutivo generado por la IA para el reclutador"
    )
    feedback_general: Optional[str] = Field(
        None, description="Feedback general de la última sesión completada"
    )

    # ── Estadísticas relevantes ────────────────────────────────
    total_sesiones: int = 0
    sesiones_completadas: int = 0
    racha_actual: int = 0
    ultima_entrevista_fecha: Optional[datetime] = None

    # ── Tecnologías destacadas ─────────────────────────────────
    mejor_tecnologia: Optional[str] = None
    peor_tecnologia: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "usuario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "nombre": "Ana",
                "apellido": "García",
                "email": "ana@example.com",
                "github_url": "https://github.com/anagarcia",
                "linkedin_url": None,
                "scores": {
                    "global": 82.5,
                    "javascript": 85.0,
                    "arquitectura": 78.0,
                    "buenas_practicas": 80.0,
                    "comunicacion": 90.0,
                    "resolucion": 79.0,
                    "consistencia": 88.0,
                },
                "nivel_actual": "recomendado",
                "tendencia": "↑ mejorando",
                "apto_para_contratacion": True,
                "resumen_para_reclutador": (
                    "Candidata con sólido dominio de Vue 3 y excelente comunicación. "
                    "Área de mejora: manejo de errores en código async."
                ),
                "feedback_general": "Muy buen desempeño general. Código limpio y bien estructurado.",
                "total_sesiones": 5,
                "sesiones_completadas": 4,
                "racha_actual": 3,
                "ultima_entrevista_fecha": "2025-06-30T14:00:00",
                "mejor_tecnologia": "Vue.js",
                "peor_tecnologia": "TypeScript",
            }
        }


class ListaCandidatosResponse(BaseModel):
    """Respuesta paginada para GET /reclutador/candidatos."""

    total: int = Field(..., description="Total de candidatos que coinciden con los filtros")
    pagina: int = Field(1, description="Página actual")
    por_pagina: int = Field(20, description="Resultados por página")
    candidatos: List[CandidatoReclutadorView]



class DebilidadResponse(BaseModel):
    """
    Respuesta simplificada para
    GET /usuario/{id}/debilidades
    """

    categoria_slug: str
    categoria_nombre: str
    tipo_error: str

    descripcion: Optional[str] = None

    veces_fallada: int = 0
    impacto: float = 0.0

    requiere_practica: bool = True

    class Config:
        from_attributes = True



class FortalezaResponse(BaseModel):
    """
    Respuesta simplificada para
    GET /usuario/{id}/fortalezas
    """

    categoria_slug: str
    categoria_nombre: str
    tipo_error: str

    descripcion: Optional[str] = None

    veces_demostrada: int = 0
    confianza: float = 0.0

    class Config:
        from_attributes = True



# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /reclutador/candidato/{id}
# ──────────────────────────────────────────────────────────────

class FortalezaDetalleResponse(BaseModel):
    categoria: str
    veces_demostrada: int
    confianza: float


class DebilidadDetalleResponse(BaseModel):
    categoria: str
    tipo: str
    veces_fallada: int
    impacto: float
    requiere_practica: bool


class HistorialSesionResponse(BaseModel):
    sesion_id: str
    tecnologia: str
    fecha: Optional[datetime] = None

    estado: str
    fue_adaptativa: bool = False

    puntaje_total: Optional[float] = None
    nivel_candidato: Optional[str] = None
    apto: Optional[bool] = None


class CandidatoDetalleResponse(BaseModel):
    """
    Perfil completo mostrado al reclutador.
    """

    usuario_id: UUID

    # Scores históricos
    score_global: float = 0
    score_javascript: float = 0
    score_arquitectura: float = 0
    score_buenas_practicas: float = 0
    score_comunicacion: float = 0
    score_resolucion: float = 0

    consistencia: float = 0
    tendencia: str = "estable"
    nivel_actual: Optional[str] = None

    # Fortalezas y debilidades
    fortalezas: List[FortalezaDetalleResponse] = Field(default_factory=list)
    debilidades: List[DebilidadDetalleResponse] = Field(default_factory=list)

    # Historial
    historial_sesiones: List[HistorialSesionResponse] = Field(default_factory=list)

    total_sesiones: int = 0
    sesiones_completadas: int = 0

    class Config:
        from_attributes = True