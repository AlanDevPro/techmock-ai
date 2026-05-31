"""
app/core/exceptions.py

HTTPExceptions personalizadas y manejadores de errores globales.

Centraliza todos los errores de la API para que:
  - Los mensajes sean consistentes en todos los endpoints
  - Sea fácil agregar logging, Sentry, o alertas en un solo lugar
  - Los tests puedan importar las excepciones sin circular imports

Uso en un route:
    from app.core.exceptions import NotFoundException, ForbiddenException
    raise NotFoundException("Sesión no encontrada.")

Uso en main.py (registro de handlers):
    from app.core.exceptions import register_exception_handlers
    register_exception_handlers(app)
"""

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# EXCEPCIONES BASE
# ──────────────────────────────────────────────────────────────

class AppException(HTTPException):
    """
    Base de todas las excepciones de negocio de la aplicación.
    Agrega un campo `code` legible por el cliente además del status HTTP.
    """

    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "APP_ERROR",
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.code = code
        self.extra = extra or {}


# ──────────────────────────────────────────────────────────────
# EXCEPCIONES DE DOMINIO (4xx)
# ──────────────────────────────────────────────────────────────

class NotFoundException(AppException):
    """
    Recurso no encontrado en la base de datos.
    HTTP 404.

    Uso:
        raise NotFoundException("Sesión no encontrada.")
        raise NotFoundException("Perfil técnico no encontrado.", code="PROFILE_NOT_FOUND")
    """

    def __init__(self, detail: str = "Recurso no encontrado.", code: str = "NOT_FOUND") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code=code)


class ValidationException(AppException):
    """
    Error de validación de negocio (distinto de validación de Pydantic).
    HTTP 422.

    Uso:
        raise ValidationException("El framework 'cobol' no está soportado.")
    """

    def __init__(self, detail: str, code: str = "VALIDATION_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            code=code,
        )


class BadRequestException(AppException):
    """
    Request malformado o con datos incoherentes.
    HTTP 400.

    Uso:
        raise BadRequestException("sesion_id debe ser un UUID válido.")
    """

    def __init__(self, detail: str, code: str = "BAD_REQUEST") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            code=code,
        )


class UnauthorizedException(AppException):
    """
    No autenticado o token inválido.
    HTTP 401.
    """

    def __init__(
        self, detail: str = "Autenticación requerida.", code: str = "UNAUTHORIZED"
    ) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code=code,
        )


class ForbiddenException(AppException):
    """
    Autenticado pero sin permisos suficientes.
    HTTP 403.

    Uso:
        raise ForbiddenException("Solo reclutadores pueden ver este perfil.")
    """

    def __init__(
        self, detail: str = "No tienes permiso para realizar esta acción.", code: str = "FORBIDDEN"
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code=code,
        )


class PayloadTooLargeException(AppException):
    """
    Payload excede el límite configurado (ej. código demasiado largo).
    HTTP 413.

    Uso:
        raise PayloadTooLargeException(f"Código excede {settings.MAX_CODIGO_LENGTH} caracteres.")
    """

    def __init__(self, detail: str, code: str = "PAYLOAD_TOO_LARGE") -> None:
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=detail,
            code=code,
        )


class ConflictException(AppException):
    """
    Conflicto de estado (ej. sesión ya finalizada, email ya registrado).
    HTTP 409.
    """

    def __init__(self, detail: str, code: str = "CONFLICT") -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            code=code,
        )


# ──────────────────────────────────────────────────────────────
# EXCEPCIONES DE INFRAESTRUCTURA (5xx)
# ──────────────────────────────────────────────────────────────

class LLMException(AppException):
    """
    Error al llamar al proveedor LLM (timeout, rate limit, respuesta inválida).
    HTTP 502.

    Uso:
        raise LLMException("Groq no respondió en el tiempo esperado.")
    """

    def __init__(self, detail: str = "Error al consultar el modelo LLM.", code: str = "LLM_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            code=code,
        )


class RAGException(AppException):
    """
    Error al consultar el vector store (OpenSearch no disponible, índice inexistente).
    HTTP 503. No es bloqueante — el sistema debe degradar a respuesta sin RAG.

    Uso:
        raise RAGException("OpenSearch no está disponible.")
    """

    def __init__(
        self, detail: str = "Servicio RAG no disponible.", code: str = "RAG_UNAVAILABLE"
    ) -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            code=code,
        )


class DatabaseException(AppException):
    """
    Error inesperado de base de datos (no es un 404 ni un conflict).
    HTTP 500.
    """

    def __init__(
        self, detail: str = "Error interno de base de datos.", code: str = "DB_ERROR"
    ) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            code=code,
        )


# ──────────────────────────────────────────────────────────────
# FORMATO DE RESPUESTA DE ERROR
# ──────────────────────────────────────────────────────────────

def _error_response(
    request: Request,
    status_code: int,
    message: str,
    code: str = "ERROR",
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    """
    Formato unificado para todas las respuestas de error.

    Estructura:
    {
        "error": {
            "code":    "NOT_FOUND",
            "status":  404,
            "message": "Sesión no encontrada.",
            "path":    "/codigo/sesion/abc/analisis"
        }
    }
    """
    body: dict[str, Any] = {
        "error": {
            "code":    code,
            "status":  status_code,
            "message": message,
            "path":    str(request.url.path),
        }
    }
    if extra:
        body["error"]["detail"] = extra

    return JSONResponse(status_code=status_code, content=body)


# ──────────────────────────────────────────────────────────────
# MANEJADORES GLOBALES
# ──────────────────────────────────────────────────────────────

async def _handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
    """Manejador para todas las AppException (errores de dominio + infraestructura)."""
    logger.warning(
        "AppException [%s] %s → %s",
        exc.status_code,
        exc.code,
        exc.detail,
    )
    return _error_response(
        request=request,
        status_code=exc.status_code,
        message=exc.detail,
        code=exc.code,
        extra=exc.extra or None,
    )


async def _handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    """Manejador para HTTPException estándar de FastAPI."""
    return _error_response(
        request=request,
        status_code=exc.status_code,
        message=str(exc.detail),
        code="HTTP_ERROR",
    )


async def _handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
    """Manejador de último recurso para errores no controlados."""
    logger.exception("Error no controlado en %s: %s", request.url.path, exc)

    # Importar aquí para evitar circular imports
    from app.core.config import settings

    message = str(exc) if settings.DEBUG else "Error interno del servidor."
    return _error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        code="INTERNAL_ERROR",
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Registra todos los manejadores de error en la app FastAPI.
    Llamar en main.py después de crear la instancia de FastAPI.

    Uso en main.py:
        from app.core.exceptions import register_exception_handlers
        register_exception_handlers(app)
    """
    app.add_exception_handler(AppException, _handle_app_exception)          # type: ignore[arg-type]
    app.add_exception_handler(HTTPException, _handle_http_exception)        # type: ignore[arg-type]
    app.add_exception_handler(Exception, _handle_generic_exception)         # type: ignore[arg-type]