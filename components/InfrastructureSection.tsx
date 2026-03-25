'use client'

import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="text-center p-6 border border-gray-800 rounded-lg hover:border-[#00ff00] transition-colors duration-200">
      <div className="w-16 h-16 bg-[#00ff00] rounded-full mx-auto mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-[#00ff00]">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export const InfrastructureSection: React.FC = () => {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
        </svg>
      ),
      title: "Ejecución Sin Latencia",
      description: "Procesamiento instantáneo con tiempos de respuesta menores a 10ms para análisis críticos."
    },
    {
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
        </svg>
      ),
      title: "Telemetría en Tiempo Real",
      description: "Monitoreo continuo con métricas avanzadas y alertas inteligentes para tu arquitectura."
    },
    {
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      ),
      title: "Revisión IA de Código",
      description: "Análisis automatizado con IA para detectar patrones, vulnerabilidades y mejoras."
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">Infraestructura de Próxima Generación</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Plataforma construida para la velocidad, escalabilidad y confiabilidad que exigen los equipos modernos.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
};