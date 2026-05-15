from fastapi import APIRouter, HTTPException
from typing import Optional
from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo, RespuestaDificultadPreview
import os

print("📦 Importando llm_service...")
from app.services.llm_service import generar_evaluacion_llm, analizar_codigo_llm, preview_dificultad
print("✅ llm_service importado")

print("📦 Creando router...")
router = APIRouter()
print("✅ Router creado")

# -----------------------------
# 🔹 ARCHIVOS DE CONTEXTO
# -----------------------------
print("📦 Configurando rutas de archivos...")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VUE_FILE = os.path.join(BASE_DIR, "data", "vue_context.txt")
NEXT_FILE = os.path.join(BASE_DIR, "data", "next_context.txt")
print("✅ Rutas configuradas")


def leer_archivo_interno(ruta: str) -> str:
    print(f"📖 Leyendo archivo: {ruta}")
    try:
        with open(ruta, 'r', encoding='utf-8') as f:
            contenido = f.read()
            print("✅ Archivo leído correctamente")
            return contenido
    except FileNotFoundError:
        print("⚠️ Archivo no encontrado")
        return "No existe conocimiento técnico indexado sobre este framework."


# -----------------------------
# 🔹 ENDPOINTS DE PREGUNTAS
# -----------------------------
@router.get("/generar-preguntas/vue", response_model=RespuestaEvaluacion)
async def generar_preguntas_vue_get(session_id: Optional[str] = None):
    print("👉 Endpoint Vue llamado")
    contexto = leer_archivo_interno(VUE_FILE)
    return await generar_evaluacion_llm(contexto, "Vue.js", session_id=session_id)


@router.get("/generar-preguntas/next", response_model=RespuestaEvaluacion)
async def generar_preguntas_next_get(session_id: Optional[str] = None):
    print("👉 Endpoint Next llamado")
    contexto = leer_archivo_interno(NEXT_FILE)
    return await generar_evaluacion_llm(contexto, "Next.js", session_id=session_id)


@router.get("/preview-dificultad", response_model=RespuestaDificultadPreview)
async def preview_dificultad_get(
    session_id: Optional[str] = None,
    framework: Optional[str] = None,
):
    print("👉 Endpoint preview dificultad llamado")
    return await preview_dificultad(session_id=session_id, framework=framework)


# -----------------------------
# 🔥 ENDPOINT ANALIZAR CÓDIGO PRO
# -----------------------------
@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(data: dict):
    print("👉 Endpoint analizar código llamado")

    codigo = data.get("codigo", "").strip()
    framework = data.get("framework", "general").strip()
    session_id = data.get("session_id")
    timeout = bool(data.get("timeout"))
    strict = bool(data.get("strict", False))

    if not codigo:
        print("❌ Código vacío")
        raise HTTPException(
            status_code=400,
            detail="El campo 'codigo' es requerido y no puede estar vacío."
        )

    if len(codigo) > 10_000:
        print("❌ Código demasiado largo")
        raise HTTPException(
            status_code=413,
            detail="El código excede el límite de 10,000 caracteres."
        )

    print("⏳ Enviando código a LLM...")
    return await analizar_codigo_llm(
        codigo,
        framework,
        session_id=session_id,
        timeout=timeout,
        strict=strict,
    )