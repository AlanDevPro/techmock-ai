from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# -----------------------------
# 🔹 ENGINE ASYNC
# -----------------------------
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# -----------------------------
# 🔹 SESSION FACTORY
# -----------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# -----------------------------
# 🔹 BASE PARA MODELOS ORM
# -----------------------------
class Base(DeclarativeBase):
    pass


# -----------------------------
# 🔹 INICIALIZAR TABLAS
# -----------------------------
async def init_db() -> None:
    """Crea todas las tablas al iniciar la app (solo para dev sin Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas verificadas/creadas en la base de datos")


async def close_db() -> None:
    """Cierra el engine al apagar la app."""
    await engine.dispose()
    print("🔌 Conexión a la base de datos cerrada")