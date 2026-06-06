"""
app/api/deps.py
Dependencias inyectables de FastAPI: sesión de BD, usuario autenticado, etc.
"""

from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from sqlalchemy.ext.asyncio import AsyncSession

import jwt

from app.core.config import settings
from app.db.session import AsyncSessionLocal

bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# BASE DE DATOS
# ─────────────────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provee una sesión de BD por request.
    Hace commit automático si no hubo excepciones;
    rollback si las hubo.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN JWT
# ─────────────────────────────────────────────────────────────────────────────

async def require_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> UUID:

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida"
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )

        usuario_id = payload.get("sub")

        if not usuario_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido"
            )

        try:
            return UUID(usuario_id)
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail="UUID inválido en token"
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expirado"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido"
        )