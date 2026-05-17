print("🔥 1 - inicio archivo")

import json
import re

print("🔥 2 - json/re OK")

from langchain_community.chat_models import ChatOllama
print("🔥 3 - ChatOllama importado")

from langchain_core.messages import SystemMessage, HumanMessage
print("🔥 4 - messages importado")

from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.core.prompts import get_junior_prompt

print("🔥 5 - imports completos")



# -----------------------------
# 🔹 GENERAR PREGUNTAS
# -----------------------------
async def generar_evaluacion_llm(contexto: str, framework: str) -> dict:
    print("🔥 6 - dentro de generar_evaluacion_llm")

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=500,
        num_ctx=1536
    )
    print("🔥 7 - ChatOllama creado en generar_evaluacion_llm")

    esquema = """
{
  "pregunta_practica": "string",
  "comprension_a_evaluar": "string",
  "explicacion_codigo_esperado": "string",
  "error_por_falta_de_contexto": "string"
}
"""

    system_prompt = get_junior_prompt(framework)

    prompt_completo = f"""
{system_prompt}

⚠ Responde SOLO en JSON válido.
NO agregues texto fuera del JSON.

Formato obligatorio:
{esquema}
"""

    messages = [
        SystemMessage(content=prompt_completo),
        HumanMessage(content=f"Contexto técnico:\n{contexto[:1500]}")
    ]
    print("🔥 8 - messages preparados, antes de llm.ainvoke")

    try:
        respuesta = await llm.ainvoke(messages)
        print("🔥 9 - llm.ainvoke completado")
        data = _safe_json_load(respuesta.content)

        return {
            "pregunta_practica": data.get("pregunta_practica", ""),
            "comprension_a_evaluar": data.get("comprension_a_evaluar", ""),
            "explicacion_codigo_esperado": data.get("explicacion_codigo_esperado", ""),
            "error_por_falta_de_contexto": data.get("error_por_falta_de_contexto", "")
        }

    except Exception as e:
        print("❌ ERROR GENERANDO PREGUNTAS:", e)
        return {
            "pregunta_practica": "",
            "comprension_a_evaluar": "",
            "explicacion_codigo_esperado": "",
            "error_por_falta_de_contexto": f"Error JSON: {str(e)}",
        }


# -----------------------------
# 🔥 ANALIZAR CÓDIGO (PRO FEEDBACK)
# -----------------------------
async def analizar_codigo_llm(
    codigo: str,
    framework: str,
    contexto_proyecto: str = "",
) -> dict:

    print("🔥 10 - dentro de analizar_codigo_llm")
    print("⚡ Iniciando análisis profesional de código...")

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=800,
        num_ctx=4096
    )

    print("🔥 11 - ChatOllama creado en analizar_codigo_llm")

    esquema = """
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

    prompt = f"""
Eres un ingeniero senior con 10+ años de experiencia en revisión de código frontend.

Tu objetivo es dar un feedback profesional, constructivo y accionable.

Analiza el código {framework} enviado por el usuario considerando también
el contexto completo del proyecto, arquitectura, imports, composición de componentes
y relación entre archivos.

Responde ÚNICAMENTE en JSON válido.

⚠ REGLAS CRÍTICAS:

1. calificacion_general.nivel DEBE ser uno de:
   "Excelente", "Bueno", "Regular", "Deficiente", "Crítico"

2. calificacion_general.puntaje DEBE ser un entero de 0 a 100

3. errores → lista de objetos:
   tipo, descripcion, impacto, linea_aproximada

4. buenas_practicas → SOLO strings

5. malas_practicas → SOLO strings

6. recomendaciones → lista de objetos:
   mensaje, solucion, prioridad

7. evaluacion_tecnica → objeto:
   manejo_estado, legibilidad, arquitectura, performance

ESCALA:
- 90-100 → Excelente
- 70-89  → Bueno
- 50-69  → Regular
- 30-49  → Deficiente
- 0-29   → Crítico

Formato obligatorio:
{esquema}
"""

    codigo_recortado = codigo[:2500]

    contexto_recortado = contexto_proyecto[:4000] if contexto_proyecto else ""

    human_content = f"""
=== CÓDIGO PRINCIPAL ===

{codigo_recortado}
"""

    if contexto_recortado:
        human_content += f"""

=== CONTEXTO DEL PROYECTO ===

