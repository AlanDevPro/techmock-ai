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
    PerfilTecnicoUsuario, FortalezaUsuario, DebilidadUsuario,
    CategoriaError, ErrorDetectado, RecomendacionSolucion,
    ContactoReclutamiento, Notificacion,
)


# =============================================================
# 🔹 EMPRESA
# =============================================================
async def get_empresa(db: AsyncSession) -> Optional[Empresa]:
    """Obtiene la información de la empresa (primera fila)."""
    result = await db.execute(select(Empresa).limit(1))
    return result.scalar_one_or_none()


async def update_empresa(db: AsyncSession, empresa_data: dict) -> Optional[Empresa]:
    """Crea o actualiza la información de la empresa."""
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

    # Crear estadísticas y perfil técnico iniciales
    estadisticas = EstadisticasUsuario(usuario_id=usuario.id)
    perfil = PerfilTecnicoUsuario(usuario_id=usuario.id)
    db.add(estadisticas)
    db.add(perfil)
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


async def listar_usuarios(
    db: AsyncSession,
    rol: Optional[str] = None,
    activo: Optional[bool] = True,
    limit: int = 50,
    offset: int = 0,
) -> List[Usuario]:
    query = select(Usuario)
    if rol:
        query = query.where(Usuario.rol == rol)
    if activo is not None:
        query = query.where(Usuario.activo == activo)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


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


async def get_auth_provider_por_usuario(
    db: AsyncSession, user_id: uuid.UUID, provider: str
) -> Optional[AuthProvider]:
    result = await db.execute(
        select(AuthProvider).where(
            and_(AuthProvider.user_id == user_id, AuthProvider.provider == provider)
        )
    )
    return result.scalar_one_or_none()


async def crear_auth_provider(
    db: AsyncSession,
    user_id: uuid.UUID,
    provider: str,
    provider_uid: Optional[str] = None,
    password_hash: Optional[str] = None,
) -> AuthProvider:
    auth_provider = AuthProvider(
        user_id=user_id,
        provider=provider,
        provider_uid=provider_uid,
        password_hash=password_hash,
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


async def get_refresh_token(db: AsyncSession, token_hash: str) -> Optional[RefreshToken]:
    result = await db.execute(
        select(RefreshToken).where(
            and_(RefreshToken.token_hash == token_hash, RefreshToken.revocado == False)
        )
    )
    return result.scalar_one_or_none()


async def revocar_token(db: AsyncSession, token_hash: str) -> bool:
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(revocado=True)
    )
    await db.commit()
    return result.rowcount > 0


async def revocar_todos_tokens_usuario(db: AsyncSession, usuario_id: uuid.UUID) -> int:
    result = await db.execute(
        update(RefreshToken)
        .where(and_(RefreshToken.usuario_id == usuario_id, RefreshToken.revocado == False))
        .values(revocado=True)
    )
    await db.commit()
    return result.rowcount


# =============================================================
# 🔹 TECNOLOGIAS
# =============================================================
async def get_tecnologia_por_id(db: AsyncSession, tecnologia_id: int) -> Optional[Tecnologia]:
    result = await db.execute(select(Tecnologia).where(Tecnologia.id == tecnologia_id))
    return result.scalar_one_or_none()


async def get_tecnologia_por_slug(db: AsyncSession, slug: str) -> Optional[Tecnologia]:
    result = await db.execute(
        select(Tecnologia).where(and_(Tecnologia.slug == slug, Tecnologia.activo == True))
    )
    return result.scalar_one_or_none()


async def get_tecnologias_activas(db: AsyncSession) -> List[Tecnologia]:
    result = await db.execute(select(Tecnologia).where(Tecnologia.activo == True))
    return result.scalars().all()


