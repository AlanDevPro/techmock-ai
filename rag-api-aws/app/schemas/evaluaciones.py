"""
app/schemas/evaluaciones.py

Schemas Pydantic para los endpoints de evaluación de código.
Cubre:
  - POST /codigo/analizar
  - POST /codigo/borrador
  - GET  /sesion/{id}/resultado
  - GET  /sesion/{id}/analisis
"""

from typing import Dict, List, Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, validator


# ──────────────────────────────────────────────────────────────
# SUB-SCHEMAS (bloques reutilizables)
# ──────────────────────────────────────────────────────────────

class CalificacionGeneral(BaseModel):
    """Resumen ejecutivo del desempeño en la sesión."""

    nivel: str = Field(
        ...,
        description="Clasificación cualitativa: Excelente / Bueno / Regular / Deficiente / Crítico",
    )
    puntaje: int = Field(..., ge=0, le=100, description="Puntaje global de 0 a 100")
    resumen: str = Field(..., description="Párrafo narrativo de la evaluación general")

    # Campos opcionales — solo presentes en evaluaciones finales
    nivel_candidato: Optional[str] = Field(
        None,
        description="descartado / revisar / promisorio / recomendado / destacado",
        pattern="^(descartado|revisar|promisorio|recomendado|destacado)$",
    )
    apto_para_contratacion: Optional[bool] = Field(
        None,
        description="Flag directo para el reclutador. Solo presente en evaluaciones finales.",
    )
    resumen_para_reclutador: Optional[str] = Field(
        None,
        description="Resumen ejecutivo pensado para el reclutador/admin. Solo en evaluaciones finales.",
    )


class ErrorDetectado(BaseModel):
    """
    Error identificado por la IA en el código del candidato.
    Corresponde conceptualmente a una fila en `errores_detectados`.
    """

    tipo: str = Field(
        ..., description="Slug de la categoría del error (ej. 'async_await', 'manejo_estado')"
    )
    descripcion: str = Field(..., description="Descripción específica del error en este código")
    impacto: str = Field(
        ...,
        description="Severidad del error",
        pattern="^(alto|medio|bajo|critico)$",
    )
    es_error_conceptual: bool = Field(
        False,
        description=(
            "True si es un error de fundamentos (grave). "
            "False si es error de práctica/experiencia (mejorable)."
        ),
    )
    linea_aproximada: Optional[int] = Field(
        None, description="Línea aproximada del código donde ocurre el error"
    )
    fragmento_codigo: Optional[str] = Field(
        None, description="Fragmento exacto del código con el problema"
    )
    codigo_corregido: Optional[str] = Field(
        None, description="Cómo debería haberse escrito ese fragmento"
    )
    explicacion_ia: Optional[str] = Field(
        None, description="Explicación de la IA sobre por qué es un error"
    )


class Recomendacion(BaseModel):
    """
    Sugerencia concreta de mejora.
    Corresponde a una fila en `recomendaciones_solucion`.
    """

    tipo: str = Field(
        "concepto",
        description="Tipo de recomendación: codigo / concepto / recurso / patron",
        pattern="^(codigo|concepto|recurso|patron)$",
    )
    titulo: str = Field(..., description="Título / mensaje corto de la recomendación")
    descripcion: str = Field(..., description="Descripción detallada de cómo resolverlo")
    prioridad: str = Field(
        "media",
        description="Urgencia: alta / media / baja",
        pattern="^(alta|media|baja)$",
    )
    codigo_ejemplo: Optional[str] = Field(
        None, description="Ejemplo de código correcto (solo para tipo='codigo')"
    )
    recurso_url: Optional[str] = Field(
        None, description="URL de documentación o artículo (solo para tipo='recurso')"
    )
    recurso_titulo: Optional[str] = Field(
        None, description="Título del recurso externo"
    )
    categoria_error_slug: Optional[str] = Field(
        None,
        description="Slug de la categoría de error que motivó esta recomendación",
    )


