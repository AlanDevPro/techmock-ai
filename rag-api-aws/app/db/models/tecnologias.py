"""
app/db/models/tecnologias.py
Modelos: tecnologias, niveles_dificultad, rubricas.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Tecnologia(Base):
    __tablename__ = "tecnologias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    version_actual: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    icono_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # Relaciones
    preguntas: Mapped[list["Pregunta"]] = relationship(  # type: ignore[name-defined]
        back_populates="tecnologia"
    )
    sesiones: Mapped[list["SesionEntrevista"]] = relationship(  # type: ignore[name-defined]
        back_populates="tecnologia"
    )
    categorias_error: Mapped[list["CategoriaError"]] = relationship(  # type: ignore[name-defined]
        back_populates="tecnologia"
    )


class NivelDificultad(Base):
    __tablename__ = "niveles_dificultad"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
        index=True
    )
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    multiplicador_puntaje: Mapped[float] = mapped_column(Numeric(3, 2), default=1.0)

    # Relaciones
    preguntas: Mapped[list["Pregunta"]] = relationship(  # type: ignore[name-defined]
        back_populates="nivel"
    )
    sesiones: Mapped[list["SesionEntrevista"]] = relationship(  # type: ignore[name-defined]
        back_populates="nivel"
    )


class Rubrica(Base):
    __tablename__ = "rubricas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    peso_porcentual: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relaciones
    detalles: Mapped[list["DetalleEvaluacion"]] = relationship(  # type: ignore[name-defined]
        back_populates="rubrica"
    )