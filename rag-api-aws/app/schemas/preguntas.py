"""
app/schemas/preguntas.py

Schemas Pydantic para los endpoints de generación de preguntas.
Cubre:
  - GET /preguntas/generar/{framework}
  - GET /preguntas/iniciar-sesion/{framework}
  - GET /sesion/{id}/pregunta
"""

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────
# REQUEST
# ──────────────────────────────────────────────────────────────

class SolicitudSesionAdaptativa(BaseModel):
    """
    Body opcional para iniciar una sesión adaptativa.
    Permite al cliente indicar de qué sesión anterior tomar errores.
    """

    usuario_id: UUID = Field(..., description="UUID del usuario autenticado")
    tecnologia_slug: str = Field(
        ..., description="Slug de la tecnología (ej. 'vue', 'react', 'nextjs')"
    )
    nivel_slug: Optional[str] = Field(
        None, description="Slug del nivel de dificultad (ej. 'junior', 'senior')"
    )
    sesion_anterior_id: Optional[UUID] = Field(
        None,
        description=(
            "UUID de la sesión previa. Si se omite, el sistema busca "
            "automáticamente la última sesión completada del usuario."
        ),
    )

    class Config:
        json_schema_extra = {
            "example": {
                "usuario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "tecnologia_slug": "vue",
                "nivel_slug": "junior",
                "sesion_anterior_id": None,
            }
        }


# ──────────────────────────────────────────────────────────────
# RESPONSE: /preguntas/generar/{framework}
# ──────────────────────────────────────────────────────────────

class RespuestaPregunta(BaseModel):
    """
    Respuesta al generar una pregunta técnica (estándar o adaptativa).

    Incluye el enunciado, contexto teórico recuperado por RAG y
    metadata de trazabilidad para el sistema adaptativo.
    """

    # ── Metadata de sesión ──────────────────────────────────────
    sesion_id: Optional[UUID] = Field(
        None, description="UUID de la sesión creada (presente si se proporcionó usuario_id)"
    )
    pregunta_id: Optional[int] = Field(
        None, description="ID de la pregunta persistida en base de datos"
    )

    # ── Contexto del ejercicio ─────────────────────────────────
    framework: str = Field(..., description="Framework evaluado (ej. Vue.js, React)")
    nivel: str = Field("junior", description="Slug del nivel de dificultad")

    # ── Contenido ─────────────────────────────────────────────
    pregunta_practica: str = Field(..., description="Enunciado principal de la pregunta técnica")
    contexto_teorico: Optional[str] = Field(
        None, description="Conceptos teóricos relevantes recuperados por RAG"
    )
    criterios_evaluacion: List[str] = Field(
        default_factory=list, description="Criterios que se evaluarán en la respuesta"
    )
    tiempo_estimado_minutos: int = Field(
        30, description="Tiempo sugerido en minutos para resolver el ejercicio"
    )

    # ── Sistema adaptativo ─────────────────────────────────────
    fue_adaptativa: bool = Field(
        False,
        description="True si la pregunta fue generada en base a errores previos del usuario",
    )
    categorias_error_objetivo: List[str] = Field(
        default_factory=list,
        description=(
            "Slugs de las categorías de error que esta pregunta evalúa/refuerza. "
            "Ej: ['async_await', 'manejo_estado']"
        ),
    )

    # ── Metadata RAG ───────────────────────────────────────────
    rag_used: bool = Field(False, description="Indica si RAG encontró contexto relevante")
    fuentes_rag: List[str] = Field(
        default_factory=list, description="Nombres de las fuentes usadas por RAG"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "sesion_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "pregunta_id": 42,
                "framework": "Vue.js",
                "nivel": "junior",
                "pregunta_practica": (
                    "Crea un componente Vue 3 con Composition API que muestre "
                    "una lista de tareas con la posibilidad de marcarlas como completadas."
                ),
                "contexto_teorico": (
                    "En Vue 3, la Composition API permite organizar la lógica "
                    "por funcionalidad usando ref() y reactive()..."
                ),
                "criterios_evaluacion": [
                    "Uso correcto de ref/reactive",
                    "Manejo de eventos con emit",
                    "Separación de responsabilidades",
                ],
                "tiempo_estimado_minutos": 30,
                "fue_adaptativa": True,
                "categorias_error_objetivo": ["async_await", "consumo_apis"],
                "rag_used": True,
                "fuentes_rag": ["vue3-composition-api.md"],
            }
        }


# ──────────────────────────────────────────────────────────────
# RESPONSE: /preguntas/iniciar-sesion/{framework}
# ──────────────────────────────────────────────────────────────

class SesionIniciadaResponse(BaseModel):
    """
    Confirmación de que la sesión fue creada junto con la primera pregunta.
    Extiende RespuestaPregunta con datos adicionales de la sesión.
    """

    sesion_id: UUID = Field(..., description="UUID de la sesión recién creada")
    pregunta_id: int = Field(..., description="ID de la pregunta asignada a la sesión")
    tecnologia_id: int = Field(..., description="ID de la tecnología de la sesión")
    nivel_id: int = Field(..., description="ID del nivel de dificultad")
    tiempo_limite_segundos: int = Field(
        3600, description="Límite de tiempo total de la sesión en segundos"
    )
    fue_adaptativa: bool = Field(
        False, description="Indica si la sesión usa una pregunta adaptativa"
    )
    sesion_anterior_id: Optional[UUID] = Field(
        None, description="UUID de la sesión anterior usada para la adaptación"
    )

    # Contenido de la pregunta (inline para evitar un segundo request)
    pregunta_practica: str = Field(..., description="Enunciado de la pregunta asignada")
    criterios_evaluacion: List[str] = Field(default_factory=list)
    tiempo_estimado_minutos: int = Field(30)
    categorias_error_objetivo: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "sesion_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "pregunta_id": 42,
                "tecnologia_id": 1,
                "nivel_id": 2,
                "tiempo_limite_segundos": 3600,
                "fue_adaptativa": False,
                "sesion_anterior_id": None,
                "pregunta_practica": "Implementa un hook personalizado useDebounce en React...",
                "criterios_evaluacion": ["Uso correcto de useEffect", "Limpieza del timer"],
                "tiempo_estimado_minutos": 30,
                "categorias_error_objetivo": [],
            }
        }