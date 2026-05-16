import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func
from app.db.models import (
    Usuario, Empresa, AuthProvider, RefreshToken,
    Tecnologia, NivelDificultad, Pregunta, Rubrica,
    SesionEntrevista, Mensaje, EnvioCodigo, EjecucionIDE,
    Evaluacion, DetalleEvaluacion, EstadisticasUsuario,
    ContactoReclutamiento, Notificacion
)


# =============================================================
# 🔹 EMPRESA
# =============================================================
async def get_empresa(db: AsyncSession) -> Optional[Empresa]:
    """Obtiene la información de la empresa (primera fila)."""
    result = await db.execute(select(Empresa).limit(1))
    return result.scalar_one_or_none()


async def update_empresa(db: AsyncSession, empresa_data: dict) -> Optional[Empresa]:
    """Actualiza la información de la empresa."""
    empresa = await get_empresa(db)
    if not empresa:
        empresa = Empresa(**empresa_data)
        db.add(empresa)
    else:
        for key, value in empresa_data.items():
            if hasattr(empresa, key) and value is not None:
                setattr(empresa, key, value)
    
    await db.commit()
    await db.refresh(empresa)
    return empresa


# =============================================================
# 🔹 USUARIOS
# =============================================================
async def get_usuario_por_id(db: AsyncSession, usuario_id: uuid.UUID) -> Optional[Usuario]:
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    return result.scalar_one_or_none()


async def get_usuario_por_email(db: AsyncSession, email: str) -> Optional[Usuario]:
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    return result.scalar_one_or_none()


async def crear_usuario(db: AsyncSession, usuario_data: dict) -> Usuario:
    usuario = Usuario(**usuario_data)
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    
    # Crear estadísticas iniciales para el usuario
    estadisticas = EstadisticasUsuario(usuario_id=usuario.id)
    db.add(estadisticas)
    await db.commit()
    
    return usuario


async def update_usuario(db: AsyncSession, usuario_id: uuid.UUID, update_data: dict) -> Optional[Usuario]:
    usuario = await get_usuario_por_id(db, usuario_id)
    if not usuario:
        return None
    
    for key, value in update_data.items():
        if hasattr(usuario, key) and value is not None:
            setattr(usuario, key, value)
    
    usuario.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(usuario)
    return usuario


# =============================================================
# 🔹 AUTH PROVIDERS
# =============================================================
async def get_auth_provider(db: AsyncSession, provider: str, provider_uid: str) -> Optional[AuthProvider]:
    result = await db.execute(
        select(AuthProvider).where(
            and_(AuthProvider.provider == provider, AuthProvider.provider_uid == provider_uid)
        )
    )
    return result.scalar_one_or_none()


async def crear_auth_provider(db: AsyncSession, user_id: uuid.UUID, provider: str, 
                              provider_uid: Optional[str] = None, 
                              password_hash: Optional[str] = None) -> AuthProvider:
    auth_provider = AuthProvider(
        user_id=user_id,
        provider=provider,
        provider_uid=provider_uid,
        password_hash=password_hash
    )
    db.add(auth_provider)
    await db.commit()
    await db.refresh(auth_provider)
    return auth_provider


# =============================================================
# 🔹 REFRESH TOKENS
# =============================================================
async def crear_refresh_token(db: AsyncSession, token_data: dict) -> RefreshToken:
    token = RefreshToken(**token_data)
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def revocar_token(db: AsyncSession, token_hash: str) -> bool:
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(revocado=True)
    )
    await db.commit()
    return result.rowcount > 0


# =============================================================
# 🔹 TECNOLOGIAS
# =============================================================
async def get_tecnologia_por_slug(db: AsyncSession, slug: str) -> Optional[Tecnologia]:
    result = await db.execute(
        select(Tecnologia).where(Tecnologia.slug == slug, Tecnologia.activo == True)
    )
    return result.scalar_one_or_none()


async def get_tecnologias_activas(db: AsyncSession) -> List[Tecnologia]:
    result = await db.execute(select(Tecnologia).where(Tecnologia.activo == True))
    return result.scalars().all()


# =============================================================
# 🔹 NIVELES
# =============================================================
async def get_nivel_por_nombre(db: AsyncSession, nombre: str) -> Optional[NivelDificultad]:
    result = await db.execute(select(NivelDificultad).where(NivelDificultad.nombre == nombre))
    return result.scalar_one_or_none()


async def get_nivel_por_id(db: AsyncSession, nivel_id: int) -> Optional[NivelDificultad]:
    result = await db.execute(select(NivelDificultad).where(NivelDificultad.id == nivel_id))
    return result.scalar_one_or_none()


async def get_niveles(db: AsyncSession) -> List[NivelDificultad]:
    result = await db.execute(select(NivelDificultad))
    return result.scalars().all()


# =============================================================
# 🔹 PREGUNTAS
# =============================================================
async def crear_pregunta(
    db: AsyncSession,
    tecnologia_id: int,
    nivel_id: int,
    titulo: str,
    enunciado: str,
    prompt_contexto: Optional[str] = None,
    creada_por: Optional[uuid.UUID] = None,
) -> Pregunta:
    pregunta = Pregunta(
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        titulo=titulo[:300],
        enunciado=enunciado,
        tipo="practica_codigo",
        tiempo_estimado_min=30,
        generada_por_ia=True,
        prompt_contexto=prompt_contexto,
        creada_por=creada_por,
    )
    db.add(pregunta)
    await db.commit()
    await db.refresh(pregunta)
    print(f"✅ Pregunta guardada con id={pregunta.id}")
    return pregunta


async def get_pregunta_por_id(db: AsyncSession, pregunta_id: int) -> Optional[Pregunta]:
    result = await db.execute(select(Pregunta).where(Pregunta.id == pregunta_id))
    return result.scalar_one_or_none()


async def get_pregunta_random(db: AsyncSession, tecnologia_id: int, nivel_id: int) -> Optional[Pregunta]:
    result = await db.execute(
        select(Pregunta)
        .where(
            and_(
                Pregunta.tecnologia_id == tecnologia_id,
                Pregunta.nivel_id == nivel_id,
                Pregunta.activa == True
            )
        )
        .order_by(func.random())
        .limit(1)
    )
    return result.scalar_one_or_none()


# =============================================================
# 🔹 RUBRICAS
# =============================================================
async def get_rubricas_activas(db: AsyncSession) -> List[Rubrica]:
    result = await db.execute(select(Rubrica).where(Rubrica.activa == True))
    return result.scalars().all()


# =============================================================
# 🔹 SESIONES DE ENTREVISTA
# =============================================================
async def crear_sesion(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    tecnologia_id: int,
    nivel_id: int,
    pregunta_id: int,
    ip_usuario: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> SesionEntrevista:
    sesion = SesionEntrevista(
        usuario_id=usuario_id,
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        pregunta_id=pregunta_id,
        estado="en_progreso",
        ip_usuario=ip_usuario,
        user_agent=user_agent,
    )
    db.add(sesion)
    await db.commit()
    await db.refresh(sesion)
    print(f"✅ Sesión creada con id={sesion.id}")
    return sesion


async def get_sesion_por_id(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[SesionEntrevista]:
    result = await db.execute(select(SesionEntrevista).where(SesionEntrevista.id == sesion_id))
    return result.scalar_one_or_none()


async def get_sesion_con_detalles(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[SesionEntrevista]:
    """Obtiene sesión con todas sus relaciones cargadas."""
    result = await db.execute(
        select(SesionEntrevista)
        .where(SesionEntrevista.id == sesion_id)
    )
    sesion = result.scalar_one_or_none()
    
    if sesion:
        # Cargar relaciones
        await db.refresh(sesion, attribute_names=["usuario", "tecnologia", "nivel", "pregunta", "mensajes", "envios", "evaluacion"])
    
    return sesion


async def finalizar_sesion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    duracion_segundos: Optional[int] = None,
) -> Optional[SesionEntrevista]:
    sesion = await get_sesion_por_id(db, sesion_id)
    if not sesion:
        return None

    sesion.estado = "completada"
    sesion.fecha_fin = datetime.utcnow()
    sesion.duracion_segundos = duracion_segundos

    await db.commit()
    await db.refresh(sesion)
    
    # Actualizar estadísticas del usuario
    await actualizar_estadisticas_usuario(db, sesion.usuario_id)
    
    print(f"✅ Sesión {sesion_id} finalizada")
    return sesion


# =============================================================
# 🔹 MENSAJES
# =============================================================
async def guardar_mensaje(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    rol: str,
    contenido: str,
    tokens_usados: Optional[int] = None
) -> Mensaje:
    mensaje = Mensaje(
        sesion_id=sesion_id,
        rol=rol,
        contenido=contenido,
        tokens_usados=tokens_usados
    )
    db.add(mensaje)
    await db.commit()
    await db.refresh(mensaje)
    return mensaje


async def get_mensajes_sesion(db: AsyncSession, sesion_id: uuid.UUID) -> List[Mensaje]:
    result = await db.execute(
        select(Mensaje)
        .where(Mensaje.sesion_id == sesion_id)
        .order_by(Mensaje.fecha)
    )
    return result.scalars().all()


# =============================================================
# 🔹 ENVÍOS DE CÓDIGO
# =============================================================
async def guardar_envio_codigo(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    lenguaje: str,
    codigo: str,
    es_envio_final: bool = False,
    version: int = 1,
) -> EnvioCodigo:
    envio = EnvioCodigo(
        sesion_id=sesion_id,
        lenguaje=lenguaje,
        codigo=codigo,
        es_envio_final=es_envio_final,
        version=version,
    )
    db.add(envio)
    await db.commit()
    await db.refresh(envio)
    print(f"✅ Código guardado con id={envio.id} (sesion={sesion_id})")
    return envio


async def get_ultimo_envio_sesion(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[EnvioCodigo]:
    result = await db.execute(
        select(EnvioCodigo)
        .where(EnvioCodigo.sesion_id == sesion_id)
        .order_by(EnvioCodigo.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# =============================================================
# 🔹 EJECUCIONES IDE
# =============================================================
async def crear_ejecucion_ide(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    envio_codigo_id: Optional[int] = None,
    payload_enviado: Optional[dict] = None
) -> EjecucionIDE:
    ejecucion = EjecucionIDE(
        sesion_id=sesion_id,
        envio_codigo_id=envio_codigo_id,
        payload_enviado=payload_enviado,
        estado="pending"
    )
    db.add(ejecucion)
    await db.commit()
    await db.refresh(ejecucion)
    return ejecucion


async def actualizar_ejecucion_ide(
    db: AsyncSession,
    ejecucion_id: int,
    update_data: dict
) -> Optional[EjecucionIDE]:
    result = await db.execute(
        update(EjecucionIDE)
        .where(EjecucionIDE.id == ejecucion_id)
        .values(**update_data)
        .returning(EjecucionIDE)
    )
    await db.commit()
    return result.scalar_one_or_none()


# =============================================================
# 🔹 EVALUACIONES
# =============================================================
async def guardar_evaluacion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    puntaje_total: float,
    feedback_general: str,
    fortalezas: Optional[str] = None,
    areas_mejora: Optional[str] = None,
    sugerencias_recursos: Optional[str] = None,
    modelo_ia_usado: Optional[str] = None,
    tokens_evaluacion: Optional[int] = None,
) -> Evaluacion:
    """Persiste la evaluación generada por el LLM para una sesión."""
    result = await db.execute(select(Evaluacion).where(Evaluacion.sesion_id == sesion_id))
    evaluacion = result.scalar_one_or_none()

    if evaluacion:
        evaluacion.puntaje_total = puntaje_total
        evaluacion.feedback_general = feedback_general
        evaluacion.fortalezas = fortalezas
        evaluacion.areas_mejora = areas_mejora
        evaluacion.sugerencias_recursos = sugerencias_recursos
        evaluacion.modelo_ia_usado = modelo_ia_usado
        evaluacion.tokens_evaluacion = tokens_evaluacion
        print(f"🔄 Evaluación actualizada para sesion={sesion_id}")
    else:
        evaluacion = Evaluacion(
            sesion_id=sesion_id,
            puntaje_total=puntaje_total,
            feedback_general=feedback_general,
            fortalezas=fortalezas,
            areas_mejora=areas_mejora,
            sugerencias_recursos=sugerencias_recursos,
            generado_por_ia=True,
            modelo_ia_usado=modelo_ia_usado,
            tokens_evaluacion=tokens_evaluacion,
        )
        db.add(evaluacion)
        print(f"✅ Evaluación creada para sesion={sesion_id}")

    await db.commit()
    await db.refresh(evaluacion)
    
    # Actualizar estadísticas del usuario con el nuevo puntaje
    await actualizar_estadisticas_usuario(db, evaluacion.sesion.usuario_id)
    
    return evaluacion


async def guardar_detalle_evaluacion(
    db: AsyncSession,
    evaluacion_id: int,
    rubrica_id: int,
    puntaje: float,
    comentario: Optional[str] = None
) -> DetalleEvaluacion:
    """Guarda o actualiza un detalle de evaluación por rubrica."""
    result = await db.execute(
        select(DetalleEvaluacion).where(
            and_(
                DetalleEvaluacion.evaluacion_id == evaluacion_id,
                DetalleEvaluacion.rubrica_id == rubrica_id
            )
        )
    )
    detalle = result.scalar_one_or_none()
    
    if detalle:
        detalle.puntaje = puntaje
        detalle.comentario = comentario
    else:
        detalle = DetalleEvaluacion(
            evaluacion_id=evaluacion_id,
            rubrica_id=rubrica_id,
            puntaje=puntaje,
            comentario=comentario
        )
        db.add(detalle)
    
    await db.commit()
    await db.refresh(detalle)
    return detalle


# =============================================================
# 🔹 ESTADISTICAS USUARIO
# =============================================================
async def get_estadisticas_usuario(db: AsyncSession, usuario_id: uuid.UUID) -> Optional[EstadisticasUsuario]:
    result = await db.execute(select(EstadisticasUsuario).where(EstadisticasUsuario.usuario_id == usuario_id))
    return result.scalar_one_or_none()


async def actualizar_estadisticas_usuario(db: AsyncSession, usuario_id: uuid.UUID) -> Optional[EstadisticasUsuario]:
    """Recalcula estadísticas basado en todas las sesiones del usuario."""
    estadisticas = await get_estadisticas_usuario(db, usuario_id)
    if not estadisticas:
        return None
    
    # Contar total de entrevistas
    result = await db.execute(
        select(func.count(SesionEntrevista.id))
        .where(SesionEntrevista.usuario_id == usuario_id)
    )
    estadisticas.total_entrevistas = result.scalar() or 0
    
    # Entrevistas finalizadas
    result = await db.execute(
        select(func.count(SesionEntrevista.id))
        .where(
            and_(
                SesionEntrevista.usuario_id == usuario_id,
                SesionEntrevista.estado == "completada"
            )
        )
    )
    estadisticas.entrevistas_finalizadas = result.scalar() or 0
    
    # Entrevistas abandonadas
    estadisticas.entrevistas_abandonadas = estadisticas.total_entrevistas - estadisticas.entrevistas_finalizadas
    
    # Puntajes
    result = await db.execute(
        select(
            func.avg(Evaluacion.puntaje_total),
            func.max(Evaluacion.puntaje_total),
            func.min(Evaluacion.puntaje_total),
            func.avg(SesionEntrevista.duracion_segundos)
        )
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .where(SesionEntrevista.usuario_id == usuario_id)
    )
    row = result.first()
    if row:
        estadisticas.puntaje_promedio = row[0]
        estadisticas.mejor_puntaje = row[1]
        estadisticas.peor_puntaje = row[2]
        estadisticas.tiempo_promedio_segundos = row[3]
    
    # Tecnología favorita (más sesiones)
    result = await db.execute(
        select(SesionEntrevista.tecnologia_id, func.count(SesionEntrevista.id))
        .where(SesionEntrevista.usuario_id == usuario_id)
        .group_by(SesionEntrevista.tecnologia_id)
        .order_by(func.count(SesionEntrevista.id).desc())
        .limit(1)
    )
    row = result.first()
    if row:
        estadisticas.tecnologia_favorita_id = row[0]
    
    # Última entrevista
    result = await db.execute(
        select(SesionEntrevista.fecha_inicio)
        .where(SesionEntrevista.usuario_id == usuario_id)
        .order_by(SesionEntrevista.fecha_inicio.desc())
        .limit(1)
    )
    ultima = result.scalar_one_or_none()
    if ultima:
        estadisticas.ultima_entrevista_fecha = ultima
    
    estadisticas.fecha_actualizacion = datetime.utcnow()
    await db.commit()
    await db.refresh(estadisticas)
    
    return estadisticas


# =============================================================
# 🔹 CONTACTOS RECLUTAMIENTO
# =============================================================
async def crear_contacto_reclutamiento(
    db: AsyncSession,
    admin_id: uuid.UUID,
    developer_id: uuid.UUID,
    asunto: str,
    mensaje: str,
    sesion_entrevista_id: Optional[uuid.UUID] = None
) -> ContactoReclutamiento:
    contacto = ContactoReclutamiento(
        admin_id=admin_id,
        developer_id=developer_id,
        sesion_entrevista_id=sesion_entrevista_id,
        asunto=asunto,
        mensaje=mensaje,
        estado="enviado"
    )
    db.add(contacto)
    await db.commit()
    await db.refresh(contacto)
    return contacto


async def responder_contacto(
    db: AsyncSession,
    contacto_id: int,
    respuesta: str
) -> Optional[ContactoReclutamiento]:
    result = await db.execute(
        update(ContactoReclutamiento)
        .where(ContactoReclutamiento.id == contacto_id)
        .values(respuesta_developer=respuesta, estado="respondido")
        .returning(ContactoReclutamiento)
    )
    await db.commit()
    return result.scalar_one_or_none()


# =============================================================
# 🔹 NOTIFICACIONES
# =============================================================
async def crear_notificacion(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    tipo: str,
    titulo: str,
    mensaje: Optional[str] = None,
    url_accion: Optional[str] = None
) -> Notificacion:
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        url_accion=url_accion
    )
    db.add(notificacion)
    await db.commit()
    await db.refresh(notificacion)
    return notificacion


async def marcar_notificacion_leida(db: AsyncSession, notificacion_id: int) -> bool:
    result = await db.execute(
        update(Notificacion)
        .where(Notificacion.id == notificacion_id)
        .values(leida=True)
    )
    await db.commit()
    return result.rowcount > 0


async def get_notificaciones_usuario(
    db: AsyncSession, 
    usuario_id: uuid.UUID, 
    solo_no_leidas: bool = False
) -> List[Notificacion]:
    query = select(Notificacion).where(Notificacion.usuario_id == usuario_id)
    if solo_no_leidas:
        query = query.where(Notificacion.leida == False)
    query = query.order_by(Notificacion.fecha_creacion.desc())
    result = await db.execute(query)
    return result.scalars().all()