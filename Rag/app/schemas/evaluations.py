from pydantic import BaseModel, Field
from typing import Optional

class RespuestaEvaluacion(BaseModel):
    pregunta_practica: str = Field(description="Enunciado situacional de la prueba técnica solicitando al candidato desarrollar código para su resolución.")
    comprension_a_evaluar: str = Field(description="Aspecto técnico y práctico preciso a validar orgánicamente mediante la resolución enviada por el usuario.")
    explicacion_codigo_esperado: str = Field(description="Explicación argumentativa fusionada con el fragmento de código óptimo o ideal aplicable a la resolución del problema planteado.")
    error_por_falta_de_contexto: Optional[str] = Field(
        default=None, 
        description="Razonamiento de error provisto estrictamente en caso de carencia de fundamento en el contexto documental."
    )
