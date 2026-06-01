"""
app/core/config.py

Configuración central de la aplicación vía variables de entorno.
Todas las settings se leen desde .env una sola vez al importar el módulo.

Uso:
    from app.core.config import settings
    print(settings.LLM_PROVIDER)
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Settings globales de la aplicación.
    Pydantic lee automáticamente las variables desde el entorno / .env.
    """

    # ── Aplicación ────────────────────────────────────────────────────────
    APP_NAME: str = Field("RAG Interview API", description="Nombre de la aplicación")
    APP_VERSION: str = Field("2.0.0", description="Versión semántica")
    DEBUG: bool = Field(False, description="Activa docs, logs verbosos y errores detallados")

    # ── Base de datos ─────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL DSN async. Ej: postgresql+asyncpg://user:pass@host/db",
    )

    # ── LLM — Proveedor activo ────────────────────────────────────────────
    LLM_PROVIDER: str = Field(
        "groq",
        description="Proveedor activo: groq | openai | anthropic | ollama",
    )
    LLM_MODEL: str = Field(
        "llama-3.3-70b-versatile",
        description="Nombre del modelo según el proveedor activo",
    )
    LLM_TEMPERATURE: float = Field(0.7, ge=0.0, le=2.0)
    LLM_MAX_TOKENS: int = Field(4096, ge=256, le=16384)

    # ── LLM — Groq ────────────────────────────────────────────────────────
    GROQ_API_KEY: str = Field("", description="API Key de Groq")
    GROQ_BASE_URL: str = Field("https://api.groq.com/openai/v1")

    # ── LLM — OpenAI ──────────────────────────────────────────────────────
    OPENAI_API_KEY: str = Field("", description="API Key de OpenAI")
    OPENAI_BASE_URL: str = Field("https://api.openai.com/v1")

    # ── LLM — Anthropic ───────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = Field("", description="API Key de Anthropic")

    # ── LLM — Ollama (local) ──────────────────────────────────────────────
    OLLAMA_BASE_URL: str = Field("http://localhost:11434")

    # ── Embeddings ────────────────────────────────────────────────────────
    EMBEDDING_PROVIDER: str = Field(
        "local",
        description="Proveedor de embeddings: openai | huggingface | cohere | local | bedrock",
    )
    EMBEDDING_MODEL: str = Field(
        "text-embedding-3-small",
        description="Modelo de embeddings",
    )
    EMBEDDING_DIMENSION: int = Field(
        1536,
        description="Dimensión del vector de embedding (debe coincidir con el índice OpenSearch)",
    )

    # ── OpenSearch / RAG ──────────────────────────────────────────────────
    OPENSEARCH_URL: str = Field(
        "http://localhost:9200",
        description="URL del cluster OpenSearch",
    )
    OPENSEARCH_INDEX: str = Field(
        "rag-interview-docs",
        description="Nombre del índice k-NN donde se almacenan los fragmentos",
    )

    # ── CORS y seguridad ──────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Orígenes permitidos por CORS",
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=["*"],
        description="Hosts de confianza para TrustedHostMiddleware (solo en producción)",
    )
    SECRET_KEY: str = Field(
        "CHANGE_ME_IN_PRODUCTION",
        description="Clave secreta para firmar JWT y tokens internos",
    )
    JWT_ALGORITHM: str = Field("HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(30)

    # ── Límites de negocio ────────────────────────────────────────────────
    MAX_CODIGO_LENGTH: int = Field(
        50_000,
        description="Longitud máxima del código enviado por el candidato (caracteres)",
    )
    # ── Nivel por defecto ─────────────────────────────────────────

    NIVEL_DEFAULT: str = Field(
        "Junior",
        description="Nivel por defecto utilizado al generar preguntas y sesiones"
    )
    RAG_TOP_K: int = Field(
        5,
        description="Número de fragmentos a recuperar por búsqueda semántica",
    )
    RAG_MIN_SCORE: float = Field(
        0.0,
        description="Puntaje mínimo de similitud para incluir un fragmento (0.0 = sin filtro)",
    )

    # ── Mapeo de tecnologías (slug → nombre canónico) ─────────────────────
    # Centralizado aquí para que routes y services compartan la misma fuente
    TECH_SLUGS: dict = Field(
        default={
            "vue":        "Vue.js",
            "vuejs":      "Vue.js",
            "next":       "Next.js",
            "nextjs":     "Next.js",
            "react":      "React",
            "typescript": "TypeScript",
            "javascript": "JavaScript",
            "css":        "CSS",
            "nodejs":     "Node.js",
            "node":       "Node.js",
        },
        description="Mapa de slugs de URL a nombres canónicos de tecnología",
    )

    # ── Validaciones ──────────────────────────────────────────────────────

    @field_validator("LLM_PROVIDER")
    @classmethod
    def validar_llm_provider(cls, v: str) -> str:
        opciones = {"groq", "openai", "anthropic", "ollama"}
        if v not in opciones:
            raise ValueError(f"LLM_PROVIDER debe ser uno de {opciones}, se recibió: '{v}'")
        return v

    @field_validator("EMBEDDING_PROVIDER")
    @classmethod
    def validar_embedding_provider(cls, v: str) -> str:
        opciones = {
            "openai",
            "huggingface",
            "cohere",
            "local",
            "bedrock"
        }

        if v not in opciones:
            raise ValueError(
                f"EMBEDDING_PROVIDER debe ser uno de {opciones}, se recibió: '{v}'"
            )

        return v

    # ── Utilidades ────────────────────────────────────────────────────────

    def normalizar_framework(self, slug: str) -> str | None:
        """
        Convierte un slug de URL al nombre canónico del framework.
        Retorna None si el slug no está registrado.

        Uso:
            nombre = settings.normalizar_framework("vuejs")  # → "Vue.js"
        """
        return self.TECH_SLUGS.get(slug.strip().lower())

    def print_llm_config(self) -> None:
        """Imprime la configuración LLM activa al arranque."""
        print(f"🤖 LLM Activo  → provider={self.LLM_PROVIDER} | model={self.LLM_MODEL}")
        print(f"📐 Embeddings  → provider={self.EMBEDDING_PROVIDER} | model={self.EMBEDDING_MODEL}")
        print(f"🔍 OpenSearch  → {self.OPENSEARCH_URL} | índice={self.OPENSEARCH_INDEX}")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Permite campos extra en .env sin lanzar error
        extra = "ignore"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Retorna la instancia singleton de Settings.
    Usa lru_cache para que el .env se lea una sola vez.
    """
    return Settings()


# Instancia global — importar esto en todo el proyecto
settings: Settings = get_settings()