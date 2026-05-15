print("🔥 1 - inicio archivo")

import json
import re

print("🔥 2 - json/re OK")

from langchain_community.chat_models import ChatOllama
print("🔥 3 - ChatOllama importado")

from langchain_core.messages import SystemMessage, HumanMessage
print("🔥 4 - messages importado")

from app.schemas.evaluations import RespuestaEvaluacion, RespuestaAnalisisCodigo
from app.core.prompts import get_junior_prompt
from app.services.session_store import get_or_create_session, update_session, format_history

print("🔥 5 - imports completos")



# -----------------------------
# 🔹 GENERAR PREGUNTAS
# -----------------------------
async def generar_evaluacion_llm(contexto: str, framework: str, session_id: str | None = None) -> dict:
    print("🔥 6 - dentro de generar_evaluacion_llm")

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.7,
        num_predict=500,
        num_ctx=1536
    )
    print("🔥 7 - ChatOllama creado en generar_evaluacion_llm")

    esquema = """
{
  "pregunta_practica": "string",
  "comprension_a_evaluar": "string",
  "explicacion_codigo_esperado": "string",
    "error_por_falta_de_contexto": "string",
    "medidor_dificultad": {
        "nivel": "Junior Bajo | Junior Medio | Junior Alto",
        "puntaje": 0,
        "tendencia": "sube | mantiene | baja",
        "habilidad_estimada": "Junior Bajo | Junior Medio | Junior Alto",
        "justificacion": "string"
    }
}
"""

    session_state = get_or_create_session(session_id, framework)
    historial = format_history(session_state)
    objetivo_dificultad = _calcular_objetivo_dificultad(session_state)
    system_prompt = get_junior_prompt(
        framework,
        historial,
        objetivo_dificultad,
        session_state.last_level,
    )

    prompt_completo = f"""
{system_prompt}

⚠ Responde SOLO en JSON válido.
NO agregues texto fuera del JSON.

Formato obligatorio:
{esquema}
"""

    messages = [
        SystemMessage(content=prompt_completo),
        HumanMessage(content=f"Contexto técnico:\n{contexto[:1500]}")
    ]
    print("🔥 8 - messages preparados, antes de llm.ainvoke")

    try:
        respuesta = await llm.ainvoke(messages)
        print("🔥 9 - llm.ainvoke completado")
        data = _safe_json_load(respuesta.content)

        medidor = _normalizar_medidor_dificultad(
            data.get("medidor_dificultad"),
            session_state.last_difficulty,
            session_state.last_level,
            objetivo_dificultad,
        )

        def _str_safely(val) -> str:
            if isinstance(val, dict):
                return json.dumps(val, ensure_ascii=False)
            if isinstance(val, list):
                return "\n".join(str(v) for v in val)
            if val is None:
                return ""
            return str(val)

        pregunta_str = _str_safely(data.get("pregunta_practica", ""))
        comprension_str = _str_safely(data.get("comprension_a_evaluar", ""))
        explicacion_str = _str_safely(data.get("explicacion_codigo_esperado", ""))
        error_str = _str_safely(data.get("error_por_falta_de_contexto", ""))

        update_session(
            session_state,
            comprension_str,
            medidor["puntaje"],
            medidor["nivel"],
            pregunta=pregunta_str,
            explicacion_esperada=explicacion_str,
            framework=framework,
        )

        return {
            "session_id": session_state.session_id,
            "pregunta_practica": pregunta_str,
            "comprension_a_evaluar": comprension_str,
            "explicacion_codigo_esperado": explicacion_str,
            "error_por_falta_de_contexto": error_str,
            "medidor_dificultad": medidor,
        }

    except Exception as e:
        print("❌ ERROR GENERANDO PREGUNTAS:", e)
        return {
            "session_id": session_state.session_id,
            "pregunta_practica": "",
            "comprension_a_evaluar": "",
            "explicacion_codigo_esperado": "",
            "error_por_falta_de_contexto": f"Error JSON: {str(e)}",
            "medidor_dificultad": _medidor_fallback(session_state.last_difficulty, session_state.last_level),
        }


async def preview_dificultad(session_id: str | None = None, framework: str | None = None) -> dict:
    session_state = get_or_create_session(session_id, framework)
    objetivo_dificultad = _calcular_objetivo_dificultad(session_state)
    medidor = _medidor_fallback(
        session_state.last_difficulty,
        session_state.last_level,
        objetivo_dificultad,
    )
    return {
        "session_id": session_state.session_id,
        "medidor_dificultad": medidor,
    }


