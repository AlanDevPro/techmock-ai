"""
app/api/routes/__init__.py

Registro centralizado de todos los routers de la API.

Uso en main.py:

    from app.api.routes import register_routes

    app = FastAPI(...)
    register_routes(app)

Ventajas:
    - Un único punto de registro de endpoints
    - Evita imports dispersos en main.py
    - Facilita agregar nuevos módulos
"""

from fastapi import FastAPI

from app.api.routes.evaluacion_codigo import router as codigo_router
from app.api.routes.generacion_preguntas import router as preguntas_router
from app.api.routes.perfil_tecnico import router as perfil_router
from app.api.routes.reclutador import router as reclutador_router

__all__ = [
    "codigo_router",
    "preguntas_router",
    "perfil_router",
    "reclutador_router",
    "register_routes",
]


def register_routes(app: FastAPI) -> None:
    """
    Registra todos los routers de la aplicación.

    Args:
        app: Instancia principal de FastAPI.
    """

    app.include_router(preguntas_router)
    app.include_router(codigo_router)
    app.include_router(perfil_router)
    app.include_router(reclutador_router)