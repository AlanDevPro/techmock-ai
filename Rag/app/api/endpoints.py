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
VUE_FILE  = os.path.join(BASE_DIR, "data", "vue_context.txt")
NEXT_FILE = os.path.join(BASE_DIR, "data", "next_context.txt")
print("✅ Rutas configuradas")

TECH_SLUGS = {
    "Vue.js":  "vuejs",
    "Next.js": "nextjs",
}
NIVEL_DEFAULT = "Intermedio"

IMPACTOS_VALIDOS    = {"alto", "medio", "bajo"}
PRIORIDADES_VALIDAS = {"alta", "media", "baja"}
NIVELES_VALIDOS     = {"Excelente", "Bueno", "Regular", "Deficiente", "Crítico"}


# =============================================================
# 🧹 NORMALIZADORES — capa sanitizadora entre LLM y frontend
# =============================================================

def normalizar_recomendaciones(recs) -> list:
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
            "mensaje":   r.get("mensaje") or r.get("descripcion") or r.get("message") or "",
            "solucion":  solucion,
            "prioridad": prioridad,
        })
    return resultado


def normalizar_errores(errores) -> list:
    if not isinstance(errores, list):
        return []
    resultado = []
    for e in errores:
        if not isinstance(e, dict):
            continue
        impacto = e.get("impacto", "medio")
        if impacto not in IMPACTOS_VALIDOS:
            impacto = "medio"
        resultado.append({
            "tipo":             e.get("tipo") or e.get("type") or "general",
            "descripcion":      e.get("descripcion") or e.get("descripción") or e.get("description") or "",
            "impacto":          impacto,
            "linea_aproximada": e.get("linea_aproximada") or e.get("linea") or e.get("line") or None,
        })
    return resultado


def normalizar_calificacion(cal) -> dict:
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
        "nivel":   nivel,
        "puntaje": puntaje,
        "resumen": cal.get("resumen") or cal.get("summary") or "Sin resumen disponible.",
    }


def normalizar_evaluacion_tecnica(ev) -> dict:
    default = "No evaluado."
    if not isinstance(ev, dict):
        return {
            "manejo_estado": default,
            "legibilidad":   default,
            "arquitectura":  default,
            "performance":   default,
        }
    return {
        "manejo_estado": ev.get("manejo_estado") or ev.get("estado")     or default,
        "legibilidad":   ev.get("legibilidad")   or ev.get("claridad")   or default,
        "arquitectura":  ev.get("arquitectura")                           or default,
        "performance":   ev.get("performance")   or ev.get("rendimiento") or default,
    }


def normalizar_lista_strings(valor) -> list:
    if not isinstance(valor, list):
        return []
    return [str(item) for item in valor if item]


def normalizar_resultado_llm(resultado: dict) -> dict:
    print("🧠 Respuesta RAW LLM:", resultado)
    return {
        "calificacion_general": normalizar_calificacion(resultado.get("calificacion_general")),
        "errores":              normalizar_errores(resultado.get("errores", [])),
        "buenas_practicas":     normalizar_lista_strings(resultado.get("buenas_practicas", [])),
        "malas_practicas":      normalizar_lista_strings(resultado.get("malas_practicas", [])),
        "recomendaciones":      normalizar_recomendaciones(resultado.get("recomendaciones", [])),
        "evaluacion_tecnica":   normalizar_evaluacion_tecnica(resultado.get("evaluacion_tecnica")),
    }


# -----------------------------
# 🔧 HELPERS DE CONTEXTO
# -----------------------------

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


def _extraer_proyecto_raiz(active_file: str) -> str:
    """
    Extrae el directorio raíz del proyecto a partir del archivo activo.
    Ejemplo: '/practica-vue/src/App.vue' → 'practica-vue'
    """
    if not active_file:
        return ""
    # Normalizar separadores y limpiar slash inicial
    partes = active_file.replace("\\", "/").lstrip("/").split("/")
    return partes[0] if partes else ""


def _construir_contexto_proyecto(
    active_file: str,
    files: dict,
    framework: str,
) -> str:
    """
    Construye un contexto textual del proyecto activo para que el LLM
    entienda la arquitectura, imports y composición.

    ✅ FILTRA por proyecto raíz del archivo activo para evitar mezclar
    practica-vue con practica-nextjs u otros proyectos del workspace.
    """

    # ================================================================
    # 🔍 DEBUG: DIAGNÓSTICO DE ENTRADA A _construir_contexto_proyecto
    # ================================================================
    print("\n" + "="*80)
    print("📂 _construir_contexto_proyecto — DIAGNÓSTICO DE CONTEXTO")
    print("="*80)
    print(f"📌 Framework declarado : {framework}")
    print(f"📌 Archivo activo      : {active_file or '(ninguno)'}")
    print(f"📌 Total archivos recibidos del frontend: {len(files)}")

    if not files:
        print("⚠️  files está VACÍO — el contexto será vacío string")
        print("="*80 + "\n")
        return ""

    # ── Listar TODOS los archivos que llegaron del frontend ──────────
    print("\n📋 TODOS LOS ARCHIVOS RECIBIDOS:")
    for i, ruta in enumerate(sorted(files.keys()), 1):
        tamanio = len(files[ruta]) if files[ruta] else 0
        print(f"  {i:>2}. {ruta}  ({tamanio} chars)")

    # ── Detectar proyectos únicos presentes ─────────────────────────
    proyectos_presentes = set()
    for ruta in files:
        raiz = ruta.replace("\\", "/").lstrip("/").split("/")[0]
        if raiz:
            proyectos_presentes.add(raiz)

    print(f"\n🗂️  PROYECTOS DETECTADOS EN files: {sorted(proyectos_presentes)}")

    # ── Extraer y validar proyecto raíz del archivo activo ──────────
    proyecto_root = _extraer_proyecto_raiz(active_file)
    print(f"📁 PROYECTO RAÍZ DETECTADO (desde active_file): '{proyecto_root}'")

    if not proyecto_root:
        print("⚠️  No se pudo detectar proyecto raíz — se incluirán TODOS los archivos (riesgo de mezcla)")
    else:
        print(f"✅ Se filtrarán archivos que NO pertenezcan a: '{proyecto_root}'")

    # ── Filtrar archivos por proyecto raíz ──────────────────────────
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

    print(f"\n✅ ARCHIVOS INCLUIDOS TRAS FILTRO ({len(archivos_filtrados)}):")
    for i, ruta in enumerate(sorted(archivos_filtrados.keys()), 1):
        tamanio = len(archivos_filtrados[ruta]) if archivos_filtrados[ruta] else 0
        print(f"  {i:>2}. {ruta}  ({tamanio} chars)")

    if archivos_excluidos:
        print(f"\n🚫 ARCHIVOS EXCLUIDOS POR FILTRO DE PROYECTO ({len(archivos_excluidos)}):")
        for ruta in sorted(archivos_excluidos):
            print(f"       - {ruta}")
    else:
        print("\n✅ Sin archivos excluidos (todos pertenecen al mismo proyecto raíz)")

    # ── Selección y truncamiento ─────────────────────────────────────
    MAX_FILES          = 8
    MAX_CHARS_PER_FILE = 800

    prioridad     = [active_file] + [k for k in archivos_filtrados if k != active_file]
    seleccionados = prioridad[:MAX_FILES]

    print(f"\n📦 ARCHIVOS SELECCIONADOS PARA EL CONTEXTO (máx {MAX_FILES}):")
    for i, ruta in enumerate(seleccionados, 1):
        contenido  = archivos_filtrados.get(ruta, "")
        chars_orig = len(contenido)
        chars_env  = min(chars_orig, MAX_CHARS_PER_FILE)
        truncado   = "⚠️ TRUNCADO" if chars_orig > MAX_CHARS_PER_FILE else "✅ completo"
        print(f"  {i}. {ruta}")
        print(f"     chars originales: {chars_orig} → chars enviados: {chars_env}  [{truncado}]")

    chars_totales_contexto = sum(
        min(len(archivos_filtrados.get(r, "")), MAX_CHARS_PER_FILE)
        for r in seleccionados
    )
    print(f"\n📊 TAMAÑO ESTIMADO DEL CONTEXTO FINAL: ~{chars_totales_contexto} chars")

    if len(archivos_filtrados) > MAX_FILES:
        omitidos = list(archivos_filtrados.keys())[MAX_FILES:]
        print(f"\n⚠️  ARCHIVOS OMITIDOS POR LÍMITE DE {MAX_FILES} (no entran al contexto):")
        for ruta in omitidos:
            print(f"       - {ruta}")

    print("="*80 + "\n")
    # ================================================================

    # ── Construcción del string de contexto ─────────────────────────
    lineas = [
        f"=== Estructura del proyecto ({framework}) ===",
        f"Proyecto raíz : {proyecto_root or 'desconocido'}",
        f"Archivo activo: {active_file}",
        "",
    ]

    for ruta in seleccionados:
        contenido = archivos_filtrados.get(ruta, "")
        if not contenido:
            continue
        preview = contenido[:MAX_CHARS_PER_FILE]
        if len(contenido) > MAX_CHARS_PER_FILE:
            preview += "\n... (truncado)"
        lineas.append(f"--- {ruta} ---")
        lineas.append(preview)
        lineas.append("")

    return "\n".join(lineas)


