'use client'

import React from 'react';
import { useNavigation } from '../hooks';
import {
  HeroSection,
  InfrastructureSection,
  ProblemsSection,
  AnalysisSection,
  CTASection,
  Footer
} from '../components';

export default function Home() {
  const { navigateToAuth, navigateToDashboard } = useNavigation();

  return (
    <div className="min-h-screen bg-black text-white font-sans">

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