"""
app/db/models/preguntas.py
Modelos: preguntas, categorias_error.
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer,
    String, Text, Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CategoriaError(Base):
    __tablename__ = "categorias_error"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)   # conceptual | experiencia
    tecnologia_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=True
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relaciones
    tecnologia: Mapped[Optional["Tecnologia"]] = relationship(  # type: ignore[name-defined]
        back_populates="categorias_error"
    )
    errores_detectados: Mapped[list["ErrorDetectado"]] = relationship(  # type: ignore[name-defined]
        back_populates="categoria_error"
    )
    recomendaciones: Mapped[list["RecomendacionSolucion"]] = relationship(  # type: ignore[name-defined]
        back_populates="categoria_error"
    )
    fortalezas: Mapped[list["FortalezaUsuario"]] = relationship(  # type: ignore[name-defined]
        back_populates="categoria_error"
    )
    debilidades: Mapped[list["DebilidadUsuario"]] = relationship(  # type: ignore[name-defined]
        back_populates="categoria_error"
    )


class Pregunta(Base):
    __tablename__ = "preguntas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tecnologia_id: Mapped[int] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=False, index=True
    )
    nivel_id: Mapped[int] = mapped_column(
        ForeignKey("niveles_dificultad.id"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)  # live_coding|teoria|debugging|arquitectura|optimizacion
    tiempo_estimado_min: Mapped[int] = mapped_column(Integer, default=30)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    generada_por_ia: Mapped[bool] = mapped_column(Boolean, default=False)
    prompt_contexto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Campos del sistema adaptativo
    categorias_error_objetivo: Mapped[Optional[list]] = mapped_column(
        JSONB, default=list, nullable=True
    )
    sesion_origen_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(
        Uuid, nullable=True, index=True
    )
    contexto_adaptativo: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    creada_por: Mapped[Optional[uuid_lib.UUID]] = mapped_column(
        Uuid, ForeignKey("usuarios.id"), nullable=True
    )

    # Relaciones
    tecnologia: Mapped["Tecnologia"] = relationship(  # type: ignore[name-defined]
        back_populates="preguntas"
    )
    nivel: Mapped["NivelDificultad"] = relationship(  # type: ignore[name-defined]
        back_populates="preguntas"
    )
    sesiones: Mapped[list["SesionEntrevista"]] = relationship(  # type: ignore[name-defined]
        back_populates="pregunta"
    )