class EvaluacionTecnica(BaseModel):
    """
    Feedback narrativo por cada pilar técnico evaluado.
    Los valores numéricos (scores) viven en `PilaresScore`.
    """

    manejo_estado: str = Field("No evaluado", description="Feedback sobre gestión de estado")
    legibilidad: str = Field("No evaluado", description="Feedback sobre legibilidad del código")
    arquitectura: str = Field("No evaluado", description="Feedback sobre arquitectura y estructura")
    performance: str = Field("No evaluado", description="Feedback sobre rendimiento")
    comunicacion: str = Field(
        "No evaluado",
        description="Feedback sobre cómo el candidato explicó su proceso",
    )


class PilaresScore(BaseModel):
    """
    Puntajes numéricos (0-100) por pilar técnico.
    Corresponde a los campos `puntaje_*` de la tabla `evaluaciones`.
    """

    javascript: Optional[float] = Field(None, ge=0, le=100, description="Dominio del lenguaje base")
    arquitectura: Optional[float] = Field(
        None, ge=0, le=100, description="Estructura de componentes y separación de responsabilidades"
    )
    buenas_practicas: Optional[float] = Field(
        None, ge=0, le=100, description="Clean code, naming, inmutabilidad"
    )
    comunicacion: Optional[float] = Field(
        None, ge=0, le=100, description="Pensamiento en voz alta y claridad"
    )
    resolucion: Optional[float] = Field(
        None, ge=0, le=100, description="Manejo del bloqueo y uso de documentación"
    )


class DetalleRubrica(BaseModel):
    """
    Puntaje por rúbrica individual, proveniente de la tabla `detalle_evaluacion`.
    """

    rubrica: str = Field(..., description="Nombre de la rúbrica evaluada")
    puntaje: float = Field(..., ge=0, le=100, description="Puntaje obtenido en esta rúbrica")
    comentario: Optional[str] = Field(None, description="Comentario específico de la rúbrica")


class RecomendacionSolucion(Recomendacion):
    """
    Alias explícito de Recomendacion con el id de evaluacion_id incluido.
    Útil cuando se serializa la evaluacion completa desde la BD.
    """

    evaluacion_id: Optional[int] = Field(None, description="ID de la evaluación asociada")
    orden: int = Field(0, description="Orden de presentación al candidato")


# ──────────────────────────────────────────────────────────────
# REQUEST: POST /codigo/analizar
# ──────────────────────────────────────────────────────────────

class SolicitudFinalizarCodigo(BaseModel):
    """Schema validado para POST /codigo/finalizar"""
    
    sesion_id: str = Field(..., description="UUID de la sesión")
    codigo: str = Field(..., min_length=1, description="Código fuente a evaluar")
    lenguaje: str = Field(default="general", description="Framework/lenguaje usado")
    motivo_cierre: Literal["enviado", "tiempo_agotado"] = Field(
        default="enviado", 
        description="Motivo del cierre"
    )
    active_file: Optional[str] = Field(None, description="Archivo activo en el IDE")
    files: Optional[Dict[str, str]] = Field(None, description="Mapa de archivos del proyecto")
    
    @validator('lenguaje', pre=True, always=True)
    def normalize_lenguaje(cls, v):
        """Normaliza y valida el nombre del lenguaje/framework"""
        if not v:
            return "general"
        
        # Mapeo de valores comunes (consistente con FRAMEWORK_MAP del router)
        mapping = {
            # Vue
            "vue": "Vue.js",
            "vuejs": "Vue.js",
            "vue.js": "Vue.js",
            # Next
            "next": "Next.js",
            "nextjs": "Next.js",
            "next.js": "Next.js",
            # React
            "react": "React",
            "reactjs": "React",
            "react.js": "React",
            # JavaScript
            "javascript": "JavaScript",
            "js": "JavaScript",
            # TypeScript
            "typescript": "TypeScript",
            "ts": "TypeScript",
            # CSS
            "css": "CSS",
            # Node
            "nodejs": "Node.js",
            "node": "Node.js",
        }
        
        normalized = mapping.get(v.strip().lower(), v.strip())
        
        # Validar que el resultado sea uno de los permitidos
        allowed = ["Vue.js", "Next.js", "React", "JavaScript", "TypeScript", "CSS", "Node.js", "general"]
        if normalized not in allowed:
            # Log de advertencia pero no fallar, usar default
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Framework no reconocido: '{v}', usando 'general'")
            return "general"
        
        return normalized
    
    @validator('sesion_id')
    def validate_sesion_id(cls, v):
        """Valida que el sesion_id sea un UUID válido"""
        if not v:
            raise ValueError("sesion_id es requerido")
        
        try:
            UUID(v)
        except ValueError:
            raise ValueError(f"sesion_id debe ser un UUID válido, recibido: {v}")
        
        return v
    
    @validator('codigo')
    def validate_codigo(cls, v):
        """Valida que el código no esté vacío"""
        if not v or not v.strip():
            raise ValueError("codigo no puede estar vacío")
        
        # Limitar longitud (opcional)
        max_length = 100000  # 100KB
        if len(v) > max_length:
            raise ValueError(f"codigo excede el límite de {max_length} caracteres")
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "sesion_id": "cfc38d58-ea7a-4966-a125-42e990c5cbc9",
                "codigo": "console.log('Hello World');",
                "lenguaje": "javascript",
                "motivo_cierre": "enviado",
                "active_file": "main.js",
                "files": {
                    "main.js": "console.log('Hello');",
                    "utils.js": "export const add = (a,b) => a+b;"
                }
            }
        }


