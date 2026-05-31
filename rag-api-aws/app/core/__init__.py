"""
app/core/__init__.py

Exports centralizados del núcleo de la aplicación.

Permite importar desde:

    from app.core import settings
    from app.core import ValidationException
    from app.core import construir_contexto_proyecto

en lugar de:

    from app.core.config import settings
    from app.core.exceptions import ValidationException
    from app.core.normalizers import construir_contexto_proyecto
"""

# ──────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────

from app.core.config import (
    Settings,
    get_settings,
    settings,
)

# ──────────────────────────────────────────────────────────────
# EXCEPCIONES
# ──────────────────────────────────────────────────────────────

from app.core.exceptions import (
    AppException,
    NotFoundException,
    ValidationException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    PayloadTooLargeException,
    ConflictException,
    LLMException,
    RAGException,
    DatabaseException,
    register_exception_handlers,
)

# ──────────────────────────────────────────────────────────────
# NORMALIZADORES Y UTILIDADES
# ──────────────────────────────────────────────────────────────

from app.core.normalizers import (
    normalizar_framework,
    normalizar_framework_o_default,
    puntaje_a_nivel_candidato,
    puntaje_a_nivel_texto,
    puntaje_a_apto,
    normalizar_severidad,
    construir_contexto_proyecto,
    limpiar_codigo,
    safe_float,
    safe_int,
    truncar_texto,
)

# ──────────────────────────────────────────────────────────────
# EXPORTS PÚBLICOS
# ──────────────────────────────────────────────────────────────

__all__ = [
    # config
    "Settings",
    "get_settings",
    "settings",

    # exceptions
    "AppException",
    "NotFoundException",
    "ValidationException",
    "BadRequestException",
    "UnauthorizedException",
    "ForbiddenException",
    "PayloadTooLargeException",
    "ConflictException",
    "LLMException",
    "RAGException",
    "DatabaseException",
    "register_exception_handlers",

    # normalizers
    "normalizar_framework",
    "normalizar_framework_o_default",
    "puntaje_a_nivel_candidato",
    "puntaje_a_nivel_texto",
    "puntaje_a_apto",
    "normalizar_severidad",
    "construir_contexto_proyecto",
    "limpiar_codigo",
    "safe_float",
    "safe_int",
    "truncar_texto",
]