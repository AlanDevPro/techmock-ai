"""
main.py

Entry point de la RAG Interview API.

Responsabilidades:
  - Crear la instancia FastAPI con lifespan
  - Registrar middlewares (CORS, TrustedHost, logging)
  - Registrar manejadores de error globales
  - Registrar todos los routers via register_routes()
  - Exponer endpoints de utilidad: /, /health, /info
"""

from dotenv import load_dotenv

load_dotenv()  # Debe ejecutarse ANTES de cualquier import que use settings

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import register_routes
from app.core.config import settings
from app.core.exceptions import register_exception_handlers


# ──────────────────────────────────────────────────────────────
# LIFESPAN — Startup y Shutdown
# ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación.

    Startup (antes del yield):
      1. Confirmar configuración LLM/Embeddings activa
      2. Inicializar VectorStoreRetriever y conectar a OpenSearch
      3. Verificar health del vector store

    Shutdown (después del yield):
      1. Cerrar conexiones de OpenSearch
      2. Liberar recursos
    """
    print("\n🚀 Iniciando RAG Interview API...")

    # ── 1. Confirmar configuración activa ──────────────────────
    settings.print_llm_config()

    # ── 2. Inicializar Vector Store ────────────────────────────
    try:
        from app.services.rag.retriever.vector_store import VectorStoreRetriever

        retriever = VectorStoreRetriever()
        await retriever.connect()

        health = await retriever.health_check()

        if health.get("ready"):
            print(f"✅ Vector Store listo — OpenSearch {health.get('opensearch_version', '')}")
        else:
            print(f"⚠️  Vector Store no está completamente listo: {health}")

        app.state.vector_store = retriever

    except Exception as exc:
        print(f"❌ Error al conectar Vector Store: {exc}")
        print("⚠️  Continuando sin RAG — las respuestas usarán fallback sin contexto.")
        app.state.vector_store = None

    print(f"✅ API lista — Modo: {'DEBUG' if settings.DEBUG else 'PRODUCTION'}\n")

    yield  # ← La aplicación corre aquí

    # ── Shutdown ───────────────────────────────────────────────
    print("\n🛑 Cerrando RAG Interview API...")

    vs = getattr(app.state, "vector_store", None)
    if vs is not None:
        await vs.close()
        print("✅ Conexiones de OpenSearch cerradas.")

    print("👋 Shutdown completo.\n")


# ──────────────────────────────────────────────────────────────
# APLICACIÓN FASTAPI
# ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
API para evaluación técnica de candidatos con RAG semántico y sistema adaptativo.

## Características

- **Preguntas dinámicas**: generadas con contexto de documentación real (RAG)
- **Sistema adaptativo**: las preguntas se adaptan a las debilidades del candidato
- **Análisis de código**: evaluación en 5 pilares técnicos con feedback detallado
- **Multi-proveedor LLM**: Groq, OpenAI, Anthropic, Ollama
- **Multi-framework**: Vue.js, Next.js, React, TypeScript, JavaScript, CSS

## Grupos de endpoints

- `GET  /preguntas/generar/{framework}`        — Genera pregunta técnica vía RAG
- `GET  /preguntas/iniciar-sesion/{framework}` — Crea sesión rápida (< 100ms)
- `POST /codigo/analizar`                      — Analiza código del candidato
- `POST /codigo/borrador`                      — Autosave del IDE
- `GET  /usuario/{id}/perfil`                  — Perfil técnico histórico
- `GET  /reclutador/candidatos`                — Panel del reclutador
    """,
    # Docs solo en DEBUG para no exponer la API en producción
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────
# MANEJADORES DE ERROR GLOBALES
# ──────────────────────────────────────────────────────────────

register_exception_handlers(app)


# ──────────────────────────────────────────────────────────────
# MIDDLEWARES
# ──────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],   # 👈 importante
    allow_headers=["*"],
)

# TrustedHostMiddleware solo en producción
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# ──────────────────────────────────────────────────────────────
# MIDDLEWARE — LOGGING DE REQUESTS
# ──────────────────────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Registra cada request con método, path, status y duración.
    Agrega headers X-Response-Time y X-API-Version a todas las respuestas.
    """
    start = time.perf_counter()
    print(f"➡️  {request.method} {request.url.path}")

    response = await call_next(request)

    duration = time.perf_counter() - start
    print(
        f"⬅️  {request.method} {request.url.path} "
        f"→ {response.status_code} ({duration:.3f}s)"
    )

    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    response.headers["X-API-Version"] = settings.APP_VERSION

    return response


# ──────────────────────────────────────────────────────────────
# ROUTERS
# ──────────────────────────────────────────────────────────────

register_routes(app)


# ──────────────────────────────────────────────────────────────
# ENDPOINTS DE UTILIDAD
# ──────────────────────────────────────────────────────────────

@app.get("/", tags=["health"], summary="Health check básico")
async def root():
    """
    Retorna el estado general de la API y si RAG está activo.
    Ideal para health checks de load balancers y CI/CD.
    """
    vs = getattr(app.state, "vector_store", None)
    rag_activo = vs is not None and getattr(vs, "_is_connected", False)

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "debug": settings.DEBUG,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "rag_enabled": rag_activo,
    }


@app.get("/health", tags=["health"], summary="Health check detallado de todos los servicios")
async def health_check():
    """
    Retorna el estado de cada servicio: RAG (OpenSearch), LLM y API.
    Status global: 'ok' si RAG está sano, 'degraded' si no.
    """
    vs = getattr(app.state, "vector_store", None)
    rag_status = "disconnected"
    rag_details: dict = {}

    if vs is not None:
        health = await vs.health_check()
        rag_status = health.get("status", "unknown")
        rag_details = {
            "ready": health.get("ready", False),
            "opensearch_version": health.get("opensearch_version"),
            "index": health.get("index"),
        }

    return {
        "status": "ok" if rag_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "services": {
            "rag": {
                "status": rag_status,
                **rag_details,
            },
            "llm": {
                "provider": settings.LLM_PROVIDER,
                "model": settings.LLM_MODEL,
            },
            "api": {
                "debug": settings.DEBUG,
                "version": settings.APP_VERSION,
            },
        },
    }


@app.get("/info", tags=["utility"], summary="Información de configuración (solo DEBUG)")
async def get_info():
    """
    Información detallada de la configuración activa.
    Solo disponible cuando DEBUG=true — bloqueado en producción.
    """
    if not settings.DEBUG:
        return JSONResponse(
            status_code=403,
            content={"error": {"message": "Endpoint disponible solo en modo DEBUG."}},
        )

    vs = getattr(app.state, "vector_store", None)

    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "debug": settings.DEBUG,
        "frameworks_soportados": list(settings.TECH_SLUGS.keys()),
        "llm": {
            "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL,
            "temperature": settings.LLM_TEMPERATURE,
            "max_tokens": settings.LLM_MAX_TOKENS,
        },
        "embeddings": {
            "provider": settings.EMBEDDING_PROVIDER,
            "model": settings.EMBEDDING_MODEL,
            "dimension": settings.EMBEDDING_DIMENSION,
        },
        "rag": {
            "disponible": vs is not None and getattr(vs, "_is_connected", False),
            "opensearch_url": settings.OPENSEARCH_URL,
            "index": settings.OPENSEARCH_INDEX,
            "top_k": settings.RAG_TOP_K,
        },
        "limites": {
            "max_codigo_length": settings.MAX_CODIGO_LENGTH,
        },
    }


# ──────────────────────────────────────────────────────────────
# EJECUCIÓN DIRECTA (desarrollo local)
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )