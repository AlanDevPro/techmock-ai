'use client'

import React from 'react';
import { useMenu } from '../hooks';

interface HeaderProps {
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { isMenuOpen, toggleMenu } = useMenu();

  const handleNavigation = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    }
  };

  return (
    <header className="bg-black/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-[#00ff00] cursor-pointer" onClick={() => handleNavigation('/')}>
              TechMock AI
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button
                onClick={() => handleNavigation('/dashboard')}
                className="text-white hover:text-[#00ff00] transition-colors"
              >
                Panel
              </button>
              <button
                onClick={() => handleNavigation('/tasks')}
                className="text-white hover:text-[#00ff00] transition-colors"
              >
                Tareas
              </button>
              <button
                onClick={() => handleNavigation('/analysis')}
                className="text-white hover:text-[#00ff00] transition-colors"
              >
                Análisis
              </button>
              <button
                onClick={() => handleNavigation('/docs')}
                className="text-white hover:text-[#00ff00] transition-colors"
              >
                Documentación
              </button>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-400 hover:text-white p-2"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-900">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="block text-white hover:text-[#00ff00] px-3 py-2 w-full text-left"
            >
              Panel
            </button>
            <button
              onClick={() => handleNavigation('/tasks')}
              className="block text-white hover:text-[#00ff00] px-3 py-2 w-full text-left"
            >
              Tareas
            </button>
            <button
              onClick={() => handleNavigation('/analysis')}
              className="block text-white hover:text-[#00ff00] px-3 py-2 w-full text-left"
            >
              Análisis
            </button>
            <button
              onClick={() => handleNavigation('/docs')}
              className="block text-white hover:text-[#00ff00] px-3 py-2 w-full text-left"
            >
              Documentación
            </button>
          </div>
        </div>
      )}
    </header>
  );
};