# -----------------------------
# 🔥 ANALIZAR CÓDIGO (PRO FEEDBACK)
# -----------------------------
async def analizar_codigo_llm(
    codigo: str,
    framework: str,
    session_id: str | None = None,
    timeout: bool = False,
    strict: bool = True,
) -> dict:
    print("🔥 10 - dentro de analizar_codigo_llm")
    print("⚡ Iniciando análisis profesional de código...")

    if not _parece_codigo(codigo):
        return _respuesta_fuera_de_pregunta(
            "La respuesta no contiene código ejecutable relacionado con la consigna."
        )

    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        num_predict=800,
        num_ctx=2048
    )
    print("🔥 11 - ChatOllama creado en analizar_codigo_llm")

    esquema = """
{
  "calificacion_general": {
    "nivel": "Excelente | Bueno | Regular | Deficiente | Crítico",
    "puntaje": 0,
    "resumen": "string"
  },
  "errores": [
    {
      "tipo": "Sintaxis | Lógica | Performance | Seguridad | Arquitectura | Estilo",
      "descripcion": "string",
      "impacto": "alto | medio | bajo",
      "linea_aproximada": "string"
    }
  ],
  "buenas_practicas": ["string"],
  "malas_practicas": ["string"],
  "recomendaciones": [
    {
      "mensaje": "string",
      "solucion": "string",
      "prioridad": "alta | media | baja"
    }
  ],
  "consejos_entrevista": ["string"],
  "evaluacion_tecnica": {
    "manejo_estado": "string",
    "legibilidad": "string",
    "arquitectura": "string",
    "performance": "string"
  }
}
"""

    session_state = get_or_create_session(session_id, framework)
    pregunta_base = session_state.last_question or ""
    esperado_base = session_state.last_expected or ""

    if strict and not _es_respuesta_relacionada(codigo, pregunta_base, esperado_base):
        return _respuesta_fuera_de_pregunta(
            "El código no responde a la consigna generada para esta sesión."
        )

    if strict and timeout and _parece_incompleto(codigo):
        return _respuesta_fuera_de_pregunta(
            "Tiempo agotado: la solución está incompleta respecto a la consigna."
        )

    if not pregunta_base:
        pregunta_base = "Sin consigna definida."
    if not esperado_base:
        esperado_base = "Sin respuesta esperada definida."

    prompt = f"""
Eres un ingeniero senior con 10+ años de experiencia en revisión de código frontend.
Tu objetivo es dar un feedback profesional, constructivo y accionable.

Analiza el código {framework} enviado por el usuario y responde ÚNICAMENTE en JSON válido.

Contexto de evaluación (OBLIGATORIO):
- Pregunta generada para esta sesión:
<<<{pregunta_base}>>>

- Explicación/código esperado:
<<<{esperado_base}>>>

Regla crítica: califica SOLO en función de la pregunta y la explicación esperada. No evalúes contra otros escenarios.

Regla de estrictez:
- Si el código NO intenta resolver la pregunta o ignora requisitos clave, la calificación DEBE ser "Crítico" con puntaje <= 15.
- En ese caso, agrega al menos un error de tipo "Lógica" indicando que la solución no corresponde a la consigna.
- No inventes buenas prácticas ni recomendaciones positivas si no hay correspondencia con la consigna.
- Si la solución es parcial, detalla exactamente qué requisitos faltan y reduce puntaje de forma significativa.

⚠ REGLAS CRÍTICAS:

1. calificacion_general.nivel DEBE ser uno de: "Excelente", "Bueno", "Regular", "Deficiente", "Crítico"
2. calificacion_general.puntaje DEBE ser un número entero del 0 al 100
3. calificacion_general.resumen → párrafo con tono profesional y constructivo
4. errores → lista de objetos con: tipo, descripcion, impacto, linea_aproximada
5. buenas_practicas → SOLO strings (prácticas positivas encontradas)
6. malas_practicas → SOLO strings (antipatrones o malos hábitos detectados)
7. recomendaciones → lista de objetos con: mensaje, solucion, prioridad
8. consejos_entrevista → SOLO strings (consejos prácticos para que el candidato mejore en entrevistas reales basados en su código)
9. evaluacion_tecnica → objeto con: manejo_estado, legibilidad, arquitectura, performance

ESCALA DE PUNTAJE:
- 90-100 → Excelente
- 70-89  → Bueno
- 50-69  → Regular
- 30-49  → Deficiente
- 0-29   → Crítico

❌ NUNCA mezcles tipos:
"errores": [{{"mensaje": "..."}}]  ← MAL
"buenas_practicas": [{{"texto": "..."}}]  ← MAL

✅ SIEMPRE:
"buenas_practicas": ["texto", "texto"]  ← BIEN
"malas_practicas": ["texto", "texto"]   ← BIEN

Formato obligatorio:
{esquema}
"""

    codigo_recortado = codigo[:2500]

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"Analiza este código {framework}:\n\n{codigo_recortado}")
    ]
    print("🔥 12 - messages preparados en analizar_codigo_llm, antes de llm.ainvoke")

    try:
        respuesta = await llm.ainvoke(messages)
        print("🔥 13 - llm.ainvoke completado en analizar_codigo_llm")

        print("🧠 RAW LLM:", respuesta.content[:300])

        data = _safe_json_load(respuesta.content)

        return _construir_respuesta_analisis(data)

    except Exception as e:
        print("❌ ERROR EN ANÁLISIS PRO:", e)
        return _respuesta_error_analisis(str(e))


