"""
app/db/models/evaluaciones.py
Modelos: evaluaciones, detalle_evaluacion, errores_detectados, recomendaciones_solucion.
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Evaluacion(Base):
    __tablename__ = "evaluaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid,
        ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Score global
    puntaje_total: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Los 5 pilares técnicos — columnas directas para queries y gráficas rápidas
    puntaje_javascript: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    puntaje_arquitectura: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    puntaje_buenas_practicas: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    puntaje_comunicacion: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    puntaje_resolucion: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Clasificación del candidato
    nivel_candidato: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # descartado|revisar|promisorio|recomendado|destacado
    apto_para_contratacion: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Feedback narrativo
    feedback_general: Mapped[str] = mapped_column(Text, nullable=False)
    fortalezas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    areas_mejora: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resumen_para_reclutador: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata de generación
    generado_por_ia: Mapped[bool] = mapped_column(Boolean, default=True)
    modelo_ia_usado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tokens_evaluacion: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # Relaciones
    sesion: Mapped["SesionEntrevista"] = relationship(  # type: ignore[name-defined]
        back_populates="evaluacion"
    )
    detalles: Mapped[list["DetalleEvaluacion"]] = relationship(
        back_populates="evaluacion", cascade="all, delete-orphan"
    )
    recomendaciones: Mapped[list["RecomendacionSolucion"]] = relationship(
        back_populates="evaluacion", cascade="all, delete-orphan"
    )


class DetalleEvaluacion(Base):
    __tablename__ = "detalle_evaluacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluacion_id: Mapped[int] = mapped_column(
        ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rubrica_id: Mapped[int] = mapped_column(
        ForeignKey("rubricas.id"), nullable=False
    )
    puntaje: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    comentario: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relaciones
    evaluacion: Mapped["Evaluacion"] = relationship(back_populates="detalles")
    rubrica: Mapped["Rubrica"] = relationship(  # type: ignore[name-defined]
        back_populates="detalles"
    )


class ErrorDetectado(Base):
    __tablename__ = "errores_detectados"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid,
        ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    envio_codigo_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("envios_codigo.id"), nullable=True
    )
    categoria_error_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_error.id"), nullable=False, index=True
    )

    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    severidad: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medio"
    )  # bajo|medio|alto|critico
    es_error_conceptual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    linea_codigo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fragmento_codigo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    codigo_corregido: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explicacion_ia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detectado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # Relaciones
    sesion: Mapped["SesionEntrevista"] = relationship(  # type: ignore[name-defined]
        back_populates="errores_detectados"
    )
    envio_codigo: Mapped[Optional["EnvioCodigo"]] = relationship(  # type: ignore[name-defined]
        back_populates="errores_detectados"
    )
    categoria_error: Mapped["CategoriaError"] = relationship(  # type: ignore[name-defined]
        back_populates="errores_detectados"
    )


class RecomendacionSolucion(Base):
    __tablename__ = "recomendaciones_solucion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluacion_id: Mapped[int] = mapped_column(
        ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)   # codigo|concepto|recurso|patron
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    codigo_ejemplo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recurso_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    recurso_titulo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    categoria_error_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categorias_error.id"), nullable=True
    )
    prioridad: Mapped[str] = mapped_column(String(10), nullable=False, default="media")  # alta|media|baja
    orden: Mapped[int] = mapped_column(Integer, default=0)

    # Relaciones
    evaluacion: Mapped["Evaluacion"] = relationship(back_populates="recomendaciones")
    categoria_error: Mapped[Optional["CategoriaError"]] = relationship(  # type: ignore[name-defined]
        back_populates="recomendaciones"
    )