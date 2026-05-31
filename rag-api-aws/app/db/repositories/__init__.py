"""
app/db/repositories/__init__.py
Re-exporta los módulos de repositorios para imports limpios:
  from app.db.repositories import sesiones_repo, evaluaciones_repo, ...
"""

from app.db.repositories import (
    tecnologias_repo,
    preguntas_repo,
    sesiones_repo,
    evaluaciones_repo,
    codigo_repo,
    perfil_repo,
)

__all__ = [
    "tecnologias_repo",
    "preguntas_repo",
    "sesiones_repo",
    "evaluaciones_repo",
    "codigo_repo",
    "perfil_repo",
]