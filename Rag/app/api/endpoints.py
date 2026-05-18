"""
Endpoints de evaluación de código y preguntas técnicas.
Organizado por responsabilidades claras.
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.api.deps import get_db
from app.services.llm_service import generar_evaluacion_llm, analizar_codigo_llm
from app.services.analytics_service import AnalyticsService
from app.db import repositories as repo

# Módulos internos de normalización
from app.core.normalizers import (
    normalizar_resultado_llm,
    construir_contexto_proyecto,
    leer_archivo_interno
)

# Configuración
from app.core.config import settings

router = APIRouter()
analytics_service = AnalyticsService()

# Constantes
TECH_SLUGS = settings.TECH_SLUGS
NIVEL_DEFAULT = settings.NIVEL_DEFAULT


# =============================================================
# 🔹 FUNCIÓN AUXILIAR
# =============================================================

def _puntaje_a_nivel_texto(puntaje: float) -> str:
    """Convierte puntaje numérico a nivel textual para el frontend"""
    if puntaje >= 90:
        return "Excelente"
    if puntaje >= 75:
        return "Bueno"
    if puntaje >= 60:
        return "Regular"
    if puntaje >= 40:
        return "Deficiente"
    return "Crítico"


# =============================================================
# 🎯 ENDPOINTS DE PREGUNTAS
# =============================================================

@router.get("/generar-preguntas/vue", response_model=RespuestaEvaluacion)
async def generar_preguntas_vue_get(
    request: Request,
    usuario_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Genera preguntas de evaluación para Vue.js"""
    print("👉 Endpoint Vue llamado")
    contexto = leer_archivo_interno(settings.VUE_FILE)
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
    """Genera preguntas de evaluación para Next.js"""
    print("👉 Endpoint Next llamado")
    contexto = leer_archivo_interno(settings.NEXT_FILE)
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


# =============================================================
# 🔥 ENDPOINT ANALIZAR CÓDIGO PRO
# =============================================================

@router.post("/analizar-codigo", response_model=RespuestaAnalisisCodigo)
async def analizar_codigo(
    data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Analiza código enviado por el usuario con contexto multi-archivo"""
    print("👉 Endpoint analizar código llamado")

    codigo = data.get("codigo", "").strip()
    framework = data.get("framework", "general").strip()
    sesion_id_str = data.get("sesion_id")
    usuario_id_str = data.get("usuario_id")
    active_file = data.get("active_file", "")
    files = data.get("files", {})

    # Validaciones
    if not codigo:
        raise HTTPException(
            status_code=400,
            detail="El campo 'codigo' es requerido y no puede estar vacío.",
        )

    if len(codigo) > settings.MAX_CODIGO_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"El código excede el límite de {settings.MAX_CODIGO_LENGTH} caracteres.",
        )

    # Construir contexto del proyecto
    contexto_proyecto = construir_contexto_proyecto(
        active_file=active_file,
        files=files,
        framework=framework,
    )

    # Analizar con LLM
    resultado_raw = await analizar_codigo_llm(
        codigo=codigo,
        framework=framework,
        contexto_proyecto=contexto_proyecto,
    )

    resultado = normalizar_resultado_llm(resultado_raw)

    # Persistir si hay sesión
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
# 📊 ENDPOINTS DE CONSULTA
# =============================================================

@router.get("/sesion/{sesion_id}/resultado")
async def obtener_resultado_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene el resultado completo de una sesión (formato ORM).
    Útil para debugging, admin panel o uso interno.
    """
    print(f"👉 Consultando resultado de sesión (ORM): {sesion_id}")

    try:
        sesion_uuid = uuid.UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido")

    sesion = await repo.get_sesion_con_detalles(db, sesion_uuid)

    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    return sesion


# ✅ NUEVO ENDPOINT PROFESIONAL - Formato específico para frontend
@router.get("/sesion/{sesion_id}/analisis", response_model=RespuestaAnalisisCodigo)
async def obtener_analisis_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene el análisis de código en el formato específico que espera el frontend.
    Este es el endpoint que DEBE usar el frontend.
    
    Ventajas:
    - Contrato estable entre backend y frontend
    - Transformación centralizada (si cambia la BD, solo cambia aquí)
    - Frontend recibe exactamente lo que necesita
    """
    print(f"👉 Obteniendo análisis formateado para frontend: {sesion_id}")
    
    try:
        sesion_uuid = uuid.UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido")
    
    # Obtener la sesión con todos sus datos
    sesion = await repo.get_sesion_con_detalles(db, sesion_uuid)
    
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    # Transformar los datos de BD al formato que espera el frontend
    evaluacion = sesion.evaluacion
    
    # Mapear nivel de puntaje a categoría
    puntaje = evaluacion.puntaje_total if evaluacion else 0
    nivel = _puntaje_a_nivel_texto(puntaje)
    
    # Construir errores en el formato esperado
    errores = []
    for error in (sesion.errores_detectados or []):
        errores.append({
            "tipo": error.categoria_error.nombre if error.categoria_error else "general",
            "descripcion": error.descripcion,
            "impacto": error.severidad,
            "linea_aproximada": error.linea_codigo,
        })
    
    # Construir recomendaciones
    recomendaciones = []
    if evaluacion and evaluacion.recomendaciones:
        for rec in evaluacion.recomendaciones:
            recomendaciones.append({
                "mensaje": rec.titulo,
                "solucion": rec.descripcion,
                "prioridad": rec.prioridad,
            })
    
    # Parsear fortalezas y áreas de mejora (son strings con saltos de línea)
    fortalezas = evaluacion.fortalezas.split("\n") if evaluacion and evaluacion.fortalezas else []
    areas_mejora = evaluacion.areas_mejora.split("\n") if evaluacion and evaluacion.areas_mejora else []
    
    # Filtrar líneas vacías
    fortalezas = [f.strip() for f in fortalezas if f and f.strip()]
    areas_mejora = [a.strip() for a in areas_mejora if a and a.strip()]
    
    # Evaluación técnica (podría venir de detalles de rúbrica)
    evaluacion_tecnica = {
        "manejo_estado": "No evaluado",
        "legibilidad": "No evaluado", 
        "arquitectura": "No evaluado",
        "performance": "No evaluado",
    }
    
    # Intentar extraer de detalles de rúbrica
    if evaluacion and evaluacion.detalles:
        for detalle in evaluacion.detalles:
            if detalle.rubrica:
                rubrica_nombre = detalle.rubrica.nombre.lower()
                comentario = detalle.comentario or "Evaluado"
                
                if "estado" in rubrica_nombre or "state" in rubrica_nombre:
                    evaluacion_tecnica["manejo_estado"] = comentario
                elif "legibilidad" in rubrica_nombre or "legibility" in rubrica_nombre:
                    evaluacion_tecnica["legibilidad"] = comentario
                elif "arquitectura" in rubrica_nombre or "architecture" in rubrica_nombre:
                    evaluacion_tecnica["arquitectura"] = comentario
                elif "performance" in rubrica_nombre or "rendimiento" in rubrica_nombre:
                    evaluacion_tecnica["performance"] = comentario
    
    return {
        "calificacion_general": {
            "nivel": nivel,
            "puntaje": int(puntaje) if puntaje else 0,
            "resumen": evaluacion.feedback_general if evaluacion else "Sin evaluación",
        },
        "errores": errores,
        "buenas_practicas": fortalezas,
        "malas_practicas": areas_mejora,
        "recomendaciones": recomendaciones,
        "evaluacion_tecnica": evaluacion_tecnica,
    }


# =============================================================
# 💾 ENDPOINTS DE AUTOSAVE
# =============================================================

@router.post("/guardar-borrador")
async def guardar_borrador(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Guarda un borrador de código (autosave)"""
    sesion_id_str = data.get("sesion_id")
    codigo = data.get("codigo", "").strip()
    active_file = data.get("active_file", "")

    if not sesion_id_str or not codigo:
        raise HTTPException(status_code=400, detail="sesion_id y codigo son requeridos")

    try:
        sesion_id = uuid.UUID(sesion_id_str)
        sesion = await repo.get_sesion_por_id(db, sesion_id)

        if not sesion:
            print(f"⚠️ Sesión {sesion_id} no encontrada para autosave")
            return {"ok": False, "detail": "Sesión no encontrada"}

        await repo.guardar_envio_codigo(
            db=db,
            sesion_id=sesion_id,
            lenguaje=active_file or "autosave",
            codigo=codigo,
            es_envio_final=False,
        )

        print(f"💾 Borrador guardado para sesión {sesion_id}")
        return {"ok": True}

    except Exception as e:
        print(f"⚠️ Error guardando borrador (no bloquea): {e}")
        return {"ok": False, "detail": str(e)}


# =============================================================
# 🔧 HELPERS DE PERSISTENCIA (PRIVADOS)
# =============================================================

async def _persistir_pregunta_y_sesion(
    db: AsyncSession,
    framework: str,
    resultado: dict,
    contexto: str,
    usuario_id: str | None,
    request: Request,
):
    """Persiste la pregunta generada y crea la sesión"""
    sesion = None

    try:
        slug = TECH_SLUGS.get(framework)
        if not slug:
            print(f"⚠️ Slug no encontrado para framework: {framework}")
            return None

        tecnologia = await repo.get_tecnologia_por_slug(db, slug)
        nivel = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)

        if not tecnologia or not nivel:
            print(f"⚠️ Tecnología '{slug}' o nivel '{NIVEL_DEFAULT}' no encontrados en BD")
            return None

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
    """Persiste el análisis de código en la base de datos"""
    try:
        sesion_id = uuid.UUID(sesion_id_str)
        sesion = await repo.get_sesion_por_id(db, sesion_id)
        
        if not sesion:
            print(f"⚠️ Sesión {sesion_id} no encontrada, no se guarda el análisis")
            return

        # Guardar el código enviado
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

        evaluacion = await repo.guardar_evaluacion(
            db=db,
            sesion_id=sesion_id,
            puntaje_total=float(puntaje),
            feedback_general=resumen,
            fortalezas="\n".join(buenas) if buenas else None,
            areas_mejora="\n".join(malas) if malas else None,
            modelo_ia_usado=settings.DEFAULT_LLM_MODEL,
        )

        # Guardar errores detectados
        errores = resultado.get("errores", [])
        for error in errores:
            try:
                # Validar que linea_codigo sea entero o None
                linea_raw = error.get("linea_aproximada")
                if linea_raw is not None:
                    try:
                        linea_codigo_val = int(linea_raw) if str(linea_raw).isdigit() else None
                    except (ValueError, TypeError):
                        linea_codigo_val = None
                else:
                    linea_codigo_val = None
                
                await repo.guardar_error_detectado(
                    db=db,
                    sesion_id=sesion_id,
                    categoria_error_id=1,
                    descripcion=error.get("descripcion", "Sin descripción"),
                    severidad=error.get("impacto", "medio"),
                    linea_codigo=linea_codigo_val,
                )
            except Exception as e_err:
                print(f"⚠️ Error guardando error detectado: {e_err}")
        
        # Guardar recomendaciones
        recomendaciones = resultado.get("recomendaciones", [])
        for rec in recomendaciones:
            try:
                await repo.guardar_recomendacion(
                    db=db,
                    evaluacion_id=evaluacion.id,
                    tipo="mejora",
                    titulo=rec.get("mensaje", "Recomendación"),
                    descripcion=rec.get("solucion", ""),
                    prioridad=rec.get("prioridad", "media"),
                )
            except Exception as e_rec:
                print(f"⚠️ Error guardando recomendación: {e_rec}")

        # Guardar evaluación técnica detallada
        evaluacion_tecnica = resultado.get("evaluacion_tecnica", {})
        if evaluacion_tecnica:
            await analytics_service.guardar_evaluacion_tecnica(
                db, evaluacion.id, evaluacion_tecnica
            )

        # Actualizar estadísticas del usuario
        if sesion.usuario_id:
            await repo.actualizar_estadisticas_usuario(db, sesion.usuario_id)
            await repo.actualizar_perfil_tecnico(db, sesion.usuario_id)

        await repo.finalizar_sesion(db, sesion_id)

        print(f"✅ Análisis de código persistido para sesión {sesion_id}")

    except Exception as e:
        print(f"⚠️ Error persistiendo análisis de código (no bloquea respuesta): {e}")


