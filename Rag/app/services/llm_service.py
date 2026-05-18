# app/services/llm_service.py
"""
Responsabilidad única: comunicación con el modelo LLM (Ollama).
NO accede a BD. NO contiene lógica de negocio. NO importa schemas de reportes.
"""

import json
import re

from langchain_community.chat_models import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.prompts import get_junior_prompt


# ================================================================
# 🔹 CONSTANTES
# ================================================================

NIVELES_VALIDOS    = {"Excelente", "Bueno", "Regular", "Deficiente", "Crítico"}
IMPACTOS_VALIDOS   = {"alto", "medio", "bajo"}
PRIORIDADES_VALIDAS = {"alta", "media", "baja"}

_ESQUEMA_EVALUACION = """
{
  "pregunta_practica": "string",
  "comprension_a_evaluar": "string",
  "explicacion_codigo_esperado": "string",
  "error_por_falta_de_contexto": "string"
}
"""

_ESQUEMA_ANALISIS = """
{
  "calificacion_general": {
    "nivel": "Excelente | Bueno | Regular | Deficiente | Crítico",
    "puntaje": 0,
    "resumen": "string"
  },
  "errores": [
    {
      "tipo": "Sintaxis | Lógica | Performance | Seguridad | Arquitectura | Estilo",
      "descripcion": "string",
      "impacto": "alto | medio | bajo",
      "linea_aproximada": "string"
    }
  ],
  "buenas_practicas": ["string"],
  "malas_practicas": ["string"],
  "recomendaciones": [
    {
      "mensaje": "string",
      "solucion": "string",
      "prioridad": "alta | media | baja"
    }
  ],
  "evaluacion_tecnica": {
    "manejo_estado": "string",
    "legibilidad": "string",
    "arquitectura": "string",
    "performance": "string"
  }
}
"""


# ================================================================
# 🔹 GENERAR PREGUNTA DE ENTREVISTA
# ================================================================

async def generar_evaluacion_llm(contexto: str, framework: str) -> dict:
    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=500,
        num_ctx=1536,
    )

    system_prompt = get_junior_prompt(framework)
    prompt_completo = (
        f"{system_prompt}\n\n"
        "⚠ Responde SOLO en JSON válido. "
        "NO agregues texto fuera del JSON.\n\n"
        f"Formato obligatorio:\n{_ESQUEMA_EVALUACION}"
    )

    messages = [
        SystemMessage(content=prompt_completo),
        HumanMessage(content=f"Contexto técnico:\n{contexto[:1500]}"),
    ]

    try:
        respuesta = await llm.ainvoke(messages)
        data = _safe_json_load(respuesta.content)
        return {
            "pregunta_practica":          data.get("pregunta_practica", ""),
            "comprension_a_evaluar":      data.get("comprension_a_evaluar", ""),
            "explicacion_codigo_esperado": data.get("explicacion_codigo_esperado", ""),
            "error_por_falta_de_contexto": data.get("error_por_falta_de_contexto", ""),
        }
    except Exception as e:
        return {
            "pregunta_practica":          "",
            "comprension_a_evaluar":      "",
            "explicacion_codigo_esperado": "",
            "error_por_falta_de_contexto": f"Error LLM: {str(e)}",
        }


# ================================================================
# 🔹 ANALIZAR CÓDIGO
# ================================================================

async def analizar_codigo_llm(
    codigo: str,
    framework: str,
    contexto_proyecto: str = "",
) -> dict:
    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=800,
        num_ctx=4096,
    )

    prompt = (
        f"Eres un ingeniero senior con 10+ años de experiencia en revisión de código frontend.\n\n"
        f"Analiza el código {framework} considerando arquitectura, imports y composición de componentes.\n\n"
        "Responde ÚNICAMENTE en JSON válido.\n\n"
        "⚠ REGLAS:\n"
        "1. nivel: 'Excelente'|'Bueno'|'Regular'|'Deficiente'|'Crítico'\n"
        "2. puntaje: entero 0-100\n"
        "3. errores → lista: tipo, descripcion, impacto, linea_aproximada\n"
        "4. buenas_practicas / malas_practicas → solo strings\n"
        "5. recomendaciones → lista: mensaje, solucion, prioridad\n"
        "6. evaluacion_tecnica → manejo_estado, legibilidad, arquitectura, performance\n\n"
        "ESCALA: 90-100 Excelente | 70-89 Bueno | 50-69 Regular | 30-49 Deficiente | 0-29 Crítico\n\n"
        f"Formato:\n{_ESQUEMA_ANALISIS}"
    )

    human_content = f"=== CÓDIGO PRINCIPAL ===\n\n{codigo[:2500]}"
    if contexto_proyecto:
        human_content += f"\n\n=== CONTEXTO DEL PROYECTO ===\n\n{contexto_proyecto[:4000]}"

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=human_content),
    ]

    try:
        respuesta = await llm.ainvoke(messages)
        data = _safe_json_load(respuesta.content)
        return _construir_respuesta_analisis(data)
    except Exception as e:
        return _respuesta_error_analisis(str(e))


