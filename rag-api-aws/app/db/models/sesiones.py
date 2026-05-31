"""
app/db/models/sesiones.py
Modelos: sesiones_entrevista, mensajes, envios_codigo, ejecuciones_ide.
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SesionEntrevista(Base):
    __tablename__ = "sesiones_entrevista"

    id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid_lib.uuid4
    )
    usuario_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id"), nullable=False, index=True
    )
    tecnologia_id: Mapped[int] = mapped_column(
        ForeignKey("tecnologias.id"), nullable=False
    )
    nivel_id: Mapped[int] = mapped_column(
        ForeignKey("niveles_dificultad.id"), nullable=False
    )
    pregunta_id: Mapped[int] = mapped_column(
        ForeignKey("preguntas.id"), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(30), default="en_progreso", nullable=False
    )  # en_progreso | completada | abandonada | tiempo_agotado

    # Sistema adaptativo
    fue_adaptativa: Mapped[bool] = mapped_column(Boolean, default=False)
    sesion_anterior_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(
        Uuid,
        ForeignKey("sesiones_entrevista.id"),
        nullable=True,
        index=True,
    )

    fecha_inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    fecha_fin: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duracion_segundos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tiempo_limite_segundos: Mapped[int] = mapped_column(Integer, default=3600)
    ip_usuario: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(  # type: ignore[name-defined]
        back_populates="sesiones"
    )
    tecnologia: Mapped["Tecnologia"] = relationship(  # type: ignore[name-defined]
        back_populates="sesiones"
    )
    nivel: Mapped["NivelDificultad"] = relationship(  # type: ignore[name-defined]
        back_populates="sesiones"
    )
    pregunta: Mapped["Pregunta"] = relationship(  # type: ignore[name-defined]
        back_populates="sesiones"
    )
    sesion_anterior: Mapped[Optional["SesionEntrevista"]] = relationship(
        "SesionEntrevista",
        remote_side="SesionEntrevista.id",
        foreign_keys=[sesion_anterior_id],
    )
    mensajes: Mapped[list["Mensaje"]] = relationship(
        back_populates="sesion", cascade="all, delete-orphan"
    )
    envios_codigo: Mapped[list["EnvioCodigo"]] = relationship(
        back_populates="sesion", cascade="all, delete-orphan"
    )
    evaluacion: Mapped[Optional["Evaluacion"]] = relationship(  # type: ignore[name-defined]
        back_populates="sesion", uselist=False
    )
    errores_detectados: Mapped[list["ErrorDetectado"]] = relationship(  # type: ignore[name-defined]
        back_populates="sesion", cascade="all, delete-orphan"
    )
    ejecuciones_ide: Mapped[list["EjecucionIDE"]] = relationship(
        back_populates="sesion"
    )


class Mensaje(Base):
    __tablename__ = "mensajes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid,
        ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rol: Mapped[str] = mapped_column(String(10), nullable=False)   # user|assistant|system
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_usados: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    sesion: Mapped["SesionEntrevista"] = relationship(back_populates="mensajes")


class EnvioCodigo(Base):
    __tablename__ = "envios_codigo"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid,
        ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lenguaje: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo: Mapped[str] = mapped_column(Text, nullable=False)
    es_envio_final: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    sesion: Mapped["SesionEntrevista"] = relationship(back_populates="envios_codigo")
    ejecuciones: Mapped[list["EjecucionIDE"]] = relationship(
        back_populates="envio_codigo"
    )
    errores_detectados: Mapped[list["ErrorDetectado"]] = relationship(  # type: ignore[name-defined]
        back_populates="envio_codigo"
    )


class EjecucionIDE(Base):
    __tablename__ = "ejecuciones_ide"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sesion_id: Mapped[uuid_lib.UUID] = mapped_column(
        Uuid, ForeignKey("sesiones_entrevista.id"), nullable=False, index=True
    )
    envio_codigo_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("envios_codigo.id"), nullable=True
    )
    kubernetes_job_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    kubernetes_namespace: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="pending")
    payload_enviado: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    stdout: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tiempo_ejecucion_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    memoria_usada_mb: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    fecha_completado: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    sesion: Mapped["SesionEntrevista"] = relationship(back_populates="ejecuciones_ide")
    envio_codigo: Mapped[Optional["EnvioCodigo"]] = relationship(
        back_populates="ejecuciones"
    )