# -----------------------------
# 🧠 CONSTRUCCIÓN RESPUESTA PRO
# -----------------------------

def _construir_respuesta_analisis(data: dict) -> dict:
    """Construye y normaliza la respuesta completa del análisis pro."""
    print("🔥 14 - dentro de _construir_respuesta_analisis")

    cal = data.get("calificacion_general", {})

    return {
        "calificacion_general": {
            "nivel": _normalizar_nivel(cal.get("nivel", "Regular")),
            "puntaje": _normalizar_puntaje(cal.get("puntaje", 50)),
            "resumen": cal.get("resumen", "No se pudo generar un resumen.")
        },
        "errores": _normalizar_errores_pro(data.get("errores")),
        "buenas_practicas": _asegurar_lista_strings(data.get("buenas_practicas")),
        "malas_practicas": _asegurar_lista_strings(data.get("malas_practicas")),
        "recomendaciones": _normalizar_recomendaciones_pro(data.get("recomendaciones")),
        "consejos_entrevista": _asegurar_lista_strings(data.get("consejos_entrevista")),
        "evaluacion_tecnica": _normalizar_evaluacion_tecnica(data.get("evaluacion_tecnica"))
    }


def _respuesta_error_analisis(error: str) -> dict:
    """Respuesta de fallback cuando hay un error interno."""
    print("🔥 15 - dentro de _respuesta_error_analisis")
    return {
        "calificacion_general": {
            "nivel": "Crítico",
            "puntaje": 0,
            "resumen": "No fue posible analizar el código. Verifica que sea código válido e intenta nuevamente."
        },
        "errores": [
            {
                "tipo": "Sistema",
                "descripcion": f"Error interno del analizador: {error}",
                "impacto": "alto",
                "linea_aproximada": None
            }
        ],
        "buenas_practicas": [],
        "malas_practicas": [],
        "recomendaciones": [
            {
                "mensaje": "El código no pudo ser procesado.",
                "solucion": "Asegúrate de enviar código válido y legible.",
                "prioridad": "alta"
            }
        ],
        "consejos_entrevista": ["Asegúrate de tener un entorno estable antes de enviar el código definitivo."],
        "evaluacion_tecnica": {
            "manejo_estado": "No evaluado",
            "legibilidad": "No evaluado",
            "arquitectura": "No evaluado",
            "performance": "No evaluado"
        }
    }


# -----------------------------
# 🧠 UTILIDADES DE NORMALIZACIÓN
# -----------------------------

NIVELES_VALIDOS = {"Excelente", "Bueno", "Regular", "Deficiente", "Crítico"}
IMPACTOS_VALIDOS = {"alto", "medio", "bajo"}
PRIORIDADES_VALIDAS = {"alta", "media", "baja"}


def _normalizar_nivel(nivel: str) -> str:
    if nivel in NIVELES_VALIDOS:
        return nivel
    nivel_lower = nivel.lower()
    mapa = {
        "excellent": "Excelente", "good": "Bueno", "regular": "Regular",
        "deficient": "Deficiente", "critical": "Crítico"
    }
    return mapa.get(nivel_lower, "Regular")