# -----------------------------
# 🔹 ENDPOINTS DE PREGUNTAS
# -----------------------------

@router.get("/generar-preguntas/vue", response_model=RespuestaEvaluacion)
async def generar_preguntas_vue_get(
    request: Request,
    usuario_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    print("👉 Endpoint Vue llamado")
    contexto  = leer_archivo_interno(VUE_FILE)
    resultado = await generar_evaluacion_llm(contexto, "Vue.js")

    sesion = await _persistir_pregunta_y_sesion(
        db=db,
        framework="Vue.js",
        resultado=resultado,
        contexto=contexto,
        usuario_id=usuario_id,
        request=request,
    )

    if sesion:
        resultado["sesion_id"] = str(sesion.id)

    return resultado


@router.get("/generar-preguntas/next", response_model=RespuestaEvaluacion)
async def generar_preguntas_next_get(
    request: Request,
    usuario_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    print("👉 Endpoint Next llamado")
    contexto  = leer_archivo_interno(NEXT_FILE)
    resultado = await generar_evaluacion_llm(contexto, "Next.js")

    sesion = await _persistir_pregunta_y_sesion(
        db=db,
        framework="Next.js",
        resultado=resultado,
        contexto=contexto,
        usuario_id=usuario_id,
        request=request,
    )

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
    print("👉 Endpoint analizar código llamado")

    codigo         = data.get("codigo", "").strip()
    framework      = data.get("framework", "general").strip()
    sesion_id_str  = data.get("sesion_id")
    usuario_id_str = data.get("usuario_id")
    active_file    = data.get("active_file", "")
    files          = data.get("files", {})

    # ================================================================
    # 🔍 DEBUG: PAYLOAD RECIBIDO DEL FRONTEND
    # ================================================================
    print("\n" + "="*80)
    print("📥 PAYLOAD RECIBIDO EN /analizar-codigo")
    print("="*80)
    print(f"  framework      : {framework}")
    print(f"  active_file    : {active_file or '(vacío)'}")
    print(f"  sesion_id      : {sesion_id_str or '(sin sesión)'}")
    print(f"  usuario_id     : {usuario_id_str or '(sin usuario)'}")
    print(f"  len(codigo)    : {len(codigo)} chars")
    print(f"  len(files)     : {len(files)} archivos")
    print(f"  files keys     : {sorted(files.keys()) if files else '[]'}")
    print("="*80 + "\n")
    # ================================================================

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

    contexto_proyecto = _construir_contexto_proyecto(
        active_file=active_file,
        files=files,
        framework=framework,
    )

    # ── Resumen post-construcción ────────────────────────────────────
    print("\n" + "-"*60)
    print("📊 RESUMEN CONTEXTO CONSTRUIDO")
    print("-"*60)
    print(f"  Tamaño contexto_proyecto : {len(contexto_proyecto)} chars")
    print(f"  Contexto vacío           : {'SÍ ⚠️' if not contexto_proyecto else 'NO ✅'}")
    print("-"*60 + "\n")

    print("⏳ Enviando código a LLM con contexto multi-archivo...")
    resultado_raw = await analizar_codigo_llm(
        codigo=codigo,
        framework=framework,
        contexto_proyecto=contexto_proyecto,
    )

    resultado = normalizar_resultado_llm(resultado_raw)

    if sesion_id_str:
        await _persistir_analisis_codigo(
            db=db,
            sesion_id_str=sesion_id_str,
            codigo=codigo,
            framework=framework,
            resultado=resultado,
        )

    return resultado


# ✅ Obtener resultado de sesión
@router.get("/sesion/{sesion_id}/resultado")
async def obtener_resultado_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    print(f"👉 Consultando resultado de sesión: {sesion_id}")

    try:
        sesion_uuid = uuid.UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido")

    sesion = await repo.get_sesion_completa(db, sesion_uuid)

    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    return sesion


# ✅ Guardar borrador (autosave)
@router.post("/guardar-borrador")
async def guardar_borrador(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    sesion_id_str = data.get("sesion_id")
    codigo        = data.get("codigo", "").strip()
    active_file   = data.get("active_file", "")

    if not sesion_id_str or not codigo:
        raise HTTPException(status_code=400, detail="sesion_id y codigo son requeridos")

    try:
        sesion_id = uuid.UUID(sesion_id_str)
        sesion    = await repo.get_sesion_por_id(db, sesion_id)

        if not sesion:
            print(f"⚠️ Sesión {sesion_id} no encontrada para autosave")
            return {"ok": False, "detail": "Sesión no encontrada"}

        await repo.guardar_borrador_codigo(
            db=db,
            sesion_id=sesion_id,
            codigo=codigo,
            active_file=active_file,
        )

        print(f"💾 Borrador guardado para sesión {sesion_id}")
        return {"ok": True}

    except Exception as e:
        print(f"⚠️ Error guardando borrador (no bloquea): {e}")
        return {"ok": False, "detail": str(e)}


# =============================================================
# 🔧 HELPERS DE PERSISTENCIA
# =============================================================

async def _persistir_pregunta_y_sesion(
    db: AsyncSession,
    framework: str,
    resultado: dict,
    contexto: str,
    usuario_id: str | None,
    request: Request,
):
    sesion = None

    try:
        slug = TECH_SLUGS.get(framework)
        if not slug:
            print(f"⚠️ Slug no encontrado para framework: {framework}")
            return None

        tecnologia = await repo.get_tecnologia_por_slug(db, slug)
        nivel      = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)

        if not tecnologia or not nivel:
            print(f"⚠️ Tecnología '{slug}' o nivel '{NIVEL_DEFAULT}' no encontrados en BD")
            return None

        enunciado = resultado.get("pregunta_practica", "Sin enunciado")
        titulo    = enunciado[:100] if enunciado else f"Pregunta {framework}"

        pregunta = await repo.crear_pregunta(
            db=db,
            tecnologia_id=tecnologia.id,
            nivel_id=nivel.id,
            titulo=titulo,
            enunciado=enunciado,
            prompt_contexto=contexto[:500],
            creada_por=uuid.UUID(usuario_id) if usuario_id else None,
        )

        if usuario_id:
            ip         = request.client.host if request.client else None
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
    try:
        sesion_id = uuid.UUID(sesion_id_str)

        sesion = await repo.get_sesion_por_id(db, sesion_id)
        if not sesion:
            print(f"⚠️ Sesión {sesion_id} no encontrada, no se guarda el análisis")
            return

        await repo.guardar_envio_codigo(
            db=db,
            sesion_id=sesion_id,
            lenguaje=framework,
            codigo=codigo,
            es_envio_final=True,
        )

        cal     = resultado.get("calificacion_general", {})
        puntaje = cal.get("puntaje", 0)
        resumen = cal.get("resumen", "Sin resumen")

        buenas = resultado.get("buenas_practicas", [])
        malas  = resultado.get("malas_practicas", [])

        await repo.guardar_evaluacion(
            db=db,
            sesion_id=sesion_id,
            puntaje_total=float(puntaje),
            feedback_general=resumen,
            fortalezas="\n".join(buenas) if buenas else None,
            areas_mejora="\n".join(malas) if malas else None,
            modelo_ia_usado="qwen2.5-coder:1.5b",
        )

        errores = resultado.get("errores", [])

        for error in errores:
            await repo.crear_error_detectado(
                db=db,
                sesion_id=sesion_id,
                tipo=error.get("tipo"),
                descripcion=error.get("descripcion"),
                impacto=error.get("impacto"),
                linea_aproximada=error.get("linea_aproximada"),
            )

        recomendaciones = resultado.get("recomendaciones", [])

        for rec in recomendaciones:
            await repo.crear_recomendacion_solucion(
                db=db,
                sesion_id=sesion_id,
                mensaje=rec.get("mensaje"),
                solucion=rec.get("solucion"),
                prioridad=rec.get("prioridad"),
            )

        evaluacion_tecnica = resultado.get("evaluacion_tecnica", {})

        await repo.crear_detalle_evaluacion(
            db=db,
            sesion_id=sesion_id,
            manejo_estado=evaluacion_tecnica.get("manejo_estado"),
            legibilidad=evaluacion_tecnica.get("legibilidad"),
            arquitectura=evaluacion_tecnica.get("arquitectura"),
            performance=evaluacion_tecnica.get("performance"),
        )

        if sesion.usuario_id:
            await repo.actualizar_estadisticas_usuario(
                db=db,
                usuario_id=sesion.usuario_id,
                puntaje=puntaje,
            )
        if sesion.usuario_id:
            await repo.actualizar_perfil_tecnico(
                db=db,
                usuario_id=sesion.usuario_id,
                evaluacion_tecnica=evaluacion_tecnica,
            )

        await repo.finalizar_sesion(db=db, sesion_id=sesion_id)

        print(f"✅ Análisis de código persistido para sesión {sesion_id}")

    except Exception as e:
        print(f"⚠️ Error persistiendo análisis de código (no bloquea respuesta): {e}")