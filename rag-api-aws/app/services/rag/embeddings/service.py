"""
app/services/rag/embeddings/service.py

Servicios de embedding: OpenAI, Bedrock, y local (SentenceTransformers).
Factory function get_embedding_service() según settings.EMBEDDING_PROVIDER.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)

_BGE_MODELS = {
    "BAAI/bge-small-en-v1.5",
    "BAAI/bge-base-en-v1.5",
    "BAAI/bge-large-en-v1.5",
}
_BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class BaseEmbeddingService(ABC):
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        pass


# ─────────────────────────────────────────────────────────────────────────────

class OpenAIEmbeddingService(BaseEmbeddingService):
    def __init__(self):
        import openai
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model  = settings.EMBEDDING_MODEL
        logger.info("Embeddings → OpenAI / %s", self.model)

    async def embed(self, text: str) -> List[float]:
        resp = await self.client.embeddings.create(input=text, model=self.model)
        return resp.data[0].embedding

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        resp = await self.client.embeddings.create(input=texts, model=self.model)
        return [item.embedding for item in sorted(resp.data, key=lambda x: x.index)]


class BedrockEmbeddingService(BaseEmbeddingService):
    def __init__(self):
        import boto3
        self.client = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)
        self.model  = settings.EMBEDDING_MODEL
        logger.info("Embeddings → Bedrock / %s", self.model)

    async def embed(self, text: str) -> List[float]:
        body     = json.dumps({"inputText": text})
        response = self.client.invoke_model(
            modelId=self.model, body=body, contentType="application/json"
        )
        return json.loads(response["body"].read())["embedding"]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [await self.embed(t) for t in texts]


class LocalEmbeddingService(BaseEmbeddingService):
    def __init__(self):
        print("EMB-1 Entrando a LocalEmbeddingService")

        from sentence_transformers import SentenceTransformer

        print("EMB-2 SentenceTransformer importado")

        self.model_name = settings.EMBEDDING_MODEL

        print(f"EMB-3 Modelo configurado: {self.model_name}")

        self.is_bge = self.model_name in _BGE_MODELS

        print("EMB-4 Antes de cargar modelo")

        self.model = SentenceTransformer(self.model_name)
        print(self.model.device)

        print("EMB-5 Modelo cargado")

        # Fix: use get_embedding_dimension() to avoid FutureWarning
        if hasattr(self.model, "get_embedding_dimension"):
            self.vector_dimension = self.model.get_embedding_dimension()
        else:
            self.vector_dimension = self.model.get_sentence_embedding_dimension()

        print(f"EMB-6 Dimensión detectada: {self.vector_dimension}")

        logger.info(
            "Embeddings → local / %s (BGE=%s, dim=%d)",
            self.model_name,
            self.is_bge,
            self.vector_dimension,
        )

    def _prepare(self, text: str, is_query: bool) -> str:
        return (_BGE_QUERY_PREFIX + text) if (is_query and self.is_bge) else text

    async def embed(self, text: str, is_query: bool = True) -> List[float]:
        emb = self.model.encode(self._prepare(text, is_query), normalize_embeddings=True)
        return emb.tolist()

    async def embed_document(self, text: str) -> List[float]:
        return await self.embed(text, is_query=False)

    async def embed_batch(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        """Async version — use with 'await' in async contexts."""
        return self._encode_batch(texts, is_query)

    def embed_batch_sync(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        """Sync version — use this in ingest.py or any non-async context."""
        return self._encode_batch(texts, is_query)

    def _encode_batch(self, texts: List[str], is_query: bool) -> List[List[float]]:
        processed = [self._prepare(t, is_query) for t in texts]
        embeddings = self.model.encode(
            processed,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=len(texts) > 50,
        )
        return [e.tolist() for e in embeddings]


# ─────────────────────────────────────────────────────────────────────────────
# FACTORY
# ─────────────────────────────────────────────────────────────────────────────

def get_embedding_service() -> BaseEmbeddingService:
    _services = {
        "openai":  OpenAIEmbeddingService,
        "bedrock": BedrockEmbeddingService,
        "local":   LocalEmbeddingService,
    }
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider not in _services:
        raise ValueError(f"Proveedor de embeddings desconocido: '{provider}'")
    return _services[provider]()