import json
import re
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.core.prompts import get_junior_prompt


# -----------------------------
# 🔹 GENERAR PREGUNTAS
# -----------------------------
async def generar_evaluacion_llm(contexto: str, framework: str) -> dict:

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=500,
        num_ctx=1536
    )

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

    try:
        respuesta = await llm.ainvoke(messages)
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
# 🔥 ANALIZAR CÓDIGO (ULTRA PRO)
# -----------------------------
async def analizar_codigo_llm(codigo: str, framework: str) -> dict:

    print("⚡ Analizando código...")

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=350,
        num_ctx=1024
    )

    esquema = """
{
  "calidad_codigo": "string",
  "errores_detectados": ["string"],
  "buenas_practicas": ["string"],
  "recomendaciones": ["string"]
}
"""

    prompt = f"""
Eres un ingeniero senior experto en revisión de código frontend (React, Vue, Angular, Astro).

Analiza el código y responde SOLO en JSON válido.

⚠ REGLAS CRÍTICAS:
- NO devuelvas texto fuera del JSON
- NO devuelvas "properties"
- NO devuelvas schema
- SIEMPRE usa arrays en:
  errores_detectados
  buenas_practicas
  recomendaciones

Formato obligatorio:
{esquema}
"""

    codigo_recortado = codigo[:2000]

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"Código en {framework}:\n\n{codigo_recortado}")
    ]

    try:
        respuesta = await llm.ainvoke(messages)

        print("🧠 RAW:", respuesta.content)

        data = _safe_json_load(respuesta.content)

        return {
            "calidad_codigo": data.get("calidad_codigo", ""),
            "errores_detectados": _asegurar_lista(data.get("errores_detectados")),
            "buenas_practicas": _asegurar_lista(data.get("buenas_practicas")),
            "recomendaciones": _asegurar_lista(data.get("recomendaciones"))
        }

    except Exception as e:
        print("❌ ERROR EN ANÁLISIS:", e)

        return {
            "calidad_codigo": "",
            "errores_detectados": ["No se pudo analizar el código"],
            "buenas_practicas": [],
            "recomendaciones": [f"Error interno: {str(e)}"]
        }


# -----------------------------
# 🧠 UTILIDADES PRO (CLAVE)
# -----------------------------

def _asegurar_lista(valor):
    """Convierte cualquier cosa a lista segura"""
    if isinstance(valor, list):
        return valor
    elif isinstance(valor, str) and valor.strip():
        return [valor]
    return []


def _safe_json_load(texto: str) -> dict:
    """
    🔥 Intenta parsear JSON incluso si el modelo devuelve basura
    """

    try:
        return json.loads(texto)
    except:
        # 🔥 intenta extraer JSON dentro de texto
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass

    print("⚠ JSON inválido, devolviendo vacío")
    return {}