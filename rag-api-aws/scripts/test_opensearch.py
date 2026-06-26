#!/usr/bin/env python
"""
Script de diagnóstico para verificar documentos en OpenSearch.
Ejecutar: python -m scripts.test_opensearch

Este script verifica:
1. Qué documentos tiene OpenSearch por framework
2. Si el filtro por framework funciona correctamente
3. Cuántos documentos hay de Vue.js vs Next.js
"""

import asyncio
import sys
import os
from pathlib import Path

# Añadir el directorio raíz al path para poder importar app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.rag.retriever.vector_store import VectorStoreRetriever
import logging

# Configurar logging para ver detalles
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def diagnosticar_opensearch():
    """Diagnóstico completo de OpenSearch."""
    
    print("\n" + "=" * 80)
    print("🔍 DIAGNÓSTICO DE OPENSEARCH")
    print("=" * 80 + "\n")
    
    # ── 1. Conectar a OpenSearch ──────────────────────────────────────
    print("📡 1. CONECTANDO A OPENSEARCH...")
    retriever = VectorStoreRetriever()
    
    try:
        await retriever.connect()
        print("✅ Conexión exitosa\n")
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return
    
    # ── 2. Verificar documentos por framework ────────────────────────
    print("📊 2. VERIFICANDO DOCUMENTOS POR FRAMEWORK")
    print("-" * 60)
    
    frameworks = ["Vue.js", "Next.js", "React", "TypeScript", "JavaScript", "CSS"]
    framework_counts = {}
    
    for fw in frameworks:
        try:
            results = await retriever.buscar_raw(
                query=f"best practices {fw} code review",
                framework=fw,
                top_k=20
            )
            
            count = len(results)
            framework_counts[fw] = count
            
            print(f"\n🔧 {fw}:")
            print(f"   📄 Documentos encontrados: {count}")
            
            if count > 0:
                print("   📋 Primeros 3 documentos:")
                for i, r in enumerate(results[:3], 1):
                    source = r.get('source', 'desconocido')
                    score = r.get('score', 0)
                    content_preview = r.get('content', '')[:100].replace('\n', ' ')
                    print(f"      {i}. {source} (score: {score:.3f})")
                    print(f"         {content_preview}...")
            else:
                print("   ⚠️  ¡No se encontraron documentos para este framework!")
                
        except Exception as e:
            print(f"   ❌ Error buscando {fw}: {e}")
    
    # ── 3. Resumen ─────────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("📊 RESUMEN DE DOCUMENTOS POR FRAMEWORK")
    print("-" * 60)
    
    for fw, count in sorted(framework_counts.items(), key=lambda x: x[1], reverse=True):
        status = "✅" if count > 0 else "❌"
        print(f"   {status} {fw}: {count} documentos")
    
    # ── 4. Verificar problema específico ──────────────────────────────
    print("\n" + "=" * 80)
    print("🎯 VERIFICACIÓN DEL PROBLEMA ESPECÍFICO")
    print("-" * 60)
    
    # Ver si hay documentos de Vue
    vue_count = framework_counts.get("Vue.js", 0)
    next_count = framework_counts.get("Next.js", 0)
    
    if vue_count == 0:
        print("❌ ¡PROBLEMA DETECTADO! No hay documentos de Vue.js en OpenSearch")
        print("   Esto explica por qué el RAG devuelve documentos de Next.js")
        print("\n   🛠️ SOLUCIÓN: Debes indexar documentos de Vue.js")
        print("   1. Asegúrate de que ingestion/docs/vue.md existe")
        print("   2. Ejecuta el script de ingestión:")
        print("      python -m ingestion.ingest")
    elif vue_count > 0 and next_count > vue_count:
        print(f"⚠️  Hay {vue_count} documentos de Vue, pero {next_count} de Next.js")
        print("   El RAG puede priorizar Next.js si la query no es específica")
    elif vue_count > 0 and vue_count >= next_count:
        print(f"✅ Hay suficientes documentos de Vue ({vue_count} vs {next_count} de Next.js)")
        print("   El problema probablemente está en la query o en el filtro")
    
    # ── 5. Verificar metadata ──────────────────────────────────────────
    print("\n" + "=" * 80)
    print("🔍 VERIFICANDO METADATA DE DOCUMENTOS")
    print("-" * 60)
    
    # Buscar un documento de Vue específico
    if vue_count > 0:
        results = await retriever.buscar_raw(
            query="Vue Composition API",
            framework="Vue.js",
            top_k=3
        )
        
        if results:
            print("📄 Ejemplo de documento Vue:")
            r = results[0]
            print(f"   Source: {r.get('source')}")
            print(f"   Framework: {r.get('framework')}")
            print(f"   Chunk ID: {r.get('chunk_id')}")
            print(f"   Content preview: {r.get('content', '')[:200]}...")
            
            # Verificar que el campo framework está correcto
            if r.get('framework') == 'Vue.js':
                print("   ✅ Campo 'framework' correcto: Vue.js")
            else:
                print(f"   ❌ Campo 'framework' incorrecto: {r.get('framework')}")
    
    # ── 6. Verificar la query que usa el RAG ──────────────────────────
    print("\n" + "=" * 80)
    print("🧪 SIMULANDO LA QUERY DEL RAG")
    print("-" * 60)
    
    # Esta es la query que usa RAGService.analizar_codigo
    test_queries = [
        "Vue.js Composition API script setup Vue reactive ref computed",
        "Next.js App Router Server Components",
    ]
    
    for query in test_queries:
        print(f"\n📝 Query: {query}")
        results = await retriever.buscar_raw(query=query, top_k=5)
        print(f"   Resultados: {len(results)}")
        
        # Verificar qué frameworks aparecen
        frameworks_encontrados = {}
        for r in results:
            fw = r.get('framework', 'unknown')
            frameworks_encontrados[fw] = frameworks_encontrados.get(fw, 0) + 1
        
        print("   Frameworks encontrados:")
        for fw, count in frameworks_encontrados.items():
            print(f"      - {fw}: {count}")
    
    # ── 7. Cerrar conexión ─────────────────────────────────────────────
    retriever.close()
    
    print("\n" + "=" * 80)
    print("✅ DIAGNÓSTICO COMPLETADO")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(diagnosticar_opensearch())