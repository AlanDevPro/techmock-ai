// 📁 services/developers.service.ts

import { apiService } from "./api.service";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type Rol = "developer" | "admin" | "reclutador";

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  telefono: string | null;
  activo: boolean;
  email_verificado: boolean;
  fecha_creacion: string;
  ultimo_login: string | null;
  provider: "password" | "google" | "github";
  
  // Stats de estadisticas_usuario
  total_entrevistas?: number;
  puntaje_promedio?: number | null;
  
  // Campos del perfil técnico (perfil_tecnico_usuario)
  score_global?: number | null;
  score_javascript?: number | null;
  score_arquitectura?: number | null;
  score_buenas_practicas?: number | null;
  score_comunicacion?: number | null;
  score_resolucion?: number | null;
  consistencia?: number | null;
  tendencia?: string | null;
  nivel_actual?: string | null;
  total_sesiones?: number;
  sesiones_completadas?: number;
  mejor_tecnologia?: string | null;
  peor_tecnologia?: string | null;
  
  // Última evaluación
  ultimo_feedback?: string | null;
  ultimo_resumen_reclutador?: string | null;
  apto_para_contratacion?: boolean | null;
  ultima_evaluacion_fecha?: string | null;
}

export interface UsuariosResponse {
  success: boolean;
  data: Usuario[];
}

export interface UsuarioResponse {
  success: boolean;
  data: Usuario;
}

export type CreateUsuarioPayload = Omit<
  Usuario,
  "fecha_creacion" | "ultimo_login" | "total_entrevistas" | "puntaje_promedio" | 
  "score_global" | "score_javascript" | "score_arquitectura" | "score_buenas_practicas" |
  "score_comunicacion" | "score_resolucion" | "consistencia" | "tendencia" | "nivel_actual" |
  "total_sesiones" | "sesiones_completadas" | "mejor_tecnologia" | "peor_tecnologia" |
  "ultimo_feedback" | "ultimo_resumen_reclutador" | "apto_para_contratacion" | "ultima_evaluacion_fecha"
>;

export type UpdateUsuarioPayload = Partial<CreateUsuarioPayload>;

// ─────────────────────────────────────────────
// CACHÉ DE USUARIOS ✅
// ─────────────────────────────────────────────

let usersCache: Usuario[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto
let pendingRequest: Promise<Usuario[]> | null = null;

// ─────────────────────────────────────────────
// RETRY CON BACKOFF EXPONENCIAL ✅
// ─────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error as Error;
      const errorMessage = error?.message || String(error);
      
      // Solo hacer reintentos locales si es error de rate limit o de red
      if (
        errorMessage.toLowerCase().includes('demasiadas solicitudes') ||
        errorMessage.toLowerCase().includes('too many requests') ||
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('econnrefused')
      ) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Local Retry ${attempt + 1}/${maxRetries} en ${delay}ms (${errorMessage})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Si es un error definitivo (como 403, 400), lanzar de inmediato sin reintentar
      throw error;
    }
  }
  
  throw lastError;
}

// ─────────────────────────────────────────────
// ENDPOINTS CON CACHÉ Y RETRY
// ─────────────────────────────────────────────

const BASE = "/admin/usuarios";

export async function getUsuarios(forceRefresh = false): Promise<Usuario[]> {
  const now = Date.now();
  
  // ✅ Si hay caché válida y no se fuerza el refresco, devolver caché
  if (!forceRefresh && usersCache && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('📦 Usando caché de usuarios (TTL restante:', Math.round((CACHE_TTL - (now - cacheTimestamp)) / 1000), 's)');
    return usersCache;
  }
  
  // ✅ Si hay una solicitud idéntica ya en vuelo, suscribirse a ella para evitar duplicidad
  if (pendingRequest) {
    console.log('⏳ Esperando solicitud pendiente de usuarios...');
    return pendingRequest;
  }
  
  // ✅ Crear nueva solicitud encapsulada en la estrategia de backoff
  pendingRequest = withRetry(async () => {
    console.log('🌐 Solicitando usuarios al backend...');
    const result = await apiService.get<UsuariosResponse>(BASE);
    
    // ✅ Actualizar la caché en memoria
    usersCache = result.data ?? [];
    cacheTimestamp = Date.now();
    console.log('✅ Caché de usuarios actualizada (', usersCache.length, 'usuarios)');
    
    return usersCache;
  });
  
  try {
    return await pendingRequest;
  } catch (error) {
    // ✅ Mecanismo Estructurado de Resiliencia: Si el backend falla pero tenemos caché antigua, úsala como Fallback
    if (usersCache) {
      console.warn('⚠️ Error al obtener usuarios, usando caché expirada como fallback:', error);
      return usersCache;
    }
    throw error;
  } finally {
    pendingRequest = null;
  }
}

export async function getUsuarioById(id: string): Promise<Usuario> {
  // ✅ Optimización: Primero buscar en la caché local en memoria si existe
  if (usersCache) {
    const cached = usersCache.find(u => u.id === id);
    if (cached) {
      console.log('📦 Usuario encontrado en caché:', id);
      return cached;
    }
  }
  
  try {
    const result = await apiService.get<UsuarioResponse>(`${BASE}/${id}`);
    return result.data;
  } catch (error: any) {
    throw new Error(error.message || `Error al obtener el usuario con ID: ${id}`);
  }
}

export async function createUsuario(payload: CreateUsuarioPayload): Promise<Usuario> {
  try {
    const result = await apiService.post<UsuarioResponse>(BASE, payload);

    // ✅ Invalidar caché de listados generales para garantizar datos frescos en la próxima navegación
    usersCache = null;
    cacheTimestamp = 0;
    console.log('🔄 Caché invalidada por creación de usuario');

    return result.data;
  } catch (error: any) {
    throw new Error(error.message || "Error al registrar el nuevo usuario.");
  }
}

export async function updateUsuario(id: string, payload: UpdateUsuarioPayload): Promise<Usuario> {
  try {
    const result = await apiService.patch<UsuarioResponse>(`${BASE}/${id}`, payload);

    // ✅ Actualización reactiva de caché en línea para optimizar rendimiento de renderizado
    if (usersCache) {
      usersCache = usersCache.map(u => u.id === id ? result.data : u);
      console.log('🔄 Caché actualizada en tiempo real para usuario:', id);
    }

    return result.data;
  } catch (error: any) {
    throw new Error(error.message || `Error al actualizar los datos del usuario ${id}.`);
  }
}

export async function toggleUsuarioActivo(id: string, activo: boolean): Promise<Usuario> {
  try {
    const result = await apiService.patch<UsuarioResponse>(`${BASE}/${id}/estado`, { activo });

    if (usersCache) {
      usersCache = usersCache.map(u => u.id === id ? result.data : u);
      console.log('🔄 Caché actualizada (estado cambiado) para usuario:', id);
    }

    return result.data;
  } catch (error: any) {
    throw new Error(error.message || `Error al modificar el estado del usuario ${id}.`);
  }
}

export async function deleteUsuario(id: string): Promise<void> {
  try {
    await apiService.delete<any>(`${BASE}/${id}`);

    // ✅ Invalidar caché de inmediato para evitar inconsistencias visuales en las tablas
    usersCache = null;
    cacheTimestamp = 0;
    console.log('🔄 Caché invalidada por eliminación de usuario');
  } catch (error: any) {
    throw new Error(error.message || `Error al eliminar el usuario ${id}.`);
  }
}