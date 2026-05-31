"""
app/db/models.py

Modelos ORM SQLAlchemy para el sistema de evaluaciones.
Exportados desde app.db para que repositories.py los importe limpiamente.
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey,
    Integer, String, Text, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────────────────────────────────────────
# CATÁLOGOS
# ──────────────────────────────────────────────────────────────

class Tecnologia(Base):
    __tablename__ = "tecnologias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    sesiones: Mapped[List["Sesion"]] = relationship(back_populates="tecnologia")
    preguntas: Mapped[List["Pregunta"]] = relationship(back_populates="tecnologia")


class Nivel(Base):
    __tablename__ = "niveles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    sesiones: Mapped[List["Sesion"]] = relationship(back_populates="nivel")
    preguntas: Mapped[List["Pregunta"]] = relationship(back_populates="nivel")


class CategoriaError(Base):
    __tablename__ = "categorias_error"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    errores: Mapped[List["ErrorDetectado"]] = relationship(back_populates="categoria_error")


# ──────────────────────────────────────────────────────────────
# PREGUNTAS
# ──────────────────────────────────────────────────────────────

class Pregunta(Base):
    __tablename__ = "preguntas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tecnologia_id: Mapped[int] = mapped_column(ForeignKey("tecnologias.id"), nullable=False)
    nivel_id: Mapped[int] = mapped_column(ForeignKey("niveles.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_contexto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creada_por: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid, nullable=True)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    tecnologia: Mapped["Tecnologia"] = relationship(back_populates="preguntas")
    nivel: Mapped["Nivel"] = relationship(back_populates="preguntas")
    sesiones: Mapped[List["Sesion"]] = relationship(back_populates="pregunta")


# ──────────────────────────────────────────────────────────────
# SESIONES
# ──────────────────────────────────────────────────────────────

class Sesion(Base):
    __tablename__ = "sesiones"

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    usuario_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid, nullable=True, index=True)
    tecnologia_id: Mapped[int] = mapped_column(ForeignKey("tecnologias.id"), nullable=False)
    nivel_id: Mapped[int] = mapped_column(ForeignKey("niveles.id"), nullable=False)
    pregunta_id: Mapped[int] = mapped_column(ForeignKey("preguntas.id"), nullable=False)
    ip_usuario: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="activa", nullable=False)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    finalizada_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relaciones
    tecnologia: Mapped["Tecnologia"] = relationship(back_populates="sesiones")
    nivel: Mapped["Nivel"] = relationship(back_populates="sesiones")
    pregunta: Mapped["Pregunta"] = relationship(back_populates="sesiones")
    evaluacion: Mapped[Optional["Evaluacion"]] = relationship(
        back_populates="sesion", uselist=False
    )
    errores_detectados: Mapped[List["ErrorDetectado"]] = relationship(
        back_populates="sesion"
    )
    envios_codigo: Mapped[List["EnvioCodigo"]] = relationship(back_populates="sesion")


# ──────────────────────────────────────────────────────────────
# CÓDIGO Y EVALUACIÓN
# ──────────────────────────────────────────────────────────────

class EnvioCodigo(Base):
    __tablename__ = "envios_codigo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("sesiones.id"), nullable=False, index=True
    )
    lenguaje: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo: Mapped[str] = mapped_column(Text, nullable=False)
    es_envio_final: Mapped[bool] = mapped_column(Boolean, default=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    sesion: Mapped["Sesion"] = relationship(back_populates="envios_codigo")


class Evaluacion(Base):
    __tablename__ = "evaluaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("sesiones.id"), nullable=False, unique=True
    )
    puntaje_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    feedback_general: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fortalezas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    areas_mejora: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    modelo_ia_usado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    sesion: Mapped["Sesion"] = relationship(back_populates="evaluacion")
    recomendaciones: Mapped[List["Recomendacion"]] = relationship(
        back_populates="evaluacion"
    )
    detalles: Mapped[List["DetalleEvaluacion"]] = relationship(
        back_populates="evaluacion"
    )


class ErrorDetectado(Base):
    __tablename__ = "errores_detectados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("sesiones.id"), nullable=False, index=True
    )
    categoria_error_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categorias_error.id"), nullable=True
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    severidad: Mapped[str] = mapped_column(String(20), default="medio")
    linea_codigo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    sesion: Mapped["Sesion"] = relationship(back_populates="errores_detectados")
    categoria_error: Mapped[Optional["CategoriaError"]] = relationship(
        back_populates="errores"
    )


class Recomendacion(Base):
    __tablename__ = "recomendaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluacion_id: Mapped[int] = mapped_column(
        ForeignKey("evaluaciones.id"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(50), default="mejora")
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    prioridad: Mapped[str] = mapped_column(String(20), default="media")

    evaluacion: Mapped["Evaluacion"] = relationship(back_populates="recomendaciones")


class DetalleEvaluacion(Base):
    """Detalle por rúbrica (manejo_estado, legibilidad, arquitectura, performance)."""
    __tablename__ = "detalles_evaluacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evaluacion_id: Mapped[int] = mapped_column(
        ForeignKey("evaluaciones.id"), nullable=False, index=True
    )
    rubrica_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("rubricas.id"), nullable=True
    )
    puntaje: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    comentario: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    evaluacion: Mapped["Evaluacion"] = relationship(back_populates="detalles")
    rubrica: Mapped[Optional["Rubrica"]] = relationship()


class Rubrica(Base):
    __tablename__ = "rubricas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    peso: Mapped[float] = mapped_column(Float, default=1.0)


# ──────────────────────────────────────────────────────────────
# ESTADÍSTICAS DE USUARIO
# ──────────────────────────────────────────────────────────────

class EstadisticasUsuario(Base):
    __tablename__ = "estadisticas_usuario"

    usuario_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True)
    total_sesiones: Mapped[int] = mapped_column(Integer, default=0)
    puntaje_promedio: Mapped[float] = mapped_column(Float, default=0.0)
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )