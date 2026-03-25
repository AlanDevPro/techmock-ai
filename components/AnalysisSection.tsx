'use client'

import React from 'react';

interface FeatureListItemProps {
  text: string;
}

const FeatureListItem: React.FC<FeatureListItemProps> = ({ text }) => {
  return (
    <li className="flex items-center">
      <svg className="w-5 h-5 text-[#00ff00] mr-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
      </svg>
      {text}
    </li>
  );
};

const TerminalPreview: React.FC = () => {
  return (
    <div className="relative">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[#00ff00] text-sm font-mono">análisis_arquitectónico.log</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="font-mono text-sm space-y-2">
          <div className="text-[#00ff00]">✓ Escaneando arquitectura...</div>
          <div className="text-gray-400">  → 847 archivos analizados</div>
          <div className="text-yellow-400">⚠ Acoplamiento alto detectado en /core</div>
          <div className="text-[#00ff00]">✓ Sugerencia: Implementar patrón Repository</div>
          <div className="text-blue-400">ℹ Análisis completado en 0.3s</div>
        </div>
      </div>
    </div>
  );
};

export const AnalysisSection: React.FC = () => {
  const features = [
    "Análisis de dependencias y acoplamiento",
    "Detección de anti-patrones arquitectónicos",
    "Recomendaciones de mejora automatizadas"
  ];

  return (
    <section className="bg-gray-900/50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Más allá de Pruebas Simples.{" "}
              <span className="text-[#00ff00]">Análisis Arquitectónico</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              No solo probamos código, analizamos arquitecturas completas. Identificamos
              cuellos de botella, patrones anti-arquitectónicos y oportunidades de optimización
              antes de que se conviertan en problemas críticos.
            </p>
            <ul className="space-y-4 text-gray-300">
              {features.map((feature, index) => (
                <FeatureListItem key={index} text={feature} />
              ))}
            </ul>
          </div>

          <TerminalPreview />
        </div>
      </div>
    </section>
  );
};