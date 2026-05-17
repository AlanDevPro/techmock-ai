import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Numeric, BigInteger, JSON, func, Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    estadisticas_tecnologia_favorita = relationship(
        "EstadisticasUsuario", back_populates="tecnologia_favorita",
        foreign_keys="EstadisticasUsuario.tecnologia_favorita_id"
    )
    categorias_error = relationship("CategoriaError", back_populates="tecnologia")
    perfil_mejor_tecnologia = relationship(
        "PerfilTecnicoUsuario", back_populates="mejor_tecnologia",
        foreign_keys="PerfilTecnicoUsuario.mejor_tecnologia_id"
    )
    perfil_peor_tecnologia = relationship(
        "PerfilTecnicoUsuario", back_populates="peor_tecnologia",
        foreign_keys="PerfilTecnicoUsuario.peor_tecnologia_id"
    )


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
# CATEGORIAS DE ERROR
# =========================
class CategoriaError(Base):
    __tablename__ = "categorias_error"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    slug = Column(String(80), unique=True, nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(20), nullable=False)  # 'conceptual' | 'experiencia'
    tecnologia_id = Column(Integer, ForeignKey("tecnologias.id", ondelete="SET NULL"), nullable=True)
    activo = Column(Boolean, default=True)

    __table_args__ = (
        CheckConstraint("tipo IN ('conceptual', 'experiencia')", name="categorias_error_tipo_check"),
    )

    # Relaciones
    tecnologia = relationship("Tecnologia", back_populates="categorias_error")
    errores_detectados = relationship("ErrorDetectado", back_populates="categoria_error")
    recomendaciones = relationship("RecomendacionSolucion", back_populates="categoria_error")
    fortalezas_usuario = relationship("FortalezaUsuario", back_populates="categoria_error")
    debilidades_usuario = relationship("DebilidadUsuario", back_populates="categoria_error")


# =========================
# USUARIOS
# =========================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    email = Column(String(150), unique=True, nullable=False)
    rol = Column(String(20), nullable=False)  # 'developer' | 'admin'
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

    __table_args__ = (
        CheckConstraint("rol IN ('developer', 'admin')", name="usuarios_rol_check"),
        Index("idx_users_email", "email"),
        Index("idx_users_rol", "rol"),
    )

    # Relaciones
    auth_providers = relationship("AuthProvider", back_populates="usuario", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="usuario", cascade="all, delete-orphan")
    preguntas_creadas = relationship("Pregunta", back_populates="creador")
    sesiones = relationship("SesionEntrevista", back_populates="usuario")
    estadisticas = relationship("EstadisticasUsuario", back_populates="usuario", uselist=False)
    perfil_tecnico = relationship("PerfilTecnicoUsuario", back_populates="usuario", uselist=False)
    contactos_enviados = relationship(
        "ContactoReclutamiento", foreign_keys="ContactoReclutamiento.admin_id", back_populates="admin"
    )
    contactos_recibidos = relationship(
        "ContactoReclutamiento", foreign_keys="ContactoReclutamiento.developer_id", back_populates="developer"
    )
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")


