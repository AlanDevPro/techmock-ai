'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  fetchSignInMethodsForEmail
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
  providers: string[]; // ['google.com', 'github.com', 'password']
}

interface AuthContextType {
  user: AppUser | null;
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
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Decodifica un JWT sin librerías externas.
 * Solo lee el payload — NO valida la firma (eso lo hace el backend).
 */
function decodeJWT(token: string): Omit<AppUser, 'providers'> | null {
  try {
    const payload = token.split('.')[1];

    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );

    if (!decoded?.sub && !decoded?.id) return null;

    return {
      id: decoded.sub ?? decoded.id,
      email: decoded.email ?? '',
      name: decoded.name ?? decoded.nombre ?? '',
      nombre: decoded.nombre ?? decoded.name ?? '',
      apellido: decoded.apellido ?? '',
      rol: decoded.rol ?? 'developer',
    };
  } catch {
    return null;
  }
}

/**
 * Construye el AppUser completo combinando el JWT (identidad)
 * con data.user.providers (siempre viene del backend, nunca del JWT).
 */
function buildAppUser(accessToken: string, backendUser: any): AppUser {
  const decoded = decodeJWT(accessToken);
  if (!decoded) throw new Error('Token JWT inválido');

  return {
    ...decoded,
    providers: backendUser?.providers ?? [], // ✅ FUENTE DE VERDAD: backend
  };
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Sincroniza un usuario de Firebase (Google/GitHub) con tu backend.
 * Devuelve AppUser con providers reales desde data.user.providers.
 */
async function syncFirebaseUserWithBackend(firebaseUser: FirebaseUser): Promise<AppUser> {
  const idToken = await firebaseUser.getIdToken();

  console.log("🔥 [AUTH] syncFirebaseUserWithBackend - idToken enviado");
  console.log("🔥 [AUTH] URL:", `${API}/auth/firebase`);

  const res = await fetch(`${API}/auth/firebase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await res.json();

  console.log("🔥 [AUTH] Response status:", res.status);
  console.log("🔥 [AUTH] Response data:", data);

  if (!res.ok) {
    throw new Error(data.error ?? `Error sincronizando usuario: ${res.status}`);
  }

  if (!data.accessToken || !data.refreshToken) {
    throw new Error('El backend no devolvió tokens válidos');
  }

  saveTokens(data.accessToken, data.refreshToken);

  // ✅ CORRECCIÓN CLAVE: usar data.user.providers, NO decoded.providers
  const appUser = buildAppUser(data.accessToken, data.user);
  
  console.log('🔍 [AUTH] syncFirebase → providers:', appUser.providers);
  
  return appUser;
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

  // ── Inicialización: restaurar sesión desde localStorage ──────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        // ⚠️ Al restaurar desde localStorage no tenemos data.user.providers
        // → hacemos una llamada a /me para obtenerlos frescos
        fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.user) {
              const restored: AppUser = {
                ...decoded,
                providers: data.user.providers ?? [],
              };
              console.log('🔍 [AUTH] Sesión restaurada → providers:', restored.providers);
              setUser(restored);
            } else {
              // Token expirado o inválido según el backend
              clearTokens();
            }
          })
          .catch(() => {
            // Sin conexión: restaurar sin providers (degradado)
            setUser({ ...decoded, providers: [] });
          })
          .finally(() => setLoading(false));
      } else {
        clearTokens();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // ── Firebase listener (SOLO para OAuth — renovación silenciosa) ──────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const existingToken = localStorage.getItem('accessToken');
        const existingUser = existingToken ? decodeJWT(existingToken) : null;

        if (existingUser) {
          try {
            const refreshed = await syncFirebaseUserWithBackend(firebaseUser);
            setUser(refreshed);
          } catch (err) {
            console.warn('No se pudo refrescar token de Firebase:', err);
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  // ─────────────────────────────────────────────
  // EMAIL / PASSWORD
  // ─────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    console.log("🔥 [AUTH] LOGIN ATTEMPT");
    console.log("🔥 [AUTH] Login payload:", { email, password });
    console.log("🔥 [AUTH] API URL:", `${API}/auth/login`);
    
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    console.log("🔥 [AUTH] Response status:", res.status);
    
    const data = await res.json();
    console.log("🔥 [AUTH] Response data:", data);

    if (!res.ok) {
      throw new Error(data.error ?? 'Error al iniciar sesión');
    }

    saveTokens(data.accessToken, data.refreshToken);

    // ✅ CORRECCIÓN: usar data.user.providers
    const decoded = decodeJWT(data.accessToken);
    if (!decoded) throw new Error('Token inválido recibido del backend');

    const appUser: AppUser = {
      ...decoded,
      providers: data.user?.providers ?? [],
    };

    console.log('🔍 [AUTH] login → providers:', appUser.providers);
    setUser(appUser);
  };

  
  
  
  const register = async (
  email: string,
  password: string,
  name: string,
  apellido?: string
): Promise<void> => {
  console.log("🔥 [AUTH] REGISTER ATTEMPT");

  // 1. VALIDACIÓN FRONTEND (IMPORTANTE)
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

  if (!strongPasswordRegex.test(password)) {
    throw new Error(
      "La contraseña debe tener mayúscula, minúscula, número y símbolo (@$!%*?&)"
    );
  }

  if (!name?.trim()) {
    throw new Error("El nombre es obligatorio");
  }

  // 2. REQUEST AL BACKEND
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      nombre: name.trim(),   // 🔥 CRÍTICO
      apellido
    })
  });

  const data = await res.json();

  console.log("🔥 [AUTH] RESPONSE:", data);

  if (!res.ok) {
    throw new Error(data.error ?? "Error al registrar");
  }

  saveTokens(data.accessToken, data.refreshToken);

  const decoded = decodeJWT(data.accessToken);
  if (!decoded) throw new Error("Token inválido");

  setUser({
    ...decoded,
    providers: data.user?.providers ?? []
  });
};


  // ─────────────────────────────────────────────
  // OAUTH
  // ─────────────────────────────────────────────

  const loginWithGoogle = async (): Promise<void> => {
    const googleProvider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = await syncFirebaseUserWithBackend(result.user);
      setUser(appUser);
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          throw new Error(
            `Este correo (${email}) ya está registrado con "${methods[0]}". ` +
            `Inicia sesión con ese método y luego vincula Google.`
          );
        }
      }
      throw new Error(error.message ?? 'Error al iniciar sesión con Google');
    }
  };

  const loginWithGithub = async (): Promise<void> => {
    const githubProvider = new GithubAuthProvider();

    try {
      const result = await signInWithPopup(auth, githubProvider);
      const appUser = await syncFirebaseUserWithBackend(result.user);
      setUser(appUser);
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;

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
            throw new Error(
              'Este correo ya tiene contraseña. Inicia sesión con email y luego vincula GitHub desde tu perfil.'
            );
          }
        }
      }

      throw new Error(error.message ?? 'Error al iniciar sesión con GitHub');
    }
  };

  // ─────────────────────────────────────────────
  // VINCULACIÓN DE PROVIDERS
  // ─────────────────────────────────────────────

  const linkGithubToCurrentUser = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('No hay usuario de Firebase autenticado');

    const githubProvider = new GithubAuthProvider();
    const result = await linkWithPopup(auth.currentUser, githubProvider);
    const appUser = await syncFirebaseUserWithBackend(result.user);
    setUser(appUser);
  };

  const linkGoogleToCurrentUser = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('No hay usuario de Firebase autenticado');

    const googleProvider = new GoogleAuthProvider();
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    const appUser = await syncFirebaseUserWithBackend(result.user);
    setUser(appUser);
  };

  const getLinkedProviders = (): string[] => {
    return user?.providers ?? [];
  };

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────
  
  const resetPassword = async (email: string): Promise<void> => {
    console.log("🔥 [AUTH] forgot-password payload:", { email });
    console.log("🔥 [AUTH] URL:", `${API}/auth/forgot-password`);
    
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    console.log("🔥 [AUTH] Response status:", res.status);
    console.log("🔥 [AUTH] Response data:", data);

    if (!res.ok) {
      throw new Error(data.error || 'No se pudo enviar el correo');
    }
  };

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Notificar al backend para revocar el refresh token
    if (refreshToken) {
      try {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Si falla, igual limpiamos localmente
      }
    }

    clearTokens();

    if (auth.currentUser) {
      await signOut(auth);
    }

    setUser(null);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
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
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};