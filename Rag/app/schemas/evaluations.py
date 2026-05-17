from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# -----------------------------
# 🔹 RESPUESTA ENTREVISTA
# -----------------------------
class RespuestaEvaluacion(BaseModel):
    pregunta_practica: Optional[str] = Field(
        default="",
        description="Enunciado de la prueba técnica"
    )
    comprension_a_evaluar: Optional[str] = Field(
        default="",
        description="Concepto técnico evaluado"
    )
    explicacion_codigo_esperado: Optional[str] = Field(
        default="",
        description="Explicación con código ideal"
    )
    error_por_falta_de_contexto: Optional[str] = Field(
        default=None,
        description="Error por falta de contexto"
    )
    sesion_id: Optional[str] = Field(
        default=None,
        description="UUID de la sesión de entrevista creada (si el usuario está autenticado)"
    )


# -----------------------------
# 🔥 CALIFICACIÓN GENERAL
# -----------------------------
class CalificacionGeneral(BaseModel):
    nivel: str = Field(
        default="Regular",
        description="Nivel del código: Excelente | Bueno | Regular | Deficiente | Crítico"
    )
    puntaje: int = Field(
        default=50,
        ge=0,
        le=100,
        description="Puntaje del 0 al 100"
    )
    resumen: str = Field(
        default="Sin resumen disponible.",
        description="Resumen ejecutivo del análisis con tono profesional y constructivo"
    )


# -----------------------------
# 🔥 ERROR DETECTADO
# -----------------------------
class ErrorDetectado(BaseModel):
    tipo: str = Field(
        default="general",
        description="Categoría del error: Sintaxis | Lógica | Performance | Seguridad | Arquitectura | Estilo"
    )
    descripcion: str = Field(
        default="",
        description="Descripción clara del error encontrado"
    )
    impacto: Literal["alto", "medio", "bajo"] = Field(
        default="medio",
        description="Nivel de impacto del error"
    )
    linea_aproximada: Optional[str] = Field(
        default=None,
        description="Línea o sección aproximada donde ocurre el error"
    )


# -----------------------------
# 🔥 RECOMENDACIÓN
# ✅ MEJORA: defaults seguros para todos los campos,
#    ya que el LLM puede omitir o renombrar claves.
# -----------------------------
class RecomendacionItem(BaseModel):
    mensaje: str = Field(
        default="",
        description="Problema detectado o área de mejora"
    )
    solucion: str = Field(
        default="",
        description="Solución concreta con ejemplo de código si aplica"
    )
    prioridad: Literal["alta", "media", "baja"] = Field(
        default="media",
        description="Prioridad de implementación"
    )


# -----------------------------
# 🔥 EVALUACIÓN TÉCNICA
# ✅ MEJORA: defaults seguros en cada dimensión
# -----------------------------
class EvaluacionTecnica(BaseModel):
    manejo_estado: str = Field(
        default="No evaluado.",
        description="Evaluación del manejo de estado y reactividad"
    )
    legibilidad: str = Field(
        default="No evaluado.",
        description="Claridad, nomenclatura y estructura del código"
    )
    arquitectura: str = Field(
        default="No evaluado.",
        description="Organización de componentes y separación de responsabilidades"
    )
    performance: str = Field(
        default="No evaluado.",
        description="Optimización, renders innecesarios, memory leaks, etc."
    )


# -----------------------------
# 🔥 RESPUESTA ANÁLISIS PRO
# ✅ MEJORA: default_factory en todas las listas
#    para garantizar que nunca lleguen como None al frontend
# -----------------------------
class RespuestaAnalisisCodigo(BaseModel):
    calificacion_general: CalificacionGeneral = Field(
        default_factory=CalificacionGeneral,
        description="Calificación global del código analizado"
    )
    errores: List[ErrorDetectado] = Field(
        default_factory=list,
        description="Lista detallada de errores encontrados"
    )
    buenas_practicas: List[str] = Field(
        default_factory=list,
        description="Prácticas positivas identificadas en el código"
    )
    malas_practicas: List[str] = Field(
        default_factory=list,
        description="Antipatrones o malas prácticas detectadas"
    )
    recomendaciones: List[RecomendacionItem] = Field(
        default_factory=list,
        description="Recomendaciones accionables con prioridad"
    )
    evaluacion_tecnica: EvaluacionTecnica = Field(
        default_factory=EvaluacionTecnica,
        description="Evaluación técnica por dimensiones clave"
    )