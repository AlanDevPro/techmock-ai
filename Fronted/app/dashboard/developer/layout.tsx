// app/dashboard/developer/layout.tsx
'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useThemeContext } from '../../../components/providers/ThemeProvider';
import DeveloperNavbar from '../../../components/dashboard/developer/Navbar';
import ProfilePanel from '../../../components/dashboard/developer/ProfilePanel';

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme, themeClasses } = useThemeContext();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const displayEmail = user?.email || '';

  // Rutas donde NO se debe mostrar el navbar
  const hideNavbarPaths = [
    '/dashboard/developer/profile',
    '/dashboard/developer/settings',
    '/dashboard/developer/ide',
    '/dashboard/developer/interviews/analisis',
  ];

  // Verificar si la ruta actual debe ocultar el navbar
  const shouldHideNavbar = hideNavbarPaths.some(path => pathname?.startsWith(path));

  // Verificar que el usuario tiene permiso para estar aquí
  useEffect(() => {
    if (!loading && userRole && userRole !== 'developer') {
      console.warn('🚫 [DEVELOPER LAYOUT] Usuario no es developer, redirigiendo...');
      router.replace('/dashboard/admin');
    }
  }, [userRole, loading, router]);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    }
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen]);

  // Mostrar loading mientras se verifica el rol
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00]" />
      </div>
    );
  }

  // Si no es developer, no renderizar nada
  if (userRole !== 'developer') {
    return null;
  }

  const handleStartInterview = () => {
    router.push('/dashboard/developer/ide');
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.textPrimary} transition-colors duration-200`}>
      {/* Navbar condicional */}
      {!shouldHideNavbar && (
        <DeveloperNavbar
          isDark={isDark}
          onToggleTheme={toggleTheme}
          displayName={displayName}
          displayEmail={displayEmail}
          onProfileClick={() => setIsPanelOpen(!isPanelOpen)}
          isPanelOpen={isPanelOpen}
        />
      )}

      <div className="relative flex">
        {/* Main content - ajustar padding cuando no hay navbar */}
        <div className={`flex-1 min-w-0 ${!shouldHideNavbar ? 'p-8' : 'p-0'}`}>
          {children}
        </div>

        {/* Profile Panel - SOLUCIÓN: Eliminar la prop no soportada */}
        <div ref={panelRef}>
          <ProfilePanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
            isDark={isDark}
            displayName={displayName}
            displayEmail={displayEmail}
            // ✅ Eliminada la prop onStartInterview que no existe en ProfilePanel
          />
        </div>

        {/* Backdrop overlay */}
        {isPanelOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setIsPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}