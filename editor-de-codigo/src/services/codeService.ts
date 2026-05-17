import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000/api/v1";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type Framework = "vuejs" | "nextjs" | null;

export type AnalizarCodigoPayload = {
  codigo: string;
  /** ✅ MEJORA: siempre "Vue.js" o "Next.js", nunca "vuejs"/"nextjs" */
  framework: string;
  sesion_id?: string | null;
  usuario_id?: string | null;
  /** ✅ MEJORA: archivo activo */
  active_file?: string;
  /** ✅ MEJORA: sistema de archivos completo para contexto multi-archivo */
  files?: { [path: string]: string };
};

export type GuardarBorradorPayload = {
  sesion_id: string;
  codigo: string;
  active_file?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * ✅ MEJORA: mapea el framework del IDE al string que espera el backend.
 *
 * Backend espera: "Vue.js" | "Next.js"
 * IDE usa:        "vuejs"  | "nextjs"
 */
const resolverFrameworkApi = (framework: Framework): string => {
  if (framework === "vuejs")  return "Vue.js";
  if (framework === "nextjs") return "Next.js";
  return "general";
};

// ─── API calls ─────────────────────────────────────────────────────────────────

/**
 * Analiza el código del usuario usando el LLM del backend.
 * ✅ MEJORA: envía sesion_id, usuario_id, active_file y files.
 */
const analizarCodigo = async (payload: AnalizarCodigoPayload) => {
  const response = await axios.post(`${API_URL}/analizar-codigo`, payload, {
    timeout: 60_000, // El LLM puede tardar hasta 60s
  });
  return response.data;
};

/**
 * ✅ NUEVO: Guarda un borrador del código (autosave).
 * Falla silenciosamente — no debe bloquear al usuario.
 */
const guardarBorrador = async (payload: GuardarBorradorPayload): Promise<void> => {
  try {
    await axios.post(`${API_URL}/guardar-borrador`, payload, {
      timeout: 5_000,
    });
  } catch (err) {
    // Autosave no debe interrumpir la sesión
    console.warn("⚠️ Autosave falló (no bloquea):", err);
  }
};

/**
 * ✅ NUEVO: Obtiene el resultado completo de una sesión por su ID.
 * El frontend principal usa esto en lugar de postMessage/sessionStorage.
 */
const obtenerResultadoSesion = async (sesionId: string) => {
  const response = await axios.get(`${API_URL}/sesion/${sesionId}/resultado`, {
    timeout: 10_000,
  });
  return response.data;
};

/**
 * Genera una pregunta para el framework dado.
 * Retorna la pregunta + sesion_id creado en backend.
 */
const generarPregunta = async (
  framework: "vue" | "next",
  usuarioId?: string,
  token?: string,
) => {
  const params = new URLSearchParams();
  if (usuarioId) params.set("usuario_id", usuarioId);

  const response = await axios.get(
    `${API_URL}/generar-preguntas/${framework}?${params.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 30_000,
    }
  );
  return response.data;
};

// ─── Export ────────────────────────────────────────────────────────────────────

const codeService = {
  resolverFrameworkApi,
  analizarCodigo,
  guardarBorrador,
  obtenerResultadoSesion,
  generarPregunta,
};

export default codeService;