'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export default function IDEPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleOpenIDE = () => {
    window.open('http://localhost:3001', '_blank');
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

      {/* Contenedor Principal con dos secciones */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Sección de Problemas - Arriba */}
        <div className="bg-gray-950 border-b border-gray-800 overflow-y-auto" style={{height: '35%'}}>
          <div className="p-6 max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Problemas a Resolver</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Espacio para que agregues los problemas */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-[#00ff00] transition-colors">
                <h3 className="text-lg font-semibold text-[#00ff00] mb-2">Problema 1</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Descripción del problema que deberá resolver...
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded">Intermedio</span>
                  <span>~30 min</span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-[#00ff00] transition-colors">
                <h3 className="text-lg font-semibold text-[#00ff00] mb-2">Problema 2</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Descripción del problema que deberá resolver...
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="bg-green-600 text-white px-2 py-1 rounded">Avanzado</span>
                  <span>~45 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección del IDE - Abajo */}
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-gray-900 p-4" style={{height: '65%'}}>
          <button
            onClick={handleOpenIDE}
            className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-8 py-4 rounded-lg text-xl font-bold transition-all shadow-lg hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] transform hover:scale-105"
          >
            ▶ Abrir IDE en Nueva Ventana
          </button>
          <p className="text-gray-400 mt-4 text-center">
            Se abrirá el editor de código en una nueva ventana
          </p>
        </div>
      </div>
    </div>
  );
}
