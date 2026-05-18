"""
app/schemas/reportes.py

DTOs de solo lectura para reportes.
NUNCA devuelven ORM directo — solo Pydantic serializado.
Correlacionados con: evaluaciones, errores_detectados, recomendaciones_solucion,
sesiones_entrevista, tecnologias, niveles_dificultad
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
from uuid import UUID
from datetime import datetime


# ================================================================
# 🔹 TECNOLOGÍA (anidado liviano)
# ================================================================
class TecnologiaResumen(BaseModel):
    """Resumen de tecnología para respuestas anidadas"""
    id: int
    nombre: str
    slug: str
    icono_url: Optional[str] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 NIVEL DIFICULTAD (anidado liviano)
# ================================================================
class NivelResumen(BaseModel):
    """Resumen de nivel de dificultad"""
    id: int
    nombre: str
    orden: int

    class Config:
        from_attributes = True


# ================================================================
# 🔹 USUARIO (resumen para reportes)
# ================================================================
class UsuarioResumen(BaseModel):
    """Resumen de usuario para reportes"""
    id: UUID
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 PREGUNTA (resumen)
# ================================================================
class PreguntaResumen(BaseModel):
    """Resumen de pregunta para reportes"""
    id: int
    titulo: str
    enunciado: str
    nivel_id: Optional[int] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 ERROR DETECTADO
# Tabla: errores_detectados + join categoria_error
# ================================================================
class ErrorResponse(BaseModel):
    """Error detectado en una sesión"""
    id: int
    descripcion: str
    severidad: Literal["bajo", "medio", "alto", "critico"] = "medio"
    es_error_conceptual: bool = False
    linea_codigo: Optional[int] = None
    fragmento_codigo: Optional[str] = None
    codigo_corregido: Optional[str] = None
    explicacion_ia: Optional[str] = None
    # Nombre de la categoría (join con categorias_error)
    categoria_nombre: Optional[str] = Field(default=None, alias="categoria_nombre")

    class Config:
        from_attributes = True
        populate_by_name = True


# ================================================================
# 🔹 RECOMENDACIÓN
# Tabla: recomendaciones_solucion (relacionada con evaluacion_id)
# ================================================================
class RecomendacionResponse(BaseModel):
    """Recomendación de mejora"""
    id: int
    tipo: Literal["codigo", "concepto", "recurso", "patron", "mejora"] = "mejora"
    titulo: str
    descripcion: str
    codigo_ejemplo: Optional[str] = None
    recurso_url: Optional[str] = None
    recurso_titulo: Optional[str] = None
    prioridad: Literal["alta", "media", "baja"] = "media"
    orden: int = 0

    class Config:
        from_attributes = True


# ================================================================
# 🔹 DETALLE DE RÚBRICA
# Tabla: detalle_evaluacion (join con rubricas)
# ================================================================
class DetalleRubricaResponse(BaseModel):
    """Detalle de evaluación por rúbrica"""
    rubrica_nombre: Optional[str] = None
    puntaje: float
    comentario: Optional[str] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 EVALUACIÓN COMPLETA
# Tabla: evaluaciones + detalles
# ================================================================
class EvaluacionResponse(BaseModel):
    """Evaluación completa de una sesión"""
    id: int
    puntaje_total: Optional[float] = None

    # Desglose técnico
    puntaje_javascript: Optional[float] = None
    puntaje_arquitectura: Optional[float] = None
    puntaje_buenas_practicas: Optional[float] = None
    puntaje_comunicacion: Optional[float] = None
    puntaje_resolucion: Optional[float] = None

    # Clasificación
    nivel_candidato: Optional[
        Literal["descartado", "revisar", "promisorio", "recomendado", "destacado"]
    ] = None
    apto_para_contratacion: Optional[bool] = None

    # Feedback cualitativo
    feedback_general: Optional[str] = None
    resumen_para_reclutador: Optional[str] = None
    fortalezas: Optional[str] = None
    areas_mejora: Optional[str] = None
    sugerencias_recursos: Optional[str] = None

    # Metadatos IA
    generado_por_ia: bool = True
    modelo_ia_usado: Optional[str] = None
    fecha_evaluacion: Optional[datetime] = None

    # Detalle rúbricas (opcional, para vista detallada) - ✅ USAR default_factory
    detalles_rubrica: List[DetalleRubricaResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ================================================================
# 🔹 ENVÍO DE CÓDIGO (resumen)
# ================================================================
class EnvioCodigoResumen(BaseModel):
    """Resumen de envío de código"""
    id: int
    lenguaje: Optional[str] = None
    codigo_preview: Optional[str] = None
    fecha_envio: Optional[datetime] = None
    es_envio_final: bool = False

    class Config:
        from_attributes = True


# ================================================================
# 🔹 MENSAJE DE CONVERSACIÓN (resumen)
# ================================================================
class MensajeResumen(BaseModel):
    """Resumen de mensaje en conversación"""
    id: int
    rol: str  # "system", "assistant", "user"
    contenido: str
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 REPORTE COMPLETO DE SESIÓN
# Tabla principal: sesiones_entrevista + todas las relaciones
# ================================================================
class ReporteSesionResponse(BaseModel):
    """
    Reporte completo de una sesión.
    Incluye todas las relaciones cargadas por get_reporte_completo_sesion()
    """
    # Datos de sesión
    id: UUID
    estado: str
    fue_adaptativa: bool = False
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    duracion_segundos: Optional[int] = None
    ip_usuario: Optional[str] = None
    user_agent: Optional[str] = None

    # Relaciones anidadas - ✅ USAR default_factory para listas
    usuario: Optional[UsuarioResumen] = None
    tecnologia: Optional[TecnologiaResumen] = None
    nivel: Optional[NivelResumen] = None
    pregunta: Optional[PreguntaResumen] = None
    
    # Listas con default_factory (evita mutable default)
    mensajes: List[MensajeResumen] = Field(default_factory=list)
    envios: List[EnvioCodigoResumen] = Field(default_factory=list)
    errores_detectados: List[ErrorResponse] = Field(default_factory=list)
    evaluacion: Optional[EvaluacionResponse] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 RESUMEN LIVIANO (para listados / dashboard)
# ================================================================
class ReporteSesionResumen(BaseModel):
    """
    Resumen liviano de sesión para listados.
    Aplana datos de evaluación para evitar N+1 en frontend.
    """
    id: UUID
    estado: str
    fue_adaptativa: bool = False
    fecha_inicio: Optional[datetime] = None
    duracion_segundos: Optional[int] = None
    
    # Relaciones resumidas
    tecnologia: Optional[TecnologiaResumen] = None
    nivel: Optional[NivelResumen] = None

    # Datos de evaluacion aplanados (evita N+1 en listados)
    puntaje_total: Optional[float] = None
    nivel_candidato: Optional[str] = None
    apto_para_contratacion: Optional[bool] = None

    class Config:
        from_attributes = True


# ================================================================
# 🔹 PERFIL TÉCNICO DE DEVELOPER
# ================================================================
class FortalezaDebilidadItem(BaseModel):
    """Item de fortaleza o debilidad"""
    categoria_id: int
    nombre: str
    tipo: Optional[str] = None

    class Config:
        from_attributes = True


class PerfilTecnicoResponse(BaseModel):
    """Perfil técnico completo de un developer"""
    usuario_id: UUID
    nivel_actual: Optional[str] = None
    score_global: float = 0.0
    sesiones_completadas: int = 0
    evaluacion_promedio: float = 0.0
    
    mejor_tecnologia: Optional[TecnologiaResumen] = None
    peor_tecnologia: Optional[TecnologiaResumen] = None
    
    # Listas con default_factory
    fortalezas: List[FortalezaDebilidadItem] = Field(default_factory=list)
    debilidades: List[FortalezaDebilidadItem] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ================================================================
# 🔹 MÉTRICAS ANALÍTICAS (sin ORM, construido en analytics_service)
# ================================================================
class MetricasSesionResponse(BaseModel):
    """Métricas agregadas de una sesión"""
    sesion_id: str
    puntaje_total: float
    nivel: str
    total_errores: int
    errores_por_severidad: Dict[str, int] = Field(default_factory=dict)
    total_recomendaciones: int
    recomendaciones_por_prioridad: Dict[str, int] = Field(default_factory=dict)


class TendenciaUsuarioResponse(BaseModel):
    """Tendencia de progreso de un usuario"""
    usuario_id: str
    total_sesiones: int
    puntaje_promedio: float
    puntaje_maximo: float
    puntaje_minimo: float
    tendencia: List[Dict[str, Any]] = Field(default_factory=list)


class ErrorFrecuenteResponse(BaseModel):
    """Estadísticas de error frecuente"""
    categoria_id: int
    nombre: str
    tipo: Optional[str] = None
    total_errores: int
    severidad_promedio: Optional[float] = None
    severidad_total: Optional[int] = None
    ultimo_detectado: Optional[datetime] = None


class RendimientoTecnologiaResponse(BaseModel):
    """Rendimiento agregado por tecnología"""
    tecnologia_id: int
    nombre: str
    slug: str
    total_sesiones: int
    puntaje_promedio: float
    tasa_aprobacion_pct: float


class EstadisticasGlobalesResponse(BaseModel):
    """Estadísticas globales del sistema"""
    total_sesiones: int
    sesiones_completadas: int
    sesiones_abandonadas: int
    total_evaluaciones: int
    puntaje_promedio_global: float
    tasa_aprobacion_pct: float
    distribucion_por_nivel: Dict[str, int] = Field(default_factory=dict)