# ──────────────────────────────────────────────────────────────
# RESPONSE: POST /codigo/analizar  |  GET /sesion/{id}/resultado
# ──────────────────────────────────────────────────────────────

class RespuestaAnalisisCodigo(BaseModel):
    """
    Respuesta completa del análisis de código.
    Incluye calificación, errores, recomendaciones y scores por pilar.
    """

    # ── Clasificación global ───────────────────────────────────
    calificacion_general: CalificacionGeneral

    # ── Pilares numéricos (para gráficas en el frontend) ──────
    pilares: PilaresScore = Field(default_factory=PilaresScore)

    # ── Feedback narrativo por pilar ───────────────────────────
    evaluacion_tecnica: EvaluacionTecnica = Field(default_factory=EvaluacionTecnica)

    # ── Errores y prácticas ────────────────────────────────────
    errores: List[ErrorDetectado] = Field(
        default_factory=list,
        description="Errores detectados por la IA en el código",
    )
    buenas_practicas: List[str] = Field(
        default_factory=list, description="Prácticas correctas identificadas"
    )
    malas_practicas: List[str] = Field(
        default_factory=list, description="Prácticas incorrectas o mejorables"
    )

    # ── Recomendaciones de mejora ──────────────────────────────
    recomendaciones: List[Recomendacion] = Field(default_factory=list)

    # ── Feedback narrativo adicional ───────────────────────────
    fortalezas: Optional[str] = Field(None, description="Párrafo sobre lo que hizo bien")
    areas_mejora: Optional[str] = Field(None, description="Párrafo sobre lo que debe mejorar")

    # ── Detalle por rúbrica (tabla detalle_evaluacion) ─────────
    detalle_rubricas: List[DetalleRubrica] = Field(
        default_factory=list,
        description="Puntaje desglosado por rúbrica individual",
    )

    # ── Metadata RAG ───────────────────────────────────────────
    rag_used: bool = Field(False, description="Si RAG aportó contexto de buenas prácticas")
    fuentes_rag: List[str] = Field(
        default_factory=list, description="Fuentes RAG consultadas"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "calificacion_general": {
                    "nivel": "Bueno",
                    "puntaje": 78,
                    "resumen": "El código cumple con los requisitos básicos pero carece de manejo de errores.",
                    "nivel_candidato": None,
                    "apto_para_contratacion": None,
                    "resumen_para_reclutador": None,
                },
                "pilares": {
                    "javascript": 80.0,
                    "arquitectura": 70.0,
                    "buenas_practicas": 75.0,
                    "comunicacion": 85.0,
                    "resolucion": 78.0,
                },
                "evaluacion_tecnica": {
                    "manejo_estado": "Correcto uso de reactive()",
                    "legibilidad": "Código claro y bien comentado",
                    "arquitectura": "Separación de responsabilidades mejorable",
                    "performance": "Sin optimizaciones de memo",
                    "comunicacion": "Explicó bien su proceso de pensamiento",
                },
                "errores": [
                    {
                        "tipo": "async_await",
                        "descripcion": "Falta manejo de errores en llamadas async",
                        "impacto": "alto",
                        "es_error_conceptual": False,
                        "linea_aproximada": 14,
                        "fragmento_codigo": "const data = await fetchData()",
                        "codigo_corregido": "try { const data = await fetchData() } catch(e) { ... }",
                        "explicacion_ia": "Las llamadas async sin try/catch pueden romper la UI silenciosamente.",
                    }
                ],
                "buenas_practicas": ["Uso correcto de Composition API", "Nombres descriptivos"],
                "malas_practicas": ["Falta manejo de errores en llamadas async"],
                "recomendaciones": [
                    {
                        "tipo": "codigo",
                        "titulo": "Agregar manejo de errores",
                        "descripcion": "Envolver todas las llamadas async en bloques try/catch.",
                        "prioridad": "alta",
                        "codigo_ejemplo": "try { await fetchData() } catch (err) { handleError(err) }",
                        "recurso_url": None,
                        "recurso_titulo": None,
                        "categoria_error_slug": "async_await",
                    }
                ],
                "fortalezas": "Demostró dominio de la Composition API y buen naming.",
                "areas_mejora": "Debe incorporar manejo de errores y tests unitarios.",
                "detalle_rubricas": [],
                "rag_used": True,
                "fuentes_rag": ["vue3-best-practices.md"],
            }
        }


