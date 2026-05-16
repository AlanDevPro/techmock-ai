import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Numeric, BigInteger, JSON, func, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


# =========================
# EMPRESA
# =========================
class Empresa(Base):
    __tablename__ = "empresa"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    logo_url = Column(Text)
    descripcion = Column(Text)
    sitio_web = Column(String(200))
    email_contacto = Column(String(150))
    fecha_creacion = Column(DateTime, default=func.now())


# =========================
# USUARIOS
# =========================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    email = Column(String(150), unique=True, nullable=False)
    rol = Column(String(20), nullable=False)  # admin, developer, reclutador
    avatar_url = Column(Text)
    github_url = Column(String(200))
    linkedin_url = Column(String(200))
    telefono = Column(String(30))
    activo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=func.now())
    ultimo_acceso = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    ultimo_login = Column(DateTime)

    # Relaciones
    auth_providers = relationship("AuthProvider", back_populates="usuario", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="usuario", cascade="all, delete-orphan")
    preguntas_creadas = relationship("Pregunta", back_populates="creador")
    sesiones = relationship("SesionEntrevista", back_populates="usuario")
    estadisticas = relationship("EstadisticasUsuario", back_populates="usuario", uselist=False)
    contactos_enviados = relationship("ContactoReclutamiento", foreign_keys="ContactoReclutamiento.admin_id", back_populates="admin")
    contactos_recibidos = relationship("ContactoReclutamiento", foreign_keys="ContactoReclutamiento.developer_id", back_populates="developer")
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")


# =========================
# AUTH PROVIDERS
# =========================
class AuthProvider(Base):
    __tablename__ = "auth_providers"

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(20), nullable=False)  # password, google, github
    provider_uid = Column(Text)
    password_hash = Column(Text)
    creado_en = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="auth_providers")

    __table_args__ = (
        Index("idx_auth_provider_uid", "provider", "provider_uid"),
        Index("idx_auth_user_provider", "user_id", "provider"),
    )


# =========================
# REFRESH TOKENS
# =========================
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(BigInteger, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(Text, unique=True, nullable=False)
    dispositivo = Column(String(200))
    ip = Column(String(45))
    expires_at = Column(DateTime, nullable=False)
    revocado = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="refresh_tokens")


# =========================
# TECNOLOGIAS
# =========================
class Tecnologia(Base):
    __tablename__ = "tecnologias"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    tipo = Column(String(30), nullable=False)
    version_actual = Column(String(20))
    icono_url = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    preguntas = relationship("Pregunta", back_populates="tecnologia")
    sesiones = relationship("SesionEntrevista", back_populates="tecnologia")
    estadisticas_tecnologia_favorita = relationship("EstadisticasUsuario", back_populates="tecnologia_favorita")


# =========================
# NIVELES DE DIFICULTAD
# =========================
class NivelDificultad(Base):
    __tablename__ = "niveles_dificultad"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(30), nullable=False)
    descripcion = Column(Text)
    multiplicador_puntaje = Column(Numeric(3, 2), default=1.0)

    # Relaciones
    preguntas = relationship("Pregunta", back_populates="nivel")
    sesiones = relationship("SesionEntrevista", back_populates="nivel")


# =========================
# PREGUNTAS
# =========================
class Pregunta(Base):
    __tablename__ = "preguntas"

    id = Column(Integer, primary_key=True)
    tecnologia_id = Column(Integer, ForeignKey("tecnologias.id"), nullable=False)
    nivel_id = Column(Integer, ForeignKey("niveles_dificultad.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    enunciado = Column(Text, nullable=False)
    tipo = Column(String(30), nullable=False)
    tiempo_estimado_min = Column(Integer, default=30)
    activa = Column(Boolean, default=True)
    generada_por_ia = Column(Boolean, default=False)
    prompt_contexto = Column(Text)
    fecha_creacion = Column(DateTime, default=func.now())
    creada_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    # Relaciones
    tecnologia = relationship("Tecnologia", back_populates="preguntas")
    nivel = relationship("NivelDificultad", back_populates="preguntas")
    creador = relationship("Usuario", back_populates="preguntas_creadas")
    sesiones = relationship("SesionEntrevista", back_populates="pregunta")


# =========================
# RUBRICAS
# =========================
class Rubrica(Base):
    __tablename__ = "rubricas"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    peso_porcentual = Column(Numeric(5, 2), nullable=False)
    activa = Column(Boolean, default=True)

    # Relaciones
    detalles_evaluacion = relationship("DetalleEvaluacion", back_populates="rubrica")


# =========================
# SESIONES DE ENTREVISTA
# =========================
class SesionEntrevista(Base):
    __tablename__ = "sesiones_entrevista"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    tecnologia_id = Column(Integer, ForeignKey("tecnologias.id"), nullable=False)
    nivel_id = Column(Integer, ForeignKey("niveles_dificultad.id"), nullable=False)
    pregunta_id = Column(Integer, ForeignKey("preguntas.id"), nullable=False)
    estado = Column(String(30), default="en_progreso")
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime, nullable=True)
    duracion_segundos = Column(Integer, nullable=True)
    tiempo_limite_segundos = Column(Integer, default=3600)
    ip_usuario = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="sesiones")
    tecnologia = relationship("Tecnologia", back_populates="sesiones")
    nivel = relationship("NivelDificultad", back_populates="sesiones")
    pregunta = relationship("Pregunta", back_populates="sesiones")
    mensajes = relationship("Mensaje", back_populates="sesion", cascade="all, delete-orphan")
    envios = relationship("EnvioCodigo", back_populates="sesion", cascade="all, delete-orphan")
    ejecuciones = relationship("EjecucionIDE", back_populates="sesion", cascade="all, delete-orphan")
    evaluacion = relationship("Evaluacion", back_populates="sesion", uselist=False, cascade="all, delete-orphan")
    contactos = relationship("ContactoReclutamiento", back_populates="sesion_entrevista")


# =========================
# MENSAJES (CHAT DE ENTREVISTA)
# =========================
class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"), nullable=False)
    rol = Column(String(10), nullable=False)  # user, assistant, system
    contenido = Column(Text, nullable=False)
    tokens_usados = Column(Integer, nullable=True)
    fecha = Column(DateTime, default=func.now())

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="mensajes")


# =========================
# ENVÍOS DE CÓDIGO
# =========================
class EnvioCodigo(Base):
    __tablename__ = "envios_codigo"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"), nullable=False)
    lenguaje = Column(String(50), nullable=False)
    codigo = Column(Text, nullable=False)
    es_envio_final = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    fecha = Column(DateTime, default=func.now())

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="envios")
    ejecuciones = relationship("EjecucionIDE", back_populates="envio_codigo")


# =========================
# EJECUCIONES DEL IDE
# =========================
class EjecucionIDE(Base):
    __tablename__ = "ejecuciones_ide"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id"), nullable=False)
    envio_codigo_id = Column(BigInteger, ForeignKey("envios_codigo.id"), nullable=True)
    kubernetes_job_name = Column(String(200))
    kubernetes_namespace = Column(String(100))
    estado = Column(String(30), default="pending")  # pending, running, success, failed
    payload_enviado = Column(JSON)
    stdout = Column(Text)
    stderr = Column(Text)
    exit_code = Column(Integer)
    tiempo_ejecucion_ms = Column(Integer)
    memoria_usada_mb = Column(Numeric(8, 2))
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_completado = Column(DateTime, nullable=True)

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="ejecuciones")
    envio_codigo = relationship("EnvioCodigo", back_populates="ejecuciones")


# =========================
# EVALUACIONES
# =========================
class Evaluacion(Base):
    __tablename__ = "evaluaciones"

    id = Column(Integer, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"), unique=True, nullable=False)
    puntaje_total = Column(Numeric(5, 2), nullable=True)
    feedback_general = Column(Text, nullable=False)
    fortalezas = Column(Text, nullable=True)
    areas_mejora = Column(Text, nullable=True)
    sugerencias_recursos = Column(Text, nullable=True)
    generado_por_ia = Column(Boolean, default=True)
    modelo_ia_usado = Column(String(100), nullable=True)
    tokens_evaluacion = Column(Integer, nullable=True)
    fecha = Column(DateTime, default=func.now())

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="evaluacion")
    detalles = relationship("DetalleEvaluacion", back_populates="evaluacion", cascade="all, delete-orphan")


# =========================
# DETALLE EVALUACION (POR RUBRICA)
# =========================
class DetalleEvaluacion(Base):
    __tablename__ = "detalle_evaluacion"

    id = Column(Integer, primary_key=True)
    evaluacion_id = Column(Integer, ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False)
    rubrica_id = Column(Integer, ForeignKey("rubricas.id"), nullable=False)
    puntaje = Column(Numeric(5, 2), nullable=False)
    comentario = Column(Text, nullable=True)

    # Relaciones
    evaluacion = relationship("Evaluacion", back_populates="detalles")
    rubrica = relationship("Rubrica", back_populates="detalles_evaluacion")


# =========================
# ESTADISTICAS DE USUARIO
# =========================
class EstadisticasUsuario(Base):
    __tablename__ = "estadisticas_usuario"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), unique=True, nullable=False)
    total_entrevistas = Column(Integer, default=0)
    entrevistas_finalizadas = Column(Integer, default=0)
    entrevistas_abandonadas = Column(Integer, default=0)
    puntaje_promedio = Column(Numeric(5, 2), nullable=True)
    mejor_puntaje = Column(Numeric(5, 2), nullable=True)
    peor_puntaje = Column(Numeric(5, 2), nullable=True)
    tiempo_promedio_segundos = Column(Integer, nullable=True)
    tecnologia_favorita_id = Column(Integer, ForeignKey("tecnologias.id"), nullable=True)
    racha_actual = Column(Integer, default=0)
    racha_maxima = Column(Integer, default=0)
    ultima_entrevista_fecha = Column(DateTime, nullable=True)
    fecha_actualizacion = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="estadisticas")
    tecnologia_favorita = relationship("Tecnologia", back_populates="estadisticas_tecnologia_favorita")


# =========================
# CONTACTOS DE RECLUTAMIENTO
# =========================
class ContactoReclutamiento(Base):
    __tablename__ = "contactos_reclutamiento"

    id = Column(Integer, primary_key=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    sesion_entrevista_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id"), nullable=True)
    asunto = Column(String(300), nullable=False)
    mensaje = Column(Text, nullable=False)
    estado = Column(String(30), default="enviado")  # enviado, leido, respondido
    respuesta_developer = Column(Text, nullable=True)
    fecha_envio = Column(DateTime, default=func.now())

    # Relaciones
    admin = relationship("Usuario", foreign_keys=[admin_id], back_populates="contactos_enviados")
    developer = relationship("Usuario", foreign_keys=[developer_id], back_populates="contactos_recibidos")
    sesion_entrevista = relationship("SesionEntrevista", back_populates="contactos")


# =========================
# NOTIFICACIONES
# =========================
class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(BigInteger, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=True)
    leida = Column(Boolean, default=False)
    url_accion = Column(String(300), nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones")