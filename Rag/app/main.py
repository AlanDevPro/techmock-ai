from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("📦 Importando base de datos...")
from app.db.database import init_db, close_db
print("✅ Base de datos importada")

print("📦 Importando router...")
from app.api.endpoints import router as api_router
print("✅ Router importado correctamente")


# ---------------------------------------------------
# 🔹 LIFESPAN (startup / shutdown)
# ---------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Iniciando TechMock RAG API...")

    try:
        print("📦 Inicializando base de datos...")
        await init_db()
        print("✅ Base de datos lista")
    except Exception as e:
        print(f"❌ Error inicializando la base de datos: {e}")

    yield

    # Shutdown
    print("🔌 Cerrando TechMock RAG API...")

    try:
        await close_db()
        print("✅ Conexión a base de datos cerrada")
    except Exception as e:
        print(f"❌ Error cerrando la base de datos: {e}")


# ---------------------------------------------------
# 🔹 APP
# ---------------------------------------------------
print("📦 Creando instancia de FastAPI...")

app = FastAPI(
    title="TechMock RAG API",
    description="API de generación y análisis de entrevistas técnicas con LLM local",
    version="1.0.0",
    lifespan=lifespan,
)

print("✅ App creada")


# ---------------------------------------------------
# 🔹 CORS
# ---------------------------------------------------
print("📦 Configurando CORS...")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ CORS configurado")


# ---------------------------------------------------
# 🔹 ROUTERS
# ---------------------------------------------------
print("📦 Incluyendo routers...")

app.include_router(api_router, prefix="/api/v1")

print("✅ Router incluido correctamente")


# ---------------------------------------------------
# 🔹 ENDPOINTS
# ---------------------------------------------------
@app.get("/")
async def read_root():
    print("👉 Endpoint raíz llamado")

    return {
        "message": (
            "🚀 API TechMock RAG activada correctamente. "
            "Ir a /docs para consultar la documentación Swagger."
        ),
        "docs": "/docs",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/health")
async def health():
    print("💚 Health check ejecutado")

    return {
        "status": "ok",
        "service": "TechMock RAG",
        "version": "1.0.0",
    }