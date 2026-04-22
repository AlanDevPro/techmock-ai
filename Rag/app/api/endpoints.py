from fastapi import APIRouter
from app.schemas.evaluations import RespuestaEvaluacion
from app.services.llm_service import generar_evaluacion_llm
import os

router = APIRouter()

# Rutas de base de datos de contexto interna
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VUE_FILE = os.path.join(BASE_DIR, "data", "vue_context.txt")
NEXT_FILE = os.path.join(BASE_DIR, "data", "next_context.txt")

def leer_archivo_interno(ruta: str) -> str:
    """Extrae la información interna sin saturar memoria."""
    try:
        with open(ruta, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "No existe conocimiento técnico indexado sobre este framework."

@router.get("/generar-preguntas/vue", response_model=RespuestaEvaluacion)
async def generar_preguntas_vue_get():
    contexto = leer_archivo_interno(VUE_FILE)
    # Se introduce await para garantizar velocidad sobre el thread de FastAPI
    return await generar_evaluacion_llm(contexto, "Vue.js")

@router.get("/generar-preguntas/next", response_model=RespuestaEvaluacion)
async def generar_preguntas_next_get():
    contexto = leer_archivo_interno(NEXT_FILE)
    # Se introduce await para garantizar velocidad sobre el thread de FastAPI
    return await generar_evaluacion_llm(contexto, "Next.js")