# =========================
# AUTH PROVIDERS
# =========================
class AuthProvider(Base):
    __tablename__ = "auth_providers"

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(20), nullable=False)  # password | google | github
    provider_uid = Column(Text)
    password_hash = Column(Text)
    creado_en = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "provider_uid", name="uq_auth_provider_uid"),
        UniqueConstraint("user_id", "provider", name="uq_auth_user_provider"),
        Index("idx_auth_provider_uid", "provider", "provider_uid"),
        Index("idx_auth_user_provider", "user_id", "provider"),
        CheckConstraint(
            "(provider = 'password' AND password_hash IS NOT NULL) OR "
            "(provider != 'password' AND password_hash IS NULL)",
            name="provider_password_logic"
        ),
    )

    # Relaciones
    usuario = relationship("Usuario", back_populates="auth_providers")


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
    # live_coding | teoria | debugging | arquitectura | optimizacion
    tiempo_estimado_min = Column(Integer, default=30)
    activa = Column(Boolean, default=True)
    generada_por_ia = Column(Boolean, default=False)
    prompt_contexto = Column(Text)
    # Columnas adaptativas nuevas
    categorias_error_objetivo = Column(JSONB, default=list)
    sesion_origen_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="SET NULL"), nullable=True)
    contexto_adaptativo = Column(JSONB, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    creada_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('live_coding', 'teoria', 'debugging', 'arquitectura', 'optimizacion')",
            name="preguntas_tipo_check"
        ),
        Index("idx_preguntas_tecnologia", "tecnologia_id"),
    )

    # Relaciones
    tecnologia = relationship("Tecnologia", back_populates="preguntas")
    nivel = relationship("NivelDificultad", back_populates="preguntas")
    creador = relationship("Usuario", back_populates="preguntas_creadas")
    sesiones = relationship(
        "SesionEntrevista", back_populates="pregunta",
        foreign_keys="SesionEntrevista.pregunta_id"
    )
    sesion_origen = relationship(
        "SesionEntrevista", foreign_keys=[sesion_origen_id]
    )


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
    # en_progreso | completada | abandonada | tiempo_agotado
    fue_adaptativa = Column(Boolean, default=False)
    sesion_anterior_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sesiones_entrevista.id", ondelete="SET NULL"),
        nullable=True
    )
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime, nullable=True)
    duracion_segundos = Column(Integer, nullable=True)
    tiempo_limite_segundos = Column(Integer, default=3600)
    ip_usuario = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('en_progreso', 'completada', 'abandonada', 'tiempo_agotado')",
            name="sesiones_entrevista_estado_check"
        ),
        Index("idx_sesiones_usuario", "usuario_id"),
        Index("idx_sesiones_estado", "estado"),
        Index("idx_sesiones_anterior", "sesion_anterior_id"),
    )

    # Relaciones
    usuario = relationship("Usuario", back_populates="sesiones")
    tecnologia = relationship("Tecnologia", back_populates="sesiones")
    nivel = relationship("NivelDificultad", back_populates="sesiones")
    pregunta = relationship(
        "Pregunta", back_populates="sesiones",
        foreign_keys=[pregunta_id]
    )
    sesion_anterior = relationship(
        "SesionEntrevista", remote_side="SesionEntrevista.id",
        foreign_keys=[sesion_anterior_id]
    )
    mensajes = relationship("Mensaje", back_populates="sesion", cascade="all, delete-orphan")
    envios = relationship("EnvioCodigo", back_populates="sesion", cascade="all, delete-orphan")
    ejecuciones = relationship("EjecucionIDE", back_populates="sesion", cascade="all, delete-orphan")
    evaluacion = relationship("Evaluacion", back_populates="sesion", uselist=False, cascade="all, delete-orphan")
    contactos = relationship("ContactoReclutamiento", back_populates="sesion_entrevista")
    errores_detectados = relationship("ErrorDetectado", back_populates="sesion", cascade="all, delete-orphan")


# =========================
# MENSAJES (CHAT DE ENTREVISTA)
# =========================
class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"), nullable=False)
    rol = Column(String(10), nullable=False)  # user | assistant | system
    contenido = Column(Text, nullable=False)
    tokens_usados = Column(Integer, nullable=True)
    fecha = Column(DateTime, default=func.now())

    __table_args__ = (
        CheckConstraint("rol IN ('user', 'assistant', 'system')", name="mensajes_rol_check"),
    )

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
    errores_detectados = relationship("ErrorDetectado", back_populates="envio_codigo")


