'use client'

import React, { useEffect, useState } from 'react';
import { useNavigation } from '../hooks';
import {
  Header,
  HeroSection,
  InfrastructureSection,
  ProblemsSection,
  AnalysisSection,
  CTASection,
  Footer
} from '../components';
import { AuthCard } from '../components/AuthCard';

export default function Home() {
  const { navigateToAuth, navigateToDashboard, navigateToHome } = useNavigation();
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAuthOverlay(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigation = (route: string) => {
    switch (route) {
      case '/':
        navigateToHome();
        break;
      case '/auth':
        navigateToAuth();
        break;
      case '/dashboard':
      case '/tasks':
      case '/analysis':
        navigateToDashboard();
        break;
      default:
        // Handle other routes or show not found
        console.log(`Navigation to ${route} not implemented`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Header onNavigate={handleNavigation} />

      <HeroSection
        onLoginClick={() => setShowAuthOverlay(true)}
        onArchitectureClick={navigateToDashboard}
      />

      <InfrastructureSection />

      <ProblemsSection />

      <AnalysisSection />

      <CTASection onStartClick={navigateToAuth} />

      <Footer />

      {showAuthOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <button
            className="absolute inset-0 w-full h-full cursor-default"
            onClick={() => setShowAuthOverlay(false)}
            aria-label="Cerrar"
          />
          <div className="relative w-full max-w-md">
            <AuthCard showClose onClose={() => setShowAuthOverlay(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
