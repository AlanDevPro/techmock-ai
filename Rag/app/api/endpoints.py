import uuid
import os
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.api.deps import get_db
from app.db import repositories as repo

print("📦 Importando llm_service...")
from app.services.llm_service import generar_evaluacion_llm, analizar_codigo_llm
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

# IDs fijos de tecnología y nivel en la BD
# (ajustar una vez que tengas datos seed en la tabla tecnologias/niveles_dificultad)
TECH_SLUGS = {
    "Vue.js": "vuejs",
    "Next.js": "nextjs",
}
NIVEL_DEFAULT = "Intermedio"


def leer_archivo_interno(ruta: str) -> str:
    print(f"📖 Leyendo archivo: {ruta}")
    try:
        with open(ruta, "r", encoding="utf-8") as f:
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
async def generar_preguntas_vue_get(
    request: Request,
    usuario_id: str = None,       # Opcional: UUID del usuario autenticado
    db: AsyncSession = Depends(get_db),
):
    """
    Genera una pregunta técnica de Vue.js con el LLM y la persiste en la BD.
    Crea también una sesión de entrevista si se provee usuario_id.
    """
    print("👉 Endpoint Vue llamado")
    contexto = leer_archivo_interno(VUE_FILE)
    resultado = await generar_evaluacion_llm(contexto, "Vue.js")

    # Persistir pregunta en BD si tenemos datos de tecnología/nivel
    sesion = await _persistir_pregunta_y_sesion(
        db=db,
        framework="Vue.js",
        resultado=resultado,
        contexto=contexto,
        usuario_id=usuario_id,
        request=request,
    )

    # Si se creó una sesión, añadir el sesion_id a la respuesta
    if sesion:
        resultado["sesion_id"] = str(sesion.id)

    return resultado


@router.get("/generar-preguntas/next", response_model=RespuestaEvaluacion)
async def generar_preguntas_next_get(
    request: Request,
    usuario_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera una pregunta técnica de Next.js con el LLM y la persiste en la BD.
    """
    print("👉 Endpoint Next llamado")
    contexto = leer_archivo_interno(NEXT_FILE)
    resultado = await generar_evaluacion_llm(contexto, "Next.js")

    sesion = await _persistir_pregunta_y_sesion(
        db=db,
        framework="Next.js",
        resultado=resultado,
        contexto=contexto,
        usuario_id=usuario_id,
        request=request,
    )

    # Si se creó una sesión, añadir el sesion_id a la respuesta
    if sesion:
        resultado["sesion_id"] = str(sesion.id)

    return resultado


# -----------------------------
# 🔥 ENDPOINT ANALIZAR CÓDIGO PRO
# -----------------------------

@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Analiza el código enviado con el LLM y persiste el resultado.
    Espera opcionalmente sesion_id y usuario_id en el body.
    """
    print("👉 Endpoint analizar código llamado")

    codigo = data.get("codigo", "").strip()
    framework = data.get("framework", "general").strip()
    sesion_id_str = data.get("sesion_id")       # UUID de sesión existente (opcional)
    usuario_id_str = data.get("usuario_id")     # UUID del usuario (opcional)

    if not codigo:
        print("❌ Código vacío")
        raise HTTPException(
            status_code=400,
            detail="El campo 'codigo' es requerido y no puede estar vacío.",
        )

    if len(codigo) > 10_000:
        print("❌ Código demasiado largo")
        raise HTTPException(
            status_code=413,
            detail="El código excede el límite de 10,000 caracteres.",
        )

    print("⏳ Enviando código a LLM...")
    resultado = await analizar_codigo_llm(codigo, framework)

    # Persistir envío + evaluación si hay sesión activa
    if sesion_id_str:
        await _persistir_analisis_codigo(
            db=db,
            sesion_id_str=sesion_id_str,
            codigo=codigo,
            framework=framework,
            resultado=resultado,
        )

    return resultado


# =============================================================
# 🔧 HELPERS INTERNOS
# =============================================================

async def _persistir_pregunta_y_sesion(
    db: AsyncSession,
    framework: str,
    resultado: dict,
    contexto: str,
    usuario_id: str | None,
    request: Request,
):
    """
    Guarda la pregunta generada y opcionalmente crea una sesión de entrevista.
    Retorna la sesión creada (o None si no se creó).
    Falla silenciosamente para no interrumpir la respuesta al frontend.
    """
    sesion = None
    
    try:
        slug = TECH_SLUGS.get(framework)
        if not slug:
            print(f"⚠️ Slug no encontrado para framework: {framework}")
            return None

        # Buscar tecnología y nivel en BD
        tecnologia = await repo.get_tecnologia_por_slug(db, slug)
        nivel = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)

        if not tecnologia or not nivel:
            print(f"⚠️ Tecnología '{slug}' o nivel '{NIVEL_DEFAULT}' no encontrados en BD")
            print("💡 Asegúrate de tener datos seed en las tablas tecnologias y niveles_dificultad")
            return None

        # Crear pregunta
        enunciado = resultado.get("pregunta_practica", "Sin enunciado")
        titulo = enunciado[:100] if enunciado else f"Pregunta {framework}"

        pregunta = await repo.crear_pregunta(
            db=db,
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            titulo=titulo,
            enunciado=enunciado,
            prompt_contexto=contexto[:500],
            creada_por=uuid.UUID(usuario_id) if usuario_id else None,
        )

        # Crear sesión si hay usuario autenticado
        if usuario_id:
            ip = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

            sesion = await repo.crear_sesion(
                db=db,
                usuario_id=uuid.UUID(usuario_id),
                tecnologia_id=tecnologia.id,
                nivel_id=nivel.id,
                pregunta_id=pregunta.id,
                ip_usuario=ip,
                user_agent=user_agent,
            )
            
            print(f"✅ Sesión creada con ID: {sesion.id if sesion else 'None'}")

    except Exception as e:
        print(f"⚠️ Error persistiendo pregunta/sesión (no bloquea respuesta): {e}")
    
    return sesion