def _normalizar_puntaje(puntaje) -> int:
    try:
        p = int(puntaje)
        return max(0, min(100, p))
    except (ValueError, TypeError):
        return 50


def _asegurar_lista_strings(valor) -> list:
    if not isinstance(valor, list):
        return []
    result = []
    for item in valor:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            # Extraer cualquier campo de texto si viene como objeto por error
            for key in ("mensaje", "descripcion", "texto", "text"):
                if key in item:
                    result.append(str(item[key]))
                    break
    return result


def _normalizar_errores_pro(lista) -> list:
    """Normaliza la lista de errores al formato ErrorDetectado."""
    if not isinstance(lista, list):
        return []

    resultado = []
    for item in lista:
        if isinstance(item, dict):
            impacto = item.get("impacto", "medio")
            if impacto not in IMPACTOS_VALIDOS:
                impacto = "medio"
            resultado.append({
                "tipo": item.get("tipo", "General"),
                "descripcion": item.get("descripcion", item.get("mensaje", "Error no especificado")),
                "impacto": impacto,
                "linea_aproximada": item.get("linea_aproximada", None)
            })
        elif isinstance(item, str):
            resultado.append({
                "tipo": "General",
                "descripcion": item,
                "impacto": "medio",
                "linea_aproximada": None
            })
    return resultado


def _normalizar_recomendaciones_pro(lista) -> list:
    """Normaliza la lista de recomendaciones al formato RecomendacionItem pro."""
    if not isinstance(lista, list):
        return []

    resultado = []
    for item in lista:
        if isinstance(item, dict):
            prioridad = item.get("prioridad", "media")
            if prioridad not in PRIORIDADES_VALIDAS:
                prioridad = "media"
            resultado.append({
                "mensaje": item.get("mensaje", "Sin mensaje"),
                "solucion": item.get("solucion", "Sin solución"),
                "prioridad": prioridad
            })
        elif isinstance(item, str):
            resultado.append({
                "mensaje": item,
                "solucion": "No especificada",
                "prioridad": "media"
            })
    return resultado


def _normalizar_evaluacion_tecnica(data) -> dict:
    """Garantiza que evaluacion_tecnica tenga todos sus campos."""
    base = {
        "manejo_estado": "No evaluado",
        "legibilidad": "No evaluado",
        "arquitectura": "No evaluado",
        "performance": "No evaluado"
    }
    if isinstance(data, dict):
        for key in base:
            if data.get(key):
                base[key] = str(data[key])
    return base


def _safe_json_load(texto: str) -> dict:
    try:
        return json.loads(texto)
    except Exception:
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass

    print("⚠ JSON inválido del LLM, devolviendo vacío")
    return {}


def _calcular_objetivo_dificultad(state) -> int:
    if not state.history:
        return 2
    return max(1, min(6, state.last_difficulty + 1))


def _normalizar_medidor_dificultad(medidor, dificultad_prev: int, nivel_prev: str, objetivo: int) -> dict:
    niveles_validos = {"Junior Bajo", "Junior Medio", "Junior Alto"}
    tendencias_validas = {"sube", "mantiene", "baja"}

    if not isinstance(medidor, dict):
        return _medidor_fallback(dificultad_prev, nivel_prev, objetivo)

    nivel = medidor.get("nivel", "Junior Bajo")
    if nivel not in niveles_validos:
        nivel = _nivel_por_puntaje(objetivo)

    try:
        puntaje = int(medidor.get("puntaje", objetivo))
    except (TypeError, ValueError):
        puntaje = objetivo

    puntaje = max(1, min(6, puntaje))

    tendencia = medidor.get("tendencia", "mantiene")
    if tendencia not in tendencias_validas:
        tendencia = _tendencia_por_puntaje(puntaje, dificultad_prev)

    habilidad = medidor.get("habilidad_estimada", nivel)
    if habilidad not in niveles_validos:
        habilidad = nivel

    justificacion = medidor.get("justificacion", "Ajuste progresivo dentro de Junior.")

    return {
        "nivel": nivel,
        "puntaje": puntaje,
        "tendencia": tendencia,
        "habilidad_estimada": habilidad,
        "justificacion": justificacion,
    }


