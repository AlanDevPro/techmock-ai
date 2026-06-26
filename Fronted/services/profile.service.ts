// 📁 app/services/profile.service.ts
import { apiService } from './api.service';

export interface EstadisticasUsuario {
  total_entrevistas: number;
  entrevistas_finalizadas: number;
  entrevistas_abandonadas: number;
  puntaje_promedio: number | null;
  mejor_puntaje: number | null;
  peor_puntaje: number | null;
  tiempo_promedio_segundos: number | null;
  tecnologia_favorita: string | null;
  racha_actual: number;
  racha_maxima: number;
  ultima_entrevista_fecha: string | null;
}

export interface PerfilTecnico {
  score_global: number;
  score_javascript: number;
  score_arquitectura: number;
  score_buenas_practicas: number;
  score_comunicacion: number;
  score_resolucion: number;
  consistencia: number;
  tendencia: '↑' | '→' | '↓' | string;
  nivel_actual: string;
  total_sesiones: number;
  sesiones_completadas: number;
  sesiones_abandonadas: number;
  mejor_tecnologia: string | null;
  peor_tecnologia: string | null;
}

export interface SesionReciente {
  id: string;
  tecnologia: string;
  tecnologia_id: number;
  nivel: string;
  pregunta: string;
  pregunta_id: number;
  estado: 'completada' | 'abandonada' | 'en_progreso' | 'tiempo_agotado';
  fecha_inicio: string;
  duracion_segundos: number | null;
  puntaje: number | null;
  nivel_candidato: string | null;
  feedback_general: string | null;
}

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url_accion: string | null;
  fecha_creacion: string;
}

export interface ProfileData {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    avatar_url: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    telefono: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
    activo: boolean;
    email_verificado: boolean;
    fecha_creacion: string;
    ultimo_acceso: string | null;
    ultimo_login: string | null;
    providers: string[];
  };
  estadisticas: EstadisticasUsuario;
  perfil_tecnico: PerfilTecnico;
  sesiones_recientes: SesionReciente[];
  notificaciones: Notificacion[];
}

export class ProfileService {
  static async obtenerPerfilCompleto(): Promise<ProfileData> {
    const response = await apiService.get<{ success: boolean; data: ProfileData }>('/profile/completo');
    return response.data;
  }

  static async obtenerEstadisticas(): Promise<EstadisticasUsuario> {
    const response = await apiService.get<{ success: boolean; data: EstadisticasUsuario }>('/profile/estadisticas');
    return response.data;
  }

  static async obtenerPerfilTecnico(): Promise<PerfilTecnico> {
    const response = await apiService.get<{ success: boolean; data: PerfilTecnico }>('/profile/perfil-tecnico');
    return response.data;
  }

  static async obtenerSesionesRecientes(limit: number = 10): Promise<SesionReciente[]> {
    const response = await apiService.get<{ success: boolean; data: SesionReciente[] }>(`/profile/sesiones?limit=${limit}`);
    return response.data;
  }

  static async obtenerNotificaciones(): Promise<Notificacion[]> {
    const response = await apiService.get<{ success: boolean; data: Notificacion[] }>('/profile/notificaciones');
    return response.data;
  }

  static async marcarNotificacionLeida(id: number): Promise<void> {
    await apiService.patch(`/profile/notificaciones/${id}/leer`);
  }

  static async marcarTodasNotificacionesLeidas(): Promise<void> {
    await apiService.patch('/profile/notificaciones/leer-todas');
  }
}