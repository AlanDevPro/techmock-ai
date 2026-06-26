// 📁 services/api.service.ts
'use client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api/v1';

class ApiService {
  private static instance: ApiService;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: string | null) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  }

  private setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('🗑️ [API] Tokens eliminados');
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      console.error('❌ [API] No hay refresh token disponible');
      throw new Error('No refresh token available');
    }

    console.log('🔄 [API] Intentando renovar access token...');

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      console.log('🔄 [API] /auth/refresh status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [API] Falló la renovación:', errorData);
        this.clearTokens();
        throw new Error(errorData.error || 'Refresh token expirado o inválido');
      }

      const data = await response.json();
      console.log('✅ [API] Nuevo access token recibido');

      if (data.accessToken) {
        this.setToken(data.accessToken);
      } else {
        throw new Error('No se recibió access token');
      }
      
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken);
        console.log('🔄 [API] Nuevo refresh token recibido (rotation)');
      }

      return data.accessToken;
    } catch (error) {
      console.error('❌ [API] Error al refrescar token:', error);
      this.clearTokens();
      throw error;
    }
  }

  private async processQueue(error: Error | null, token: string | null = null): Promise<void> {
    while (this.failedQueue.length) {
      const { resolve, reject } = this.failedQueue.shift()!;
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    }
  }

  private getHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const maxRetries = 1;
    const url = `${API_URL}${endpoint}`;
    
    // Combinamos las cabeceras base con las personalizadas que pasen por parámetro
    const headers = { ...this.getHeaders(), ...options.headers };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // 1. Intercepción de seguridad de sesiones (401)
      if (response.status === 401 && retryCount === 0) {
        console.warn('⚠️ [API] 401 - Token expirado o inválido, gestionando renovación...');

        // CASO A: Si otra petición ya está refrescando el token, nos encolamos
        if (this.isRefreshing) {
          console.log('⏳ [API] Refresh en curso, encolando petición...');
          return new Promise<string | null>((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            const updatedOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${newToken}`,
              }
            };
            return this.fetch<T>(endpoint, updatedOptions, retryCount + 1);
          });
        }

        // CASO B: Somos la primera petición en detectar el 401, disparamos el refresh
        this.isRefreshing = true;

        try {
          const newToken = await this.refreshAccessToken();
          this.isRefreshing = false;
          
          this.processQueue(null, newToken);

          console.log('🔄 [API] Reintentando petición original con nuevo token...');
          const updatedOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            }
          };
          return this.fetch<T>(endpoint, updatedOptions, retryCount + 1);
        } catch (error) {
          this.isRefreshing = false;
          this.processQueue(error as Error, null);
          this.clearTokens();
          
          if (typeof window !== 'undefined') {
            console.log('🔴 [API] Sesión muerta por completo. Redirigiendo...');
            window.location.href = '/auth/login';
          }
          throw error;
        }
      }

      // 2. 🚀 NUEVO: Intercepción limpia para control de Rate Limit (429)
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🚫 [API] Control de Rate Limit activado:', errorData);
        
        // Propaga el mensaje controlado configurado en tu Express-Rate-Limit ("error")
        throw new Error(errorData.error || "Has superado el límite de solicitudes. Por favor, espera unos minutos.");
      }

      // 3. Validación de respuestas generales erróneas
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Error ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      if (retryCount < maxRetries && error instanceof TypeError) {
        console.log(`🔄 [API] Error de red, reintento ${retryCount + 1}...`);
        return this.fetch<T>(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  }

  // ─── Métodos HTTP ─────────────────────────────────────────────

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiService = ApiService.getInstance();