def _medidor_fallback(dificultad_prev: int, nivel_prev: str, objetivo: int | None = None) -> dict:
    puntaje = max(1, min(6, objetivo or dificultad_prev or 2))
    nivel = _nivel_por_puntaje(puntaje)
    return {
        "nivel": nivel,
        "puntaje": puntaje,
        "tendencia": _tendencia_por_puntaje(puntaje, dificultad_prev),
        "habilidad_estimada": nivel_prev if nivel_prev else nivel,
        "justificacion": "Sin datos del modelo; se mantiene progresion Junior.",
    }


def _nivel_por_puntaje(puntaje: int) -> str:
    if puntaje <= 2:
        return "Junior Bajo"
    if puntaje <= 4:
        return "Junior Medio"
    return "Junior Alto"


def _tendencia_por_puntaje(puntaje: int, previo: int) -> str:
    if puntaje > previo:
        return "sube"
    if puntaje < previo:
        return "baja"
    return "mantiene"


_STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "de", "del",
    "a", "en", "para", "por", "con", "sin", "que", "como", "se", "su", "sus",
    "lo", "al", "es", "son", "ser", "hacer", "usa", "usar", "usar", "utiliza",
    "this", "that", "the", "and", "or", "to", "from", "with", "without", "in",
    "on", "for", "of", "as", "is", "are", "be", "by", "it", "its", "your", "you",
}


def _extraer_palabras_clave(texto: str) -> set:
    limpio = re.sub(r"[^a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+", " ", texto.lower())
    tokens = [t for t in limpio.split() if len(t) >= 3 and t not in _STOPWORDS]
    return set(tokens)


def _es_respuesta_relacionada(codigo: str, pregunta: str, esperado: str) -> bool:
    palabras = _extraer_palabras_clave(f"{pregunta} {esperado}")
    if not palabras:
        return _parece_codigo(codigo)

    codigo_min = codigo.lower()
    coincidencias = sum(1 for p in palabras if p in codigo_min)

    if coincidencias >= 2:
        return True

    ratio = coincidencias / max(1, len(palabras))
    if ratio >= 0.05:
        return True

    # Fallback tolerante: si parece codigo, aceptarlo aunque haya pocas coincidencias
    return _parece_codigo(codigo)


def _respuesta_fuera_de_pregunta(motivo: str) -> dict:
    return {
        "calificacion_general": {
            "nivel": "Crítico",
            "puntaje": 5,
            "resumen": "El código no corresponde a la consigna generada para esta sesión."
        },
        "errores": [
            {
                "tipo": "Lógica",
                "descripcion": motivo,
                "impacto": "alto",
                "linea_aproximada": None
            }
        ],
        "buenas_practicas": [],
        "malas_practicas": [
            "La solución no aborda los requisitos de la consigna."
        ],
        "recomendaciones": [
            {
                "mensaje": "Reorienta la solución a la consigna original.",
                "solucion": "Revisa la pregunta generada y ajusta la implementación para cubrir sus requisitos.",
                "prioridad": "alta"
            }
        ],
        "consejos_entrevista": ["Escucha y lee bien el enunciado antes de escribir código. Resolver el problema equivocado es una alerta roja (Red Flag) en cualquier entrevista."],
        "evaluacion_tecnica": {
            "manejo_estado": "No evaluado",
            "legibilidad": "No evaluado",
            "arquitectura": "No evaluado",
            "performance": "No evaluado"
        }
    }


def _parece_codigo(texto: str) -> bool:
    if not texto or len(texto.strip()) < 20:
        return False

    patrones = [
        r"\bfunction\b",
        r"\bconst\b",
        r"\blet\b",
        r"\bclass\b",
        r"\bimport\b",
        r"\bexport\b",
        r"=>",
        r"\breturn\b",
        r"\buseState\b",
        r"\buseEffect\b",
        r"<\w+",
        r"\{[^}]+\}",
    ]

    coincidencias = sum(1 for p in patrones if re.search(p, texto))
    return coincidencias >= 1


def _parece_incompleto(texto: str) -> bool:
    if not texto or len(texto.strip()) < 120:
        return True
    marcadores = ["TODO", "FIXME", "TODO:", "...", "placeholder", "incompleto"]
    upper = texto.upper()
    if any(m in upper for m in marcadores):
        return True
    return False