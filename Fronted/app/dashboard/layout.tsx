// app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log(
      '🏠 [DASHBOARD LAYOUT] useEffect → loading:',
      loading,
      '| user:',
      user?.email ?? null,
      '| role:',
      userRole
    );

    // ⛔ esperar a que termine loading
    if (loading) return;

    // ⛔ evitar redirecciones múltiples
    if (isRedirecting) return;

    // ⛔ no autenticado
    if (!user) {
      console.warn('🏠 [DASHBOARD LAYOUT] Sin usuario → redirigiendo a /auth');
      setIsRedirecting(true);
      router.replace('/auth');
      return;
    }

    // ✅ Usuario autenticado - verificar si está en la ruta correcta según su rol
    const isInAdminRoute = pathname?.startsWith('/dashboard/admin');
    const isInDeveloperRoute = pathname?.startsWith('/dashboard/developer');

    // Si el usuario es admin y está en ruta de developer → redirigir a admin
    if (userRole === 'admin' && isInDeveloperRoute) {
      console.warn('🏠 [DASHBOARD LAYOUT] Admin en ruta developer → redirigiendo a /dashboard/admin');
      setIsRedirecting(true);
      router.replace('/dashboard/admin');
      return;
    }

    // Si el usuario es developer y está en ruta de admin → redirigir a developer
    if (userRole === 'developer' && isInAdminRoute) {
      console.warn('🏠 [DASHBOARD LAYOUT] Developer en ruta admin → redirigiendo a /dashboard/developer');
      setIsRedirecting(true);
      router.replace('/dashboard/developer');
      return;
    }

    // Si el usuario está en la raíz de /dashboard sin subruta → redirigir según su rol
    if (pathname === '/dashboard') {
      const redirectPath = userRole === 'admin' ? '/dashboard/admin' : '/dashboard/developer';
      console.log(`🏠 [DASHBOARD LAYOUT] Redirigiendo a ${redirectPath} según rol ${userRole}`);
      setIsRedirecting(true);
      router.replace(redirectPath);
      return;
    }

  }, [loading, user, userRole, router, pathname, isRedirecting]);

  console.log(
    '🏠 [DASHBOARD LAYOUT] render → loading:',
    loading,
    '| user:',
    user?.email ?? null,
    '| role:',
    userRole
  );

  // ⛔ spinner mientras carga auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00]" />
      </div>
    );
  }

  // ⛔ evitar render del dashboard sin auth
  if (!user) {
    return null;
  }

  // ✅ usuario autenticado - renderizar el layout específico según la ruta
  // Los layouts hijos (admin y developer) se encargarán de su propio contenido
  return <>{children}</>;
}