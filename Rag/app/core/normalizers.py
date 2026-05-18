"""
Funciones de normalización para respuestas del LLM.
Sanitizan y transforman datos antes de enviarlos al frontend.
"""

import os
from app.core.config import settings

# Constantes
IMPACTOS_VALIDOS = {"alto", "medio", "bajo"}
PRIORIDADES_VALIDAS = {"alta", "media", "baja"}
NIVELES_VALIDOS = {"Excelente", "Bueno", "Regular", "Deficiente", "Crítico"}


def normalizar_recomendaciones(recs) -> list:
    """Normaliza las recomendaciones del LLM"""
    if not isinstance(recs, list):
        return []
    
    resultado = []
    for r in recs:
        if not isinstance(r, dict):
            continue
        
        prioridad = r.get("prioridad", "media")
        if prioridad not in PRIORIDADES_VALIDAS:
            prioridad = "media"
        
        solucion = (
            r.get("solucion")
            or r.get("solución")
            or r.get("fix")
            or r.get("corrección")
            or ""
        )
        
        resultado.append({
            "mensaje": r.get("mensaje") or r.get("descripcion") or r.get("message") or "",
            "solucion": solucion,
            "prioridad": prioridad,
        })
    
    return resultado


def normalizar_errores(errores) -> list:
    """Normaliza los errores detectados por el LLM"""
    if not isinstance(errores, list):
        return []
    
    resultado = []
    for e in errores:
        if not isinstance(e, dict):
            continue
        
        impacto = e.get("impacto", "medio")
        if impacto not in IMPACTOS_VALIDOS:
            impacto = "medio"
        
        # ✅ Validar que linea sea número
        linea_raw = e.get("linea_aproximada") or e.get("linea") or e.get("line")
        if linea_raw is not None:
            try:
                linea_aprox = int(linea_raw) if str(linea_raw).isdigit() else None
            except (ValueError, TypeError):
                linea_aprox = None
        else:
            linea_aprox = None
        
        resultado.append({
            "tipo": e.get("tipo") or e.get("type") or "general",
            "descripcion": e.get("descripcion") or e.get("descripción") or e.get("description") or "",
            "impacto": impacto,
            "linea_aproximada": linea_aprox,  # ✅ Ahora es int o None
        })
    
    return resultado


def normalizar_calificacion(cal) -> dict:
    """Normaliza la calificación general"""
    if not isinstance(cal, dict):
        return {"nivel": "Regular", "puntaje": 50, "resumen": "Sin resumen disponible."}
    
    nivel = cal.get("nivel", "Regular")
    if nivel not in NIVELES_VALIDOS:
        nivel = "Regular"
    
    try:
        puntaje = int(cal.get("puntaje", 50))
        puntaje = max(0, min(100, puntaje))
    except (TypeError, ValueError):
        puntaje = 50
    
    return {
        "nivel": nivel,
        "puntaje": puntaje,
        "resumen": cal.get("resumen") or cal.get("summary") or "Sin resumen disponible.",
    }


def normalizar_evaluacion_tecnica(ev) -> dict:
    """Normaliza la evaluación técnica detallada"""
    default = "No evaluado."
    
    if not isinstance(ev, dict):
        return {
            "manejo_estado": default,
            "legibilidad": default,
            "arquitectura": default,
            "performance": default,
        }
    
    return {
        "manejo_estado": ev.get("manejo_estado") or ev.get("estado") or default,
        "legibilidad": ev.get("legibilidad") or ev.get("claridad") or default,
        "arquitectura": ev.get("arquitectura") or default,
        "performance": ev.get("performance") or ev.get("rendimiento") or default,
    }


def normalizar_lista_strings(valor) -> list:
    """Normaliza listas de strings"""
    if not isinstance(valor, list):
        return []
    return [str(item) for item in valor if item]


def normalizar_resultado_llm(resultado: dict) -> dict:
    """Normaliza el resultado completo del LLM"""
    print("🧠 Normalizando respuesta LLM...")
    
    return {
        "calificacion_general": normalizar_calificacion(resultado.get("calificacion_general")),
        "errores": normalizar_errores(resultado.get("errores", [])),
        "buenas_practicas": normalizar_lista_strings(resultado.get("buenas_practicas", [])),
        "malas_practicas": normalizar_lista_strings(resultado.get("malas_practicas", [])),
        "recomendaciones": normalizar_recomendaciones(resultado.get("recomendaciones", [])),
        "evaluacion_tecnica": normalizar_evaluacion_tecnica(resultado.get("evaluacion_tecnica")),
    }


