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
          <span className="text-[#00ff00] text-sm font-mono">reporte_entrevista.log</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="font-mono text-sm space-y-2">
          <div className="text-[#00ff00]">✓ Entrevista completada</div>
          <div className="text-gray-400">  → Tiempo total: 32:15</div>
          <div className="text-[#00ff00]">✓ Solución correcta - O(n log n)</div>
          <div className="text-yellow-400">⚠ Mejora: Considera manejo de edge cases</div>
          <div className="text-blue-400">→ Puntuación: 8.5/10</div>
        </div>
      </div>
    </div>
  );
};

export const AnalysisSection: React.FC = () => {
  const features = [
    "Complejidad de Tiempo y Espacio (Big O) explicada paso a paso",
    "Patrones de diseño que aplicaste (¿bien o mal?)",
    "Bugs encontrados y cómo habrías fallado en la entrevista real"
  ];

  return (
    <section className="bg-gray-900/50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              No es solo Pasar o Fallar.{" "}
              <span className="text-[#00ff00]">Es Aprender</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Cada simulación genera un reporte detallado. Sabrás exactamente qué hiciste bien,
              dónde fallaste y por qué. Es como tener un Senior mentor revisando tu código en tiempo real.
            </p>
            <ul className="space-y-4 text-gray-300">
              {features.map((feature, index) => (
                <FeatureListItem key={index} text={feature} />
              ))}
            </ul>
            <p className="text-gray-400 mt-8 text-sm italic">
              💡 Tip: Haz simulaciones 2-3 veces por semana. Después de 4 semanas, estarás listo.
            </p>
          </div>

          <TerminalPreview />
        </div>
      </div>
    </section>
  );
};