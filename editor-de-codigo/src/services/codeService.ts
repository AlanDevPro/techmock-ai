import axios, { AxiosError, AxiosResponse } from "axios";

const API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Framework = "vuejs" | "nextjs" | null;

export type AnalizarCodigoPayload = {
  codigo: string;
  framework: string;
  sesion_id?: string | null;
  active_file?: string;
  files?: { [path: string]: string };
};

export type GuardarBorradorPayload = {
  sesion_id: string;
  codigo: string;
  active_file?: string;
};

export type ErrorDetail = {
  campo?: string;
  mensaje?: string;
  tipo?: string;
  loc?: string[];
  msg?: string;
  type?: string;
  input?: unknown;
};

export type ErrorResponse = {
  success?: boolean;
  status_code?: number;
  message?: string;
  details?: ErrorDetail[];
  detail?: ErrorDetail[] | string;
  error?: string;
  errors?: ErrorDetail[];
};

export type CalificacionGeneral = {
  nivel?: string;
  puntaje?: number;
  resumen?: string;
  nivel_candidato?: string;
  apto_para_contratacion?: boolean;
  resumen_para_reclutador?: string;
};

export type RespuestaAnalisis = {
  calificacion_general?: CalificacionGeneral;
  pilares_tecnicos?: Record<string, number>;
  errores?: unknown[];
  buenas_practicas?: string[];
  malas_practicas?: string[];
  recomendaciones?: unknown[];
  detalle_rubricas?: unknown[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIMEOUTS = {
  ANALISIS: 60_000,
  AUTOSAVE: 5_000,
  RESULTADO: 10_000,
  PREGUNTA: 30_000,
} as const;

// ====================================================================
// FILTRADO DE ARCHIVOS
// ====================================================================

// Patrones de directorios/archivos a ignorar COMPLETAMENTE
const IGNORED_PATTERNS = [
  // Directorios de dependencias y builds
  'node_modules/',
  'dist/',
  'build/',
  '.next/',
  '.nuxt/',
  '.git/',
  '.vscode/',
  '.idea/',
  '__pycache__/',
  'coverage/',
  '.cache/',
  '.vercel/',
  '.netlify/',
  '.output/',
  '.nitro/',
  
  // Lock files y archivos de paquetes
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'deno.lock',
  
  // Archivos de entorno y configuración
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  
  // Archivos binarios y de imágenes
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.webp',
  '.avif',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  
  // Archivos de documentación
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'AUTHORS',
  
  // Archivos de configuración de herramientas (generalmente no relevantes)
  '.gitignore',
  '.dockerignore',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.json',
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.json',
  '.editorconfig',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'webpack.config.js',
  'next.config.js',
  'nuxt.config.ts',
  'vitest.config.ts',
  'jest.config.js',
];

// Extensiones de archivos relevantes para análisis de código
const RELEVANT_EXTENSIONS = [
  '.vue', '.js', '.ts', '.jsx', '.tsx',     // Frontend frameworks
  '.html', '.htm',                           // HTML
  '.css', '.scss', '.sass', '.less',         // Estilos
  '.json',                                   // Configuración (solo pequeños)
  '.py', '.java', '.go', '.rs', '.rb',       // Backend
  '.sql',                                    // Consultas
  '.yaml', '.yml',                           // Configuración
  '.xml',                                    // Configuración
  '.graphql', '.gql',                        // GraphQL
];

// Tamaño máximo por archivo (5KB - suficiente para código relevante)
const MAX_FILE_SIZE = 5_000;

/**
 * Determina si un archivo debe ser ignorado
 */
function shouldIgnoreFile(path: string): { ignore: boolean; reason: string } {
  // Normalizar path para comparación
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
  
  // Verificar patrones de ignorados
  for (const pattern of IGNORED_PATTERNS) {
    if (normalizedPath.includes(pattern.toLowerCase())) {
      return { ignore: true, reason: `patrón ignorado: ${pattern}` };
    }
  }
  
  // Verificar extensión
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext && !RELEVANT_EXTENSIONS.includes(`.${ext}`)) {
    // Permitir archivos sin extensión (como Dockerfile, Makefile)
    const basename = path.split('/').pop() || '';
    const hasNoExt = !basename.includes('.');
    if (!hasNoExt) {
      return { ignore: true, reason: `extensión no relevante: .${ext}` };
    }
  }
  
  return { ignore: false, reason: '' };
}

/**
 * Filtra archivos del proyecto para enviar solo los relevantes
 */
function filterProjectFiles(files: { [path: string]: string }): { [path: string]: string } {
  if (!files) return {};
  
  console.group("📂 [FILTER] Filtrando archivos del proyecto");
  console.log(`📊 Archivos originales: ${Object.keys(files).length}`);
  
  const filtered: { [path: string]: string } = {};
  let ignoredCount = 0;
  let truncatedCount = 0;
  const ignoredReasons: Record<string, number> = {};
  
  for (const [path, content] of Object.entries(files)) {
    const { ignore, reason } = shouldIgnoreFile(path);
    
    if (ignore) {
      ignoredCount++;
      ignoredReasons[reason] = (ignoredReasons[reason] || 0) + 1;
      console.debug(`   ❌ Ignorado: ${path} (${reason})`);
      continue;
    }
    
    // Limitar tamaño del archivo
    let finalContent = content;
    if (content.length > MAX_FILE_SIZE) {
      truncatedCount++;
      finalContent = content.substring(0, MAX_FILE_SIZE) + 
        `\n\n... [archivo truncado de ${content.length} a ${MAX_FILE_SIZE} caracteres]`;
      console.debug(`   ⚠️ Truncado: ${path} (${content.length} → ${MAX_FILE_SIZE} chars)`);
    }
    
    filtered[path] = finalContent;
    console.debug(`   ✅ Incluido: ${path} (${finalContent.length} chars)`);
  }
  
  // Resumen del filtrado
  console.log("-".repeat(50));
  console.log("📊 RESUMEN DE FILTRADO:");
  console.log(`   ✅ Archivos incluidos: ${Object.keys(filtered).length}`);
  console.log(`   ❌ Archivos ignorados: ${ignoredCount}`);
  console.log(`   ⚠️ Archivos truncados: ${truncatedCount}`);
  
  if (Object.keys(ignoredReasons).length > 0) {
    console.log("\n📋 RAZONES DE IGNORADO:");
    for (const [reason, count] of Object.entries(ignoredReasons)) {
      console.log(`   - ${reason}: ${count} archivo(s)`);
    }
  }
  
  console.groupEnd();
  return filtered;
}

// ─── Estado global de inflight ────────────────────────────────────────────────
const _finalizandoSesiones = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapea el framework del IDE al string canónico que espera el backend.
 */
const resolverFrameworkApi = (framework: Framework): string => {
  if (framework === "vuejs") return "Vue.js";
  if (framework === "nextjs") return "Next.js";
  return "general";
};

/**
 * Formatea un objeto para logging con límite de tamaño
 */
const formatForLog = (obj: Record<string, unknown> | unknown[], maxLength: number = 500): string => {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + "... (truncado)";
    }
    return str;
  } catch {
    return String(obj);
  }
};

/**
 * Valida que el payload tenga los campos requeridos antes de enviar
 */
const validatePayload = (payload: AnalizarCodigoPayload): string[] => {
  const errors: string[] = [];
  
  if (!payload.codigo || payload.codigo.trim().length === 0) {
    errors.push("codigo: El código no puede estar vacío");
  }
  
  if (!payload.sesion_id) {
    errors.push("sesion_id: Se requiere un ID de sesión válido");
  }
  
  return errors;
};

/**
 * Type guard para verificar si un valor es un objeto
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard para verificar si es un array de ErrorDetail
 */
const isErrorDetailArray = (value: unknown): value is ErrorDetail[] => {
  return Array.isArray(value);
};

/**
 * Extrae detalles de error de la respuesta del backend
 */
const extractErrorDetails = (data: unknown): ErrorDetail[] => {
  if (!isRecord(data)) return [];
  
  if ('detail' in data) {
    const detail = data.detail;
    if (isErrorDetailArray(detail)) {
      return detail;
    }
    if (typeof detail === 'string') {
      return [{ mensaje: detail, campo: "general" }];
    }
  }
  
  if ('details' in data && isErrorDetailArray(data.details)) {
    return data.details;
  }
  
  if ('errors' in data && isErrorDetailArray(data.errors)) {
    return data.errors;
  }
  
  return [];
};

/**
 * Obtiene el mensaje de error principal de la respuesta
 */
const extractErrorMessage = (data: unknown): string => {
  if (!isRecord(data)) return "Error desconocido";
  
  if ('message' in data && typeof data.message === 'string') return data.message;
  if ('error' in data && typeof data.error === 'string') return data.error;
  if ('detail' in data && typeof data.detail === 'string') return data.detail;
  
  if ('detail' in data && isErrorDetailArray(data.detail) && data.detail[0]?.msg) {
    return data.detail[0].msg;
  }
  
  return "Error en la solicitud";
};

/**
 * Valida si una respuesta tiene calificación general
 */
const hasCalificacionGeneral = (data: unknown): data is RespuestaAnalisis => {
  return isRecord(data) && 'calificacion_general' in data;
};

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Finaliza la sesión y dispara la evaluación IA.
 */
const analizarCodigo = async (
  payload: AnalizarCodigoPayload,
): Promise<RespuestaAnalisis | null> => {
  const sesionId = payload.sesion_id ?? "sin-sesion";
  const startTime = Date.now();

  // ── Log de inicio ──────────────────────────────────────────────────────────
  console.group("🚀 [CODE-SERVICE] Iniciando análisis de código");
  console.log(`📝 Sesión ID: ${sesionId}`);
  console.log(`🔧 Framework: ${payload.framework}`);
  console.log(`📏 Longitud código: ${payload.codigo?.length || 0} caracteres`);
  console.log(`📁 Archivo activo: ${payload.active_file || "ninguno"}`);
  console.log(`📂 Archivos adjuntos: ${Object.keys(payload.files || {}).length}`);
  console.groupEnd();

  // ── Validación pre-envío ───────────────────────────────────────────────────
  const validationErrors = validatePayload(payload);
  if (validationErrors.length > 0) {
    console.error("❌ [CODE-SERVICE] Error de validación local:");
    validationErrors.forEach(err => console.error(`   - ${err}`));
    throw new Error(`Payload inválido: ${validationErrors.join(", ")}`);
  }

  // ── Protección contra doble submit ─────────────────────────────────────────
  if (_finalizandoSesiones.has(sesionId)) {
    console.warn(
      `⚠️ [CODE-SERVICE] Sesión ${sesionId} ya está siendo procesada — request ignorada`,
    );
    return null;
  }

  _finalizandoSesiones.add(sesionId);

  // ── FILTRAR ARCHIVOS ANTES DE ENVIAR ───────────────────────────────────────
  let filteredFiles = null;
  if (payload.files && Object.keys(payload.files).length > 0) {
    console.log("🔍 [CODE-SERVICE] Aplicando filtro de archivos antes de enviar...");
    filteredFiles = filterProjectFiles(payload.files);
  }
  
  // ── Construcción del request CON ARCHIVOS FILTRADOS ────────────────────────
  const requestBody = {
    sesion_id: payload.sesion_id,
    codigo: payload.codigo,
    lenguaje: resolverFrameworkApi(payload.framework as Framework),
    motivo_cierre: "enviado" as const,
    active_file: payload.active_file || null,
    files: filteredFiles,  // ← USAR ARCHIVOS FILTRADOS
  };

  // ── Log del request con información de filtrado ────────────────────────────
  console.group("📤 [CODE-SERVICE] Enviando request al backend");
  console.log(`📍 URL: ${API_URL}/codigo/finalizar`);
  console.log(`🔑 Sesion ID: ${requestBody.sesion_id}`);
  console.log(`🔧 Lenguaje: ${requestBody.lenguaje}`);
  console.log(`📏 Código: ${requestBody.codigo.length} caracteres`);
  console.log(`📁 Active file: ${requestBody.active_file || "ninguno"}`);
  console.log(`📂 Archivos originales: ${Object.keys(payload.files || {}).length}`);
  console.log(`📂 Archivos después de filtro: ${Object.keys(requestBody.files || {}).length}`);
  console.log(`🏁 Motivo: ${requestBody.motivo_cierre}`);
  console.groupEnd();

  try {
    const response: AxiosResponse<RespuestaAnalisis> = await axios.post(
      `${API_URL}/codigo/finalizar`,
      requestBody,
      {
        timeout: TIMEOUTS.ANALISIS,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const duration = Date.now() - startTime;
    
    // ── Log de éxito ─────────────────────────────────────────────────────────
    console.group("✅ [CODE-SERVICE] Request exitoso");
    console.log(`⏱️  Duración: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.data && hasCalificacionGeneral(response.data)) {
      const calif = response.data.calificacion_general;
      if (calif) {
        console.log(`⭐ Puntaje: ${calif.puntaje ?? "N/A"}`);
        console.log(`🏆 Nivel: ${calif.nivel ?? "N/A"}`);
        console.log(`✅ Apto contratación: ${calif.apto_para_contratacion ?? "N/A"}`);
      }
    }
    console.groupEnd();

    return response.data;
    
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const axiosError = error as AxiosError<ErrorResponse>;
    
    // ── Log de error detallado ───────────────────────────────────────────────
    console.group("❌ [CODE-SERVICE] Error en análisis de código");
    console.log(`⏱️  Duración: ${duration}ms`);
    console.log(`🔍 Tipo error: ${axiosError.name || "Unknown"}`);
    
    if (axiosError.response) {
      const status = axiosError.response.status;
      const statusText = axiosError.response.statusText;
      const data = axiosError.response.data;
      
      const errorMessage = extractErrorMessage(data);
      console.log(`📊 Status: ${status} ${statusText}`);
      console.log(`📝 Mensaje: ${errorMessage}`);
      
      // ── Manejo específico por código de error ─────────────────────────────
      switch (status) {
        case 422: {
          console.error("🔍 ERROR DE VALIDACIÓN 422 - Datos inválidos:");
          const errorDetails = extractErrorDetails(data);
          
          if (errorDetails.length > 0) {
            const tableData = errorDetails.map(d => ({
              Campo: d.campo || d.loc?.join('.') || "desconocido",
              Error: d.mensaje || d.msg || "Error de validación",
              Tipo: d.tipo || d.type || "unknown"
            }));
            console.table(tableData);
          } else {
            console.error("   Detalle:", formatForLog(data as Record<string, unknown>));
          }
          
          console.error("\n📋 Campos requeridos por el backend:");
          console.error("   - sesion_id: string (UUID format)");
          console.error("   - codigo: string (non-empty)");
          console.error("   - lenguaje: string (vuejs, react, nextjs, javascript, etc.)");
          console.error("   - motivo_cierre: 'enviado' | 'tiempo_agotado' (opcional)");
          break;
        }
          
        case 400:
          console.error("🔍 ERROR DE CLIENTE 400 - Request mal formado:");
          console.error(`   ${errorMessage}`);
          break;
          
        case 404:
          console.error("🔍 ERROR 404 - Recurso no encontrado:");
          console.error(`   ${errorMessage}`);
          console.error(`   Verifica que el sesion_id '${payload.sesion_id}' sea correcto`);
          break;
          
        case 413:
          console.error("🔍 ERROR 413 - Código demasiado largo:");
          console.error(`   ${errorMessage}`);
          console.error(`   Longitud actual: ${payload.codigo.length} caracteres`);
          break;
          
        case 429:
          console.error("🔍 ERROR 429 - Rate limit excedido:");
          console.error("   El servidor está recibiendo demasiadas solicitudes");
          console.error("   Espera unos segundos y reintenta");
          break;
          
        case 500:
          console.error("🔍 ERROR 500 - Error interno del servidor:");
          console.error(`   ${errorMessage}`);
          console.error("   Revisa los logs del servidor para más detalles");
          break;
          
        default:
          console.error(`🔍 Error HTTP ${status}: ${statusText}`);
          console.error("   Detalle:", formatForLog(data as Record<string, unknown>));
      }
      
      // Log del request que causó el error
      console.group("📦 Request que causó el error:");
      console.log(`   sesion_id: ${requestBody.sesion_id}`);
      console.log(`   lenguaje: ${requestBody.lenguaje}`);
      console.log(`   codigo length: ${requestBody.codigo?.length || 0}`);
      console.log(`   motivo_cierre: ${requestBody.motivo_cierre}`);
      console.groupEnd();
      
    } else if (axiosError.request) {
      console.error("🔍 ERROR DE RED - No se recibió respuesta del servidor");
      console.error(`   URL: ${API_URL}/codigo/finalizar`);
      console.error("   Posibles causas:");
      console.error("   - El backend no está corriendo");
      console.error("   - CORS no está configurado correctamente");
      console.error("   - Firewall bloqueando la conexión");
      console.error("   - URL incorrecta");
      console.error(`\n   Verifica que el backend esté disponible en: ${API_URL}`);
      
    } else {
      console.error("🔍 ERROR DE CONFIGURACIÓN:");
      console.error(`   ${axiosError.message}`);
    }
    
    console.groupEnd();
    throw error;
    
  } finally {
    _finalizandoSesiones.delete(sesionId);
    console.debug(`🔓 [CODE-SERVICE] Lock liberado para sesión: ${sesionId}`);
  }
};

/**
 * Guarda un borrador del código (autosave)
 */
const guardarBorrador = async (payload: GuardarBorradorPayload): Promise<void> => {
  const startTime = Date.now();
  
  console.debug(`💾 [CODE-SERVICE] Autosave - Sesión: ${payload.sesion_id}`);
  console.debug(`   Longitud código: ${payload.codigo.length}`);
  
  try {
    await axios.post(`${API_URL}/codigo/borrador`, payload, {
      timeout: TIMEOUTS.AUTOSAVE,
    });
    
    const duration = Date.now() - startTime;
    console.debug(`✅ [CODE-SERVICE] Autosave exitoso (${duration}ms)`);
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.warn(`⚠️ [CODE-SERVICE] Autosave falló después de ${duration}ms (no bloquea):`, err);
  }
};

/**
 * Obtiene el resultado crudo de una sesión (debug/admin)
 */
const obtenerResultadoSesion = async (sesionId: string): Promise<unknown> => {
  console.debug(`📊 [CODE-SERVICE] Obteniendo resultado crudo - Sesión: ${sesionId}`);
  
  try {
    const response = await axios.get(
      `${API_URL}/codigo/sesion/${sesionId}/resultado`,
      { timeout: TIMEOUTS.RESULTADO },
    );
    console.debug(`✅ [CODE-SERVICE] Resultado crudo obtenido - Status: ${response.status}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ [CODE-SERVICE] Error obteniendo resultado crudo:`, error);
    throw error;
  }
};

/**
 * Obtiene el análisis formateado para mostrar al candidato
 */
const obtenerAnalisisSesion = async (sesionId: string): Promise<RespuestaAnalisis | null> => {
  console.debug(`📊 [CODE-SERVICE] Obteniendo análisis formateado - Sesión: ${sesionId}`);
  
  try {
    const response = await axios.get<RespuestaAnalisis>(
      `${API_URL}/codigo/sesion/${sesionId}/analisis`,
      { timeout: TIMEOUTS.RESULTADO },
    );
    console.debug(`✅ [CODE-SERVICE] Análisis obtenido - Status: ${response.status}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ [CODE-SERVICE] Error obteniendo análisis:`, error);
    throw error;
  }
};

/**
 * Genera una pregunta para el framework dado
 */
const generarPregunta = async (
  framework: "vue" | "next",
  usuarioId?: string,
  token?: string,
): Promise<unknown> => {
  console.group("🎯 [CODE-SERVICE] Generando nueva pregunta");
  console.log(`🔧 Framework: ${framework}`);
  console.log(`👤 Usuario ID: ${usuarioId || "no proporcionado"}`);
  console.log(`🔑 Token: ${token ? "presente" : "ausente"}`);
  
  try {
    const response = await axios.get(
      `${API_URL}/preguntas/generar/${framework}`,
      {
        params: usuarioId ? { usuario_id: usuarioId } : {},
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: TIMEOUTS.PREGUNTA,
      },
    );
    
    console.log(`✅ [CODE-SERVICE] Pregunta generada - Status: ${response.status}`);
    if (response.data && typeof response.data === 'object' && 'sesion_id' in response.data) {
      console.log(`🆔 Nueva sesión ID: ${response.data.sesion_id}`);
    }
    console.groupEnd();
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ [CODE-SERVICE] Error generando pregunta:`, error);
    console.groupEnd();
    throw error;
  }
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