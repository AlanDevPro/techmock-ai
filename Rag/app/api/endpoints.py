from fastapi import APIRouter, HTTPException
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
# 🔥 ENDPOINT ANALIZAR CÓDIGO PRO
# -----------------------------
@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(data: dict):
    codigo = data.get("codigo", "").strip()
    framework = data.get("framework", "general").strip()

    if not codigo:
        raise HTTPException(
            status_code=400,
            detail="El campo 'codigo' es requerido y no puede estar vacío."
        )

    if len(codigo) > 10_000:
        raise HTTPException(
            status_code=413,
            detail="El código excede el límite de 10,000 caracteres."
        )

    return await analizar_codigo_llm(codigo, framework)