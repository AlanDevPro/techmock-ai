"""
app/services/rag/retriever/vector_store.py

Retriever semántico sobre OpenSearch con k-NN.
Se instancia UNA sola vez en el arranque de la app (app.state.vector_store).
"""

import logging
from typing import Optional

from opensearchpy import AsyncOpenSearch

from app.services.rag.embeddings.service import get_embedding_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStoreRetriever:
    """
    Retriever semántico sobre OpenSearch.
    Busca fragmentos relevantes usando k-Nearest Neighbors sobre embeddings.

    Ciclo de vida:
      startup  → retriever.connect()
      runtime  → retriever.buscar(query, framework)
      shutdown → retriever.close()
    """

    def __init__(self):
        self.client: Optional[AsyncOpenSearch] = None
        self.index = settings.OPENSEARCH_INDEX
        self.embedding_service = None
        self._is_connected = False

    async def connect(self) -> None:
        """Conecta a OpenSearch y carga el servicio de embeddings."""
        if self._is_connected:
            return

        try:
            self.embedding_service = get_embedding_service()

            self.client = AsyncOpenSearch(
                hosts=[settings.OPENSEARCH_URL],
                use_ssl=False,
                verify_certs=False,
                timeout=30,
            )

            info = await self.client.info()
            self._is_connected = True
            logger.info(
                "✅ OpenSearch conectado — versión %s | índice: %s",
                info.get("version", {}).get("number", "?"),
                self.index,
            )

        except Exception as exc:
            logger.error("❌ Error conectando a OpenSearch: %s", exc)
            raise

    async def health_check(self) -> dict:
        if not self._is_connected or not self.client:
            return {"status": "disconnected", "ready": False}

        try:
            info = await self.client.info()
            return {
                "status":              "healthy",
                "ready":               True,
                "opensearch_version":  info.get("version", {}).get("number"),
                "index":               self.index,
            }
        except Exception as exc:
            return {"status": "unhealthy", "ready": False, "error": str(exc)}

    async def buscar(
        self,
        query: str,
        framework: Optional[str] = None,
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> str:
        """
        Busca fragmentos relevantes y retorna texto formateado para el prompt.

        Returns:
            String con los fragmentos concatenados o "" si no hay resultados.
        """
        if not self._is_connected or not self.client:
            logger.warning("Retriever no conectado — retornando contexto vacío")
            return ""

        if not query or not query.strip():
            return ""

        try:
            query_vector = await self.embedding_service.embed(query)
            if not query_vector:
                return ""

            knn_query = self._build_knn_query(
                vector=query_vector,
                framework=framework,
                top_k=top_k,
                min_score=min_score,
            )

            response = await self.client.search(index=self.index, body=knn_query)
            hits = response.get("hits", {}).get("hits", [])
            total = response.get("hits", {}).get("total", {}).get("value", 0)

            logger.debug("Búsqueda RAG: %d total, %d devueltos", total, len(hits))

            return self._format_context(hits) if hits else ""

        except Exception as exc:
            logger.error("Error en búsqueda semántica: %s", exc)
            return ""

    async def buscar_raw(
        self,
        query: str,
        framework: Optional[str] = None,
        top_k: int = 5,
    ) -> list[dict]:
        """Retorna resultados crudos para debug."""
        if not self._is_connected or not self.client:
            return []

        try:
            query_vector = await self.embedding_service.embed(query)
            knn_query = self._build_knn_query(query_vector, framework, top_k)
            response = await self.client.search(index=self.index, body=knn_query)

            return [
                {
                    "score":     hit.get("_score"),
                    "content":   hit.get("_source", {}).get("content"),
                    "source":    hit.get("_source", {}).get("source"),
                    "framework": hit.get("_source", {}).get("framework"),
                    "chunk_id":  hit.get("_source", {}).get("chunk_id"),
                }
                for hit in response.get("hits", {}).get("hits", [])
            ]

        except Exception as exc:
            logger.error("Error en búsqueda raw: %s", exc)
            return []

    def _build_knn_query(
        self,
        vector: list[float],
        framework: Optional[str],
        top_k: int,
        min_score: float = 0.0,
    ) -> dict:
        knn_config: dict = {"embedding": {"vector": vector, "k": top_k}}
        if min_score > 0:
            knn_config["embedding"]["min_score"] = min_score

        query: dict = {
            "size": top_k,
            "query": {"knn": knn_config},
            "_source": ["content", "source", "framework", "chunk_id", "title"],
        }

        if framework:
            query["query"] = {
                "bool": {
                    "must":   [{"knn": knn_config}],
                    "filter": [{"term": {"framework": framework.lower()}}],
                }
            }

        return query

    def _format_context(self, hits: list) -> str:
        fragments = []
        for idx, hit in enumerate(hits, 1):
            src     = hit.get("_source", {})
            content = src.get("content", "").strip()
            if not content:
                continue

            parts = [f"Fragmento {idx}"]
            if src.get("title"):    parts.append(f"📄 {src['title']}")
            if src.get("framework"): parts.append(f"🔧 {src['framework']}")
            if src.get("source"):   parts.append(f"📁 {src['source']}")

            fragments.append(
                f"[{' | '.join(parts)} | Relevancia: {hit.get('_score', 0):.3f}]\n{content}"
            )

        return ("\n\n" + "─" * 60 + "\n\n").join(fragments) if fragments else ""

    async def close(self) -> None:
        if self.client:
            await self.client.close()
            self._is_connected = False
            logger.info("🔌 Conexión con OpenSearch cerrada")