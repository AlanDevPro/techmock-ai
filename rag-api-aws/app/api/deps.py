"""
app/api/deps.py
Dependencias inyectables de FastAPI: sesión de BD, usuario autenticado, etc.
"""

from typing import AsyncGenerator, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal

bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# BASE DE DATOS
# ─────────────────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provee una sesión de BD por request.
    Hace commit automático si no hubo excepciones; rollback si las hubo.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN (stub — adaptar a tu sistema JWT real)
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[UUID]:
    """
    Extrae el usuario_id del JWT Bearer token.
    Retorna None si no hay token (endpoints públicos).
    Lanza 401 si el token es inválido.

    TODO: reemplazar el stub por validación JWT real con tu librería de auth.
    """
    if credentials is None:
        return None

    token = credentials.credentials

    # ── Stub: en producción verificar firma JWT aquí ──────────────────────
    # from app.core.security import decode_jwt
    # payload = decode_jwt(token)
    # return UUID(payload["sub"])
    # ──────────────────────────────────────────────────────────────────────

    try:
        # Stub temporal: asume que el token ES el UUID directamente
        # Solo para desarrollo. Reemplazar con lógica JWT real.
        return UUID(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )


async def require_current_user_id(
    usuario_id: Optional[UUID] = Depends(get_current_user_id),
) -> UUID:
    """Igual que get_current_user_id pero lanza 401 si no hay token."""
    if usuario_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida.",
        )
    return usuario_id