# ================================================================
# 🔹 CONSTRUCCIÓN Y NORMALIZACIÓN (privado al módulo)
# ================================================================

def _construir_respuesta_analisis(data: dict) -> dict:
    cal = data.get("calificacion_general", {})
    return {
        "calificacion_general": {
            "nivel":   _normalizar_nivel(cal.get("nivel", "Regular")),
            "puntaje": _normalizar_puntaje(cal.get("puntaje", 50)),
            "resumen": cal.get("resumen", "No se pudo generar un resumen."),
        },
        "errores":           _normalizar_errores(data.get("errores")),
        "buenas_practicas":  _asegurar_lista_strings(data.get("buenas_practicas")),
        "malas_practicas":   _asegurar_lista_strings(data.get("malas_practicas")),
        "recomendaciones":   _normalizar_recomendaciones(data.get("recomendaciones")),
        "evaluacion_tecnica": _normalizar_evaluacion_tecnica(data.get("evaluacion_tecnica")),
    }


def _respuesta_error_analisis(error: str) -> dict:
    return {
        "calificacion_general": {
            "nivel": "Crítico", "puntaje": 0,
            "resumen": "No fue posible analizar el código. Verifica que sea código válido e intenta nuevamente.",
        },
        "errores": [{"tipo": "Sistema", "descripcion": f"Error interno: {error}", "impacto": "alto", "linea_aproximada": None}],
        "buenas_practicas": [],
        "malas_practicas":  [],
        "recomendaciones":  [{"mensaje": "El código no pudo ser procesado.", "solucion": "Envía código válido y legible.", "prioridad": "alta"}],
        "evaluacion_tecnica": {"manejo_estado": "No evaluado", "legibilidad": "No evaluado", "arquitectura": "No evaluado", "performance": "No evaluado"},
    }


def _normalizar_nivel(nivel: str) -> str:
    if nivel in NIVELES_VALIDOS:
        return nivel
    mapa = {"excellent": "Excelente", "good": "Bueno", "regular": "Regular",
            "deficient": "Deficiente", "critical": "Crítico"}
    return mapa.get(nivel.lower(), "Regular")


def _normalizar_puntaje(puntaje) -> int:
    try:
        return max(0, min(100, int(puntaje)))
    except (ValueError, TypeError):
        return 50


def _asegurar_lista_strings(valor) -> list:
    if not isinstance(valor, list):
        return []
    result = []
    for item in valor:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            for key in ("mensaje", "descripcion", "texto", "text"):
                if key in item:
                    result.append(str(item[key]))
                    break
    return result


def _normalizar_errores(lista) -> list:
    if not isinstance(lista, list):
        return []
    resultado = []
    for item in lista:
        if isinstance(item, dict):
            impacto = item.get("impacto", "medio")
            resultado.append({
                "tipo":             item.get("tipo", "General"),
                "descripcion":      item.get("descripcion", item.get("mensaje", "Error no especificado")),
                "impacto":          impacto if impacto in IMPACTOS_VALIDOS else "medio",
                "linea_aproximada": item.get("linea_aproximada"),
            })
        elif isinstance(item, str):
            resultado.append({"tipo": "General", "descripcion": item, "impacto": "medio", "linea_aproximada": None})
    return resultado


def _normalizar_recomendaciones(lista) -> list:
    if not isinstance(lista, list):
        return []
    resultado = []
    for item in lista:
        if isinstance(item, dict):
            prioridad = item.get("prioridad", "media")
            resultado.append({
                "mensaje":  item.get("mensaje", "Sin mensaje"),
                "solucion": item.get("solucion", "Sin solución"),
                "prioridad": prioridad if prioridad in PRIORIDADES_VALIDAS else "media",
            })
        elif isinstance(item, str):
            resultado.append({"mensaje": item, "solucion": "No especificada", "prioridad": "media"})
    return resultado


def _normalizar_evaluacion_tecnica(data) -> dict:
    base = {"manejo_estado": "No evaluado", "legibilidad": "No evaluado",
            "arquitectura": "No evaluado", "performance": "No evaluado"}
    if isinstance(data, dict):
        for key in base:
            if data.get(key):
                base[key] = str(data[key])
    return base


def _safe_json_load(texto: str) -> dict:
    try:
        return json.loads(texto)
    except Exception:
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}