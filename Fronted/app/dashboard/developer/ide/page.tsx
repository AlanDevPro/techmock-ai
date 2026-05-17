'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useState } from 'react';

export default function IDEPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingVue, setIsLoadingVue] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setIsLoggingOut(false);
    }
  };

  // ✅ MEJORA 1: Genera pregunta → obtiene sesion_id → pasa al IDE
  const handleOpenIDE = async (framework: 'vuejs' | 'nextjs') => {
    const setLoading = framework === 'vuejs' ? setIsLoadingVue : setIsLoadingNext;
    setLoading(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';
      const endpoint = framework === 'vuejs' ? 'vue' : 'next';

      // ✅ MEJORA 2: Llama al backend para generar pregunta y crear sesión
      const response = await fetch(
        `${apiBase}/generar-preguntas/${endpoint}?usuario_id=${user!.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error generando pregunta: ${response.status}`);
      }

      const data = await response.json();

      // ✅ MEJORA 3: Guardar sesion_id localmente (puede servir en la misma pestaña)
      if (data.sesion_id) {
        sessionStorage.setItem('sesion_id', data.sesion_id);
      }

      // ✅ MEJORA 4: Pasar sesion_id + mode=interview al IDE
      const params = new URLSearchParams({
        framework,
        usuario_id: user!.id,
        token: accessToken || '',
        mode: 'interview',
        ...(data.sesion_id ? { sesion_id: data.sesion_id } : {}),
      });

      window.open(`http://localhost:3001?${params.toString()}`, '_blank');
    } catch (error) {
      console.error('Error abriendo IDE:', error);
      // Fallback: abrir IDE sin sesión (modo práctica libre)
      const accessToken = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        framework,
        usuario_id: user!.id,
        token: accessToken || '',
        mode: 'free',
      });
      window.open(`http://localhost:3001?${params.toString()}`, '_blank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-[#00ff00]">DEV_STREAM</h1>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Prueba de Código</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">{user?.email}</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

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
              onClick={() => handleOpenIDE('vuejs')}
              disabled={isLoadingVue || isLoadingNext}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoadingVue ? '⏳ Preparando...' : '▶ Prueba con Vue.js'}
            </button>
            <button
              onClick={() => handleOpenIDE('nextjs')}
              disabled={isLoadingVue || isLoadingNext}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoadingNext ? '⏳ Preparando...' : '▶ Prueba con Next.js'}
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Duracion estimada</p>
              <p className="text-lg text-white font-semibold">30 a 45 min</p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Nivel sugerido</p>
              <p className="text-lg text-white font-semibold">Intermedio / Avanzado</p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Formato</p>
              <p className="text-lg text-white font-semibold">Editor en vivo</p>
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