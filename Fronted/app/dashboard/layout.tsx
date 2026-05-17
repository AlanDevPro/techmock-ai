'use client'

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(
      '🏠 [LAYOUT] useEffect → loading:',
      loading,
      '| user:',
      user?.email ?? null
    );

    // ⛔ esperar a que termine loading
    if (loading) return;

    // ⛔ no autenticado
    if (!user) {
      console.warn(
        '🏠 [LAYOUT] Sin usuario → redirigiendo a /auth'
      );

      router.replace('/auth');
    }

  }, [loading, user, router]);

  console.log(
    '🏠 [LAYOUT] render → loading:',
    loading,
    '| user:',
    user?.email ?? null
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

  // ✅ usuario autenticado
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}