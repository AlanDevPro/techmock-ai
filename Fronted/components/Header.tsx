'use client'

import React from 'react';
import { useMenu } from '../hooks';
import { useRouter } from "next/navigation";

export const Header: React.FC = () => {
  const { isMenuOpen, toggleMenu } = useMenu();
  const router = useRouter();

  const handleNavigation = (route: string) => {
    router.push(route);
  };

  return (
    <header className="bg-black/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <h1
            className="text-2xl font-bold text-[#00ff00] cursor-pointer"
            onClick={() => handleNavigation('/')}
          >
            TechMock AI
          </h1>

          {/* Desktop */}
          <nav className="hidden md:block">
            <div className="flex space-x-8">

              <button onClick={() => handleNavigation('/dashboard')} className="text-white hover:text-[#00ff00]">
                Panel
              </button>

              <button onClick={() => handleNavigation('/tasks')} className="text-white hover:text-[#00ff00]">
                Tareas
              </button>

              <button onClick={() => handleNavigation('/analysis')} className="text-white hover:text-[#00ff00]">
                Análisis
              </button>

              <button onClick={() => handleNavigation('/docs')} className="text-white hover:text-[#00ff00]">
                Documentación
              </button>

            </div>
          </nav>

          {/* Mobile */}
          <button onClick={toggleMenu} className="md:hidden text-white">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};