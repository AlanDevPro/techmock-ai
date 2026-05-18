# app/api/reportes.py - VERSIÓN CORREGIDA

"""
Endpoints para generación de reportes y analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.api.deps import get_db
from app.services.reporte_service import (
    generar_reporte_sesion,
    listar_reportes_usuario,
    obtener_perfil_tecnico,
    obtener_errores_frecuentes_usuario,
    obtener_errores_frecuentes_globales,
    obtener_estadisticas_globales,
    obtener_rendimiento_por_tecnologia,
    obtener_tendencia_usuario,
)
from app.schemas.reportes import (
    ReporteSesionResponse,
    ReporteSesionResumen,
    PerfilTecnicoResponse,
    ErrorFrecuenteResponse,
    EstadisticasGlobalesResponse,
    RendimientoTecnologiaResponse,
    TendenciaUsuarioResponse,
)

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"]
)


@router.get("/sesion/{sesion_id}", response_model=ReporteSesionResponse)
async def get_reporte_sesion(
    sesion_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Genera un reporte completo de una sesión de evaluación."""
    try:
        from uuid import UUID
        sesion_uuid = UUID(sesion_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="sesion_id inválido")
    
    reporte = await generar_reporte_sesion(db, sesion_uuid)
    
    if not reporte:
        raise HTTPException(
            status_code=404, 
            detail=f"Sesión {sesion_id} no encontrada"
        )
    
    return reporte


@router.get("/usuario/{usuario_id}/sesiones", response_model=list[ReporteSesionResumen])
async def get_sesiones_usuario(
    usuario_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Lista las sesiones de un usuario (resumen)."""
    sesiones = await listar_reportes_usuario(db, usuario_id, limit, offset)
    return sesiones


@router.get("/usuario/{usuario_id}/perfil", response_model=PerfilTecnicoResponse)
async def get_perfil_tecnico(
    usuario_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el perfil técnico completo de un usuario."""
    perfil = await obtener_perfil_tecnico(db, usuario_id)
    
    if not perfil:
        raise HTTPException(
            status_code=404,
            detail=f"Usuario {usuario_id} no encontrado o sin evaluaciones"
        )
    
    return perfil


@router.get("/usuario/{usuario_id}/errores-frecuentes", response_model=list[ErrorFrecuenteResponse])
async def get_errores_frecuentes_usuario_endpoint(
    usuario_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los errores más frecuentes de un usuario."""
    errores = await obtener_errores_frecuentes_usuario(db, usuario_id, limit)
    return errores


@router.get("/usuario/{usuario_id}/tendencia", response_model=TendenciaUsuarioResponse)
async def get_tendencia_usuario(
    usuario_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la tendencia de evolución de un usuario."""
    tendencia = await obtener_tendencia_usuario(db, usuario_id, limit)
    
    if not tendencia:
        raise HTTPException(
            status_code=404,
            detail=f"Usuario {usuario_id} no encontrado o sin evaluaciones"
        )
    
    return tendencia


@router.get("/estadisticas/globales", response_model=EstadisticasGlobalesResponse)
async def get_estadisticas_globales_endpoint(
    desde: Optional[datetime] = Query(None),
    hasta: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene estadísticas globales del sistema."""
    stats = await obtener_estadisticas_globales(db, desde, hasta)
    return stats


@router.get("/errores/globales", response_model=list[ErrorFrecuenteResponse])
async def get_errores_frecuentes_globales_endpoint(
    tecnologia_id: Optional[int] = Query(None),
    desde: Optional[datetime] = Query(None),
    hasta: Optional[datetime] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los errores más frecuentes a nivel global."""
    errores = await obtener_errores_frecuentes_globales(
        db, tecnologia_id, desde, hasta, limit, offset
    )
    return errores


@router.get("/rendimiento/tecnologias", response_model=list[RendimientoTecnologiaResponse])
async def get_rendimiento_por_tecnologia_endpoint(
    desde: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene rendimiento agregado por tecnología."""
    rendimiento = await obtener_rendimiento_por_tecnologia(db, desde)
    return rendimiento