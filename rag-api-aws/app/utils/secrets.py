from app.core.config import settings


async def get_secret(secret_name: str) -> str:
    """
    Obtiene secretos localmente desde variables de entorno.
    En producción esto puede reemplazarse por AWS Secrets Manager.
    """

    secrets_map = {
        "RAG_API_KEY": getattr(settings, "RAG_API_KEY", "12345"),
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
        "ANTHROPIC_API_KEY": settings.ANTHROPIC_API_KEY,
    }

    if secret_name not in secrets_map:
        raise ValueError(f"Secret no encontrado: {secret_name}")

    return secrets_map[secret_name]