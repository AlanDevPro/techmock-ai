// 📁 contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  User as FirebaseUser,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  name: string;
  nombre?: string;
  apellido?: string;
  rol: 'admin' | 'developer';
  providers: string[];
  telefono?: string;
  bio?: string;
  website?: string;
  location?: string;
  github_url?: string;
  github?: string;
  linkedin_url?: string;
  twitter?: string;
  avatar_url?: string;
  activo?: boolean;
  email_verificado?: boolean;
  fecha_creacion?: string;
  createdAt?: string;
  ultimo_acceso?: string;
  ultimo_login?: string;
}

export interface UpdateProfilePayload {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  bio?: string;
  website?: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter?: string;
  avatar_url?: string;
  email?: string;
}

interface AuthContextType {
  user: AppUser | null;
  userRole: 'admin' | 'developer' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, apellido?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  linkGithubToCurrentUser: () => Promise<void>;
  linkGoogleToCurrentUser: () => Promise<void>;
  getLinkedProviders: () => string[];
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000/api/v1';

function decodeJWT(token: string): Omit<AppUser, 'providers'> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );

    console.log('🔍 [JWT] Payload decodificado completo:', decoded);
    console.log('🔍 [JWT] exp (unix):', decoded.exp, '→ fecha:', decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'sin exp');
    console.log('🔍 [JWT] iat (unix):', decoded.iat, '→ fecha:', decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'sin iat');
    console.log('🔍 [JWT] Ahora:', new Date().toISOString());

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.error('❌ [JWT] TOKEN EXPIRADO. Expiró hace:', Math.round((Date.now() - decoded.exp * 1000) / 1000 / 60), 'minutos');
    } else if (decoded.exp) {
      console.log('✅ [JWT] Token vigente. Expira en:', Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60), 'minutos');
    }

    if (!decoded?.sub && !decoded?.id) {
      console.error('❌ [JWT] Token sin sub ni id — inválido');
      return null;
    }

    return {
      id: decoded.sub ?? decoded.id,
      email: decoded.email ?? '',
      name: decoded.name ?? decoded.nombre ?? '',
      nombre: decoded.nombre ?? decoded.name ?? '',
      apellido: decoded.apellido ?? '',
      rol: decoded.rol ?? 'developer',
    };
  } catch (e) {
    console.error('❌ [JWT] Error al decodificar:', e);
    return null;
  }
}

interface BackendUser {
  providers?: string[];
}

function buildAppUser(accessToken: string, backendUser: BackendUser): AppUser {
  const decoded = decodeJWT(accessToken);
  if (!decoded) throw new Error('Token JWT inválido');
  return { ...decoded, providers: backendUser.providers ?? [] };
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  console.log('💾 [TOKENS] Guardados en localStorage');
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  console.log('🗑️ [TOKENS] Eliminados de localStorage');
}

// ─── REFRESH TOKEN FUNCTIONS ────────────────────────────────

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    console.error('❌ [REFRESH] No hay refresh token disponible');
    throw new Error('No hay refresh token disponible');
  }

  console.log('🔄 [REFRESH] Intentando renovar access token...');

  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  console.log('🔄 [REFRESH] /auth/refresh status:', res.status);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('❌ [REFRESH] Falló la renovación:', errorData);
    clearTokens();
    throw new Error(errorData.error || 'Refresh token expirado o inválido');
  }

  const data = await res.json();
  console.log('✅ [REFRESH] Nuevo access token recibido');

  localStorage.setItem('accessToken', data.accessToken);
  
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
    console.log('🔄 [REFRESH] Nuevo refresh token recibido (rotation)');
  }

  return data.accessToken;
};

// ─── FETCH WITH AUTH ─────────────────────────────────────────

