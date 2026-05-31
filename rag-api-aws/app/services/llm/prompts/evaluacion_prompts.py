"""
app/services/llm/prompts/evaluacion_prompts.py

Prompts para análisis y evaluación de código del candidato.
El LLM debe retornar los 5 pilares técnicos por separado
para poblar las columnas de la tabla `evaluaciones` en BD.
"""

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM = """\
Eres un revisor de código senior especializado en {framework}, \
con experiencia en code reviews en equipos de alto rendimiento.

Analiza el código enviado por un candidato junior-intermedio y proporciona \
retroalimentación detallada, honesta y constructiva.

REGLAS:
1. Señala problemas concretos con referencia a líneas o patrones específicos.
2. Clasifica cada error por severidad real: bajo | medio | alto | critico.
3. Identifica el tipo de error por categoría: consumo_apis, manejo_estado, \
   async_await, componentes_props, css_layout, typescript_tipos, \
   inmutabilidad, optimizacion_renders, arquitectura_general.
4. Las recomendaciones deben incluir código de ejemplo cuando sea posible.
5. Evalúa también lo que el candidato hizo bien.
6. Clasifica al candidato: descartado | revisar | promisorio | recomendado | destacado.
7. Responder ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown.

FORMATO DE RESPUESTA (JSON estricto):
{{
  "calificacion_general": {{
    "nivel":                  "Excelente | Bueno | Regular | Deficiente | Crítico",
    "nivel_candidato":        "descartado | revisar | promisorio | recomendado | destacado",
    "puntaje":                85,
    "apto_para_contratacion": true,
    "resumen":                "Evaluación global en 2-3 oraciones. Honesta y específica.",
    "resumen_para_reclutador": "Una sola oración que le diga al reclutador si contratar o no y por qué."
  }},
  "pilares_tecnicos": {{
    "puntaje_javascript":       80,
    "puntaje_arquitectura":     75,
    "puntaje_buenas_practicas": 85,
    "puntaje_comunicacion":     70,
    "puntaje_resolucion":       65
  }},
  "errores": [
    {{
      "categoria_slug":    "slug de categorias_error (ej: manejo_estado)",
      "tipo":              "nombre legible del error",
      "descripcion":       "descripción detallada del problema",
      "impacto":           "critico | alto | medio | bajo",
      "es_conceptual":     false,
      "linea_aproximada":  null,
      "fragmento_codigo":  "fragmento exacto con el error (opcional)",
      "codigo_corregido":  "cómo debería escribirse (opcional)",
      "explicacion_ia":    "por qué es un error y qué implica"
    }}
  ],
  "buenas_practicas": [
    "Práctica positiva concreta detectada en el código"
  ],
  "malas_practicas": [
    "Anti-pattern concreto con explicación breve"
  ],
  "recomendaciones": [
    {{
      "tipo":          "codigo | concepto | recurso | patron",
      "mensaje":       "Qué mejorar y por qué",
      "solucion":      "Cómo mejorarlo",
      "codigo_ejemplo": "snippet de código (opcional)",
      "recurso_url":   null,
      "recurso_titulo": null,
      "prioridad":     "alta | media | baja",
      "orden":         1
    }}
  ],
  "evaluacion_tecnica": {{
    "manejo_estado":    "comentario sobre cómo maneja el estado",
    "legibilidad":      "comentario sobre naming, estructura y claridad",
    "arquitectura":     "comentario sobre separación de responsabilidades",
    "performance":      "comentario sobre eficiencia y cuellos de botella"
  }}
}}
"""


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PÚBLICA
# ─────────────────────────────────────────────────────────────────────────────

def build_code_analysis_prompt(
    codigo: str,
    framework: str,
    contexto_proyecto: str = "",
    contexto_rag: str = "",
) -> list[dict]:
    """
    Construye los mensajes para analizar código de un candidato.

    Args:
        codigo:            Código enviado por el usuario.
        framework:         Tecnología ("Vue.js", "Next.js", etc.)
        contexto_proyecto: Archivos adicionales del IDE.
        contexto_rag:      Documentación de buenas prácticas del retriever.

    Returns:
        Lista de mensajes [system, user] para el LLM.
    """
    system = _SYSTEM.format(framework=framework)

    context_parts = []
    if contexto_rag:
        context_parts.append(
            f"BUENAS PRÁCTICAS DE REFERENCIA ({framework}):\n---\n{contexto_rag}\n---"
        )
    if contexto_proyecto:
        context_parts.append(
            f"CONTEXTO DEL PROYECTO (otros archivos del IDE):\n---\n{contexto_proyecto}\n---"
        )

    context_block = "\n\n".join(context_parts)
    lang_tag = framework.lower().replace(".", "").replace(" ", "")

    user_content = f"""
{context_block}

CÓDIGO DEL CANDIDATO A EVALUAR:
```{lang_tag}
{codigo}
```

Analiza este código de {framework} con criterio de revisor senior.
Recuerda incluir los puntajes de los 5 pilares técnicos por separado.
Responde SOLO con el JSON. Sin texto adicional, sin markdown.
"""

    return [
        {"role": "system", "content": system},
        {"role": "user",   "content": user_content.strip()},
    ]