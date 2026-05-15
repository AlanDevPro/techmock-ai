// app/(protected)/dashboard/page.tsx
'use client'

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Redirige según el rol que viene de tu BD (usuarios.rol)
    const rutas: Record<string, string> = {
      admin:     '/dashboard/admin',
      developer: '/dashboard/developer',
    };

    const destino = rutas[user.rol ?? ''];
    if (destino) {
      router.replace(destino);
    } else {
      // Rol desconocido → auth
      router.push('/auth');
    }
  }, [user, router]);

  // Pantalla de carga mientras redirige
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00] mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Cargando tu dashboard...</p>
      </div>
    </div>
  );
}