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

  const handleOpenIDE = async (framework: 'vuejs' | 'nextjs') => {
    const setLoading = framework === 'vuejs' ? setIsLoadingVue : setIsLoadingNext;
    setLoading(true);

    // ✅ Abrir ventana inmediatamente (User Gesture Requirement)
    const ideWindow = window.open('', '_blank');

    if (!ideWindow) {
      console.error('❌ El navegador bloqueó el popup');
      alert(
        'Tu navegador bloqueó la ventana emergente.\n\nHabilita los popups para este sitio y vuelve a intentarlo.'
      );
      setLoading(false);
      return;
    }

    // Mostrar carga mínima mientras se crea la sesión
    ideWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cargando IDE...</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: #0f172a;
              color: #94a3b8;
              font-family: 'JetBrains Mono', monospace, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              gap: 20px;
            }
            .spinner {
              width: 40px; height: 40px;
              border: 3px solid #1e293b;
              border-top-color: #22c55e;
              border-radius: 50%;
              animation: spin 0.7s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            p { font-size: 13px; letter-spacing: 0.08em; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p>Iniciando entorno...</p>
        </body>
      </html>
    `);

    try {
      const accessToken = localStorage.getItem('accessToken');

      if (!accessToken) {
        throw new Error('No hay accessToken en localStorage');
      }

      if (!user?.id) {
        throw new Error('No existe user.id en el contexto de autenticación');
      }

      const apiBase =
        process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';

      // ✅ PASO 1: Crear sesión RÁPIDO (< 100ms) - SOLO crear sesión, sin generar pregunta
      const sesionResponse = await fetch(
        `${apiBase}/preguntas/iniciar-sesion/${framework}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!sesionResponse.ok) {
        const errorText = await sesionResponse.text();
        console.error('❌ Error creando sesión:', sesionResponse.status, errorText);
        throw new Error(`Error creando sesión: ${sesionResponse.status}`);
      }

      const data = await sesionResponse.json();
      const sesionId = data.sesion_id;

      console.log('✅ Sesión creada rápidamente:', sesionId);

      // Guardar en sessionStorage por si acaso
      if (sesionId) {
        sessionStorage.setItem('sesion_id', sesionId);
      }

      // ✅ PASO 2: Redirigir al IDE INMEDIATAMENTE con el sesion_id
      const ideBase = process.env.NEXT_PUBLIC_IDE_URL || 'http://localhost:3001';

      const params = new URLSearchParams({
        framework,
        usuario_id: user.id,
        token: accessToken,
        sesion_id: sesionId,
        mode: 'interview',
      });

      const finalUrl = `${ideBase}?${params.toString()}`;

      console.log('🟢 Redirigiendo al IDE:', finalUrl);
      ideWindow.location.href = finalUrl;
    } catch (error) {
      console.error('❌ Error al abrir IDE:', error);

      // ✅ Fallback: modo libre si algo falla
      const fallbackParams = new URLSearchParams({
        framework,
        usuario_id: user?.id || '',
        token: localStorage.getItem('accessToken') || '',
        mode: 'free',
      });

      const ideBase = process.env.NEXT_PUBLIC_IDE_URL || 'http://localhost:3001';
      const fallbackUrl = `${ideBase}?${fallbackParams.toString()}`;

      console.warn('⚠️ Redirigiendo a modo libre (fallback):', fallbackUrl);
      ideWindow.location.href = fallbackUrl;
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
            Tu avance se guarda automáticamente y puedes volver cuando quieras.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleOpenIDE('vuejs')}
              disabled={isLoadingVue || isLoadingNext}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoadingVue ? '⏳ Iniciando...' : '▶ Prueba con Vue.js'}
            </button>
            <button
              onClick={() => handleOpenIDE('nextjs')}
              disabled={isLoadingVue || isLoadingNext}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoadingNext ? '⏳ Iniciando...' : '▶ Prueba con Next.js'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500">Duración estimada</p>
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
            Se abrirá el editor de código en una nueva ventana
          </p>
        </div>
      </div>
    </div>
  );
}