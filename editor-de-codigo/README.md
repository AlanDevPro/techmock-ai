enpoints.py:

from fastapi import APIRouter
from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.services.llm_service import generar_evaluacion_llm, analizar_codigo_llm
import os

router = APIRouter()

# -----------------------------
# 🔹 ARCHIVOS DE CONTEXTO
# -----------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VUE_FILE = os.path.join(BASE_DIR, "data", "vue_context.txt")
NEXT_FILE = os.path.join(BASE_DIR, "data", "next_context.txt")


def leer_archivo_interno(ruta: str) -> str:
    try:
        with open(ruta, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "No existe conocimiento técnico indexado sobre este framework."


# -----------------------------
# 🔹 ENDPOINTS DE PREGUNTAS
# -----------------------------
@router.get("/generar-preguntas/vue", response_model=RespuestaEvaluacion)
async def generar_preguntas_vue_get():
    contexto = leer_archivo_interno(VUE_FILE)
    return await generar_evaluacion_llm(contexto, "Vue.js")


@router.get("/generar-preguntas/next", response_model=RespuestaEvaluacion)
async def generar_preguntas_next_get():
    contexto = leer_archivo_interno(NEXT_FILE)
    return await generar_evaluacion_llm(contexto, "Next.js")


# -----------------------------
# 🔥 NUEVO ENDPOINT ANALIZAR CÓDIGO
# -----------------------------
@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(data: dict):
    codigo = data.get("codigo", "")
    framework = data.get("framework", "general")

    return await analizar_codigo_llm(codigo, framework)



evaluations.py:

from typing import Optional, List
from pydantic import BaseModel, Field


# -----------------------------
# 🔹 RESPUESTA ENTREVISTA
# -----------------------------
class RespuestaEvaluacion(BaseModel):
    pregunta_practica: Optional[str] = Field(
        default="",
        description="Enunciado de la prueba técnica"
    )
    comprension_a_evaluar: Optional[str] = Field(
        default="",
        description="Concepto técnico evaluado"
    )
    explicacion_codigo_esperado: Optional[str] = Field(
        default="",
        description="Explicación con código ideal"
    )
    error_por_falta_de_contexto: Optional[str] = Field(
        default=None,
        description="Error por falta de contexto"
    )


# -----------------------------
# 🔥 ITEM DE RECOMENDACIÓN PRO
# -----------------------------
class RecomendacionItem(BaseModel):
    mensaje: str = Field(
        description="Problema detectado en el código"
    )
    solucion: str = Field(
        description="Cómo solucionarlo correctamente"
    )


# -----------------------------
# 🔥 RESPUESTA ANÁLISIS PRO
# -----------------------------
class RespuestaAnalisisCodigo(BaseModel):
    calidad_codigo: str = Field(
        description="Evaluación general del código"
    )
    errores_detectados: List[str] = Field(
        default_factory=list,
        description="Lista de errores reales detectados"
    )
    buenas_practicas: List[str] = Field(
        default_factory=list,
        description="Buenas prácticas aplicadas"
    )
    recomendaciones: List[RecomendacionItem] = Field(
        default_factory=list,
        description="Recomendaciones detalladas con solución"
    )


llm_service.py:
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
  "recomendaciones": [
    {
      "mensaje": "string",
      "solucion": "string"
    }
  ]
}
"""

    prompt = f"""
Eres un ingeniero senior experto en revisión de código frontend.

Analiza el código y responde SOLO en JSON válido.

⚠ REGLAS CRÍTICAS (OBLIGATORIO):

- errores_detectados → SOLO strings
- buenas_practicas → SOLO strings
- recomendaciones → SOLO objetos con:
    - mensaje
    - solucion

❌ NUNCA hagas esto:
"errores_detectados": [{{ "mensaje": "...", "solucion": "..." }}]

✅ SIEMPRE haz esto:
"errores_detectados": ["texto", "texto"]

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
            "errores_detectados": _normalizar_errores(data.get("errores_detectados")),
            "buenas_practicas": _asegurar_lista(data.get("buenas_practicas")),
            "recomendaciones": _normalizar_recomendaciones(data.get("recomendaciones"))
        }

    except Exception as e:
        print("❌ ERROR EN ANÁLISIS:", e)

        return {
            "calidad_codigo": "",
            "errores_detectados": ["No se pudo analizar el código"],
            "buenas_practicas": [],
            "recomendaciones": [
                {
                    "mensaje": "Error interno",
                    "solucion": str(e)
                }
            ]
        }


# -----------------------------
# 🧠 UTILIDADES PRO (BLINDAJE)
# -----------------------------

def _asegurar_lista(valor):
    if isinstance(valor, list):
        return valor
    elif isinstance(valor, str) and valor.strip():
        return [valor]
    return []


def _normalizar_errores(lista):
    """Convierte objetos o strings a lista de strings"""
    resultado = []

    if not isinstance(lista, list):
        return []

    for item in lista:
        if isinstance(item, str):
            resultado.append(item)
        elif isinstance(item, dict):
            resultado.append(item.get("mensaje", "Error desconocido"))

    return resultado


def _normalizar_recomendaciones(lista):
    """Convierte cualquier cosa a formato válido de RecomendacionItem"""
    resultado = []

    if not isinstance(lista, list):
        return []

    for item in lista:
        if isinstance(item, dict):
            resultado.append({
                "mensaje": item.get("mensaje", "Sin mensaje"),
                "solucion": item.get("solucion", "Sin solución")
            })
        elif isinstance(item, str):
            resultado.append({
                "mensaje": item,
                "solucion": "No especificada"
            })

    return resultado


def _safe_json_load(texto: str) -> dict:
    try:
        return json.loads(texto)
    except:
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass

    print("⚠ JSON inválido, devolviendo vacío")
    return {}


si tengo esos codigos quiero que me des mis codigos completos pero con mejoras para que el analisis del codigo sea de forma pro y me de un feelback pro ya sea si el codigo es bueno o malo para que ayude al usuario a retroalimentarse con ese feelback del analisis del codigo que tenga esta respuesta json: {
  "calificacion_general": {
    "nivel": "string",
    "puntaje": 0,
    "resumen": "string"
  },
  "errores": [
    {
      "tipo": "string",
      "descripcion": "string",
      "impacto": "alto | medio | bajo",
      "linea_aproximada": "string"
    }
  ],
  "buenas_practicas": [
    "string"
  ],
  "malas_practicas": [
    "string"
  ],
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


o sino tambien dame un json mas bueno y profesional para retroalimentar al usuario dependiendo si su codigo fue bueno o malo dame el codigo completo cno estas mejoras de feelback