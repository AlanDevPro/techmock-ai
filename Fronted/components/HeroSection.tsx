'use client'

import React from 'react';
import { RotatingCube } from './RotatingCube';

interface HeroSectionProps {
  onLoginClick: () => void;
  onArchitectureClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onLoginClick,
  onArchitectureClick
}) => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            ¿Nervioso por tu primera{" "}
            <span className="text-[#00ff00]">entrevista técnica?</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Practica con un entrevistador IA disponible 24/7. Resuelve problemas de programación,
            recibe retroalimentación instantánea y gana confianza antes de enfrentarte a empresas
            como Google, Meta o Globant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onLoginClick}
              className="bg-[#00ff00] text-black px-8 py-3 rounded-lg font-semibold hover:bg-[#00cc00] transition-colors duration-200"
            >
              Simula tu Entrevista Gratis
            </button>
            <button
              onClick={onArchitectureClick}
              className="border border-[#00ff00] text-[#00ff00] px-8 py-3 rounded-lg font-semibold hover:bg-[#00ff00] hover:text-black transition-colors duration-200"
            >
              ¿Cómo Funciona?
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <RotatingCube />
        </div>
      </div>
    </main>
  );
};