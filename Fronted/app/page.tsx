'use client'

import React from 'react';
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

export default function Home() {
  const { navigateToAuth, navigateToDashboard, navigateToHome } = useNavigation();

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
        onLoginClick={navigateToAuth}
        onArchitectureClick={navigateToDashboard}
      />

      <InfrastructureSection />

      <ProblemsSection />

      <AnalysisSection />

      <CTASection onStartClick={navigateToAuth} />

      <Footer />
    </div>
  );
}
