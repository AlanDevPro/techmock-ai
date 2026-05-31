"""
Infraestructura RAG.

No contiene lógica de negocio.
Solamente recuperación de contexto y embeddings.
"""

from .rag_service import RAGService

__all__ = [
    "RAGService",
]