const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> => {
  const maxRetries = 1;

  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && retryCount === 0) {
      console.warn('⚠️ [FETCH] 401 - Token expirado, intentando refrescar...');
      
      try {
        const newToken = await refreshAccessToken();
        
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${newToken}`,
        };
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: newHeaders,
        });
        
        console.log('✅ [FETCH] Reintento exitoso con nuevo token, status:', retryResponse.status);
        return retryResponse;
        
      } catch (refreshError) {
        console.error('❌ [FETCH] Error al refrescar token:', refreshError);
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        throw refreshError;
      }
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries && error instanceof TypeError) {
      console.log(`🔄 [FETCH] Error de red, reintento ${retryCount + 1}...`);
      return fetchWithAuth(url, options, retryCount + 1);
    }
    throw error;
  }
};

// ─── SYNC FIREBASE CON RATE LIMITING ─────────────────────────

// ✅ SOLUCIÓN: Cache de sincronización para evitar múltiples llamadas
let lastSyncTime = 0;
const SYNC_COOLDOWN = 60000; // 1 minuto de cooldown
let pendingSyncPromise: Promise<AppUser> | null = null;

async function syncFirebaseUserWithBackend(firebaseUser: FirebaseUser): Promise<AppUser> {
  console.log('🟣 [FIREBASE SYNC] Iniciando sync para:', firebaseUser.email);
  console.log('🟣 [FIREBASE SYNC] Providers en Firebase:', firebaseUser.providerData.map(p => p.providerId));

  // ✅ Rate limiting: Si la última sincronización fue hace menos de 1 minuto, omitir
  const now = Date.now();
  if (now - lastSyncTime < SYNC_COOLDOWN) {
    console.log(`⏳ [FIREBASE SYNC] Sincronización omitida (cooldown de ${SYNC_COOLDOWN/1000}s). Última sync hace ${Math.round((now - lastSyncTime)/1000)}s`);
    
    // Si hay una promesa pendiente, usarla
    if (pendingSyncPromise) {
      console.log('🔄 [FIREBASE SYNC] Usando promesa de sync pendiente');
      return pendingSyncPromise;
    }
    
    // Si no hay datos en localStorage, forzar sync
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('⚠️ [FIREBASE SYNC] Sin token en localStorage, forzando sync aunque esté en cooldown');
    } else {
      // Reconstruir usuario desde token existente
      const decoded = decodeJWT(token);
      if (decoded) {
        const user = { ...decoded, providers: [] };
        console.log('♻️ [FIREBASE SYNC] Usando usuario desde token existente');
        return user as AppUser;
      }
    }
  }

  // Si ya hay una sincronización en curso, esperar
  if (pendingSyncPromise) {
    console.log('🔄 [FIREBASE SYNC] Esperando sync en curso...');
    return pendingSyncPromise;
  }

  // Crear promesa de sincronización
  pendingSyncPromise = (async () => {
    try {
      const idToken = await firebaseUser.getIdToken();
      console.log('🟣 [FIREBASE SYNC] idToken obtenido (primeros 30 chars):', idToken.substring(0, 30) + '...');
      console.log('🟣 [FIREBASE SYNC] POST →', `${API}/auth/firebase`);

      const res = await fetch(`${API}/auth/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      console.log('🟣 [FIREBASE SYNC] /firebase status:', res.status);

      const data: {
        accessToken: string;
        refreshToken: string;
        user: BackendUser;
        error?: string;
      } = await res.json();

      console.log('🟣 [FIREBASE SYNC] /firebase body:', JSON.stringify(data));

      if (!res.ok) {
        console.error('❌ [FIREBASE SYNC] Backend rechazó el idToken. Error:', data.error);
        
        // ✅ Manejo específico de rate limiting
        if (data.error?.includes('Demasiadas solicitudes') || data.error?.includes('Too many requests')) {
          console.warn('⏳ [FIREBASE SYNC] Rate limit detectado. Intentando usar token existente...');
          const token = localStorage.getItem('accessToken');
          if (token) {
            const decoded = decodeJWT(token);
            if (decoded) {
              console.log('♻️ [FIREBASE SYNC] Usando token existente durante rate limit');
              const user = { ...decoded, providers: [] };
              return user as AppUser;
            }
          }
        }
        
        throw new Error(data.error ?? `Error sincronizando usuario: ${res.status}`);
      }

      if (!data.accessToken || !data.refreshToken) {
        console.error('❌ [FIREBASE SYNC] Backend no devolvió tokens. data:', data);
        throw new Error('El backend no devolvió tokens válidos');
      }

      lastSyncTime = Date.now();
      saveTokens(data.accessToken, data.refreshToken);
      console.log('✅ [FIREBASE SYNC] Sync exitoso para:', firebaseUser.email);

      return buildAppUser(data.accessToken, data.user);
    } finally {
      pendingSyncPromise = null;
    }
  })();

  return pendingSyncPromise;
}

