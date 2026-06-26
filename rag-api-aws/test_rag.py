# Crea un script de prueba: test_opensearch.py
import asyncio
from app.services.rag.retriever.vector_store import VectorStoreRetriever

async def test():
    retriever = VectorStoreRetriever()
    await retriever.connect()
    
    # Buscar documentos de Vue
    results_vue = await retriever.buscar_raw(
        query="Vue Composition API",
        framework="Vue.js",
        top_k=10
    )
    print(f"📊 Documentos de Vue encontrados: {len(results_vue)}")
    for r in results_vue[:3]:
        print(f"  - {r.get('source')} | framework: {r.get('framework')}")
    
    # Buscar documentos de Next.js
    results_next = await retriever.buscar_raw(
        query="Next.js App Router",
        framework="Next.js",
        top_k=10
    )
    print(f"📊 Documentos de Next.js encontrados: {len(results_next)}")
    for r in results_next[:3]:
        print(f"  - {r.get('source')} | framework: {r.get('framework')}")

asyncio.run(test())