# =============================================================
# 🔹 NIVELES DE DIFICULTAD
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
# 🔹 CATEGORIAS DE ERROR
# =============================================================
async def get_categoria_error_por_id(db: AsyncSession, categoria_id: int) -> Optional[CategoriaError]:
    result = await db.execute(select(CategoriaError).where(CategoriaError.id == categoria_id))
    return result.scalar_one_or_none()


async def get_categoria_error_por_slug(db: AsyncSession, slug: str) -> Optional[CategoriaError]:
    result = await db.execute(
        select(CategoriaError).where(and_(CategoriaError.slug == slug, CategoriaError.activo == True))
    )
    return result.scalar_one_or_none()


async def get_categorias_error(
    db: AsyncSession,
    tipo: Optional[str] = None,
    tecnologia_id: Optional[int] = None,
    solo_activas: bool = True,
) -> List[CategoriaError]:
    query = select(CategoriaError)
    if solo_activas:
        query = query.where(CategoriaError.activo == True)
    if tipo:
        query = query.where(CategoriaError.tipo == tipo)
    if tecnologia_id is not None:
        query = query.where(CategoriaError.tecnologia_id == tecnologia_id)
    result = await db.execute(query)
    return result.scalars().all()


async def crear_categoria_error(db: AsyncSession, data: dict) -> CategoriaError:
    categoria = CategoriaError(**data)
    db.add(categoria)
    await db.commit()
    await db.refresh(categoria)
    return categoria


# =============================================================
# 🔹 PREGUNTAS
# =============================================================
async def crear_pregunta(
    db: AsyncSession,
    tecnologia_id: int,
    nivel_id: int,
    titulo: str,
    enunciado: str,
    tipo: str = "live_coding",
    prompt_contexto: Optional[str] = None,
    creada_por: Optional[uuid.UUID] = None,
    categorias_error_objetivo: Optional[list] = None,
    sesion_origen_id: Optional[uuid.UUID] = None,
    contexto_adaptativo: Optional[dict] = None,
) -> Pregunta:
    pregunta = Pregunta(
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        titulo=titulo[:300],
        enunciado=enunciado,
        tipo=tipo,
        tiempo_estimado_min=30,
        generada_por_ia=True,
        prompt_contexto=prompt_contexto,
        creada_por=creada_por,
        categorias_error_objetivo=categorias_error_objetivo or [],
        sesion_origen_id=sesion_origen_id,
        contexto_adaptativo=contexto_adaptativo,
    )
    db.add(pregunta)
    await db.commit()
    await db.refresh(pregunta)
    print(f"✅ Pregunta guardada con id={pregunta.id}")
    return pregunta


async def get_pregunta_por_id(db: AsyncSession, pregunta_id: int) -> Optional[Pregunta]:
    result = await db.execute(select(Pregunta).where(Pregunta.id == pregunta_id))
    return result.scalar_one_or_none()