# =========================
# EJECUCIONES DEL IDE
# =========================
class EjecucionIDE(Base):
    __tablename__ = "ejecuciones_ide"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id"), nullable=False)
    envio_codigo_id = Column(BigInteger, ForeignKey("envios_codigo.id", ondelete="SET NULL"), nullable=True)
    kubernetes_job_name = Column(String(200))
    kubernetes_namespace = Column(String(100))
    estado = Column(String(30), default="pending")  # pending | running | success | failed
    payload_enviado = Column(JSONB)
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
    # Desglose técnico avanzado
    puntaje_javascript = Column(Numeric(5, 2), nullable=True)
    puntaje_arquitectura = Column(Numeric(5, 2), nullable=True)
    puntaje_buenas_practicas = Column(Numeric(5, 2), nullable=True)
    puntaje_comunicacion = Column(Numeric(5, 2), nullable=True)
    puntaje_resolucion = Column(Numeric(5, 2), nullable=True)
    nivel_candidato = Column(String(20), nullable=True)
    # descartado | revisar | promisorio | recomendado | destacado
    apto_para_contratacion = Column(Boolean, nullable=True)
    feedback_general = Column(Text, nullable=False)
    resumen_para_reclutador = Column(Text, nullable=True)
    fortalezas = Column(Text, nullable=True)
    areas_mejora = Column(Text, nullable=True)
    sugerencias_recursos = Column(Text, nullable=True)
    generado_por_ia = Column(Boolean, default=True)
    modelo_ia_usado = Column(String(100), nullable=True)
    tokens_evaluacion = Column(Integer, nullable=True)
    fecha = Column(DateTime, default=func.now())

    __table_args__ = (
        CheckConstraint(
            "nivel_candidato IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')",
            name="evaluaciones_nivel_candidato_check"
        ),
        Index("idx_eval_nivel_candidato", "nivel_candidato"),
        Index("idx_eval_apto", "apto_para_contratacion"),
    )

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="evaluacion")
    detalles = relationship("DetalleEvaluacion", back_populates="evaluacion", cascade="all, delete-orphan")
    recomendaciones = relationship("RecomendacionSolucion", back_populates="evaluacion", cascade="all, delete-orphan")


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

    __table_args__ = (
        UniqueConstraint("evaluacion_id", "rubrica_id", name="uq_detalle_evaluacion_rubrica"),
    )

    # Relaciones
    evaluacion = relationship("Evaluacion", back_populates="detalles")
    rubrica = relationship("Rubrica", back_populates="detalles_evaluacion")


# =========================
# ERRORES DETECTADOS
# =========================
class ErrorDetectado(Base):
    __tablename__ = "errores_detectados"

    id = Column(BigInteger, primary_key=True)
    sesion_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="CASCADE"), nullable=False)
    envio_codigo_id = Column(BigInteger, ForeignKey("envios_codigo.id", ondelete="SET NULL"), nullable=True)
    categoria_error_id = Column(Integer, ForeignKey("categorias_error.id"), nullable=False)
    descripcion = Column(Text, nullable=False)
    severidad = Column(String(20), nullable=False, default="medio")
    # bajo | medio | alto | critico
    es_error_conceptual = Column(Boolean, nullable=False, default=False)
    linea_codigo = Column(Integer, nullable=True)
    fragmento_codigo = Column(Text, nullable=True)
    codigo_corregido = Column(Text, nullable=True)
    explicacion_ia = Column(Text, nullable=True)
    detectado_en = Column(DateTime, default=func.now())

    __table_args__ = (
        CheckConstraint(
            "severidad IN ('bajo', 'medio', 'alto', 'critico')",
            name="errores_detectados_severidad_check"
        ),
        Index("idx_errores_sesion", "sesion_id"),
        Index("idx_errores_categoria", "categoria_error_id"),
        Index("idx_errores_severidad", "severidad"),
    )

    # Relaciones
    sesion = relationship("SesionEntrevista", back_populates="errores_detectados")
    envio_codigo = relationship("EnvioCodigo", back_populates="errores_detectados")
    categoria_error = relationship("CategoriaError", back_populates="errores_detectados")