# =============================================================
# 🚀 NUEVO ENDPOINT RÁPIDO - Solo crear sesión
# =============================================================

@router.get("/iniciar-sesion/{framework}")
async def iniciar_sesion_rapida(
    framework: str,
    request: Request,
    usuario_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Crea SOLO la sesión sin generar pregunta (rápido, < 100ms).
    El IDE luego puede generar la pregunta bajo demanda.
    """
    print(f"👉 Creando sesión rápida para framework: {framework}")
    
    # Mapear framework a slug
    framework_map = {
        "vuejs": "Vue.js",
        "nextjs": "Next.js",
    }
    
    framework_nombre = framework_map.get(framework.lower())
    if not framework_nombre:
        raise HTTPException(status_code=400, detail=f"Framework no soportado: {framework}")
    
    slug = TECH_SLUGS.get(framework_nombre)
    if not slug:
        raise HTTPException(status_code=400, detail=f"Slug no encontrado para {framework_nombre}")
    
    # Obtener tecnología y nivel
    tecnologia = await repo.get_tecnologia_por_slug(db, slug)
    nivel = await repo.get_nivel_por_nombre(db, NIVEL_DEFAULT)
    
    if not tecnologia or not nivel:
        raise HTTPException(status_code=404, detail="Tecnología o nivel no encontrados")
    
    # Crear pregunta temporal (placeholder)
    pregunta_placeholder = await repo.crear_pregunta(
        db=db,
        tecnologia_id=tecnologia.id,
        nivel_id=nivel.id,
        titulo="Cargando pregunta...",
        enunciado="La pregunta se generará en el IDE",
        prompt_contexto="",
        creada_por=uuid.UUID(usuario_id) if usuario_id else None,
    )
    
    # Crear sesión
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    sesion = await repo.crear_sesion(
        db=db,
        usuario_id=uuid.UUID(usuario_id) if usuario_id else None,
        tecnologia_id=tecnologia.id,
        nivel_id=nivel.id,
        pregunta_id=pregunta_placeholder.id,
        ip_usuario=ip,
        user_agent=user_agent,
    )
    
    print(f"✅ Sesión rápida creada con ID: {sesion.id}")
    
    return {
        "sesion_id": str(sesion.id),
        "tecnologia_id": tecnologia.id,
        "nivel_id": nivel.id,
    }