'use client'

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {

  // ✅ ahora también usamos loading
  const { user, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {

    // ✅ esperar restauración del token
    if (loading) return;

    // ✅ recién aquí validar auth
    if (!user) {
      router.push('/auth');
      return;
    }

    // ✅ Redirección por rol
    const rutas: Record<string, string> = {
      admin: '/dashboard/admin',
      developer: '/dashboard/developer',
    };

    const destino = rutas[user.rol ?? ''];

    if (destino) {
      router.replace(destino);
    } else {
      // ✅ rol inválido
      router.push('/auth');
    }

  }, [user, loading, router]);

  // ✅ mientras loading = true
  // NO redirigir todavía
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00]" />
      </div>
    );
  }

  // ✅ si terminó loading y no hay user
  if (!user) {
    return null;
  }

  // ✅ pantalla temporal mientras router.replace navega
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00] mx-auto mb-4" />
        <p className="text-gray-400 text-sm">
          Cargando tu dashboard...
        </p>
      </div>
    </div>
  );
}