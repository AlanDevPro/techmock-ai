'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export const useNavigation = () => {
  const router = useRouter();
  const { user } = useAuth();

  const navigateToAuth = () => {
    router.push('/auth');
  };

  const navigateToDashboard = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  };

  const navigateToHome = () => {
    router.push('/');
  };

  return {
    navigateToAuth,
    navigateToDashboard,
    navigateToHome,
    user,
    isAuthenticated: !!user
  };
};