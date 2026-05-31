"""
app/services/llm/client.py

Cliente LLM multi-proveedor: Groq, OpenAI, Anthropic, Ollama.
Proveedor activo configurado en settings.LLM_PROVIDER (.env).
"""

import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Cliente unificado para múltiples proveedores LLM.

    Uso:
        raw = await llm_client.chat([{"role": "user", "content": "..."}])
        raw = await llm_client.chat(messages, temperature=0.2)
    """

    def __init__(self):
        self.provider    = settings.LLM_PROVIDER
        self.model       = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens  = settings.LLM_MAX_TOKENS
        logger.info(
            "🤖 LLMClient → provider=%s | model=%s", self.provider, self.model
        )

    async def chat(self, messages: list[dict], **kwargs) -> str:
        """
        Envía mensajes al proveedor activo y retorna el texto de respuesta.

        Args:
            messages: Formato OpenAI [{"role": "system|user|assistant", "content": "..."}]
            **kwargs: Overrides opcionales: provider, model, temperature, max_tokens.

        Returns:
            Texto plano de la respuesta del LLM.
        """
        provider = kwargs.get("provider", self.provider)

        dispatch = {
            "groq":      self._call_openai_compatible,
            "openai":    self._call_openai_compatible,
            "anthropic": self._call_anthropic,
            "ollama":    self._call_ollama,
        }

        handler = dispatch.get(provider)
        if not handler:
            raise ValueError(
                f"Proveedor LLM no soportado: '{provider}'. "
                f"Opciones: {list(dispatch.keys())}"
            )

        if provider == "groq":
            return await handler(
                base_url=settings.GROQ_BASE_URL,
                api_key=settings.GROQ_API_KEY,
                messages=messages,
                **kwargs,
            )
        if provider == "openai":
            return await handler(
                base_url=settings.OPENAI_BASE_URL,
                api_key=settings.OPENAI_API_KEY,
                messages=messages,
                **kwargs,
            )

        return await handler(messages=messages, **kwargs)

    # ── Groq / OpenAI ────────────────────────────────────────────────────────

    async def _call_openai_compatible(
        self, base_url: str, api_key: str, messages: list[dict], **kwargs
    ) -> str:
        if not api_key:
            raise ValueError(
                f"API key vacía para proveedor '{self.provider}'. "
                "Verifica tu .env."
            )

        payload = {
            "model":       kwargs.get("model", self.model),
            "messages":    messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens":  kwargs.get("max_tokens", self.max_tokens),
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
                json=payload,
            )
            response.raise_for_status()

        return response.json()["choices"][0]["message"]["content"]

    # ── Anthropic / Claude ────────────────────────────────────────────────────

    async def _call_anthropic(self, messages: list[dict], **kwargs) -> str:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY vacía. Configura tu .env.")

        system_content = ""
        user_messages  = []
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            else:
                user_messages.append(msg)

        payload: dict = {
            "model":      kwargs.get("model", self.model),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "messages":   user_messages,
        }
        if system_content:
            payload["system"] = system_content

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type":      "application/json",
                },
                json=payload,
            )
            response.raise_for_status()

        return response.json()["content"][0]["text"]

    # ── Ollama / local ────────────────────────────────────────────────────────

    async def _call_ollama(self, messages: list[dict], **kwargs) -> str:
        payload = {
            "model":    kwargs.get("model", self.model),
            "messages": messages,
            "stream":   False,
            "options": {
                "temperature": kwargs.get("temperature", self.temperature),
                "num_predict": kwargs.get("max_tokens", self.max_tokens),
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        return response.json()["message"]["content"]


# Instancia global reutilizable
llm_client = LLMClient()