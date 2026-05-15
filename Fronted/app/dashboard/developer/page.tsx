// app/(protected)/dashboard/user/page.tsx
'use client'

import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '../../../components/dashboard/shared/DashboardNavbar';
import LinkAccountsPanel from '../../../components/dashboard/shared/LinkAccountsPanel';
import DevelopmentTracks from '../../../components/dashboard/developer/DevelopmentTracks';
import RecentInsights from '../../../components/dashboard/developer/RecentInsights';
import GlobalRanking from '../../../components/dashboard/developer/GlobalRanking';
import { useState } from 'react';

const navItems = ['Dashboard', 'Tasks', 'Insights', 'Docs'];

export default function UserDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'Usuario';
  const displayEmail = user.email || '';

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardNavbar
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showStartButton
      />

      <div className="flex">
        {/* Contenido principal */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Mission Control</h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Acelera tu crecimiento con tracks diseñados por expertos de la industria.
              Domina tecnologías modernas con proyectos reales.
            </p>
          </div>

          <DevelopmentTracks />
        </div>

        {/* Sidebar derecho */}
        <div className="w-80 bg-gray-900/50 p-6 border-l border-gray-800 space-y-6">

          {/* Tarjeta de perfil */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{displayName}</h3>
                {displayEmail && (
                  <p className="text-gray-400 text-xs truncate max-w-[160px]">{displayEmail}</p>
                )}
              </div>
            </div>

            {/* Estadísticas — en el futuro conectar a estadisticas_usuario */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Entrevistas completadas</span>
                <span className="text-[#00ff00] font-semibold">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Puntaje promedio</span>
                <span className="text-[#00ff00] font-semibold">78.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Racha actual</span>
                <span className="text-[#00ff00] font-semibold">12 días</span>
              </div>
            </div>

            <button
              onClick={() => router.push('developer/ide')}
              className="w-full bg-[#00ff00] hover:bg-[#00dd00] text-black px-4 py-2 rounded text-sm font-bold transition-colors mb-2"
            >
              Iniciar entrevista
            </button>
            <button
              onClick={() => router.push('/dashboard/developer/profile')}
              className="w-full text-center text-xs text-[#00ff00] hover:text-green-400 transition-colors underline underline-offset-2"
            >
              Ver y editar perfil →
            </button>
          </div>

          <LinkAccountsPanel />
          <RecentInsights />
          <GlobalRanking />
        </div>
      </div>
    </div>
  );
}