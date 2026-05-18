"""
app/db/reportes_repository.py

Repositorio dedicado exclusivamente a consultas de reportes, analytics y dashboard.
NO hace inserts ni updates — eso queda en repositories.py.

Responsabilidades:
- Reporte completo de sesión (para reclutador y developer)
- Dashboard de reclutador (listado paginado con filtros)
- Ranking de developers
- Analytics de tecnologías y errores
- Historial técnico de un usuario
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, func, and_, or_, desc, asc, case, text
from sqlalchemy.orm import selectinload, aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Usuario,
    Tecnologia,
    NivelDificultad,
    SesionEntrevista,
    Evaluacion,
    DetalleEvaluacion,
    ErrorDetectado,
    CategoriaError,
    RecomendacionSolucion,
    EstadisticasUsuario,
    PerfilTecnicoUsuario,
    FortalezaUsuario,
    DebilidadUsuario,
    Mensaje,
    EnvioCodigo,
)


# ================================================================
# 🔹 CONSTANTES (Evitar strings hardcodeados)
# ================================================================

class EstadoSesion:
    """Constantes para estados de sesión - evitar typos"""
    EN_PROGRESO = "en_progreso"
    COMPLETADA = "completada"
    ABANDONADA = "abandonada"
    EVALUADA = "evaluada"


class NivelCandidato:
    """Niveles de candidato"""
    PRINCIPIANTE = "principiante"
    INTERMEDIO = "intermedio"
    AVANZADO = "avanzado"
    PROMISORIO = "promisorio"
    RECOMENDADO = "recomendado"
    DESTACADO = "destacado"


class SeveridadError:
    """Severidad de errores para cálculos"""
    CRITICO = "critico"
    ALTO = "alto"
    MEDIO = "medio"
    BAJO = "bajo"
    
    # Pesos para cálculos
    PESOS = {
        CRITICO: 4,
        ALTO: 3,
        MEDIO: 2,
        BAJO: 1,
    }


# ================================================================
# 🔹 REPORTE COMPLETO DE SESIÓN
# ================================================================

async def get_reporte_completo_sesion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
) -> Optional[SesionEntrevista]:
    """
    Carga una sesión con TODAS sus relaciones anidadas en una sola query.
    Ideal para generar el reporte final visible al developer y al reclutador.
    """
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            # Datos del candidato
            selectinload(SesionEntrevista.usuario),
            
            # Contexto de la entrevista
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.pregunta),
            
            # Conversación completa (ordenada correctamente)
            selectinload(SesionEntrevista.mensajes).order_by(asc(Mensaje.fecha)),
            
            # Código enviado
            selectinload(SesionEntrevista.envios),
            
            # Errores con su categoría anidada
            selectinload(SesionEntrevista.errores_detectados).selectinload(
                ErrorDetectado.categoria_error
            ),
            
            # Evaluación con detalles por rúbrica
            selectinload(SesionEntrevista.evaluacion).selectinload(
                Evaluacion.detalles
            ).selectinload(
                DetalleEvaluacion.rubrica
            ),
            
            # Evaluación con recomendaciones de solución
            selectinload(SesionEntrevista.evaluacion).selectinload(
                Evaluacion.recomendaciones
            ).selectinload(
                RecomendacionSolucion.categoria_error
            ),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    return result.scalar_one_or_none()


# ================================================================
# 🔹 DASHBOARD RECLUTADOR — LISTADO DE SESIONES EVALUADAS
# ================================================================

async def get_sesiones_evaluadas_para_dashboard(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    nivel_id: Optional[int] = None,
    nivel_candidato: Optional[str] = None,
    apto_para_contratacion: Optional[bool] = None,
    puntaje_minimo: Optional[float] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    limit: int = 20,
    offset: int = 0,
    orden_por: str = "fecha_desc",
) -> List[SesionEntrevista]:
    """
    Listado paginado de sesiones completadas con evaluación para el dashboard del reclutador.
    Soporta filtros múltiples y ordenamiento.
    """
    query = (
        select(SesionEntrevista)
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .options(
            selectinload(SesionEntrevista.usuario),
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.evaluacion),
        )
        .where(SesionEntrevista.estado == EstadoSesion.COMPLETADA)
    )
    
    # Filtros opcionales
    if tecnologia_id is not None:
        query = query.where(SesionEntrevista.tecnologia_id == tecnologia_id)
    if nivel_id is not None:
        query = query.where(SesionEntrevista.nivel_id == nivel_id)
    if nivel_candidato is not None:
        query = query.where(Evaluacion.nivel_candidato == nivel_candidato)
    if apto_para_contratacion is not None:
        query = query.where(Evaluacion.apto_para_contratacion == apto_para_contratacion)
    if puntaje_minimo is not None:
        query = query.where(Evaluacion.puntaje_total >= puntaje_minimo)
    if desde is not None:
        query = query.where(SesionEntrevista.fecha_inicio >= desde)
    if hasta is not None:
        query = query.where(SesionEntrevista.fecha_inicio <= hasta)
    
    # Ordenamiento
    orden_map = {
        "fecha_desc": desc(SesionEntrevista.fecha_inicio),
        "fecha_asc": asc(SesionEntrevista.fecha_inicio),
        "puntaje_desc": desc(Evaluacion.puntaje_total),
        "puntaje_asc": asc(Evaluacion.puntaje_total),
    }
    query = query.order_by(orden_map.get(orden_por, desc(SesionEntrevista.fecha_inicio)))
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    return result.scalars().all()


async def contar_sesiones_evaluadas(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    nivel_id: Optional[int] = None,
    nivel_candidato: Optional[str] = None,
    apto_para_contratacion: Optional[bool] = None,
    puntaje_minimo: Optional[float] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> int:
    """Cuenta total de sesiones para paginación del dashboard."""
    query = (
        select(func.count(SesionEntrevista.id))
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .where(SesionEntrevista.estado == EstadoSesion.COMPLETADA)
    )
    
    if tecnologia_id is not None:
        query = query.where(SesionEntrevista.tecnologia_id == tecnologia_id)
    if nivel_id is not None:
        query = query.where(SesionEntrevista.nivel_id == nivel_id)
    if nivel_candidato is not None:
        query = query.where(Evaluacion.nivel_candidato == nivel_candidato)
    if apto_para_contratacion is not None:
        query = query.where(Evaluacion.apto_para_contratacion == apto_para_contratacion)
    if puntaje_minimo is not None:
        query = query.where(Evaluacion.puntaje_total >= puntaje_minimo)
    if desde is not None:
        query = query.where(SesionEntrevista.fecha_inicio >= desde)
    if hasta is not None:
        query = query.where(SesionEntrevista.fecha_inicio <= hasta)
    
    result = await db.execute(query)
    return result.scalar() or 0


# ================================================================
# 🔹 RANKING DE DEVELOPERS
# ================================================================

async def get_ranking_developers(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    nivel_candidato: Optional[str] = None,
    solo_aptos: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[PerfilTecnicoUsuario]:
    """
    Ranking de developers ordenado por score global descendente.
    Incluye datos del usuario y tecnología favorita.
    """
    query = (
        select(PerfilTecnicoUsuario)
        .join(Usuario, PerfilTecnicoUsuario.usuario_id == Usuario.id)
        .options(
            selectinload(PerfilTecnicoUsuario.usuario),
            selectinload(PerfilTecnicoUsuario.mejor_tecnologia),
            selectinload(PerfilTecnicoUsuario.peor_tecnologia),
        )
        .where(
            and_(
                Usuario.activo == True,
                Usuario.rol == "developer",
                PerfilTecnicoUsuario.sesiones_completadas > 0,
            )
        )
    )
    
    if nivel_candidato is not None:
        query = query.where(PerfilTecnicoUsuario.nivel_actual == nivel_candidato)
    if solo_aptos:
        query = query.where(
            PerfilTecnicoUsuario.nivel_actual.in_([
                NivelCandidato.PROMISORIO,
                NivelCandidato.RECOMENDADO,
                NivelCandidato.DESTACADO,
            ])
        )
    
    # Filtro por tecnología: al menos una sesión completada con esa tech
    if tecnologia_id is not None:
        subq = (
            select(SesionEntrevista.usuario_id)
            .where(
                and_(
                    SesionEntrevista.tecnologia_id == tecnologia_id,
                    SesionEntrevista.estado == EstadoSesion.COMPLETADA,
                )
            )
            .distinct()
            .scalar_subquery()
        )
        query = query.where(PerfilTecnicoUsuario.usuario_id.in_(subq))
    
    query = (
        query
        .order_by(desc(PerfilTecnicoUsuario.score_global))
        .limit(limit)
        .offset(offset)
    )
    
    result = await db.execute(query)
    return result.scalars().all()


# ================================================================
# 🔹 HISTORIAL TÉCNICO DE UN DEVELOPER
# ================================================================

async def get_historial_sesiones_developer(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> List[SesionEntrevista]:
    """
    Historial completo de sesiones de un developer con sus evaluaciones.
    Ordenado por fecha descendente.
    """
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.pregunta),
            selectinload(SesionEntrevista.evaluacion),
        )
        .where(SesionEntrevista.usuario_id == usuario_id)
        .order_by(desc(SesionEntrevista.fecha_inicio))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


async def get_perfil_completo_developer(
    db: AsyncSession,
    usuario_id: uuid.UUID,
) -> Optional[PerfilTecnicoUsuario]:
    """
    Perfil técnico completo de un developer con fortalezas, debilidades
    y referencias a tecnologías.
    """
    result = await db.execute(
        select(PerfilTecnicoUsuario)
        .options(
            selectinload(PerfilTecnicoUsuario.usuario),
            selectinload(PerfilTecnicoUsuario.mejor_tecnologia),
            selectinload(PerfilTecnicoUsuario.peor_tecnologia),
            selectinload(PerfilTecnicoUsuario.ultima_evaluacion),
            selectinload(PerfilTecnicoUsuario.fortalezas).selectinload(
                FortalezaUsuario.categoria_error
            ),
            selectinload(PerfilTecnicoUsuario.debilidades).selectinload(
                DebilidadUsuario.categoria_error
            ),
        )
        .where(PerfilTecnicoUsuario.usuario_id == usuario_id)
    )
    return result.scalar_one_or_none()


# ================================================================
# 🔹 ANALYTICS — ERRORES MÁS FRECUENTES (CON PAGINACIÓN)
# ================================================================

async def get_errores_frecuentes_globales(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    limit: int = 10,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Ranking de categorías de error más frecuentes en todo el sistema.
    Útil para detectar patrones de debilidad general.
    SOPORTA PAGINACIÓN COMPLETA.
    """
    # Subquery para evitar duplicados y cartesian explosion
    query = (
        select(
            CategoriaError.id,
            CategoriaError.nombre,
            CategoriaError.tipo,
            func.count(ErrorDetectado.id).label("total"),
            func.sum(
                case(
                    (ErrorDetectado.severidad == SeveridadError.CRITICO, 4),
                    (ErrorDetectado.severidad == SeveridadError.ALTO, 3),
                    (ErrorDetectado.severidad == SeveridadError.MEDIO, 2),
                    (ErrorDetectado.severidad == SeveridadError.BAJO, 1),
                    else_=1,
                )
            ).label("severidad_total"),
            func.avg(
                case(
                    (ErrorDetectado.severidad == SeveridadError.CRITICO, 4.0),
                    (ErrorDetectado.severidad == SeveridadError.ALTO, 3.0),
                    (ErrorDetectado.severidad == SeveridadError.MEDIO, 2.0),
                    (ErrorDetectado.severidad == SeveridadError.BAJO, 1.0),
                    else_=1.0,
                )
            ).label("severidad_promedio"),
        )
        .select_from(CategoriaError)  # Explicit FROM para evitar joins problemáticos
        .join(ErrorDetectado, CategoriaError.id == ErrorDetectado.categoria_error_id)
        .join(SesionEntrevista, ErrorDetectado.sesion_id == SesionEntrevista.id)
        .where(CategoriaError.activo == True)
    )
    
    if tecnologia_id is not None:
        query = query.where(SesionEntrevista.tecnologia_id == tecnologia_id)
    if desde is not None:
        query = query.where(ErrorDetectado.detectado_en >= desde)
    if hasta is not None:
        query = query.where(ErrorDetectado.detectado_en <= hasta)
    
    # Agrupar y ordenar
    query = (
        query
        .group_by(CategoriaError.id, CategoriaError.nombre, CategoriaError.tipo)
        .order_by(desc(func.count(ErrorDetectado.id)))
        .limit(limit)
        .offset(offset)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "categoria_id": r.id,
            "nombre": r.nombre,
            "tipo": r.tipo,
            "total_errores": r.total,
            "severidad_promedio": round(float(r.severidad_promedio or 0), 2),
            "severidad_total": r.severidad_total or 0,
        }
        for r in rows
    ]


async def get_errores_frecuentes_usuario(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    limit: int = 10,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Errores más frecuentes de un developer específico.
    Útil para personalizar recomendaciones y preguntas adaptativas.
    SOPORTA PAGINACIÓN.
    """
    result = await db.execute(
        select(
            CategoriaError.id,
            CategoriaError.nombre,
            CategoriaError.tipo,
            func.count(ErrorDetectado.id).label("total"),
            func.max(ErrorDetectado.detectado_en).label("ultimo_detectado"),
        )
        .select_from(CategoriaError)
        .join(ErrorDetectado, CategoriaError.id == ErrorDetectado.categoria_error_id)
        .join(SesionEntrevista, ErrorDetectado.sesion_id == SesionEntrevista.id)
        .where(SesionEntrevista.usuario_id == usuario_id)
        .group_by(CategoriaError.id, CategoriaError.nombre, CategoriaError.tipo)
        .order_by(desc(func.count(ErrorDetectado.id)))
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    
    return [
        {
            "categoria_id": r.id,
            "nombre": r.nombre,
            "tipo": r.tipo,
            "total_errores": r.total,
            "ultimo_detectado": r.ultimo_detectado,
        }
        for r in rows
    ]


async def count_errores_frecuentes_globales(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> int:
    """Cuenta total de categorías de error para paginación."""
    query = (
        select(func.count(func.distinct(CategoriaError.id)))
        .select_from(CategoriaError)
        .join(ErrorDetectado, CategoriaError.id == ErrorDetectado.categoria_error_id)
        .join(SesionEntrevista, ErrorDetectado.sesion_id == SesionEntrevista.id)
        .where(CategoriaError.activo == True)
    )
    
    if tecnologia_id is not None:
        query = query.where(SesionEntrevista.tecnologia_id == tecnologia_id)
    if desde is not None:
        query = query.where(ErrorDetectado.detectado_en >= desde)
    if hasta is not None:
        query = query.where(ErrorDetectado.detectado_en <= hasta)
    
    result = await db.execute(query)
    return result.scalar() or 0


# ================================================================
# 🔹 ANALYTICS — ESTADÍSTICAS GLOBALES DEL SISTEMA
# ================================================================

async def get_estadisticas_globales(
    db: AsyncSession,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Métricas globales del sistema: total sesiones, puntaje promedio,
    tasa de aprobación, distribución por nivel.
    Usa Decimal para precisión financiera/analítica.
    """
    filtros = []
    if desde:
        filtros.append(SesionEntrevista.fecha_inicio >= desde)
    if hasta:
        filtros.append(SesionEntrevista.fecha_inicio <= hasta)
    
    # Conteos generales
    result = await db.execute(
        select(
            func.count(SesionEntrevista.id).label("total_sesiones"),
            func.count(
                case((SesionEntrevista.estado == EstadoSesion.COMPLETADA, 1), else_=None)
            ).label("completadas"),
            func.count(
                case((SesionEntrevista.estado == EstadoSesion.ABANDONADA, 1), else_=None)
            ).label("abandonadas"),
        )
        .where(and_(*filtros) if filtros else True)
    )
    conteos = result.first()
    
    # Puntaje promedio y tasa de aprobación (usando Decimal)
    eval_filtros = []
    if desde:
        eval_filtros.append(SesionEntrevista.fecha_inicio >= desde)
    if hasta:
        eval_filtros.append(SesionEntrevista.fecha_inicio <= hasta)
    
    result = await db.execute(
        select(
            func.avg(Evaluacion.puntaje_total).label("puntaje_promedio"),
            func.count(
                case((Evaluacion.apto_para_contratacion == True, 1), else_=None)
            ).label("aptos"),
            func.count(Evaluacion.id).label("total_evaluaciones"),
        )
        .join(SesionEntrevista, Evaluacion.sesion_id == SesionEntrevista.id)
        .where(and_(*eval_filtros) if eval_filtros else True)
    )
    eval_row = result.first()
    
    # Distribución por nivel_candidato
    result = await db.execute(
        select(
            Evaluacion.nivel_candidato,
            func.count(Evaluacion.id).label("cantidad"),
        )
        .join(SesionEntrevista, Evaluacion.sesion_id == SesionEntrevista.id)
        .where(and_(*eval_filtros) if eval_filtros else True)
        .group_by(Evaluacion.nivel_candidato)
        .order_by(desc(func.count(Evaluacion.id)))
    )
    distribucion = {row.nivel_candidato: row.cantidad for row in result.all()}
    
    total_eval = eval_row.total_evaluaciones or 0
    aptos = eval_row.aptos or 0
    
    # Convertir Decimal a float para JSON (pero mantener precisión en cálculos)
    puntaje_promedio = eval_row.puntaje_promedio
    if isinstance(puntaje_promedio, Decimal):
        puntaje_promedio = float(puntaje_promedio)
    
    return {
        "total_sesiones": conteos.total_sesiones or 0,
        "sesiones_completadas": conteos.completadas or 0,
        "sesiones_abandonadas": conteos.abandonadas or 0,
        "total_evaluaciones": total_eval,
        "puntaje_promedio_global": round(puntaje_promedio or 0, 2),
        "tasa_aprobacion_pct": round((aptos / total_eval * 100) if total_eval > 0 else 0, 1),
        "distribucion_por_nivel": distribucion,
    }


# ================================================================
# 🔹 ANALYTICS — RENDIMIENTO POR TECNOLOGÍA
# ================================================================

async def get_rendimiento_por_tecnologia(
    db: AsyncSession,
    desde: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Puntaje promedio, total de sesiones y tasa de aprobación agrupado
    por tecnología. Útil para detectar qué stacks tienen más dificultad.
    """
    filtros = [SesionEntrevista.estado == EstadoSesion.COMPLETADA]
    if desde:
        filtros.append(SesionEntrevista.fecha_inicio >= desde)
    
    result = await db.execute(
        select(
            Tecnologia.id,
            Tecnologia.nombre,
            Tecnologia.slug,
            func.count(SesionEntrevista.id).label("total_sesiones"),
            func.avg(Evaluacion.puntaje_total).label("puntaje_promedio"),
            func.count(
                case((Evaluacion.apto_para_contratacion == True, 1), else_=None)
            ).label("aptos"),
        )
        .select_from(Tecnologia)  # Explicit FROM
        .join(SesionEntrevista, Tecnologia.id == SesionEntrevista.tecnologia_id)
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .where(and_(*filtros))
        .group_by(Tecnologia.id, Tecnologia.nombre, Tecnologia.slug)
        .order_by(desc(func.avg(Evaluacion.puntaje_total)))
    )
    rows = result.all()
    
    return [
        {
            "tecnologia_id": r.id,
            "nombre": r.nombre,
            "slug": r.slug,
            "total_sesiones": r.total_sesiones,
            "puntaje_promedio": round(float(r.puntaje_promedio or 0), 2),
            "tasa_aprobacion_pct": round(
                (r.aptos / r.total_sesiones * 100) if r.total_sesiones > 0 else 0, 1
            ),
        }
        for r in rows
    ]


# ================================================================
# 🔹 ANALYTICS — EVOLUCIÓN TEMPORAL DE UN DEVELOPER
# ================================================================

async def get_evolucion_puntajes_developer(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Serie temporal de puntajes de un developer para mostrar su progresión.
    Ordenado cronológicamente. SOPORTA PAGINACIÓN.
    """
    result = await db.execute(
        select(
            SesionEntrevista.fecha_inicio,
            SesionEntrevista.tecnologia_id,
            Tecnologia.nombre.label("tecnologia_nombre"),
            Evaluacion.puntaje_total,
            Evaluacion.puntaje_javascript,
            Evaluacion.puntaje_arquitectura,
            Evaluacion.puntaje_buenas_practicas,
            Evaluacion.puntaje_comunicacion,
            Evaluacion.puntaje_resolucion,
            Evaluacion.nivel_candidato,
        )
        .select_from(SesionEntrevista)
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .join(Tecnologia, SesionEntrevista.tecnologia_id == Tecnologia.id)
        .where(
            and_(
                SesionEntrevista.usuario_id == usuario_id,
                SesionEntrevista.estado == EstadoSesion.COMPLETADA,
            )
        )
        .order_by(asc(SesionEntrevista.fecha_inicio))
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    
    return [
        {
            "fecha": r.fecha_inicio,
            "tecnologia_id": r.tecnologia_id,
            "tecnologia": r.tecnologia_nombre,
            "puntaje_total": float(r.puntaje_total or 0),
            "puntaje_javascript": float(r.puntaje_javascript or 0),
            "puntaje_arquitectura": float(r.puntaje_arquitectura or 0),
            "puntaje_buenas_practicas": float(r.puntaje_buenas_practicas or 0),
            "puntaje_comunicacion": float(r.puntaje_comunicacion or 0),
            "puntaje_resolucion": float(r.puntaje_resolucion or 0),
            "nivel_candidato": r.nivel_candidato,
        }
        for r in rows
    ]


# ================================================================
# 🔹 CONTEXTO ADAPTATIVO — DATOS PARA SIGUIENTE PREGUNTA
# ================================================================

async def get_contexto_adaptativo_usuario(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    tecnologia_id: int,
) -> Dict[str, Any]:
    """
    Construye el contexto necesario para que el sistema adaptativo
    genere la siguiente pregunta personalizada.
    
    Retorna:
    - Categorías de error con mayor frecuencia (para enfocar la pregunta)
    - Puntajes recientes (para ajustar dificultad)
    - Sesiones anteriores en la misma tecnología
    """
    # Errores frecuentes del usuario en esta tecnología
    errores = await get_errores_frecuentes_usuario(db, usuario_id, limit=5)
    
    # Últimas 5 sesiones en esta tecnología con su puntaje
    result = await db.execute(
        select(
            SesionEntrevista.id,
            SesionEntrevista.nivel_id,
            SesionEntrevista.fecha_inicio,
            Evaluacion.puntaje_total,
            Evaluacion.nivel_candidato,
        )
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .where(
            and_(
                SesionEntrevista.usuario_id == usuario_id,
                SesionEntrevista.tecnologia_id == tecnologia_id,
                SesionEntrevista.estado == EstadoSesion.COMPLETADA,
            )
        )
        .order_by(desc(SesionEntrevista.fecha_inicio))
        .limit(5)
    )
    sesiones_recientes = result.all()
    
    puntajes_recientes = [float(s.puntaje_total or 0) for s in sesiones_recientes]
    promedio_reciente = (
        round(sum(puntajes_recientes) / len(puntajes_recientes), 2)
        if puntajes_recientes
        else None
    )
    
    return {
        "usuario_id": str(usuario_id),
        "tecnologia_id": tecnologia_id,
        "categorias_error_frecuentes": [e["categoria_id"] for e in errores],
        "errores_detalle": errores,
        "puntajes_recientes": puntajes_recientes,
        "promedio_reciente": promedio_reciente,
        "sesiones_en_tecnologia": len(sesiones_recientes),
        "ultimo_nivel_candidato": sesiones_recientes[0].nivel_candidato if sesiones_recientes else None,
    }


async def get_reportes_por_usuario(
    db: AsyncSession,
    usuario_id: str,
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.evaluacion),
        )
        .where(SesionEntrevista.usuario_id == usuario_id)
        .order_by(desc(SesionEntrevista.fecha_inicio))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()