# =========================
# RECOMENDACIONES DE SOLUCIÓN
# =========================
class RecomendacionSolucion(Base):
    __tablename__ = "recomendaciones_solucion"

    id = Column(Integer, primary_key=True)
    evaluacion_id = Column(Integer, ForeignKey("evaluaciones.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)  # codigo | concepto | recurso | patron
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    codigo_ejemplo = Column(Text, nullable=True)
    recurso_url = Column(String(500), nullable=True)
    recurso_titulo = Column(String(200), nullable=True)
    categoria_error_id = Column(Integer, ForeignKey("categorias_error.id", ondelete="SET NULL"), nullable=True)
    prioridad = Column(String(10), nullable=False, default="media")  # alta | media | baja
    orden = Column(Integer, default=0)

    __table_args__ = (
        CheckConstraint("tipo IN ('codigo', 'concepto', 'recurso', 'patron')", name="recomendaciones_tipo_check"),
        CheckConstraint("prioridad IN ('alta', 'media', 'baja')", name="recomendaciones_prioridad_check"),
        Index("idx_recomendaciones_evaluacion", "evaluacion_id"),
    )

    # Relaciones
    evaluacion = relationship("Evaluacion", back_populates="recomendaciones")
    categoria_error = relationship("CategoriaError", back_populates="recomendaciones")


# =========================
# ESTADISTICAS DE USUARIO
# =========================
class EstadisticasUsuario(Base):
    __tablename__ = "estadisticas_usuario"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_entrevistas = Column(Integer, default=0)
    entrevistas_finalizadas = Column(Integer, default=0)
    entrevistas_abandonadas = Column(Integer, default=0)
    puntaje_promedio = Column(Numeric(5, 2), nullable=True)
    mejor_puntaje = Column(Numeric(5, 2), nullable=True)
    peor_puntaje = Column(Numeric(5, 2), nullable=True)
    tiempo_promedio_segundos = Column(Integer, nullable=True)
    tecnologia_favorita_id = Column(Integer, ForeignKey("tecnologias.id", ondelete="SET NULL"), nullable=True)
    racha_actual = Column(Integer, default=0)
    racha_maxima = Column(Integer, default=0)
    ultima_entrevista_fecha = Column(DateTime, nullable=True)
    fecha_actualizacion = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="estadisticas")
    tecnologia_favorita = relationship(
        "Tecnologia", back_populates="estadisticas_tecnologia_favorita",
        foreign_keys=[tecnologia_favorita_id]
    )


# =========================
# PERFIL TÉCNICO USUARIO
# =========================
class PerfilTecnicoUsuario(Base):
    __tablename__ = "perfil_tecnico_usuario"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    score_global = Column(Numeric(5, 2), default=0)
    score_javascript = Column(Numeric(5, 2), default=0)
    score_arquitectura = Column(Numeric(5, 2), default=0)
    score_buenas_practicas = Column(Numeric(5, 2), default=0)
    score_comunicacion = Column(Numeric(5, 2), default=0)
    score_resolucion = Column(Numeric(5, 2), default=0)
    consistencia = Column(Numeric(5, 2), default=0)
    tendencia = Column(String(20), default="estable")
    nivel_actual = Column(String(20), nullable=True)
    # descartado | revisar | promisorio | recomendado | destacado
    total_sesiones = Column(Integer, default=0)
    sesiones_completadas = Column(Integer, default=0)
    sesiones_abandonadas = Column(Integer, default=0)
    mejor_tecnologia_id = Column(Integer, ForeignKey("tecnologias.id", ondelete="SET NULL"), nullable=True)
    peor_tecnologia_id = Column(Integer, ForeignKey("tecnologias.id", ondelete="SET NULL"), nullable=True)
    ultima_evaluacion_id = Column(Integer, ForeignKey("evaluaciones.id", ondelete="SET NULL"), nullable=True)
    actualizado_en = Column(DateTime, default=func.now())

    __table_args__ = (
        CheckConstraint(
            "nivel_actual IN ('descartado', 'revisar', 'promisorio', 'recomendado', 'destacado')",
            name="perfil_nivel_actual_check"
        ),
        Index("idx_perfil_usuario", "usuario_id"),
        Index("idx_perfil_score_global", "score_global"),
        Index("idx_perfil_nivel", "nivel_actual"),
    )

    # Relaciones
    usuario = relationship("Usuario", back_populates="perfil_tecnico")
    mejor_tecnologia = relationship(
        "Tecnologia", back_populates="perfil_mejor_tecnologia",
        foreign_keys=[mejor_tecnologia_id]
    )
    peor_tecnologia = relationship(
        "Tecnologia", back_populates="perfil_peor_tecnologia",
        foreign_keys=[peor_tecnologia_id]
    )
    ultima_evaluacion = relationship("Evaluacion", foreign_keys=[ultima_evaluacion_id])
    fortalezas = relationship("FortalezaUsuario", back_populates="perfil", cascade="all, delete-orphan")
    debilidades = relationship("DebilidadUsuario", back_populates="perfil", cascade="all, delete-orphan")


# =========================
# FORTALEZAS USUARIO
# =========================
class FortalezaUsuario(Base):
    __tablename__ = "fortalezas_usuario"

    id = Column(Integer, primary_key=True)
    perfil_id = Column(Integer, ForeignKey("perfil_tecnico_usuario.id", ondelete="CASCADE"), nullable=False)
    categoria_error_id = Column(Integer, ForeignKey("categorias_error.id"), nullable=False)
    descripcion = Column(String(200), nullable=True)
    veces_demostrada = Column(Integer, default=1)
    confianza = Column(Numeric(3, 2), default=0.5)

    __table_args__ = (
        UniqueConstraint("perfil_id", "categoria_error_id", name="uq_fortaleza_perfil_categoria"),
    )

    # Relaciones
    perfil = relationship("PerfilTecnicoUsuario", back_populates="fortalezas")
    categoria_error = relationship("CategoriaError", back_populates="fortalezas_usuario")


# =========================
# DEBILIDADES USUARIO
# =========================
class DebilidadUsuario(Base):
    __tablename__ = "debilidades_usuario"

    id = Column(Integer, primary_key=True)
    perfil_id = Column(Integer, ForeignKey("perfil_tecnico_usuario.id", ondelete="CASCADE"), nullable=False)
    categoria_error_id = Column(Integer, ForeignKey("categorias_error.id"), nullable=False)
    descripcion = Column(String(200), nullable=True)
    veces_fallada = Column(Integer, default=1)
    impacto = Column(Numeric(3, 2), default=0.5)
    requiere_practica = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("perfil_id", "categoria_error_id", name="uq_debilidad_perfil_categoria"),
        Index("idx_debilidades_perfil", "perfil_id"),
        Index("idx_debilidades_practica", "requiere_practica"),
    )

    # Relaciones
    perfil = relationship("PerfilTecnicoUsuario", back_populates="debilidades")
    categoria_error = relationship("CategoriaError", back_populates="debilidades_usuario")


# =========================
# CONTACTOS DE RECLUTAMIENTO
# =========================
class ContactoReclutamiento(Base):
    __tablename__ = "contactos_reclutamiento"

    id = Column(Integer, primary_key=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    sesion_entrevista_id = Column(UUID(as_uuid=True), ForeignKey("sesiones_entrevista.id", ondelete="SET NULL"), nullable=True)
    asunto = Column(String(300), nullable=False)
    mensaje = Column(Text, nullable=False)
    estado = Column(String(30), default="enviado")  # enviado | leido | respondido
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
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(50), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=True)
    leida = Column(Boolean, default=False)
    url_accion = Column(String(300), nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones")