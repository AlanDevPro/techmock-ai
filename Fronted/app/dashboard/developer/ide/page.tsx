'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useEffect, useState } from 'react';

interface MedidorDificultad {
  nivel: 'Junior Bajo' | 'Junior Medio' | 'Junior Alto';
  puntaje: number;
  tendencia: 'sube' | 'mantiene' | 'baja';
  habilidad_estimada: 'Junior Bajo' | 'Junior Medio' | 'Junior Alto';
  justificacion: string;
}

interface DificultadPreview {
  session_id: string;
  medidor_dificultad: MedidorDificultad;
}

export default function IDEPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [previews, setPreviews] = useState<Record<'vuejs' | 'nextjs', DificultadPreview | null>>({
    vuejs: null,
    nextjs: null,
  });
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!user && !isLoggingOut) {
      router.push('/auth');
      return;
    }
  }, [user, isLoggingOut, router]);

  useEffect(() => {
    if (!user) return;

    const loadPreview = async (framework: 'vuejs' | 'nextjs') => {
      setIsLoadingPreview(true);

      const storageKey = `rag_session_id_${framework}`;
      const storedSession = localStorage.getItem(storageKey);
      const queryBase = `framework=${encodeURIComponent(framework)}`;
      const query = storedSession
        ? `?${queryBase}&session_id=${encodeURIComponent(storedSession)}`
        : `?${queryBase}`;

      try {
        const response = await fetch(`http://127.0.0.1:8000/api/preview-dificultad${query}`);
        if (!response.ok) throw new Error('No se pudo obtener la dificultad');
        const data = (await response.json()) as DificultadPreview;
        if (data.session_id) {
          localStorage.setItem(storageKey, data.session_id);
        }
        setPreviews((prev) => ({ ...prev, [framework]: data }));
      } catch (error) {
        console.error('Error al cargar dificultad:', error);
        setPreviews((prev) => ({ ...prev, [framework]: null }));
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview('vuejs');
    loadPreview('nextjs');
  }, [user]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleOpenIDE = (framework: 'vuejs' | 'nextjs') => {
    const sessionId =
      previews[framework]?.session_id || localStorage.getItem(`rag_session_id_${framework}`);
    const sessionQuery = sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : '';
    window.open(`http://localhost:3001?framework=${framework}${sessionQuery}`, '_blank');
  };

  const handleStart = (framework: 'vuejs' | 'nextjs') => {
    handleOpenIDE(framework);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-[#00ff00]">DEV_STREAM</h1>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Prueba de Código</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {user.displayName || user.email}
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Contenedor Principal */}
      <div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <div className="max-w-4xl w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs uppercase tracking-widest text-gray-400 mb-4">
            Modo Prueba Activo
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Elige tu entorno de prueba
          </h2>
          <p className="text-gray-400 text-base md:text-lg">
            Inicia el editor en una nueva ventana y resuelve los retos con el stack que prefieras.
            Tu avance se guarda automaticamente y puedes volver cuando quieras.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleStart('vuejs')}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105"
            >
              ▶ Prueba con Vue.js
            </button>
            <button
              onClick={() => handleStart('nextjs')}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105"
            >
              ▶ Prueba con Next.js
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Duracion estimada</p>
              <p className="text-lg text-white font-semibold">30 a 45 min</p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Formato</p>
              <p className="text-lg text-white font-semibold">Editor en vivo</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Nivel sugerido Vue.js</p>
              <p className="text-lg text-white font-semibold">
                {isLoadingPreview && 'Cargando...'}
                {!isLoadingPreview && previews.vuejs && (
                  `${previews.vuejs.medidor_dificultad.nivel} · ${previews.vuejs.medidor_dificultad.puntaje}/6`
                )}
                {!isLoadingPreview && !previews.vuejs && 'Junior Bajo · 2/6'}
              </p>
              {previews.vuejs && (
                <p className="text-xs text-gray-500 mt-1">
                  Tendencia: {previews.vuejs.medidor_dificultad.tendencia}
                </p>
              )}
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Nivel sugerido Next.js</p>
              <p className="text-lg text-white font-semibold">
                {isLoadingPreview && 'Cargando...'}
                {!isLoadingPreview && previews.nextjs && (
                  `${previews.nextjs.medidor_dificultad.nivel} · ${previews.nextjs.medidor_dificultad.puntaje}/6`
                )}
                {!isLoadingPreview && !previews.nextjs && 'Junior Bajo · 2/6'}
              </p>
              {previews.nextjs && (
                <p className="text-xs text-gray-500 mt-1">
                  Tendencia: {previews.nextjs.medidor_dificultad.tendencia}
                </p>
              )}
            </div>
          </div>
          <p className="text-gray-500 mt-5 text-sm">
            Se abrira el editor de codigo en una nueva ventana
          </p>
        </div>
      </div>
    </div>
  );
}