def leer_archivo_interno(ruta: str) -> str:
    """Lee archivos de contexto internos"""
    print(f"📖 Leyendo archivo: {ruta}")
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            contenido = f.read()
            print("✅ Archivo leído correctamente")
            return contenido
    except FileNotFoundError:
        print("⚠️ Archivo no encontrado")
        return "No existe conocimiento técnico indexado sobre este framework."


def extraer_proyecto_raiz(active_file: str) -> str:
    """
    Extrae el directorio raíz del proyecto a partir del archivo activo.
    Ejemplo: '/practica-vue/src/App.vue' → 'practica-vue'
    """
    if not active_file:
        return ""
    partes = active_file.replace("\\", "/").lstrip("/").split("/")
    return partes[0] if partes else ""


def construir_contexto_proyecto(
    active_file: str,
    files: dict,
    framework: str,
    max_files: int = 8,
    max_chars_per_file: int = 800
) -> str:
    """
    Construye un contexto textual del proyecto activo para que el LLM
    entienda la arquitectura, imports y composición.
    
    Filtra por proyecto raíz del archivo activo para evitar mezclar
    practica-vue con practica-nextjs u otros proyectos del workspace.
    """
    print("\n" + "="*80)
    print("📂 Construyendo contexto de proyecto...")
    print("="*80)
    print(f"📌 Framework declarado: {framework}")
    print(f"📌 Archivo activo: {active_file or '(ninguno)'}")
    print(f"📌 Total archivos recibidos: {len(files)}")

    if not files:
        print("⚠️ files está VACÍO — el contexto será vacío")
        print("="*80 + "\n")
        return ""

    # Detectar proyectos presentes
    proyectos_presentes = set()
    for ruta in files:
        raiz = ruta.replace("\\", "/").lstrip("/").split("/")[0]
        if raiz:
            proyectos_presentes.add(raiz)
    
    print(f"🗂️ Proyectos detectados: {sorted(proyectos_presentes)}")
    
    # Filtrar por proyecto raíz
    proyecto_root = extraer_proyecto_raiz(active_file)
    print(f"📁 Proyecto raíz detectado: '{proyecto_root}'")
    
    if proyecto_root:
        archivos_filtrados = {
            ruta: contenido
            for ruta, contenido in files.items()
            if ruta.replace("\\", "/").lstrip("/").startswith(proyecto_root)
        }
        archivos_excluidos = [
            ruta for ruta in files
            if ruta not in archivos_filtrados
        ]
    else:
        archivos_filtrados = dict(files)
        archivos_excluidos = []
    
    print(f"✅ Archivos incluidos: {len(archivos_filtrados)}")
    if archivos_excluidos:
        print(f"🚫 Archivos excluidos: {len(archivos_excluidos)}")
    
    # Seleccionar archivos prioritarios
    prioridad = [active_file] + [k for k in archivos_filtrados if k != active_file]
    seleccionados = prioridad[:max_files]
    
    print(f"📦 Archivos seleccionados para contexto (máx {max_files}):")
    chars_totales = 0
    
    for i, ruta in enumerate(seleccionados, 1):
        contenido = archivos_filtrados.get(ruta, "")
        chars_orig = len(contenido)
        chars_env = min(chars_orig, max_chars_per_file)
        chars_totales += chars_env
        truncado = "⚠️ TRUNCADO" if chars_orig > max_chars_per_file else "✅ completo"
        print(f"  {i}. {ruta} ({chars_orig} chars → {chars_env} chars) {truncado}")
    
    print(f"📊 Tamaño total contexto: ~{chars_totales} chars")
    print("="*80 + "\n")
    
    # Construir contexto
    lineas = [
        f"=== Estructura del proyecto ({framework}) ===",
        f"Proyecto raíz: {proyecto_root or 'desconocido'}",
        f"Archivo activo: {active_file}",
        "",
    ]
    
    for ruta in seleccionados:
        contenido = archivos_filtrados.get(ruta, "")
        if not contenido:
            continue
        
        preview = contenido[:max_chars_per_file]
        if len(contenido) > max_chars_per_file:
            preview += "\n... (truncado)"
        
        lineas.append(f"--- {ruta} ---")
        lineas.append(preview)
        lineas.append("")
    
    return "\n".join(lineas)