from pydantic import BaseModel, Field
from typing import Optional, List


class RespuestaEvaluacion(BaseModel):
    pregunta_practica: Optional[str] = Field(default="")
    comprension_a_evaluar: Optional[str] = Field(default="")
    explicacion_codigo_esperado: Optional[str] = Field(default="")
    error_por_falta_de_contexto: Optional[str] = Field(default=None)


# 🔥 SCHEMA PRO PARA ANÁLISIS DE CÓDIGO
class RespuestaAnalisisCodigo(BaseModel):
    calidad_codigo: str = Field(
        description="Evaluación general del código"
    )
    errores_detectados: List[str] = Field(
        default_factory=list,
        description="Lista de errores detectados"
    )
    buenas_practicas: List[str] = Field(
        default_factory=list,
        description="Buenas prácticas aplicadas"
    )
    recomendaciones: List[str] = Field(
        default_factory=list,
        description="Sugerencias de mejora"
    )