// components/dashboard/shared/DashboardNavbar.tsx
'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useState } from 'react';

interface DashboardNavbarProps {
  navItems?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showStartButton?: boolean;
}

export default function DashboardNavbar({
  navItems = [],
  activeTab,
  onTabChange,
  showStartButton = false,
}: DashboardNavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold text-[#00ff00]">TechMock AI</h1>
          {navItems.length > 0 && (
            <div className="flex space-x-6">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => onTabChange?.(item)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === item
                      ? 'text-[#00ff00] border-b-2 border-[#00ff00]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {showStartButton && (
            <button
              onClick={() => router.push('developer/ide')}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-4 py-1.5 rounded text-sm font-bold transition-colors"
            >
              Iniciar prueba
            </button>
          )}

          {/* Botón de perfil */}
          <button
            onClick={() => router.push('/dashboard/developer/profile')}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[#00ff00] px-3 py-1.5 rounded-lg transition-all duration-200 group"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors max-w-[120px] truncate">
              {displayName}
            </span>
            <svg className="w-3 h-3 text-gray-500 group-hover:text-[#00ff00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
  );
}