{contexto_recortado}
"""

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=human_content)
    ]

    print("🔥 12 - messages preparados en analizar_codigo_llm")

    try:
        respuesta = await llm.ainvoke(messages)

        print("🔥 13 - llm.ainvoke completado en analizar_codigo_llm")

        print("🧠 RAW LLM:", respuesta.content[:300])

        data = _safe_json_load(respuesta.content)

        return _construir_respuesta_analisis(data)

    except Exception as e:
        print("❌ ERROR EN ANÁLISIS PRO:", e)

        return _respuesta_error_analisis(str(e))





# -----------------------------
# 🧠 CONSTRUCCIÓN RESPUESTA PRO
# -----------------------------

def _construir_respuesta_analisis(data: dict) -> dict:
    """Construye y normaliza la respuesta completa del análisis pro."""
    print("🔥 14 - dentro de _construir_respuesta_analisis")

    cal = data.get("calificacion_general", {})

    return {
        "calificacion_general": {
            "nivel": _normalizar_nivel(cal.get("nivel", "Regular")),
            "puntaje": _normalizar_puntaje(cal.get("puntaje", 50)),
            "resumen": cal.get("resumen", "No se pudo generar un resumen.")
        },
        "errores": _normalizar_errores_pro(data.get("errores")),
        "buenas_practicas": _asegurar_lista_strings(data.get("buenas_practicas")),
        "malas_practicas": _asegurar_lista_strings(data.get("malas_practicas")),
        "recomendaciones": _normalizar_recomendaciones_pro(data.get("recomendaciones")),
        "evaluacion_tecnica": _normalizar_evaluacion_tecnica(data.get("evaluacion_tecnica"))
    }


def _respuesta_error_analisis(error: str) -> dict:
    """Respuesta de fallback cuando hay un error interno."""
    print("🔥 15 - dentro de _respuesta_error_analisis")
    return {
        "calificacion_general": {
            "nivel": "Crítico",
            "puntaje": 0,
            "resumen": "No fue posible analizar el código. Verifica que sea código válido e intenta nuevamente."
        },
        "errores": [
            {
                "tipo": "Sistema",
                "descripcion": f"Error interno del analizador: {error}",
                "impacto": "alto",
                "linea_aproximada": None
            }
        ],
        "buenas_practicas": [],
        "malas_practicas": [],
        "recomendaciones": [
            {
                "mensaje": "El código no pudo ser procesado.",
                "solucion": "Asegúrate de enviar código válido y legible.",
                "prioridad": "alta"
            }
        ],
        "evaluacion_tecnica": {
            "manejo_estado": "No evaluado",
            "legibilidad": "No evaluado",
            "arquitectura": "No evaluado",
            "performance": "No evaluado"
        }
    }


# -----------------------------
# 🧠 UTILIDADES DE NORMALIZACIÓN
# -----------------------------

NIVELES_VALIDOS = {"Excelente", "Bueno", "Regular", "Deficiente", "Crítico"}
IMPACTOS_VALIDOS = {"alto", "medio", "bajo"}
PRIORIDADES_VALIDAS = {"alta", "media", "baja"}


def _normalizar_nivel(nivel: str) -> str:
    if nivel in NIVELES_VALIDOS:
        return nivel
    nivel_lower = nivel.lower()
    mapa = {
        "excellent": "Excelente", "good": "Bueno", "regular": "Regular",
        "deficient": "Deficiente", "critical": "Crítico"
    }
    return mapa.get(nivel_lower, "Regular")


def _normalizar_puntaje(puntaje) -> int:
    try:
        p = int(puntaje)
        return max(0, min(100, p))
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
            # Extraer cualquier campo de texto si viene como objeto por error
            for key in ("mensaje", "descripcion", "texto", "text"):
                if key in item:
                    result.append(str(item[key]))
                    break
    return result


def _normalizar_errores_pro(lista) -> list:
    """Normaliza la lista de errores al formato ErrorDetectado."""
    if not isinstance(lista, list):
        return []

    resultado = []
    for item in lista:
        if isinstance(item, dict):
            impacto = item.get("impacto", "medio")
            if impacto not in IMPACTOS_VALIDOS:
                impacto = "medio"
            resultado.append({
                "tipo": item.get("tipo", "General"),
                "descripcion": item.get("descripcion", item.get("mensaje", "Error no especificado")),
                "impacto": impacto,
                "linea_aproximada": item.get("linea_aproximada", None)
            })
        elif isinstance(item, str):
            resultado.append({
                "tipo": "General",
                "descripcion": item,
                "impacto": "medio",
                "linea_aproximada": None
            })
    return resultado


def _normalizar_recomendaciones_pro(lista) -> list:
    """Normaliza la lista de recomendaciones al formato RecomendacionItem pro."""
    if not isinstance(lista, list):
        return []

    resultado = []
    for item in lista:
        if isinstance(item, dict):
            prioridad = item.get("prioridad", "media")
            if prioridad not in PRIORIDADES_VALIDAS:
                prioridad = "media"
            resultado.append({
                "mensaje": item.get("mensaje", "Sin mensaje"),
                "solucion": item.get("solucion", "Sin solución"),
                "prioridad": prioridad
            })
        elif isinstance(item, str):
            resultado.append({
                "mensaje": item,
                "solucion": "No especificada",
                "prioridad": "media"
            })
    return resultado


def _normalizar_evaluacion_tecnica(data) -> dict:
    """Garantiza que evaluacion_tecnica tenga todos sus campos."""
    base = {
        "manejo_estado": "No evaluado",
        "legibilidad": "No evaluado",
        "arquitectura": "No evaluado",
        "performance": "No evaluado"
    }
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

    print("⚠ JSON inválido del LLM, devolviendo vacío")
    return {}