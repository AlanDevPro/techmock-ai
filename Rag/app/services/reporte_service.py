"""
app/services/reporte_service.py

Responsabilidad única: lógica de negocio de reportes.
Orquesta: reportes_repository → valida → serializa a DTOs.
NO accede a BD directamente. NO llama al LLM.
"""

from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.reportes_repository import (
    get_reporte_completo_sesion,
    get_historial_sesiones_developer,
    get_perfil_completo_developer,
    get_errores_frecuentes_usuario,
    get_errores_frecuentes_globales,
    get_estadisticas_globales,
    get_rendimiento_por_tecnologia,
    get_evolucion_puntajes_developer,
)
from app.schemas.reportes import (
    ReporteSesionResponse,
    ReporteSesionResumen,
    PerfilTecnicoResponse,
    ErrorFrecuenteResponse,
    EstadisticasGlobalesResponse,
    RendimientoTecnologiaResponse,
    TendenciaUsuarioResponse,
    FortalezaDebilidadItem,
    TecnologiaResumen,
    NivelResumen,
    UsuarioResumen,
    PreguntaResumen,
    MensajeResumen,
    EnvioCodigoResumen,
    ErrorResponse,
    EvaluacionResponse,
    DetalleRubricaResponse,
)


# ================================================================
# 🔹 FUNCIÓN AUXILIAR: Mapeo de modelo ORM a DTO
# ================================================================