async def get_pregunta_random(
    db: AsyncSession, tecnologia_id: int, nivel_id: int
) -> Optional[Pregunta]:
    result = await db.execute(
        select(Pregunta)
        .where(
            and_(
                Pregunta.tecnologia_id == tecnologia_id,
                Pregunta.nivel_id == nivel_id,
                Pregunta.activa == True,
            )
        )
        .order_by(func.random())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def listar_preguntas(
    db: AsyncSession,
    tecnologia_id: Optional[int] = None,
    nivel_id: Optional[int] = None,
    tipo: Optional[str] = None,
    solo_activas: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> List[Pregunta]:
    query = select(Pregunta)
    if solo_activas:
        query = query.where(Pregunta.activa == True)
    if tecnologia_id:
        query = query.where(Pregunta.tecnologia_id == tecnologia_id)
    if nivel_id:
        query = query.where(Pregunta.nivel_id == nivel_id)
    if tipo:
        query = query.where(Pregunta.tipo == tipo)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


# =============================================================
# 🔹 RUBRICAS
# =============================================================
async def get_rubricas_activas(db: AsyncSession) -> List[Rubrica]:
    result = await db.execute(select(Rubrica).where(Rubrica.activa == True))
    return result.scalars().all()


async def get_rubrica_por_id(db: AsyncSession, rubrica_id: int) -> Optional[Rubrica]:
    result = await db.execute(select(Rubrica).where(Rubrica.id == rubrica_id))
    return result.scalar_one_or_none()


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
    fue_adaptativa: bool = False,
    sesion_anterior_id: Optional[uuid.UUID] = None,
) -> SesionEntrevista:
    sesion = SesionEntrevista(
        usuario_id=usuario_id,
        tecnologia_id=tecnologia_id,
        nivel_id=nivel_id,
        pregunta_id=pregunta_id,
        estado="en_progreso",
        ip_usuario=ip_usuario,
        user_agent=user_agent,
        fue_adaptativa=fue_adaptativa,
        sesion_anterior_id=sesion_anterior_id,
    )
    db.add(sesion)
    await db.commit()
    await db.refresh(sesion)
    print(f"✅ Sesión creada con id={sesion.id}")
    return sesion


async def get_sesion_por_id(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[SesionEntrevista]:
    result = await db.execute(select(SesionEntrevista).where(SesionEntrevista.id == sesion_id))
    return result.scalar_one_or_none()


# =============================================================
# 🔹 SESIONES DE ENTREVISTA - VERSIÓN CORREGIDA
# =============================================================

async def get_sesion_con_detalles(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[SesionEntrevista]:
    """
    Obtiene sesión con todas sus relaciones cargadas eager.
    
    IMPORTANTE: Esta función precarga TODAS las relaciones necesarias
    para evitar MissingGreenlet en contexto asíncrono:
    - usuario, tecnologia, nivel, pregunta
    - mensajes, envios
    - evaluacion (con recomendaciones y detalles de rúbrica)
    - errores_detectados (con categoria_error)
    """
    from sqlalchemy.orm import selectinload
    from app.db.models import ErrorDetectado, Evaluacion, DetalleEvaluacion
    
    result = await db.execute(
        select(SesionEntrevista)
        .options(
            # Datos básicos del usuario
            selectinload(SesionEntrevista.usuario),
            
            # Contexto de la entrevista
            selectinload(SesionEntrevista.tecnologia),
            selectinload(SesionEntrevista.nivel),
            selectinload(SesionEntrevista.pregunta),
            
            # Conversación y código
            selectinload(SesionEntrevista.mensajes),
            selectinload(SesionEntrevista.envios),
            
            # Evaluación con todas sus relaciones anidadas
            selectinload(SesionEntrevista.evaluacion).selectinload(Evaluacion.recomendaciones),
            selectinload(SesionEntrevista.evaluacion).selectinload(Evaluacion.detalles).selectinload(DetalleEvaluacion.rubrica),
            
            # 🔥 CRÍTICO: Errores con su categoría (evita MissingGreenlet)
            selectinload(SesionEntrevista.errores_detectados).selectinload(ErrorDetectado.categoria_error),
        )
        .where(SesionEntrevista.id == sesion_id)
    )
    return result.scalar_one_or_none()



async def get_sesiones_usuario(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    estado: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[SesionEntrevista]:
    query = select(SesionEntrevista).where(SesionEntrevista.usuario_id == usuario_id)
    if estado:
        query = query.where(SesionEntrevista.estado == estado)
    query = query.order_by(SesionEntrevista.fecha_inicio.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()






async def finalizar_sesion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    duracion_segundos: Optional[int] = None,
    estado: str = "completada",
) -> Optional[SesionEntrevista]:
    sesion = await get_sesion_por_id(db, sesion_id)
    if not sesion:
        return None

    sesion.estado = estado
    sesion.fecha_fin = datetime.utcnow()
    sesion.duracion_segundos = duracion_segundos

    await db.commit()
    await db.refresh(sesion)

    # Actualizar estadísticas y perfil técnico
    await actualizar_estadisticas_usuario(db, sesion.usuario_id)
    await actualizar_perfil_tecnico(db, sesion.usuario_id)

    print(f"✅ Sesión {sesion_id} finalizada con estado={estado}")
    return sesion


# =============================================================
# 🔹 MENSAJES
# =============================================================
async def guardar_mensaje(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    rol: str,
    contenido: str,
    tokens_usados: Optional[int] = None,
) -> Mensaje:
    mensaje = Mensaje(
        sesion_id=sesion_id,
        rol=rol,
        contenido=contenido,
        tokens_usados=tokens_usados,
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


async def get_envios_sesion(db: AsyncSession, sesion_id: uuid.UUID) -> List[EnvioCodigo]:
    result = await db.execute(
        select(EnvioCodigo)
        .where(EnvioCodigo.sesion_id == sesion_id)
        .order_by(EnvioCodigo.version)
    )
    return result.scalars().all()


# =============================================================
# 🔹 EJECUCIONES IDE
# =============================================================
async def crear_ejecucion_ide(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    envio_codigo_id: Optional[int] = None,
    payload_enviado: Optional[dict] = None,
) -> EjecucionIDE:
    ejecucion = EjecucionIDE(
        sesion_id=sesion_id,
        envio_codigo_id=envio_codigo_id,
        payload_enviado=payload_enviado,
        estado="pending",
    )
    db.add(ejecucion)
    await db.commit()
    await db.refresh(ejecucion)
    return ejecucion


async def actualizar_ejecucion_ide(
    db: AsyncSession, ejecucion_id: int, update_data: dict
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
# 🔹 ERRORES DETECTADOS
# =============================================================
async def guardar_error_detectado(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    categoria_error_id: int,
    descripcion: str,
    severidad: str = "medio",
    es_error_conceptual: bool = False,
    envio_codigo_id: Optional[int] = None,
    linea_codigo: Optional[int] = None,
    fragmento_codigo: Optional[str] = None,
    codigo_corregido: Optional[str] = None,
    explicacion_ia: Optional[str] = None,
) -> ErrorDetectado:
    error = ErrorDetectado(
        sesion_id=sesion_id,
        envio_codigo_id=envio_codigo_id,
        categoria_error_id=categoria_error_id,
        descripcion=descripcion,
        severidad=severidad,
        es_error_conceptual=es_error_conceptual,
        linea_codigo=linea_codigo,
        fragmento_codigo=fragmento_codigo,
        codigo_corregido=codigo_corregido,
        explicacion_ia=explicacion_ia,
    )
    db.add(error)
    await db.commit()
    await db.refresh(error)
    return error


async def get_errores_sesion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    severidad: Optional[str] = None,
) -> List[ErrorDetectado]:
    query = select(ErrorDetectado).where(ErrorDetectado.sesion_id == sesion_id)
    if severidad:
        query = query.where(ErrorDetectado.severidad == severidad)
    result = await db.execute(query)
    return result.scalars().all()


async def get_errores_por_categoria(
    db: AsyncSession, usuario_id: uuid.UUID, categoria_error_id: int
) -> List[ErrorDetectado]:
    """Errores de un usuario agrupados por categoría (a través de las sesiones)."""
    result = await db.execute(
        select(ErrorDetectado)
        .join(SesionEntrevista, ErrorDetectado.sesion_id == SesionEntrevista.id)
        .where(
            and_(
                SesionEntrevista.usuario_id == usuario_id,
                ErrorDetectado.categoria_error_id == categoria_error_id,
            )
        )
        .order_by(ErrorDetectado.detectado_en.desc())
    )
    return result.scalars().all()


# =============================================================
# 🔹 EVALUACIONES
# =============================================================
async def guardar_evaluacion(
    db: AsyncSession,
    sesion_id: uuid.UUID,
    puntaje_total: float,
    feedback_general: str,
    puntaje_javascript: Optional[float] = None,
    puntaje_arquitectura: Optional[float] = None,
    puntaje_buenas_practicas: Optional[float] = None,
    puntaje_comunicacion: Optional[float] = None,
    puntaje_resolucion: Optional[float] = None,
    nivel_candidato: Optional[str] = None,
    apto_para_contratacion: Optional[bool] = None,
    resumen_para_reclutador: Optional[str] = None,
    fortalezas: Optional[str] = None,
    areas_mejora: Optional[str] = None,
    sugerencias_recursos: Optional[str] = None,
    modelo_ia_usado: Optional[str] = None,
    tokens_evaluacion: Optional[int] = None,
) -> Evaluacion:
    """Persiste o actualiza la evaluación generada por el LLM para una sesión."""
    result = await db.execute(select(Evaluacion).where(Evaluacion.sesion_id == sesion_id))
    evaluacion = result.scalar_one_or_none()

    campos = dict(
        puntaje_total=puntaje_total,
        feedback_general=feedback_general,
        puntaje_javascript=puntaje_javascript,
        puntaje_arquitectura=puntaje_arquitectura,
        puntaje_buenas_practicas=puntaje_buenas_practicas,
        puntaje_comunicacion=puntaje_comunicacion,
        puntaje_resolucion=puntaje_resolucion,
        nivel_candidato=nivel_candidato,
        apto_para_contratacion=apto_para_contratacion,
        resumen_para_reclutador=resumen_para_reclutador,
        fortalezas=fortalezas,
        areas_mejora=areas_mejora,
        sugerencias_recursos=sugerencias_recursos,
        modelo_ia_usado=modelo_ia_usado,
        tokens_evaluacion=tokens_evaluacion,
    )

    if evaluacion:
        for key, value in campos.items():
            if value is not None:
                setattr(evaluacion, key, value)
        print(f"🔄 Evaluación actualizada para sesion={sesion_id}")
    else:
        evaluacion = Evaluacion(sesion_id=sesion_id, generado_por_ia=True, **campos)
        db.add(evaluacion)
        print(f"✅ Evaluación creada para sesion={sesion_id}")

    await db.commit()
    await db.refresh(evaluacion)
    return evaluacion


async def get_evaluacion_por_sesion(db: AsyncSession, sesion_id: uuid.UUID) -> Optional[Evaluacion]:
    result = await db.execute(select(Evaluacion).where(Evaluacion.sesion_id == sesion_id))
    return result.scalar_one_or_none()


async def guardar_detalle_evaluacion(
    db: AsyncSession,
    evaluacion_id: int,
    rubrica_id: int,
    puntaje: float,
    comentario: Optional[str] = None,
) -> DetalleEvaluacion:
    result = await db.execute(
        select(DetalleEvaluacion).where(
            and_(
                DetalleEvaluacion.evaluacion_id == evaluacion_id,
                DetalleEvaluacion.rubrica_id == rubrica_id,
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
            comentario=comentario,
        )
        db.add(detalle)

    await db.commit()
    await db.refresh(detalle)
    return detalle


# =============================================================
# 🔹 RECOMENDACIONES DE SOLUCIÓN
# =============================================================
async def guardar_recomendacion(
    db: AsyncSession,
    evaluacion_id: int,
    tipo: str,
    titulo: str,
    descripcion: str,
    codigo_ejemplo: Optional[str] = None,
    recurso_url: Optional[str] = None,
    recurso_titulo: Optional[str] = None,
    categoria_error_id: Optional[int] = None,
    prioridad: str = "media",
    orden: int = 0,
) -> RecomendacionSolucion:
    rec = RecomendacionSolucion(
        evaluacion_id=evaluacion_id,
        tipo=tipo,
        titulo=titulo,
        descripcion=descripcion,
        codigo_ejemplo=codigo_ejemplo,
        recurso_url=recurso_url,
        recurso_titulo=recurso_titulo,
        categoria_error_id=categoria_error_id,
        prioridad=prioridad,
        orden=orden,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def get_recomendaciones_evaluacion(
    db: AsyncSession, evaluacion_id: int
) -> List[RecomendacionSolucion]:
    result = await db.execute(
        select(RecomendacionSolucion)
        .where(RecomendacionSolucion.evaluacion_id == evaluacion_id)
        .order_by(RecomendacionSolucion.orden)
    )
    return result.scalars().all()


# =============================================================
# 🔹 ESTADISTICAS USUARIO
# =============================================================
async def get_estadisticas_usuario(db: AsyncSession, usuario_id: uuid.UUID) -> Optional[EstadisticasUsuario]:
    result = await db.execute(
        select(EstadisticasUsuario).where(EstadisticasUsuario.usuario_id == usuario_id)
    )
    return result.scalar_one_or_none()


async def actualizar_estadisticas_usuario(
    db: AsyncSession, usuario_id: uuid.UUID
) -> Optional[EstadisticasUsuario]:
    """Recalcula estadísticas basado en todas las sesiones del usuario."""
    estadisticas = await get_estadisticas_usuario(db, usuario_id)
    if not estadisticas:
        return None

    # Total entrevistas
    result = await db.execute(
        select(func.count(SesionEntrevista.id)).where(SesionEntrevista.usuario_id == usuario_id)
    )
    estadisticas.total_entrevistas = result.scalar() or 0

    # Finalizadas
    result = await db.execute(
        select(func.count(SesionEntrevista.id)).where(
            and_(SesionEntrevista.usuario_id == usuario_id, SesionEntrevista.estado == "completada")
        )
    )
    estadisticas.entrevistas_finalizadas = result.scalar() or 0

    # Abandonadas
    estadisticas.entrevistas_abandonadas = (
        estadisticas.total_entrevistas - estadisticas.entrevistas_finalizadas
    )

    # Puntajes y tiempo
    result = await db.execute(
        select(
            func.avg(Evaluacion.puntaje_total),
            func.max(Evaluacion.puntaje_total),
            func.min(Evaluacion.puntaje_total),
            func.avg(SesionEntrevista.duracion_segundos),
        )
        .join(Evaluacion, SesionEntrevista.id == Evaluacion.sesion_id)
        .where(SesionEntrevista.usuario_id == usuario_id)
    )
    row = result.first()
    if row:
        estadisticas.puntaje_promedio = row[0]
        estadisticas.mejor_puntaje = row[1]
        estadisticas.peor_puntaje = row[2]
        estadisticas.tiempo_promedio_segundos = int(row[3]) if row[3] else None

    # Tecnología favorita
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
# 🔹 PERFIL TÉCNICO USUARIO
# =============================================================
async def get_perfil_tecnico(db: AsyncSession, usuario_id: uuid.UUID) -> Optional[PerfilTecnicoUsuario]:
    result = await db.execute(
        select(PerfilTecnicoUsuario).where(PerfilTecnicoUsuario.usuario_id == usuario_id)
    )
    return result.scalar_one_or_none()


async def actualizar_perfil_tecnico(
    db: AsyncSession, usuario_id: uuid.UUID
) -> Optional[PerfilTecnicoUsuario]:
    """Recalcula el perfil técnico promediando las evaluaciones del usuario."""
    perfil = await get_perfil_tecnico(db, usuario_id)
    if not perfil:
        return None

    # Promedios de scores de todas las evaluaciones
    result = await db.execute(
        select(
            func.avg(Evaluacion.puntaje_total),
            func.avg(Evaluacion.puntaje_javascript),
            func.avg(Evaluacion.puntaje_arquitectura),
            func.avg(Evaluacion.puntaje_buenas_practicas),
            func.avg(Evaluacion.puntaje_comunicacion),
            func.avg(Evaluacion.puntaje_resolucion),
        )
        .join(SesionEntrevista, Evaluacion.sesion_id == SesionEntrevista.id)
        .where(SesionEntrevista.usuario_id == usuario_id)
    )
    row = result.first()
    if row and row[0] is not None:
        perfil.score_global = row[0]
        perfil.score_javascript = row[1] or 0
        perfil.score_arquitectura = row[2] or 0
        perfil.score_buenas_practicas = row[3] or 0
        perfil.score_comunicacion = row[4] or 0
        perfil.score_resolucion = row[5] or 0

    # Conteos de sesiones
    result = await db.execute(
        select(func.count(SesionEntrevista.id)).where(SesionEntrevista.usuario_id == usuario_id)
    )
    perfil.total_sesiones = result.scalar() or 0

    result = await db.execute(
        select(func.count(SesionEntrevista.id)).where(
            and_(SesionEntrevista.usuario_id == usuario_id, SesionEntrevista.estado == "completada")
        )
    )
    perfil.sesiones_completadas = result.scalar() or 0
    perfil.sesiones_abandonadas = perfil.total_sesiones - perfil.sesiones_completadas

    # Última evaluación
    result = await db.execute(
        select(Evaluacion.id)
        .join(SesionEntrevista, Evaluacion.sesion_id == SesionEntrevista.id)
        .where(SesionEntrevista.usuario_id == usuario_id)
        .order_by(Evaluacion.fecha.desc())
        .limit(1)
    )
    ultima_eval_id = result.scalar_one_or_none()
    if ultima_eval_id:
        perfil.ultima_evaluacion_id = ultima_eval_id

    perfil.actualizado_en = datetime.utcnow()
    await db.commit()
    await db.refresh(perfil)
    return perfil


async def update_perfil_tecnico_campos(
    db: AsyncSession, usuario_id: uuid.UUID, update_data: dict
) -> Optional[PerfilTecnicoUsuario]:
    """Actualiza campos puntuales del perfil técnico (tendencia, nivel_actual, etc.)."""
    perfil = await get_perfil_tecnico(db, usuario_id)
    if not perfil:
        return None
    for key, value in update_data.items():
        if hasattr(perfil, key):
            setattr(perfil, key, value)
    perfil.actualizado_en = datetime.utcnow()
    await db.commit()
    await db.refresh(perfil)
    return perfil


# =============================================================
# 🔹 FORTALEZAS Y DEBILIDADES USUARIO
# =============================================================
async def upsert_fortaleza(
    db: AsyncSession,
    perfil_id: int,
    categoria_error_id: int,
    descripcion: Optional[str] = None,
    incrementar: bool = True,
) -> FortalezaUsuario:
    result = await db.execute(
        select(FortalezaUsuario).where(
            and_(
                FortalezaUsuario.perfil_id == perfil_id,
                FortalezaUsuario.categoria_error_id == categoria_error_id,
            )
        )
    )
    fortaleza = result.scalar_one_or_none()

    if fortaleza:
        if incrementar:
            fortaleza.veces_demostrada += 1
        if descripcion:
            fortaleza.descripcion = descripcion
    else:
        fortaleza = FortalezaUsuario(
            perfil_id=perfil_id,
            categoria_error_id=categoria_error_id,
            descripcion=descripcion,
        )
        db.add(fortaleza)

    await db.commit()
    await db.refresh(fortaleza)
    return fortaleza


async def upsert_debilidad(
    db: AsyncSession,
    perfil_id: int,
    categoria_error_id: int,
    descripcion: Optional[str] = None,
    incrementar: bool = True,
) -> DebilidadUsuario:
    result = await db.execute(
        select(DebilidadUsuario).where(
            and_(
                DebilidadUsuario.perfil_id == perfil_id,
                DebilidadUsuario.categoria_error_id == categoria_error_id,
            )
        )
    )
    debilidad = result.scalar_one_or_none()

    if debilidad:
        if incrementar:
            debilidad.veces_fallada += 1
        if descripcion:
            debilidad.descripcion = descripcion
    else:
        debilidad = DebilidadUsuario(
            perfil_id=perfil_id,
            categoria_error_id=categoria_error_id,
            descripcion=descripcion,
        )
        db.add(debilidad)

    await db.commit()
    await db.refresh(debilidad)
    return debilidad


async def get_debilidades_usuario(
    db: AsyncSession,
    perfil_id: int,
    solo_requieren_practica: bool = False,
) -> List[DebilidadUsuario]:
    query = select(DebilidadUsuario).where(DebilidadUsuario.perfil_id == perfil_id)
    if solo_requieren_practica:
        query = query.where(DebilidadUsuario.requiere_practica == True)
    result = await db.execute(query)
    return result.scalars().all()


async def get_fortalezas_usuario(db: AsyncSession, perfil_id: int) -> List[FortalezaUsuario]:
    result = await db.execute(
        select(FortalezaUsuario).where(FortalezaUsuario.perfil_id == perfil_id)
    )
    return result.scalars().all()


# =============================================================
# 🔹 CONTACTOS RECLUTAMIENTO
# =============================================================
async def crear_contacto_reclutamiento(
    db: AsyncSession,
    admin_id: uuid.UUID,
    developer_id: uuid.UUID,
    asunto: str,
    mensaje: str,
    sesion_entrevista_id: Optional[uuid.UUID] = None,
) -> ContactoReclutamiento:
    contacto = ContactoReclutamiento(
        admin_id=admin_id,
        developer_id=developer_id,
        sesion_entrevista_id=sesion_entrevista_id,
        asunto=asunto,
        mensaje=mensaje,
        estado="enviado",
    )
    db.add(contacto)
    await db.commit()
    await db.refresh(contacto)
    return contacto


async def responder_contacto(
    db: AsyncSession, contacto_id: int, respuesta: str
) -> Optional[ContactoReclutamiento]:
    result = await db.execute(
        update(ContactoReclutamiento)
        .where(ContactoReclutamiento.id == contacto_id)
        .values(respuesta_developer=respuesta, estado="respondido")
        .returning(ContactoReclutamiento)
    )
    await db.commit()
    return result.scalar_one_or_none()


async def get_contactos_developer(
    db: AsyncSession, developer_id: uuid.UUID
) -> List[ContactoReclutamiento]:
    result = await db.execute(
        select(ContactoReclutamiento)
        .where(ContactoReclutamiento.developer_id == developer_id)
        .order_by(ContactoReclutamiento.fecha_envio.desc())
    )
    return result.scalars().all()


# =============================================================
# 🔹 NOTIFICACIONES
# =============================================================
async def crear_notificacion(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    tipo: str,
    titulo: str,
    mensaje: Optional[str] = None,
    url_accion: Optional[str] = None,
) -> Notificacion:
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        url_accion=url_accion,
    )
    db.add(notificacion)
    await db.commit()
    await db.refresh(notificacion)
    return notificacion


async def marcar_notificacion_leida(db: AsyncSession, notificacion_id: int) -> bool:
    result = await db.execute(
        update(Notificacion).where(Notificacion.id == notificacion_id).values(leida=True)
    )
    await db.commit()
    return result.rowcount > 0


async def marcar_todas_leidas(db: AsyncSession, usuario_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Notificacion)
        .where(and_(Notificacion.usuario_id == usuario_id, Notificacion.leida == False))
        .values(leida=True)
    )
    await db.commit()
    return result.rowcount


async def get_notificaciones_usuario(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    solo_no_leidas: bool = False,
    limit: int = 50,
) -> List[Notificacion]:
    query = select(Notificacion).where(Notificacion.usuario_id == usuario_id)
    if solo_no_leidas:
        query = query.where(Notificacion.leida == False)
    query = query.order_by(Notificacion.fecha_creacion.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()