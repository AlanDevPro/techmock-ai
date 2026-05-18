"""
app/services/analytics_service.py

Responsabilidad única: métricas agregadas, tendencias evolutivas y
operaciones analíticas sobre datos ya persistidos.

NO llama al LLM. NO devuelve ORM directo.
"""

from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.reportes_repository import (
    get_reporte_completo_sesion,
    get_historial_sesiones_developer,
)
from app.schemas.reportes import (
    MetricasSesionResponse,
    TendenciaUsuarioResponse,
)
from app.db import repositories as repo


# ================================================================
# 🔹 CLASE ANALYTICS SERVICE (para usar en endpoints)
# ================================================================

class AnalyticsService:
    """
    Servicio para operaciones analíticas y procesamiento de evaluaciones técnicas.
    Compatible con endpoints.py que espera una instancia de esta clase.
    """
    
    # ================================================================
    # 🔹 MÉTRICAS DE UNA SESIÓN INDIVIDUAL
    # ================================================================
    
    async def calcular_metricas_sesion(
        self,
        db: AsyncSession,
        sesion_id: UUID,
    ) -> Optional[MetricasSesionResponse]:
        """
        Métricas derivadas de una sesión:
        - puntaje y nivel
        - errores agrupados por severidad   (tabla: errores_detectados.severidad)
        - recomendaciones por prioridad     (tabla: recomendaciones_solucion.prioridad)
        """
        sesion = await get_reporte_completo_sesion(db, sesion_id)
        if not sesion:
            return None

        evaluacion = getattr(sesion, "evaluacion", None)
        errores = getattr(sesion, "errores_detectados", []) or []
        
        # Obtener recomendaciones desde la evaluación
        recomendaciones = []
        if evaluacion and hasattr(evaluacion, 'recomendaciones'):
            recomendaciones = evaluacion.recomendaciones or []

        puntaje = float(getattr(evaluacion, "puntaje_total", 0) or 0)

        return MetricasSesionResponse(
            sesion_id=str(sesion_id),
            puntaje_total=puntaje,
            nivel=self._puntaje_a_nivel(puntaje),
            total_errores=len(errores),
            errores_por_severidad=self._agrupar_por_campo(errores, "severidad"),
            total_recomendaciones=len(recomendaciones),
            recomendaciones_por_prioridad=self._agrupar_por_campo(recomendaciones, "prioridad"),
        )

    # ================================================================
    # 🔹 TENDENCIA HISTÓRICA DE UN USUARIO
    # ================================================================

    async def calcular_tendencia_usuario(
        self,
        db: AsyncSession,
        usuario_id: str,
        limit: int = 10,
    ) -> TendenciaUsuarioResponse:
        """
        Evolución de puntajes del usuario a lo largo del tiempo.
        Usa: sesiones_entrevista → evaluaciones.puntaje_total

        Útil para gráfica de progreso en el dashboard.
        """
        try:
            usuario_uuid = UUID(usuario_id)
        except ValueError:
            return TendenciaUsuarioResponse(
                usuario_id=usuario_id,
                total_sesiones=0,
                puntaje_promedio=0.0,
                puntaje_maximo=0.0,
                puntaje_minimo=0.0,
                tendencia=[],
            )

        sesiones = await get_historial_sesiones_developer(
            db, usuario_uuid, limit=limit, offset=0
        )

        if not sesiones:
            return TendenciaUsuarioResponse(
                usuario_id=usuario_id,
                total_sesiones=0,
                puntaje_promedio=0.0,
                puntaje_maximo=0.0,
                puntaje_minimo=0.0,
                tendencia=[],
            )

        puntajes = []
        tendencia = []

        for sesion in sesiones:
            evaluacion = getattr(sesion, "evaluacion", None)
            puntaje = float(getattr(evaluacion, "puntaje_total", 0) or 0)
            puntajes.append(puntaje)
            
            tendencia.append({
                "sesion_id": str(sesion.id),
                "estado": sesion.estado,
                "puntaje": puntaje,
                "nivel": getattr(evaluacion, "nivel_candidato", None),
                "tecnologia": getattr(sesion.tecnologia, "nombre", None) if sesion.tecnologia else None,
                "created_at": sesion.fecha_inicio.isoformat() if sesion.fecha_inicio else None,
            })

        return TendenciaUsuarioResponse(
            usuario_id=usuario_id,
            total_sesiones=len(puntajes),
            puntaje_promedio=round(sum(puntajes) / len(puntajes), 2) if puntajes else 0.0,
            puntaje_maximo=max(puntajes) if puntajes else 0.0,
            puntaje_minimo=min(puntajes) if puntajes else 0.0,
            tendencia=tendencia,
        )

    # ================================================================
    # 🔹 GUARDAR EVALUACIÓN TÉCNICA (usado por endpoints.py)
    # ================================================================

    async def guardar_evaluacion_tecnica(
        self,
        db: AsyncSession,
        evaluacion_id: int,
        evaluacion_tecnica: Dict[str, Any]
    ) -> None:
        """
        Guarda la evaluación técnica detallada.
        Mapea los campos del LLM a la estructura de rúbricas.
        Este método es llamado desde endpoints.py en _persistir_analisis_codigo()
        """
        campos_tecnicos = [
            ("manejo_estado", evaluacion_tecnica.get("manejo_estado")),
            ("legibilidad", evaluacion_tecnica.get("legibilidad")),
            ("arquitectura", evaluacion_tecnica.get("arquitectura")),
            ("performance", evaluacion_tecnica.get("performance")),
        ]
        
        # Mapeo de rúbricas (ajustar según tus IDs reales en BD)
        # Estos IDs deben coincidir con los registros en tu tabla 'rubricas'
        rubrica_ids = {
            "manejo_estado": 1,
            "legibilidad": 2,
            "arquitectura": 3,
            "performance": 4,
        }
        
        for campo, comentario in campos_tecnicos:
            if comentario and comentario != "No evaluado.":
                try:
                    rubrica_id = rubrica_ids.get(campo, 1)
                    await repo.guardar_detalle_evaluacion(
                        db=db,
                        evaluacion_id=evaluacion_id,
                        rubrica_id=rubrica_id,
                        puntaje=0.0,  # El LLM no da puntajes por rubrica en este momento
                        comentario=f"[{campo}] {comentario}"
                    )
                except Exception as e:
                    print(f"⚠️ Error guardando evaluación técnica ({campo}): {e}")

    # ================================================================
    # 🔹 MÉTRICAS AGREGADAS ADICIONALES
    # ================================================================

    async def obtener_resumen_usuario(
        self,
        db: AsyncSession,
        usuario_id: str,
    ) -> Dict[str, Any]:
        """
        Obtiene un resumen analítico de un usuario.
        """
        try:
            usuario_uuid = UUID(usuario_id)
        except ValueError:
            return {
                "error": "ID de usuario inválido",
                "usuario_id": usuario_id,
            }
        
        # Obtener perfil técnico
        perfil = await repo.get_perfil_tecnico_por_usuario(db, usuario_uuid)
        
        # Obtener últimas sesiones para calcular tendencia
        tendencia = await self.calcular_tendencia_usuario(db, usuario_id, limit=5)
        
        return {
            "usuario_id": usuario_id,
            "nivel_actual": getattr(perfil, 'nivel_actual', None) if perfil else None,
            "score_global": float(getattr(perfil, 'score_global', 0)) if perfil else 0,
            "sesiones_completadas": getattr(perfil, 'sesiones_completadas', 0) if perfil else 0,
            "evaluacion_promedio": float(getattr(perfil, 'evaluacion_promedio', 0)) if perfil else 0,
            "tendencia_reciente": tendencia.tendencia[-3:] if tendencia.tendencia else [],
            "puntaje_promedio_reciente": tendencia.puntaje_promedio if tendencia.total_sesiones > 0 else 0,
        }

    # ================================================================
    # 🔹 UTILIDADES PRIVADAS
    # ================================================================

    def _agrupar_por_campo(self, lista: list, campo: str) -> Dict[str, int]:
        """
        Agrupa registros ORM por el valor de un campo.
        Ej: errores por severidad → {"alto": 2, "medio": 3}
        """
        resultado: Dict[str, int] = {}
        for item in lista:
            valor = getattr(item, campo, None)
            if valor is None:
                valor = "desconocido"
            valor_str = str(valor)
            resultado[valor_str] = resultado.get(valor_str, 0) + 1
        return resultado

    def _puntaje_a_nivel(self, puntaje: float) -> str:
        """
        Correlacionado con evaluaciones.nivel_candidato de la BD.
        90+ → destacado | 70+ → recomendado | 50+ → promisorio | 30+ → revisar | <30 → descartado
        """
        if puntaje >= 90:
            return "destacado"
        if puntaje >= 70:
            return "recomendado"
        if puntaje >= 50:
            return "promisorio"
        if puntaje >= 30:
            return "revisar"
        return "descartado"


# ================================================================
# 🔹 FUNCIONES DE CONVENIENCIA (para compatibilidad con imports anteriores)
# ================================================================

async def calcular_metricas_sesion(
    db: AsyncSession,
    sesion_id: UUID,
) -> Optional[MetricasSesionResponse]:
    """
    Función de conveniencia que usa la clase AnalyticsService.
    """
    service = AnalyticsService()
    return await service.calcular_metricas_sesion(db, sesion_id)


async def calcular_tendencia_usuario(
    db: AsyncSession,
    usuario_id: str,
    limit: int = 10,
) -> TendenciaUsuarioResponse:
    """
    Función de conveniencia que usa la clase AnalyticsService.
    """
    service = AnalyticsService()
    return await service.calcular_tendencia_usuario(db, usuario_id, limit)