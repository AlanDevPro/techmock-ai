import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Framework = "vuejs" | "nextjs" | null;

export type AnalizarCodigoPayload = {
  codigo: string;
  framework: string;
  sesion_id?: string | null;
  // usuario_id ya NO se envía: el backend lo resuelve desde sesion.usuario_id en BD
  active_file?: string;
  files?: { [path: string]: string };
};

export type GuardarBorradorPayload = {
  sesion_id: string;
  codigo: string;
  active_file?: string;
};

// ─── Estado global de inflight ────────────────────────────────────────────────
// Evita que doble-click, React StrictMode o reintentos del frontend
// disparen múltiples POST /finalizar para la misma sesión.

const _finalizandoSesiones = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapea el framework del IDE al string canónico que espera el backend.
 * Backend espera: "Vue.js" | "Next.js"
 * IDE usa:        "vuejs"  | "nextjs"
 */
const resolverFrameworkApi = (framework: Framework): string => {
  if (framework === "vuejs")  return "Vue.js";
  if (framework === "nextjs") return "Next.js";
  return "general";
};

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Finaliza la sesión y dispara la evaluación IA.
 *
 * SIN JWT: este endpoint es público.
 * El usuario_id lo resuelve el backend desde sesion.usuario_id en BD.
 *
 * PROTECCIÓN DOBLE SUBMIT:
 * Si ya hay una request en vuelo para este sesion_id, la segunda llamada
 * se ignora silenciosamente y retorna null. El componente debe manejar
 * el estado "loading" para deshabilitar el botón mientras tanto.
 */
const analizarCodigo = async (
  payload: AnalizarCodigoPayload,
): Promise<unknown | null> => {
  const sesionId = payload.sesion_id ?? "sin-sesion";

  // Lock: si ya está en vuelo para esta sesión, no duplicar
  if (_finalizandoSesiones.has(sesionId)) {
    console.warn(
      `⚠️ analizarCodigo: sesión ${sesionId} ya está siendo procesada — request ignorada`,
    );
    return null;
  }

  _finalizandoSesiones.add(sesionId);

  try {
    const response = await axios.post(
      `${API_URL}/codigo/finalizar`,
      {
        sesion_id:     payload.sesion_id,
        codigo:        payload.codigo,
        lenguaje:      resolverFrameworkApi(payload.framework as Framework),
        motivo_cierre: "enviado",
        active_file:   payload.active_file,
        files:         payload.files,
        // ← NO se envía usuario_id ni Authorization header
      },
      {
        timeout: 60_000,
      },
    );

    return response.data;
  } finally {
    // Siempre liberar el lock, haya éxito o error
    _finalizandoSesiones.delete(sesionId);
  }
};

/**
 * Guarda un borrador del código (autosave).
 * Falla silenciosamente — no debe bloquear al usuario.
 * SIN JWT.
 */
const guardarBorrador = async (payload: GuardarBorradorPayload): Promise<void> => {
  try {
    await axios.post(`${API_URL}/codigo/borrador`, payload, {
      timeout: 5_000,
      // ← sin headers de auth
    });
  } catch (err) {
    // Autosave no debe interrumpir la sesión
    console.warn("⚠️ Autosave falló (no bloquea):", err);
  }
};

/**
 * Obtiene el resultado crudo de una sesión (debug/admin).
 * SIN JWT: público por sesion_id.
 */
const obtenerResultadoSesion = async (sesionId: string): Promise<unknown> => {
  const response = await axios.get(
    `${API_URL}/codigo/sesion/${sesionId}/resultado`,
    { timeout: 10_000 },
  );
  return response.data;
};

/**
 * Obtiene el análisis formateado para mostrar al candidato.
 * SIN JWT: público por sesion_id.
 * Este es el endpoint principal que usa el frontend de resultados.
 */
const obtenerAnalisisSesion = async (sesionId: string): Promise<unknown> => {
  const response = await axios.get(
    `${API_URL}/codigo/sesion/${sesionId}/analisis`,
    { timeout: 10_000 },
  );
  return response.data;
};

/**
 * Genera una pregunta para el framework dado.
 * Retorna la pregunta + sesion_id creado en backend.
 * ESTE SÍ usa JWT: es donde se asocia usuario ↔ sesión.
 */
const generarPregunta = async (
  framework: "vue" | "next",
  usuarioId?: string,
  token?: string,
): Promise<unknown> => {
  const response = await axios.get(
    `${API_URL}/preguntas/generar/${framework}`,
    {
      params:  usuarioId ? { usuario_id: usuarioId } : {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // ↑ JWT aquí: crea la sesión y graba usuario_id en BD
    },
  );
  return response.data;
};

// ─── Export ───────────────────────────────────────────────────────────────────

const codeService = {
  resolverFrameworkApi,
  analizarCodigo,
  guardarBorrador,
  obtenerResultadoSesion,
  obtenerAnalisisSesion,
  generarPregunta,
};

export default codeService;