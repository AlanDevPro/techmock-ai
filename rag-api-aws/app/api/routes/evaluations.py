"""
Endpoints de evaluación de código y preguntas técnicas.
VERSIÓN REFACTORIZADA: usa API LLM (Groq/OpenAI/Anthropic) en vez de Ollama local.

CAMBIOS PRINCIPALES vs versión anterior:
  1. leer_archivo_interno() → retriever.buscar() (RAG semántico real)
  2. generar_evaluacion_llm() → generar_pregunta_con_rag(request=request) ← CRÍTICO
  3. analizar_codigo_llm()   → analizar_codigo_con_rag(request=request)   ← CRÍTICO
  4. Endpoint dinámico: /generar-preguntas/{framework} (uno para todos)

ENDPOINTS DISPONIBLES:
  GET  /generar-preguntas/{framework}   → genera pregunta de entrevista
  POST /analizar-codigo                 → analiza código del candidato
  GET  /sesion/{sesion_id}/resultado    → resultado crudo (debug/admin)
  GET  /sesion/{sesion_id}/analisis     → resultado formateado (frontend)
  POST /guardar-borrador                → autosave del editor
  GET  /iniciar-sesion/{framework}      → crea sesión rápida (<100ms)

FRAMEWORKS SOPORTADOS (parámetro de URL):
  vue | vuejs | next | nextjs | react | typescript | javascript | css
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.api.deps import get_db
from app.services.rag_service import generar_pregunta_con_rag, analizar_codigo_con_rag
from app.services.analytics_service import AnalyticsService
from app.db import repositories as repo
from app.core.normalizers import construir_contexto_proyecto
from app.core.config import settings

router = APIRouter()
analytics_service = AnalyticsService()

TECH_SLUGS    = settings.TECH_SLUGS
NIVEL_DEFAULT = settings.NIVEL_DEFAULT

# Mapeo de slug URL → nombre canónico del framework
FRAMEWORK_MAP: dict[str, str] = {
    "vue":        "Vue.js",
    "vuejs":      "Vue.js",
    "next":       "Next.js",
    "nextjs":     "Next.js",
    "react":      "React",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "css":        "CSS",
    "nodejs":     "Node.js",
    "node":       "Node.js",
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPER INTERNO
# ─────────────────────────────────────────────────────────────────────────────

def _puntaje_a_nivel_texto(puntaje: float) -> str:
    """Convierte puntaje 0-100 a nivel textual para el frontend."""
    if puntaje >= 90: return "Excelente"
    if puntaje >= 75: return "Bueno"
    if puntaje >= 60: return "Regular"
    if puntaje >= 40: return "Deficiente"
    return "Crítico"


def _normalizar_framework(framework_raw: str) -> str | None:
    """
    Normaliza el slug del framework al nombre canónico.
    Retorna None si no está soportado.
    """
    return FRAMEWORK_MAP.get(framework_raw.strip().lower())


# ─────────────────────────────────────────────────────────────────────────────
# 🎯 ENDPOINT DINÁMICO DE PREGUNTAS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/generar-preguntas/{framework}", response_model=RespuestaEvaluacion)
async def generar_preguntas(
    framework: str,
    request: Request,                          # ← REQUERIDO para app.state.vector_store
    usuario_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera una pregunta técnica de entrevista para el framework especificado.

    FLUJO:
      1. Normaliza el framework (vue → Vue.js)
      2. Selecciona query aleatoria para OpenSearch (diversidad)
      3. RAG recupera fragmentos relevantes
      4. LLM (Groq 70b) genera pregunta contextualizada y no repetitiva
      5. Persiste en DB si hay usuario_id

    Ejemplos:
      GET /generar-preguntas/vue
      GET /generar-preguntas/next
      GET /generar-preguntas/react?usuario_id=abc123
      GET /generar-preguntas/typescript
    """
    framework_nombre = _normalizar_framework(framework)
    if not framework_nombre:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Framework no soportado: '{framework}'. "
                f"Disponibles: {sorted(FRAMEWORK_MAP.keys())}"
            ),
        )

    print(f"👉 Generando pregunta RAG para: {framework_nombre}")

    # ─── Pipeline RAG completo ───────────────────────────────────────────────
    # CRÍTICO: pasar request para acceder a app.state.vector_store
    # Sin request=request, el retriever siempre es None y no hay RAG.
    resultado = await generar_pregunta_con_rag(
        framework=framework_nombre,
        request=request,        # ← NO omitir esto
    )

    # Agregar metadata de contexto al resultado
    resultado["framework"] = framework_nombre

    # ─── Persistir en DB ────────────────────────────────────────────────────
    sesion = await _persistir_pregunta_y_sesion(
        db=db,
        framework=framework_nombre,
        resultado=resultado,
        usuario_id=usuario_id,
        request=request,
    )

    if sesion:
        resultado["sesion_id"] = str(sesion.id)

    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# 🔥 ANÁLISIS DE CÓDIGO
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(
    data: dict,
    request: Request,                          # ← REQUERIDO para app.state.vector_store
    db: AsyncSession = Depends(get_db),
):
    """
    Analiza código del candidato con contexto RAG de buenas prácticas.

    Body esperado:
    {
      "codigo":      "código del candidato (requerido)",
      "framework":   "vue | next | react | typescript | ... (requerido)",
      "sesion_id":   "uuid (opcional — para persistir análisis)",
      "usuario_id":  "uuid (opcional)",
      "active_file": "nombre del archivo activo en el IDE",
      "files":       {"archivo.vue": "contenido del archivo"}
    }
    """
    print("👉 Analizando código con RAG")

    codigo         = data.get("codigo", "").strip()
    framework_raw  = data.get("framework", "general").strip()
    sesion_id_str  = data.get("sesion_id")
    active_file    = data.get("active_file", "")
    files          = data.get("files", {})

    # ─── Validaciones ───────────────────────────────────────────────────────
    if not codigo:
        raise HTTPException(
            status_code=400,
            detail="El campo 'codigo' es requerido y no puede estar vacío.",
        )

    if len(codigo) > settings.MAX_CODIGO_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"Código excede el límite de {settings.MAX_CODIGO_LENGTH} caracteres.",
        )

    # Normalizar framework (si viene "vuejs" → "Vue.js"; si no se reconoce, usar raw)
    framework = _normalizar_framework(framework_raw) or framework_raw

    # ─── Contexto multi-archivo del IDE ─────────────────────────────────────
    contexto_proyecto = construir_contexto_proyecto(
        active_file=active_file,
        files=files,
        framework=framework,
    )

    # ─── Pipeline RAG de análisis ───────────────────────────────────────────
    # CRÍTICO: pasar request para acceder a app.state.vector_store
    resultado = await analizar_codigo_con_rag(
        codigo=codigo,
        framework=framework,
        contexto_proyecto=contexto_proyecto,
        request=request,        # ← NO omitir esto
    )

    # ─── Persistir si hay sesión ─────────────────────────────────────────────
    if sesion_id_str:
        await _persistir_analisis_codigo(
            db=db,
            sesion_id_str=sesion_id_str,
            codigo=codigo,
            framework=framework,
            resultado=resultado,
        )

    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# 📊 CONSULTAS DE SESIÓN
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sesion/{sesion_id}/resultado")
async def obtener_resultado_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Resultado crudo de sesión (formato ORM). Para debug y panel de admin."""
    try:
        sesion_uuid = uuid.UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido.")

    sesion = await repo.get_sesion_con_detalles(db, sesion_uuid)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")

    return sesion


@router.get("/sesion/{sesion_id}/analisis", response_model=RespuestaAnalisisCodigo)
async def obtener_analisis_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Análisis formateado para el frontend.
    Este es el endpoint que DEBE usar el frontend para mostrar resultados.

    Transforma los datos de BD al contrato estable RespuestaAnalisisCodigo.
    """
    try:
        sesion_uuid = uuid.UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido.")

    sesion = await repo.get_sesion_con_detalles(db, sesion_uuid)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")

    evaluacion = sesion.evaluacion
    puntaje    = evaluacion.puntaje_total if evaluacion else 0
    nivel      = _puntaje_a_nivel_texto(puntaje)

    # ─── Errores ─────────────────────────────────────────────────────────────
    errores = [
        {
            "tipo":             e.categoria_error.nombre if e.categoria_error else "general",
            "descripcion":      e.descripcion,
            "impacto":          e.severidad,
            "linea_aproximada": e.linea_codigo,
        }
        for e in (sesion.errores_detectados or [])
    ]

    # ─── Recomendaciones ─────────────────────────────────────────────────────
    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        recomendaciones = [
            {
                "mensaje":   r.titulo,
                "solucion":  r.descripcion,
                "prioridad": r.prioridad,
            }
            for r in evaluacion.recomendaciones
        ]

    # ─── Fortalezas y áreas de mejora ────────────────────────────────────────
    fortalezas   = [
        f.strip() for f in (evaluacion.fortalezas or "").split("\n") if f.strip()
    ]
    areas_mejora = [
        a.strip() for a in (evaluacion.areas_mejora or "").split("\n") if a.strip()
    ]

    # ─── Evaluación técnica desde detalles de rúbrica ────────────────────────
    evaluacion_tecnica = {
        "manejo_estado": "No evaluado",
        "legibilidad":   "No evaluado",
        "arquitectura":  "No evaluado",
        "performance":   "No evaluado",
    }

    if evaluacion and evaluacion.detalles:
        for d in evaluacion.detalles:
            if not d.rubrica:
                continue
            nombre     = d.rubrica.nombre.lower()
            comentario = d.comentario or "Evaluado"
            if "estado" in nombre or "state" in nombre:
                evaluacion_tecnica["manejo_estado"] = comentario
            elif "legibilidad" in nombre or "legibility" in nombre:
                evaluacion_tecnica["legibilidad"] = comentario
            elif "arquitectura" in nombre or "architecture" in nombre:
                evaluacion_tecnica["arquitectura"] = comentario
            elif "performance" in nombre or "rendimiento" in nombre:
                evaluacion_tecnica["performance"] = comentario

    return {
        "calificacion_general": {
            "nivel":   nivel,
            "puntaje": int(puntaje) if puntaje else 0,
            "resumen": evaluacion.feedback_general if evaluacion else "Sin evaluación",
        },
        "errores":            errores,
        "buenas_practicas":   fortalezas,
        "malas_practicas":    areas_mejora,
        "recomendaciones":    recomendaciones,
        "evaluacion_tecnica": evaluacion_tecnica,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 💾 AUTOSAVE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/guardar-borrador")
async def guardar_borrador(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Guarda un borrador del código (autosave del editor).
    No bloquea la respuesta si falla — siempre retorna ok/not ok.
    """
    sesion_id_str = data.get("sesion_id")
    codigo        = data.get("codigo", "").strip()
    active_file   = data.get("active_file", "")

    if not sesion_id_str or not codigo:
        raise HTTPException(
            status_code=400,
            detail="'sesion_id' y 'codigo' son requeridos.",
        )

    try:
        sesion_id = uuid.UUID(sesion_id_str)
        sesion    = await repo.get_sesion_por_id(db, sesion_id)

        if not sesion:
            return {"ok": False, "detail": "Sesión no encontrada."}

        await repo.guardar_envio_codigo(
            db=db,
            sesion_id=sesion_id,
            lenguaje=active_file or "autosave",
            codigo=codigo,
            es_envio_final=False,
        )

        return {"ok": True}

    except Exception as e:
        print(f"⚠️  Error autosave (no bloqueante): {e}")
        return {"ok": False, "detail": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# 🚀 INICIO RÁPIDO DE SESIÓN
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/iniciar-sesion/{framework}")
async def iniciar_sesion_rapida(
    framework: str,
    request: Request,
    usuario_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Crea la sesión SIN generar pregunta (respuesta < 100ms).

    El IDE luego solicita la pregunta bajo demanda:
      GET /generar-preguntas/{framework}?usuario_id=...

    Retorna sesion_id que se usa en todas las llamadas posteriores.
    """
    framework_nombre = _normalizar_framework(framework)
    if not framework_nombre:
        raise HTTPException(
            status_code=400,
            detail=f"Framework no soportado: '{framework}'.",
        )

    slug       = TECH_SLUGS.get(framework_nombre)
    tecnologia = await repo.get_tecnologia_por_slug(db, slug)
    nivel      = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)

    if not tecnologia or not nivel:
        raise HTTPException(
            status_code=404,
            detail=f"Tecnología '{framework_nombre}' o nivel '{NIVEL_DEFAULT}' no encontrados en BD.",
        )

    # Pregunta placeholder — se reemplaza cuando el IDE llama a generar-preguntas
    pregunta_placeholder = await repo.crear_pregunta(
        db=db,
        tecnologia_id=tecnologia.id,
        nivel_id=nivel.id,
        titulo="Cargando pregunta...",
        enunciado="La pregunta se generará en el IDE.",
        prompt_contexto="",
        creada_por=uuid.UUID(usuario_id) if usuario_id else None,
    )

    sesion = await repo.crear_sesion(
        db=db,
        usuario_id=uuid.UUID(usuario_id) if usuario_id else None,
        tecnologia_id=tecnologia.id,
        nivel_id=nivel.id,
        pregunta_id=pregunta_placeholder.id,
        ip_usuario=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    print(f"✅ Sesión rápida creada: {sesion.id} ({framework_nombre})")

    return {
        "sesion_id":     str(sesion.id),
        "tecnologia_id": tecnologia.id,
        "nivel_id":      nivel.id,
        "framework":     framework_nombre,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 🔧 HELPERS PRIVADOS DE PERSISTENCIA
# ─────────────────────────────────────────────────────────────────────────────

async def _persistir_pregunta_y_sesion(
    db: AsyncSession,
    framework: str,
    resultado: dict,
    usuario_id: str | None,
    request: Request,
):
    """
    Persiste la pregunta generada y crea la sesión en BD.
    No bloquea la respuesta si falla — imprime warning y retorna None.
    """
    sesion = None
    try:
        slug       = TECH_SLUGS.get(framework)
        tecnologia = await repo.get_tecnologia_por_nombre(db, slug)
        nivel      = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)

        if not tecnologia or not nivel:
            print(f"⚠️  Tecnología '{slug}' o nivel '{NIVEL_DEFAULT}' no en BD.")
            return None

        enunciado = resultado.get("pregunta_practica", "Sin enunciado")
        titulo    = enunciado[:100] if enunciado else f"Pregunta {framework}"

        pregunta = await repo.crear_pregunta(
            db=db,
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            titulo=titulo,
            enunciado=enunciado,
            prompt_contexto="",
            creada_por=uuid.UUID(usuario_id) if usuario_id else None,
        )

        if usuario_id:
            sesion = await repo.crear_sesion(
                db=db,
                usuario_id=uuid.UUID(usuario_id),
                tecnologia_id=tecnologia.id,
                nivel_id=nivel.id,
                pregunta_id=pregunta.id,
                ip_usuario=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            print(f"✅ Sesión creada: {sesion.id}")

    except Exception as e:
        print(f"⚠️  Error persistiendo pregunta/sesión (no bloqueante): {e}")

    return sesion


async def _persistir_analisis_codigo(
    db: AsyncSession,
    sesion_id_str: str,
    codigo: str,
    framework: str,
    resultado: dict,
) -> None:
    """
    Persiste el análisis de código completo en BD.
    No bloquea la respuesta si falla — imprime warning.
    """
    try:
        sesion_id = uuid.UUID(sesion_id_str)
        sesion    = await repo.get_sesion_por_id(db, sesion_id)

        if not sesion:
            print(f"⚠️  Sesión {sesion_id} no encontrada. Análisis no persistido.")
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
        cal     = resultado.get("calificacion_general", {})
        puntaje = cal.get("puntaje", 0)
        resumen = cal.get("resumen", "Sin resumen")
        buenas  = resultado.get("buenas_practicas", [])
        malas   = resultado.get("malas_practicas", [])

        evaluacion = await repo.guardar_evaluacion(
            db=db,
            sesion_id=sesion_id,
            puntaje_total=float(puntaje),
            feedback_general=resumen,
            fortalezas="\n".join(buenas) if buenas else None,
            areas_mejora="\n".join(malas) if malas else None,
            modelo_ia_usado=settings.LLM_MODEL,
        )

        # Guardar errores detectados
        for error in resultado.get("errores", []):
            try:
                linea_raw = error.get("linea_aproximada")
                linea     = int(linea_raw) if linea_raw and str(linea_raw).isdigit() else None
                await repo.guardar_error_detectado(
                    db=db,
                    sesion_id=sesion_id,
                    categoria_error_id=1,
                    descripcion=error.get("descripcion", "Sin descripción"),
                    severidad=error.get("impacto", "medio"),
                    linea_codigo=linea,
                )
            except Exception as e:
                print(f"⚠️  Error guardando error detectado: {e}")

        # Guardar recomendaciones
        for rec in resultado.get("recomendaciones", []):
            try:
                await repo.guardar_recomendacion(
                    db=db,
                    evaluacion_id=evaluacion.id,
                    tipo="mejora",
                    titulo=rec.get("mensaje", "Recomendación"),
                    descripcion=rec.get("solucion", ""),
                    prioridad=rec.get("prioridad", "media"),
                )
            except Exception as e:
                print(f"⚠️  Error guardando recomendación: {e}")

        # Guardar evaluación técnica detallada
        eval_tecnica = resultado.get("evaluacion_tecnica", {})
        if eval_tecnica:
            await analytics_service.guardar_evaluacion_tecnica(
                db, evaluacion.id, eval_tecnica
            )

        # Actualizar estadísticas del usuario
        if sesion.usuario_id:
            await repo.actualizar_estadisticas_usuario(db, sesion.usuario_id)
            await repo.actualizar_perfil_tecnico(db, sesion.usuario_id)

        await repo.finalizar_sesion(db, sesion_id)
        print(f"✅ Análisis persistido para sesión {sesion_id}")

    except Exception as e:
        print(f"⚠️  Error persistiendo análisis (no bloqueante): {e}")