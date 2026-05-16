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
  console.log('🏠 [LAYOUT] useEffect → loading:', loading, '| user:', user?.email ?? null);
  if (loading) return;
  if (!user) {
    console.warn('🏠 [LAYOUT] Sin usuario → redirigiendo a /auth');
    router.push('/auth');
  }
}, [user, loading, router]);

// Y en el render:
console.log('🏠 [LAYOUT] render → loading:', loading, '| user:', user?.email ?? null);

  // ⛔ mientras carga NO renderizar nada protegido
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00ff00]" />
      </div>
    );
  }

  // ⛔ si terminó loading y no hay user
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}