async function waitForFirebaseUser(timeoutMs = 5000): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;

  console.log('⏳ [FIREBASE] Esperando currentUser...');
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
    setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
  });
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('🔄 [AUTH PROVIDER] render → loading:', loading, '| user:', user?.email ?? null);

  // ── useEffect #1 — Restaurar sesión desde localStorage ──────────────────
  useEffect(() => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 [AUTH #1] INICIO — restaurando sesión');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    console.log('🔵 [AUTH #1] accessToken en localStorage:', !!token);
    console.log('🔵 [AUTH #1] refreshToken en localStorage:', !!refreshToken);

    if (!token) {
      console.log('🔵 [AUTH #1] Sin token → setLoading(false), user queda null');
      setLoading(false);
      return;
    }

    console.log('🔵 [AUTH #1] Token (primeros 30 chars):', token.substring(0, 30) + '...');
    console.log('🔵 [AUTH #1] API URL destino:', `${API}/auth/me`);

    const decoded = decodeJWT(token);

    if (!decoded) {
      console.error('❌ [AUTH #1] Token no decodificable — limpiando y saliendo');
      clearTokens();
      setLoading(false);
      return;
    }

    console.log('🔵 [AUTH #1] Token decodificado OK:', decoded.email, '| rol:', decoded.rol);
    console.log('🔵 [AUTH #1] Llamando a /me...');

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        console.log('🔵 [AUTH #1] /me → HTTP status:', r.status, r.statusText);
        return r.text().then((text) => {
          console.log('🔵 [AUTH #1] /me → body crudo (primeros 300 chars):', text.substring(0, 300));
          try {
            const json = JSON.parse(text);
            return { status: r.status, data: json };
          } catch {
            console.error('❌ [AUTH #1] /me → body NO es JSON válido');
            return { status: r.status, data: null };
          }
        });
      })
      .then(({ status, data }) => {
        if (!data) {
          console.error('❌ [AUTH #1] /me → Sin data parseable. Status:', status);
          clearTokens();
          return;
        }

        console.log('🔵 [AUTH #1] /me → data.success:', data.success);
        console.log('🔵 [AUTH #1] /me → data.user:', JSON.stringify(data.user));

        if (data.success && data.user) {
          const restored: AppUser = {
            ...decoded,
            telefono:         data.user.telefono,
            bio:              data.user.bio,
            website:          data.user.website,
            location:         data.user.location,
            github_url:       data.user.github_url,
            linkedin_url:     data.user.linkedin_url,
            twitter:          data.user.twitter,
            avatar_url:       data.user.avatar_url,
            activo:           data.user.activo,
            email_verificado: data.user.email_verificado,
            fecha_creacion:   data.user.fecha_creacion,
            ultimo_acceso:    data.user.ultimo_acceso,
            ultimo_login:     data.user.ultimo_login,
            providers:        data.user.providers ?? [],
          };
          console.log('✅ [AUTH #1] setUser →', restored.email, '| providers:', restored.providers);
          setUser(restored);
        } else {
          console.error('❌ [AUTH #1] /me → data.success es false o data.user es null');
          clearTokens();
        }
      })
      .catch((err) => {
        console.error('❌ [AUTH #1] /me → CATCH (error de red):', err.message);
        console.warn('⚠️ [AUTH #1] Modo degradado: restaurando user sin providers desde JWT');
        setUser({ ...decoded, providers: [] });
      })
      .finally(() => {
        console.log('🔵 [AUTH #1] FIN → setLoading(false)');
        setLoading(false);
      });
  }, []);

  // ── useEffect #2 — Firebase listener OPTIMIZADO ─────────────────────────
  useEffect(() => {
    console.log('🟣 [AUTH #2] Registrando onAuthStateChanged listener');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🟣 [AUTH #2] onAuthStateChanged disparó');
      console.log('🟣 [AUTH #2] firebaseUser:', firebaseUser ? firebaseUser.email : 'null');

      if (!firebaseUser) {
        console.log('🟣 [AUTH #2] Sin usuario Firebase — no hacemos nada');
        return;
      }

      const existingToken = localStorage.getItem('accessToken');
      const existingUser = existingToken ? decodeJWT(existingToken) : null;

      // ✅ Solo sincronizar si no hay token o el usuario cambió
      if (!existingUser) {
        console.log('🟣 [AUTH #2] Sin JWT existente → sync necesario');
      } else if (existingUser.email === firebaseUser.email) {
        console.log('🟣 [AUTH #2] Mismo usuario, omitiendo sync (usando token existente)');
        return;
      }

      try {
        // ✅ Limpiar timeout previo para evitar sincronizaciones múltiples
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }

        // ✅ Pequeño delay para evitar múltiples sync en rápida sucesión
        await new Promise(resolve => {
          syncTimeoutRef.current = setTimeout(resolve, 100) as unknown as NodeJS.Timeout;
        });

        const refreshed = await syncFirebaseUserWithBackend(firebaseUser);
        console.log('✅ [AUTH #2] setUser refreshed:', refreshed.email);
        setUser(refreshed);
      } catch (err) {
        console.error('❌ [AUTH #2] sync con backend falló:', err);
        
        // ✅ Si falla la sync, intentar usar token existente
        const token = localStorage.getItem('accessToken');
        if (token) {
          const decoded = decodeJWT(token);
          if (decoded) {
            console.log('♻️ [AUTH #2] Usando token existente tras fallo de sync');
            setUser({ ...decoded, providers: [] });
          }
        }
      }
    });

    return () => {
      console.log('🟣 [AUTH #2] Cleanup — removiendo listener');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      unsubscribe();
    };
  }, []);

  // ─────────────────────────────────────────────
  // LOGIN — CON REFRESH TOKEN
  // ─────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔥 [LOGIN] email:', email);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Error al iniciar sesión');
      }

      if (!data.accessToken || !data.refreshToken) {
        throw new Error('Tokens inválidos recibidos del backend');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('💾 [LOGIN] Tokens guardados');

      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ [LOGIN] Firebase autenticado');
      } catch (firebaseError) {
        const err = firebaseError as { code?: string };
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          console.log('🔄 [LOGIN] Usuario no existe en Firebase, creándolo...');
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('✅ [LOGIN] Firebase user creado');
          } catch (createError) {
            console.warn('⚠️ [LOGIN] No se pudo crear usuario en Firebase:', createError);
          }
        } else {
          console.warn('⚠️ [LOGIN] Error Firebase no crítico:', err.code);
        }
      }

      const decoded = decodeJWT(data.accessToken);
      if (!decoded) throw new Error('Token inválido');

      const appUser: AppUser = {
        ...decoded,
        providers: data.user?.providers ?? [],
      };

      console.log('✅ [LOGIN] setUser →', appUser.email);
      setUser(appUser);
    } catch (error) {
      console.error('❌ [LOGIN] Error:', error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────

  const register = async (
    email: string,
    password: string,
    name: string,
    apellido?: string
  ): Promise<void> => {
    console.log('🔥 [REGISTER] email:', email, '| nombre:', name);

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!strongPasswordRegex.test(password)) {
      throw new Error('La contraseña debe tener mayúscula, minúscula, número y símbolo (@$!%*?&)');
    }
    if (!name?.trim()) throw new Error('El nombre es obligatorio');

    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre: name.trim(), apellido }),
    });

    console.log('🔥 [REGISTER] status:', res.status);
    const data = await res.json();
    console.log('🔥 [REGISTER] response:', JSON.stringify(data));

    if (!res.ok) throw new Error(data.error ?? 'Error al registrar');

    saveTokens(data.accessToken, data.refreshToken);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ [REGISTER] Firebase user creado');
    } catch (firebaseError) {
      const err = firebaseError as { code?: string };
      if (err.code === 'auth/email-already-in-use') {
        console.log('🔄 [REGISTER] Email ya existe en Firebase, haciendo signIn...');
        try {
          await signInWithEmailAndPassword(auth, email, password);
          console.log('✅ [REGISTER] Firebase signIn exitoso');
        } catch {
          console.warn('⚠️ [REGISTER] signIn en Firebase falló');
        }
      } else {
        console.warn('⚠️ [REGISTER] Error no crítico al crear usuario en Firebase:', err.code);
      }
    }

    const decoded = decodeJWT(data.accessToken);
    if (!decoded) throw new Error('Token inválido');

    const appUser: AppUser = { ...decoded, providers: data.user?.providers ?? [] };
    console.log('✅ [REGISTER] setUser →', appUser.email);
    setUser(appUser);
  };

  // ─────────────────────────────────────────────
  // OAUTH
  // ─────────────────────────────────────────────

  const loginWithGoogle = async (): Promise<void> => {
    console.log('🔥 [GOOGLE] Iniciando signInWithPopup...');
    const googleProvider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = await syncFirebaseUserWithBackend(result.user);
      console.log('✅ [GOOGLE] setUser →', appUser.email);
      setUser(appUser);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const firebaseError = error as { code: string; customData?: { email?: string }; message?: string };
        if (firebaseError.code === 'auth/account-exists-with-different-credential') {
          const email = firebaseError.customData?.email;
          if (email) {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            throw new Error(`Este correo (${email}) ya está registrado con "${methods[0]}". Inicia sesión con ese método y luego vincula Google.`);
          }
        }
        throw new Error(firebaseError.message ?? 'Error al iniciar sesión con Google');
      }
      throw new Error('Ocurrió un error inesperado al iniciar sesión con Google');
    }
  };

  const loginWithGithub = async (): Promise<void> => {
    console.log('🔥 [GITHUB] Iniciando signInWithPopup...');
    const githubProvider = new GithubAuthProvider();

    try {
      const result = await signInWithPopup(auth, githubProvider);
      const appUser = await syncFirebaseUserWithBackend(result.user);
      console.log('✅ [GITHUB] setUser →', appUser.email);
      setUser(appUser);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const firebaseError = error as { code: string; customData?: { email?: string }; message?: string };
        if (firebaseError.code === 'auth/account-exists-with-different-credential') {
          const email = firebaseError.customData?.email;
          if (email) {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes('google.com')) {
              const googleProvider = new GoogleAuthProvider();
              const result = await signInWithPopup(auth, googleProvider);
              await linkWithPopup(result.user, githubProvider);
              const appUser = await syncFirebaseUserWithBackend(result.user);
              setUser(appUser);
              return;
            }
            if (methods.includes('password')) {
              throw new Error('Este correo ya tiene contraseña. Inicia sesión con email y luego vincula GitHub desde tu perfil.');
            }
          }
        }
        throw new Error(firebaseError.message ?? 'Error al iniciar sesión con GitHub');
      }
      throw new Error('Ocurrió un error inesperado al iniciar sesión con GitHub');
    }
  };

  // ─────────────────────────────────────────────
  // VINCULACIÓN DE PROVIDERS
  // ─────────────────────────────────────────────

  const linkGithubToCurrentUser = async (): Promise<void> => {
    console.log('🔗 [LINK] Vinculando GitHub...');

    const firebaseUser = await waitForFirebaseUser();
    if (!firebaseUser) {
      throw new Error('No hay usuario autenticado en Firebase. Por favor, cierra sesión y vuelve a iniciarla.');
    }

    const githubProvider = new GithubAuthProvider();
    const result = await linkWithPopup(firebaseUser, githubProvider);
    const appUser = await syncFirebaseUserWithBackend(result.user);
    console.log('✅ [LINK] GitHub vinculado →', appUser.providers);
    setUser(appUser);
  };

  const linkGoogleToCurrentUser = async (): Promise<void> => {
    console.log('🔗 [LINK] Vinculando Google...');

    const firebaseUser = await waitForFirebaseUser();
    if (!firebaseUser) {
      throw new Error('No hay usuario autenticado en Firebase. Por favor, cierra sesión y vuelve a iniciarla.');
    }

    const googleProvider = new GoogleAuthProvider();
    const result = await linkWithPopup(firebaseUser, googleProvider);
    const appUser = await syncFirebaseUserWithBackend(result.user);
    console.log('✅ [LINK] Google vinculado →', appUser.providers);
    setUser(appUser);
  };

  const getLinkedProviders = (): string[] => user?.providers ?? [];

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────

  const resetPassword = async (email: string): Promise<void> => {
    console.log('🔥 [RESET] email:', email);
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar el correo');
  };

  // ─────────────────────────────────────────────
  // UPDATE USER PROFILE — CON FETCH WITH AUTH
  // ─────────────────────────────────────────────

  const updateUserProfile = async (payload: UpdateProfilePayload): Promise<void> => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 [UPDATE PROFILE] INICIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 [UPDATE PROFILE] payload:', JSON.stringify(payload));

    try {
      const response = await fetchWithAuth(`${API}/usuarios/perfil`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      console.log('📝 [UPDATE PROFILE] status:', response.status);
      const data = await response.json();
      console.log('📝 [UPDATE PROFILE] response:', JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.error ?? 'Error al actualizar el perfil');
      }

      setUser((prev) => {
        if (!prev) return prev;
        const updated: AppUser = {
          ...prev,
          nombre:       payload.nombre       ?? prev.nombre,
          apellido:     payload.apellido     ?? prev.apellido,
          name:         payload.nombre       ?? prev.name,
          telefono:     payload.telefono     ?? prev.telefono,
          bio:          payload.bio          ?? prev.bio,
          website:      payload.website      ?? prev.website,
          location:     payload.location     ?? prev.location,
          github_url:   payload.github_url   ?? prev.github_url,
          linkedin_url: payload.linkedin_url ?? prev.linkedin_url,
          twitter:      payload.twitter      ?? prev.twitter,
          avatar_url:   payload.avatar_url   ?? prev.avatar_url,
        };
        console.log('✅ [UPDATE PROFILE] setUser actualizado →', updated.email);
        return updated;
      });
    } catch (error) {
      console.error('❌ [UPDATE PROFILE] Error:', error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────

  const logout = async (): Promise<void> => {
    console.log('🔴 [LOGOUT] INICIO');

    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        const res = await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        console.log('🔴 [LOGOUT] /logout status:', res.status);
      } catch (err) {
        console.warn('⚠️ [LOGOUT] /logout falló (se limpia igual):', err);
      }
    }

    clearTokens();

    try {
      await signOut(auth);
      console.log('🔴 [LOGOUT] Firebase signOut completado');
    } catch (err) {
      console.warn('⚠️ [LOGOUT] Firebase signOut falló (ignorado):', err);
    }

    console.log('✅ [LOGOUT] setUser(null)');
    setUser(null);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole: user?.rol ?? null,
        loading,
        login,
        register,
        loginWithGoogle,
        loginWithGithub,
        linkGithubToCurrentUser,
        linkGoogleToCurrentUser,
        getLinkedProviders,
        resetPassword,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 
