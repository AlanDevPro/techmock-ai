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


# -----------------------------
# 🔥 CALIFICACIÓN GENERAL
# -----------------------------
class CalificacionGeneral(BaseModel):
    nivel: str = Field(
        description="Nivel del código: Excelente | Bueno | Regular | Deficiente | Crítico"
    )
    puntaje: int = Field(
        description="Puntaje del 0 al 100"
    )
    resumen: str = Field(
        description="Resumen ejecutivo del análisis con tono profesional y constructivo"
    )


# -----------------------------
# 🔥 ERROR DETECTADO
# -----------------------------
class ErrorDetectado(BaseModel):
    tipo: str = Field(
        description="Categoría del error: Sintaxis | Lógica | Performance | Seguridad | Arquitectura | Estilo"
    )
    descripcion: str = Field(
        description="Descripción clara del error encontrado"
    )
    impacto: Literal["alto", "medio", "bajo"] = Field(
        description="Nivel de impacto del error"
    )
    linea_aproximada: Optional[str] = Field(
        default=None,
        description="Línea o sección aproximada donde ocurre el error"
    )


# -----------------------------
# 🔥 RECOMENDACIÓN PRO
# -----------------------------
class RecomendacionItem(BaseModel):
    mensaje: str = Field(
        description="Problema detectado o área de mejora"
    )
    solucion: str = Field(
        description="Solución concreta con ejemplo de código si aplica"
    )
    prioridad: Literal["alta", "media", "baja"] = Field(
        description="Prioridad de implementación"
    )


# -----------------------------
# 🔥 EVALUACIÓN TÉCNICA
# -----------------------------
class EvaluacionTecnica(BaseModel):
    manejo_estado: str = Field(
        description="Evaluación del manejo de estado y reactividad"
    )
    legibilidad: str = Field(
        description="Claridad, nomenclatura y estructura del código"
    )
    arquitectura: str = Field(
        description="Organización de componentes y separación de responsabilidades"
    )
    performance: str = Field(
        description="Optimización, renders innecesarios, memory leaks, etc."
    )


# -----------------------------
# 🔥 RESPUESTA ANÁLISIS PRO
# -----------------------------
class RespuestaAnalisisCodigo(BaseModel):
    calificacion_general: CalificacionGeneral = Field(
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
        description="Evaluación técnica por dimensiones clave"
    )