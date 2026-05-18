from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # ================================================================
    # 🔹 BASE DE DATOS
    # ================================================================
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/techmock_db"

    # ================================================================
    # 🔹 OLLAMA / LLM
    # ================================================================
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5-coder:1.5b"
    
    # Modelo por defecto para IA (alias para mantener compatibilidad)
    DEFAULT_LLM_MODEL: str = "qwen2.5-coder:1.5b"
    LLM_API_URL: str = "http://localhost:11434/api/generate"

    # ================================================================
    # 🔹 APP
    # ================================================================
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    APP_NAME: str = "TechMock RAG API"
    API_V1_PREFIX: str = "/api/v1"

    # ================================================================
    # 🔹 LÍMITES Y CONSTANTES
    # ================================================================
    MAX_CODIGO_LENGTH: int = 10000
    MAX_FILES_CONTEXT: int = 8
    MAX_CHARS_PER_FILE: int = 800
    
    # Tecnologías y niveles
    TECH_SLUGS: dict = {
        "Vue.js": "vuejs",
        "Next.js": "nextjs",
    }
    NIVEL_DEFAULT: str = "Intermedio"
    
    # Niveles válidos para normalización
    NIVELES_VALIDOS: list = ["Excelente", "Bueno", "Regular", "Deficiente", "Crítico"]
    IMPACTOS_VALIDOS: list = ["alto", "medio", "bajo"]
    PRIORIDADES_VALIDAS: list = ["alta", "media", "baja"]

    # ================================================================
    # 🔹 ARCHIVOS DE CONTEXTO
    # ================================================================
    # Detectar BASE_DIR automáticamente
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Rutas a archivos de contexto (ajustadas a tu estructura real)
    VUE_FILE: str = os.path.join(BASE_DIR, "app", "data", "vue_context.txt")
    NEXT_FILE: str = os.path.join(BASE_DIR, "app", "data", "next_context.txt")
    
    # Rutas alternativas si no encuentra en app/data/
    @property
    def VUE_FILE_ALT(self) -> str:
        """Ruta alternativa para vue_context.txt"""
        return os.path.join(self.BASE_DIR, "data", "vue_context.txt")
    
    @property
    def NEXT_FILE_ALT(self) -> str:
        """Ruta alternativa para next_context.txt"""
        return os.path.join(self.BASE_DIR, "data", "next_context.txt")

    # ================================================================
    # 🔹 MÉTODO PARA OBTENER RUTA VÁLIDA DE ARCHIVO
    # ================================================================
    def get_vue_file_path(self) -> str:
        """Retorna la ruta válida del archivo vue_context.txt"""
        if os.path.exists(self.VUE_FILE):
            return self.VUE_FILE
        if os.path.exists(self.VUE_FILE_ALT):
            return self.VUE_FILE_ALT
        # Si no existe, retorna la ruta por defecto
        return self.VUE_FILE
    
    def get_next_file_path(self) -> str:
        """Retorna la ruta válida del archivo next_context.txt"""
        if os.path.exists(self.NEXT_FILE):
            return self.NEXT_FILE
        if os.path.exists(self.NEXT_FILE_ALT):
            return self.NEXT_FILE_ALT
        return self.NEXT_FILE

    # ================================================================
    # 🔹 CORS
    # ================================================================
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# ================================================================
# 🔹 FUNCIÓN DE VERIFICACIÓN (opcional, para debugging)
# ================================================================
def verify_settings():
    """Verifica que las rutas de archivos existan"""
    print("=" * 50)
    print("🔍 VERIFICANDO CONFIGURACIÓN")
    print("=" * 50)
    print(f"BASE_DIR: {settings.BASE_DIR}")
    print(f"VUE_FILE: {settings.VUE_FILE}")
    print(f"  ¿Existe? {os.path.exists(settings.VUE_FILE)}")
    print(f"VUE_FILE_ALT: {settings.VUE_FILE_ALT}")
    print(f"  ¿Existe? {os.path.exists(settings.VUE_FILE_ALT)}")
    print(f"NEXT_FILE: {settings.NEXT_FILE}")
    print(f"  ¿Existe? {os.path.exists(settings.NEXT_FILE)}")
    print(f"NEXT_FILE_ALT: {settings.NEXT_FILE_ALT}")
    print(f"  ¿Existe? {os.path.exists(settings.NEXT_FILE_ALT)}")
    print("=" * 50)


if __name__ == "__main__":
    verify_settings()