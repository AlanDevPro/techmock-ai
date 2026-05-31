"""
app/db/models/perfil.py
Modelos: perfil_tecnico_usuario, fortalezas_usuario, debilidades_usuario, estadisticas_usuario.
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer,
    Numeric, String, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PerfilTecnicoUsuario(Base):
    __tablename__ = "perfil_tecnico_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id"), nullable=False, unique=True, index=True
    )

    # Scores históricos ponderados
    score_global: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_javascript: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_arquitectura: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_buenas_practicas: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_comunicacion: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_resolucion: Mapped[float] = mapped_column(Numeric(5, 2), default=0)

    consistencia: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    tendencia: Mapped[str] = mapped_column(String(20), default="estable")

    nivel_actual: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # descartado|revisar|promisorio|recomendado|destacado

    total_sesiones: Mapped[int] = mapped_column(Integer, default=0)
    sesiones_completadas: Mapped[int] = mapped_column(Integer, default=0)
    sesiones_abandonadas: Mapped[int] = mapped_column(Integer, default=0)

    mejor_tecnologia_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=True
    )
    peor_tecnologia_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=True
    )
    ultima_evaluacion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("evaluaciones.id"), nullable=True
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(  # type: ignore[name-defined]
        back_populates="perfil_tecnico"
    )
    mejor_tecnologia: Mapped[Optional["Tecnologia"]] = relationship(  # type: ignore[name-defined]
        foreign_keys=[mejor_tecnologia_id]
    )
    peor_tecnologia: Mapped[Optional["Tecnologia"]] = relationship(  # type: ignore[name-defined]
        foreign_keys=[peor_tecnologia_id]
    )
    fortalezas: Mapped[list["FortalezaUsuario"]] = relationship(
        back_populates="perfil", cascade="all, delete-orphan"
    )
    debilidades: Mapped[list["DebilidadUsuario"]] = relationship(
        back_populates="perfil", cascade="all, delete-orphan"
    )


class FortalezaUsuario(Base):
    __tablename__ = "fortalezas_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    perfil_id: Mapped[int] = mapped_column(
        ForeignKey("perfil_tecnico_usuario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    categoria_error_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_error.id"), nullable=False
    )
    descripcion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    veces_demostrada: Mapped[int] = mapped_column(Integer, default=1)
    confianza: Mapped[float] = mapped_column(Numeric(3, 2), default=0.5)

    # Relaciones
    perfil: Mapped["PerfilTecnicoUsuario"] = relationship(back_populates="fortalezas")
    categoria_error: Mapped["CategoriaError"] = relationship(  # type: ignore[name-defined]
        back_populates="fortalezas"
    )


class DebilidadUsuario(Base):
    __tablename__ = "debilidades_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    perfil_id: Mapped[int] = mapped_column(
        ForeignKey("perfil_tecnico_usuario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    categoria_error_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_error.id"), nullable=False
    )
    descripcion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    veces_fallada: Mapped[int] = mapped_column(Integer, default=1)
    impacto: Mapped[float] = mapped_column(Numeric(3, 2), default=0.5)
    requiere_practica: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relaciones
    perfil: Mapped["PerfilTecnicoUsuario"] = relationship(back_populates="debilidades")
    categoria_error: Mapped["CategoriaError"] = relationship(  # type: ignore[name-defined]
        back_populates="debilidades"
    )


class EstadisticasUsuario(Base):
    __tablename__ = "estadisticas_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id"), nullable=False, unique=True, index=True
    )
    total_entrevistas: Mapped[int] = mapped_column(Integer, default=0)
    entrevistas_finalizadas: Mapped[int] = mapped_column(Integer, default=0)
    entrevistas_abandonadas: Mapped[int] = mapped_column(Integer, default=0)
    puntaje_promedio: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    mejor_puntaje: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    peor_puntaje: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    tiempo_promedio_segundos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tecnologia_favorita_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=True
    )
    racha_actual: Mapped[int] = mapped_column(Integer, default=0)
    racha_maxima: Mapped[int] = mapped_column(Integer, default=0)
    ultima_entrevista_fecha: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(  # type: ignore[name-defined]
        back_populates="estadisticas"
    )
    tecnologia_favorita: Mapped[Optional["Tecnologia"]] = relationship(  # type: ignore[name-defined]
        foreign_keys=[tecnologia_favorita_id]
    )