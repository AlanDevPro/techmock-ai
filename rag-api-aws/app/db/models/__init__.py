"""
app/db/models/__init__.py
Re-exporta todos los modelos para que Alembic y los repos los encuentren.
"""

from app.db.models.usuarios import Usuario, AuthProvider, RefreshToken
from app.db.models.tecnologias import Tecnologia, NivelDificultad, Rubrica
from app.db.models.preguntas import Pregunta, CategoriaError
from app.db.models.sesiones import SesionEntrevista, Mensaje, EnvioCodigo, EjecucionIDE
from app.db.models.evaluaciones import (
    Evaluacion,
    DetalleEvaluacion,
    ErrorDetectado,
    RecomendacionSolucion,
)
from app.db.models.perfil import (
    PerfilTecnicoUsuario,
    FortalezaUsuario,
    DebilidadUsuario,
    EstadisticasUsuario,
)

__all__ = [
    # Usuarios
    "Usuario", "AuthProvider", "RefreshToken",
    # Tecnologías
    "Tecnologia", "NivelDificultad", "Rubrica",
    # Preguntas
    "Pregunta", "CategoriaError",
    # Sesiones
    "SesionEntrevista", "Mensaje", "EnvioCodigo", "EjecucionIDE",
    # Evaluaciones
    "Evaluacion", "DetalleEvaluacion", "ErrorDetectado", "RecomendacionSolucion",
    # Perfil
    "PerfilTecnicoUsuario", "FortalezaUsuario", "DebilidadUsuario", "EstadisticasUsuario",
]