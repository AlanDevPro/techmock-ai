// services/ia.service.js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODELO = "claude-sonnet-4-20250514";

/**
 * Envía un mensaje al chat IA dentro de una sesión de entrevista.
 * Recibe el historial completo para mantener contexto.
 */
export async function chatConIA({ sesion, historial, mensajeUsuario }) {
  const systemPrompt = `Eres un entrevistador técnico senior especializado en ${sesion.tecnologia_nombre}.
Estás evaluando a un desarrollador de nivel ${sesion.nivel_nombre}.

La pregunta de la entrevista es:
"${sesion.pregunta_titulo}"

Descripción completa:
${sesion.pregunta_enunciado}

Tu rol:
- Guía al candidato con preguntas de seguimiento si es necesario
- No des la respuesta directamente, orienta con pistas
- Evalúa la profundidad técnica de sus respuestas
- Mantén un tono profesional pero amigable
- Si el candidato comparte código, analízalo y da feedback constructivo
- Responde siempre en español`;

  // Convertir historial a formato Anthropic (excluir el mensaje actual del usuario)
  const messages = historial
    .filter((m) => !(m.rol === "user" && m.contenido === mensajeUsuario))
    .map((m) => ({
      role: m.rol === "user" ? "user" : "assistant",
      content: m.contenido,
    }));

  // Agregar el mensaje actual
  messages.push({ role: "user", content: mensajeUsuario });

  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const respuesta = response.content[0].text;
  const tokensUsados = response.usage.input_tokens + response.usage.output_tokens;

  return { respuesta, tokensUsados };
}

/**
 * Evalúa el código final de una sesión usando las rúbricas activas.
 * Retorna un objeto estructurado con puntajes por rúbrica y feedback general.
 */
export async function evaluarCodigoConIA({ sesion, codigo, lenguaje, rubricas }) {
  const rubricasTexto = rubricas
    .map((r) => `- ${r.nombre} (peso: ${r.peso_porcentual}%): ${r.descripcion || ""}`)
    .join("\n");

  const prompt = `Eres un evaluador técnico experto en ${sesion.tecnologia_nombre}.

Pregunta de la entrevista (nivel ${sesion.nivel_nombre}):
"${sesion.pregunta_titulo}"

${sesion.pregunta_enunciado}

Código enviado por el candidato (${lenguaje}):
\`\`\`${lenguaje}
${codigo}
\`\`\`

Evalúa el código según estas rúbricas:
${rubricasTexto}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "puntaje_total": <número entre 0 y 100>,
  "feedback_general": "<párrafo con evaluación general>",
  "fortalezas": "<fortalezas observadas>",
  "areas_mejora": "<áreas donde puede mejorar>",
  "sugerencias_recursos": "<recursos o temas que debería estudiar>",
  "detalles": [
    {
      "rubrica_nombre": "<nombre exacto de la rúbrica>",
      "puntaje": <número entre 0 y 100>,
      "comentario": "<comentario específico sobre esta rúbrica>"
    }
  ]
}`;

  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const texto = response.content[0].text.trim();
  const tokensUsados = response.usage.input_tokens + response.usage.output_tokens;

  // Limpiar posibles backticks de markdown
  const jsonLimpio = texto.replace(/```json|```/g, "").trim();
  const evaluacion = JSON.parse(jsonLimpio);

  return { evaluacion, tokensUsados, modeloUsado: MODELO };
}