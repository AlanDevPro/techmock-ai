"""
Pipeline de ingestion: indexa documentos en OpenSearch.
Optimizado para entornos con restricciones de RAM (8GB).

EJECUTAR:
  python ingestion/ingest.py --framework vue
  python ingestion/ingest.py --all
"""

import asyncio
import argparse
import re
from pathlib import Path
from opensearchpy import OpenSearch
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.rag.embeddings.service import get_embedding_service
from app.core.config import settings

DOCS_DIR = Path(__file__).parent / "docs"

FRAMEWORKS = {
    "vue":        ("Vue.js",     DOCS_DIR / "vue.md"),
    "next":       ("Next.js",    DOCS_DIR / "nextjs.md"),
    "react":      ("React",      DOCS_DIR / "react.md"),
    "typescript": ("TypeScript", DOCS_DIR / "typescript.md"),
    "javascript": ("JavaScript", DOCS_DIR / "javascript.md"),
    "css":        ("CSS",        DOCS_DIR / "css.md"),
}

embedding_service = get_embedding_service()


def crear_indice(client: OpenSearch):
    """Crea el índice k-NN en OpenSearch si no existe."""
    dim = embedding_service.vector_dimension

    index_body = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 8,  # Mantener bajo para consumir menos memoria RAM
            }
        },
        "mappings": {
            "properties": {
                "content":   {"type": "text"},
                "framework": {"type": "keyword"},
                "source":    {"type": "keyword"},
                "chunk_id":  {"type": "keyword"},
                "embedding": {
                    "type":      "knn_vector",
                    "dimension": dim,
                    "method": {
                        "name":       "hnsw",
                        "space_type": "cosinesimil",
                        "engine":     "nmslib",
                    },
                },
            }
        },
    }

    exists = client.indices.exists(index=settings.OPENSEARCH_INDEX)
    if not exists:
        client.indices.create(index=settings.OPENSEARCH_INDEX, body=index_body)
        print(f"✅ Índice '{settings.OPENSEARCH_INDEX}' creado (dim={dim})")
    else:
        print(f"ℹ️  Índice '{settings.OPENSEARCH_INDEX}' ya existe")


def chunk_markdown(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Divide texto markdown en chunks cortos con overlap optimizado para RAM.
    """
    sections = re.split(r"\n(?=#{1,3} )", text)
    chunks   = []

    for section in sections:
        if len(section) <= chunk_size:
            if section.strip():
                chunks.append(section.strip())
        else:
            words    = section.split()
            current  = []
            char_count = 0

            for word in words:
                current.append(word)
                char_count += len(word) + 1

                if char_count >= chunk_size:
                    chunks.append(" ".join(current))
                    overlap_words = current[-overlap:] if overlap else []
                    current       = overlap_words
                    char_count    = sum(len(w) + 1 for w in overlap_words)

            if current:
                chunks.append(" ".join(current))

    return [c for c in chunks if len(c.strip()) > 50]


def ingestar_framework(client: OpenSearch, framework_key: str):
    """Indexa todos los documentos de un framework específico."""
    if framework_key not in FRAMEWORKS:
        print(f"❌ Framework desconocido: {framework_key}")
        return

    framework_nombre, doc_path = FRAMEWORKS[framework_key]

    if not doc_path.exists():
        print(f"⚠️  Archivo no encontrado: {doc_path}")
        return

    print(f"\n🔄 Ingestionando {framework_nombre} desde {doc_path.name}...")

    texto  = doc_path.read_text(encoding="utf-8")
    
    # OPTIMIZACIÓN RAM: Forzamos CHUNK_SIZE a 500 y OVERLAP a 50
    chunks = chunk_markdown(texto, chunk_size=500, overlap=50)
    print(f"   📄 {len(chunks)} chunks generados")

    print("   🧠 Generando embeddings...")
    vectors = embedding_service.embed_batch_sync(chunks)

    print("   📤 Indexando en OpenSearch...")
    indexed = 0

    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        doc_id = f"{framework_key}-{i:04d}"

        client.index(
            index=settings.OPENSEARCH_INDEX,
            id=doc_id,
            body={
                "content":   chunk,
                # Almacenamos el framework en minúsculas para hacer match exacto con el 'term filter'
                "framework": framework_nombre.lower(), 
                "source":    doc_path.name,
                "chunk_id":  doc_id,
                "embedding": vector,
            },
        )
        indexed += 1

    print(f"   ✅ {indexed} fragmentos indexados para {framework_nombre}")


def main():
    parser = argparse.ArgumentParser(description="Pipeline de ingestion RAG")
    parser.add_argument("--framework", help="Framework a ingestar (vue/next/react/...)")
    parser.add_argument("--all",       action="store_true", help="Ingestar todos los frameworks")
    # ── AGREGAMOS EL ARGUMENTO AQUÍ ────────────────────────────────────
    parser.add_argument("--recreate",   action="store_true", help="Elimina el índice existente antes de crear uno nuevo")
    args = parser.parse_args()

    client = OpenSearch(
        hosts=[settings.OPENSEARCH_URL],
        use_ssl=False,
        verify_certs=False,
    )

    try:
        # ── LÓGICA PARA BORRAR EL ÍNDICE SI SE PASA --recreate ─────────
        if args.recreate:
            if client.indices.exists(index=settings.OPENSEARCH_INDEX):
                client.indices.delete(index=settings.OPENSEARCH_INDEX)
                print(f"🗑️ Índice antiguo '{settings.OPENSEARCH_INDEX}' eliminado completamente.")
        
        crear_indice(client)

        if args.all:
            for fw_key in FRAMEWORKS:
                ingestar_framework(client, fw_key)
        elif args.framework:
            ingestar_framework(client, args.framework)
        else:
            print("Usa --framework <nombre> o --all")
            print(f"Frameworks disponibles: {list(FRAMEWORKS.keys())}")

    finally:
        client.close()

    print("\n🎉 Ingestion completada")


if __name__ == "__main__":
    asyncio.run(main())