async def _persistir_analisis_codigo(
    db: AsyncSession,
    sesion_id_str: str,
    codigo: str,
    framework: str,
    resultado: dict,
) -> None:
    """
    Guarda el código enviado y la evaluación del LLM en la BD.
    Falla silenciosamente para no interrumpir la respuesta al frontend.
    """
    try:
        sesion_id = uuid.UUID(sesion_id_str)

        # Verificar que la sesión existe
        sesion = await repo.get_sesion_por_id(db, sesion_id)
        if not sesion:
            print(f"⚠️ Sesión {sesion_id} no encontrada, no se guarda el análisis")
            return

        # Guardar código enviado
        await repo.guardar_envio_codigo(
            db=db,
            sesion_id=sesion_id,
            lenguaje=framework,
            codigo=codigo,
            es_envio_final=True,
        )

        # Guardar evaluación
        cal = resultado.get("calificacion_general", {})
        puntaje = cal.get("puntaje", 0)
        resumen = cal.get("resumen", "Sin resumen")

        buenas = resultado.get("buenas_practicas", [])
        malas = resultado.get("malas_practicas", [])

        await repo.guardar_evaluacion(
            db=db,
            sesion_id=sesion_id,
            puntaje_total=float(puntaje),
            feedback_general=resumen,
            fortalezas="\n".join(buenas) if buenas else None,
            areas_mejora="\n".join(malas) if malas else None,
            modelo_ia_usado="qwen2.5-coder:1.5b",
        )

        # Marcar sesión como completada
        await repo.finalizar_sesion(db=db, sesion_id=sesion_id)
        
        print(f"✅ Análisis de código persistido para sesión {sesion_id}")

    except Exception as e:
        print(f"⚠️ Error persistiendo análisis de código (no bloquea respuesta): {e}")