# ──────────────────────────────────────────────────────────────
# RESPONSE: POST /codigo/borrador  (autosave del IDE)
# ──────────────────────────────────────────────────────────────

class RespuestaAutosave(BaseModel):
    """
    Respuesta estándar para el endpoint de autosave.
    No bloquea el IDE — siempre retorna ok=True o ok=False.
    """

    ok: bool = Field(..., description="Indica si el guardado fue exitoso.")
    detail: Optional[str] = Field(
        None, description="Mensaje opcional de error o información adicional."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "ok": True,
                "detail": None,
            }
        }


# ──────────────────────────────────────────────────────────────
# RESPONSE: GET /sesion/{id}/analisis  (análisis parcial/borrador)
# ──────────────────────────────────────────────────────────────

class RespuestaAnalisisBorrador(BaseModel):
    """
    Feedback parcial mientras la sesión sigue en progreso.
    No incluye clasificación final ni resumen para reclutador.
    """

    sesion_id: UUID = Field(..., description="UUID de la sesión en progreso")
    errores: List[ErrorDetectado] = Field(default_factory=list)
    buenas_practicas: List[str] = Field(default_factory=list)
    malas_practicas: List[str] = Field(default_factory=list)
    sugerencias_inmediatas: List[str] = Field(
        default_factory=list,
        description="Hints rápidos para el candidato sin revelar la solución",
    )
    rag_used: bool = False
    fuentes_rag: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "sesion_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "errores": [],
                "buenas_practicas": ["Tipado correcto con TypeScript"],
                "malas_practicas": ["Mutación directa del estado"],
                "sugerencias_inmediatas": [
                    "Revisa cómo manejas la inmutabilidad en el array de tareas."
                ],
                "rag_used": False,
                "fuentes_rag": [],
            }
        }


class SolicitudFinalizarCodigo(BaseModel):
    sesion_id:     str
    codigo:        str
    lenguaje:      str
    motivo_cierre: Literal["enviado", "tiempo_agotado"] = "enviado"
    active_file:   Optional[str] = None
    files:         Optional[dict[str, str]] = None