def _mapear_sesion_a_reporte_completo(sesion) -> ReporteSesionResponse:
    """
    Mapea manualmente el modelo ORM SesionEntrevista a ReporteSesionResponse.
    Esto evita problemas de validación de Pydantic con relaciones complejas.
    """
    # Mapear usuario
    usuario = None
    if sesion.usuario:
        usuario = UsuarioResumen(
            id=sesion.usuario.id,
            nombre=sesion.usuario.nombre,
            email=sesion.usuario.email,
            rol=sesion.usuario.rol,
        )
    
    # Mapear tecnología
    tecnologia = None
    if sesion.tecnologia:
        tecnologia = TecnologiaResumen(
            id=sesion.tecnologia.id,
            nombre=sesion.tecnologia.nombre,
            slug=sesion.tecnologia.slug,
            icono_url=getattr(sesion.tecnologia, 'icono_url', None),
        )
    
    # Mapear nivel
    nivel = None
    if sesion.nivel:
        nivel = NivelResumen(
            id=sesion.nivel.id,
            nombre=sesion.nivel.nombre,
            orden=getattr(sesion.nivel, 'orden', 0),
        )
    
    # Mapear pregunta
    pregunta = None
    if sesion.pregunta:
        pregunta = PreguntaResumen(
            id=sesion.pregunta.id,
            titulo=sesion.pregunta.titulo,
            enunciado=sesion.pregunta.enunciado,
            nivel_id=getattr(sesion.pregunta, 'nivel_id', None),
        )
    
    # Mapear mensajes
    mensajes = []
    if sesion.mensajes:
        for msg in sesion.mensajes:
            mensajes.append(MensajeResumen(
                id=msg.id,
                rol=msg.rol,
                contenido=msg.contenido[:500] if msg.contenido else "",  # Truncar si es muy largo
                fecha=msg.fecha,
            ))
    
    # Mapear envíos de código
    envios = []
    if sesion.envios:
        for envio in sesion.envios:
            envios.append(EnvioCodigoResumen(
                id=envio.id,
                lenguaje=envio.lenguaje,
                codigo_preview=envio.codigo[:200] + "..." if envio.codigo and len(envio.codigo) > 200 else envio.codigo,
                fecha_envio=envio.fecha_envio,
                es_envio_final=envio.es_envio_final,
            ))
    
    # Mapear evaluación
    evaluacion = None
    if sesion.evaluacion:
        ev = sesion.evaluacion
        
        # Mapear detalles de rúbrica
        detalles_rubrica = []
        if hasattr(ev, 'detalles') and ev.detalles:
            for detalle in ev.detalles:
                detalles_rubrica.append(DetalleRubricaResponse(
                    rubrica_nombre=detalle.rubrica.nombre if detalle.rubrica else None,
                    puntaje=detalle.puntaje,
                    comentario=detalle.comentario,
                ))
        
        evaluacion = EvaluacionResponse(
            id=ev.id,
            puntaje_total=ev.puntaje_total,
            puntaje_javascript=ev.puntaje_javascript,
            puntaje_arquitectura=ev.puntaje_arquitectura,
            puntaje_buenas_practicas=ev.puntaje_buenas_practicas,
            puntaje_comunicacion=ev.puntaje_comunicacion,
            puntaje_resolucion=ev.puntaje_resolucion,
            nivel_candidato=ev.nivel_candidato,
            apto_para_contratacion=ev.apto_para_contratacion,
            feedback_general=ev.feedback_general,
            resumen_para_reclutador=ev.resumen_para_reclutador,
            fortalezas=ev.fortalezas,
            areas_mejora=ev.areas_mejora,
            sugerencias_recursos=ev.sugerencias_recursos,
            generado_por_ia=ev.generado_por_ia,
            modelo_ia_usado=ev.modelo_ia_usado,
            fecha_evaluacion=ev.fecha_evaluacion,
            detalles_rubrica=detalles_rubrica,
        )
    
    # Mapear errores detectados
    errores = []
    if sesion.errores_detectados:
        for error in sesion.errores_detectados:
            errores.append(ErrorResponse(
                id=error.id,
                descripcion=error.descripcion,
                severidad=error.severidad,
                es_error_conceptual=error.es_error_conceptual,
                linea_codigo=error.linea_codigo,
                fragmento_codigo=error.fragmento_codigo,
                codigo_corregido=error.codigo_corregido,
                explicacion_ia=error.explicacion_ia,
                categoria_nombre=error.categoria_error.nombre if error.categoria_error else None,
            ))
    
    # Calcular duración en segundos
    duracion_segundos = None
    if sesion.fecha_fin and sesion.fecha_inicio:
        delta = sesion.fecha_fin - sesion.fecha_inicio
        duracion_segundos = int(delta.total_seconds())
    
    return ReporteSesionResponse(
        id=sesion.id,
        estado=sesion.estado,
        fue_adaptativa=sesion.fue_adaptativa,
        fecha_inicio=sesion.fecha_inicio,
        fecha_fin=sesion.fecha_fin,
        duracion_segundos=duracion_segundos,
        ip_usuario=sesion.ip_usuario,
        user_agent=sesion.user_agent,
        usuario=usuario,
        tecnologia=tecnologia,
        nivel=nivel,
        pregunta=pregunta,
        mensajes=mensajes,
        envios=envios,
        errores_detectados=errores,
        evaluacion=evaluacion,
    )


def _mapear_sesion_a_resumen(sesion) -> ReporteSesionResumen:
    """Mapea sesión a resumen aplanado para listados"""
    tecnologia = None
    if sesion.tecnologia:
        tecnologia = TecnologiaResumen(
            id=sesion.tecnologia.id,
            nombre=sesion.tecnologia.nombre,
            slug=sesion.tecnologia.slug,
            icono_url=getattr(sesion.tecnologia, 'icono_url', None),
        )
    
    nivel = None
    if sesion.nivel:
        nivel = NivelResumen(
            id=sesion.nivel.id,
            nombre=sesion.nivel.nombre,
            orden=getattr(sesion.nivel, 'orden', 0),
        )
    
    evaluacion = getattr(sesion, 'evaluacion', None)
    
    return ReporteSesionResumen(
        id=sesion.id,
        estado=sesion.estado,
        fue_adaptativa=sesion.fue_adaptativa,
        fecha_inicio=sesion.fecha_inicio,
        duracion_segundos=sesion.duracion_segundos,
        tecnologia=tecnologia,
        nivel=nivel,
        puntaje_total=getattr(evaluacion, 'puntaje_total', None),
        nivel_candidato=getattr(evaluacion, 'nivel_candidato', None),
        apto_para_contratacion=getattr(evaluacion, 'apto_para_contratacion', None),
    )


# ================================================================
# 🔹 SERVICIOS PRINCIPALES
# ================================================================

async def generar_reporte_sesion(
    db: AsyncSession,
    sesion_id: UUID,
) -> Optional[ReporteSesionResponse]:
    """
    Obtiene el reporte completo de una sesión y lo serializa como DTO.
    Usa get_reporte_completo_sesion() del repository.

    Retorna None si la sesión no existe.
    Incluye: evaluacion, errores_detectados, mensajes, envios, tecnologia, nivel.
    """
    sesion = await get_reporte_completo_sesion(db, sesion_id)

    if not sesion:
        return None

    # Mapeo manual para evitar problemas de validación
    return _mapear_sesion_a_reporte_completo(sesion)


async def listar_reportes_usuario(
    db: AsyncSession,
    usuario_id: str,
    limit: int = 20,
    offset: int = 0,
) -> List[ReporteSesionResumen]:
    """
    Listado liviano de sesiones de un usuario para dashboard / historial.
    Usa get_historial_sesiones_developer() del repository.
    Aplana puntaje y nivel desde evaluacion para evitar N+1 en el frontend.
    """
    try:
        usuario_uuid = UUID(usuario_id)
    except ValueError:
        return []
    
    sesiones = await get_historial_sesiones_developer(
        db, usuario_uuid, limit=limit, offset=offset
    )
    
    return [_mapear_sesion_a_resumen(sesion) for sesion in sesiones]


async def obtener_perfil_tecnico(
    db: AsyncSession,
    usuario_id: str,
) -> Optional[PerfilTecnicoResponse]:
    """
    Obtiene el perfil técnico completo de un developer.
    Usa get_perfil_completo_developer() del repository.
    """
    try:
        usuario_uuid = UUID(usuario_id)
    except ValueError:
        return None
    
    perfil = await get_perfil_completo_developer(db, usuario_uuid)
    
    if not perfil:
        return None
    
    # Mapear fortalezas
    fortalezas = []
    if perfil.fortalezas:
        for f in perfil.fortalezas:
            fortalezas.append(FortalezaDebilidadItem(
                categoria_id=f.categoria_error_id,
                nombre=f.categoria_error.nombre if f.categoria_error else "N/A",
                tipo=f.categoria_error.tipo if f.categoria_error else None,
            ))
    
    # Mapear debilidades
    debilidades = []
    if perfil.debilidades:
        for d in perfil.debilidades:
            debilidades.append(FortalezaDebilidadItem(
                categoria_id=d.categoria_error_id,
                nombre=d.categoria_error.nombre if d.categoria_error else "N/A",
                tipo=d.categoria_error.tipo if d.categoria_error else None,
            ))
    
    # Mapear mejor tecnología
    mejor_tecnologia = None
    if perfil.mejor_tecnologia:
        mejor_tecnologia = TecnologiaResumen(
            id=perfil.mejor_tecnologia.id,
            nombre=perfil.mejor_tecnologia.nombre,
            slug=perfil.mejor_tecnologia.slug,
        )
    
    # Mapear peor tecnología
    peor_tecnologia = None
    if perfil.peor_tecnologia:
        peor_tecnologia = TecnologiaResumen(
            id=perfil.peor_tecnologia.id,
            nombre=perfil.peor_tecnologia.nombre,
            slug=perfil.peor_tecnologia.slug,
        )
    
    return PerfilTecnicoResponse(
        usuario_id=perfil.usuario_id,
        nivel_actual=perfil.nivel_actual,
        score_global=perfil.score_global,
        sesiones_completadas=perfil.sesiones_completadas,
        evaluacion_promedio=perfil.evaluacion_promedio,
        mejor_tecnologia=mejor_tecnologia,
        peor_tecnologia=peor_tecnologia,
        fortalezas=fortalezas,
        debilidades=debilidades,
    )


async def obtener_errores_frecuentes_usuario(
    db: AsyncSession,
    usuario_id: str,
    limit: int = 10,
) -> List[ErrorFrecuenteResponse]:
    """
    Obtiene los errores más frecuentes de un usuario.
    """
    try:
        usuario_uuid = UUID(usuario_id)
    except ValueError:
        return []
    
    errores = await get_errores_frecuentes_usuario(db, usuario_uuid, limit=limit)
    
    return [
        ErrorFrecuenteResponse(
            categoria_id=e["categoria_id"],
            nombre=e["nombre"],
            tipo=e.get("tipo"),
            total_errores=e["total_errores"],
            ultimo_detectado=e.get("ultimo_detectado"),
        )
        for e in errores
    ]


async def obtener_errores_frecuentes_globales(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    limit: int = 10,
    offset: int = 0,
) -> List[ErrorFrecuenteResponse]:
    """
    Obtiene los errores más frecuentes a nivel global.
    """
    errores = await get_errores_frecuentes_globales(
        db, tecnologia_id, desde, hasta, limit, offset
    )
    
    return [
        ErrorFrecuenteResponse(
            categoria_id=e["categoria_id"],
            nombre=e["nombre"],
            tipo=e.get("tipo"),
            total_errores=e["total_errores"],
            severidad_promedio=e.get("severidad_promedio"),
            severidad_total=e.get("severidad_total"),
        )
        for e in errores
    ]


async def obtener_estadisticas_globales(
    db: AsyncSession,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> EstadisticasGlobalesResponse:
    """
    Obtiene estadísticas globales del sistema.
    """
    stats = await get_estadisticas_globales(db, desde, hasta)
    
    return EstadisticasGlobalesResponse(
        total_sesiones=stats["total_sesiones"],
        sesiones_completadas=stats["sesiones_completadas"],
        sesiones_abandonadas=stats["sesiones_abandonadas"],
        total_evaluaciones=stats["total_evaluaciones"],
        puntaje_promedio_global=stats["puntaje_promedio_global"],
        tasa_aprobacion_pct=stats["tasa_aprobacion_pct"],
        distribucion_por_nivel=stats["distribucion_por_nivel"],
    )


async def obtener_rendimiento_por_tecnologia(
    db: AsyncSession,
    desde: Optional[datetime] = None,
) -> List[RendimientoTecnologiaResponse]:
    """
    Obtiene rendimiento agregado por tecnología.
    """
    rendimiento = await get_rendimiento_por_tecnologia(db, desde)
    
    return [
        RendimientoTecnologiaResponse(
            tecnologia_id=r["tecnologia_id"],
            nombre=r["nombre"],
            slug=r["slug"],
            total_sesiones=r["total_sesiones"],
            puntaje_promedio=r["puntaje_promedio"],
            tasa_aprobacion_pct=r["tasa_aprobacion_pct"],
        )
        for r in rendimiento
    ]


async def obtener_tendencia_usuario(
    db: AsyncSession,
    usuario_id: str,
    limit: int = 20,
) -> Optional[TendenciaUsuarioResponse]:
    """
    Obtiene la tendencia de evolución de un usuario.
    """
    try:
        usuario_uuid = UUID(usuario_id)
    except ValueError:
        return None
    
    evolucion = await get_evolucion_puntajes_developer(db, usuario_uuid, limit=limit)
    
    if not evolucion:
        return None
    
    puntajes = [e["puntaje_total"] for e in evolucion if e["puntaje_total"] is not None]
    
    return TendenciaUsuarioResponse(
        usuario_id=usuario_id,
        total_sesiones=len(evolucion),
        puntaje_promedio=sum(puntajes) / len(puntajes) if puntajes else 0,
        puntaje_maximo=max(puntajes) if puntajes else 0,
        puntaje_minimo=min(puntajes) if puntajes else 0,
        tendencia=evolucion,
    )