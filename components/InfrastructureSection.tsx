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
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
        </svg>
      ),
      title: "7 Días, 7 Simulaciones",
      description: "Practica un problema técnico cada día. Desde Arrays y Strings hasta Árboles y Grafos. Incrementa dificultad: Junior → Mid → Senior."
    },
    {
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      ),
      title: "Retroalimentación Instantánea",
      description: "Después de cada entrevista recibe un análisis completo: ¿Es eficiente tu solución? ¿Qué complejidad tiene? ¿Cómo mejorar?"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
        </svg>
      ),
      title: "Sin Estrés, Sin Horarios",
      description: "Practica a las 3 AM si quieres. El IA nunca se cansa, nunca juzga, solo evalúa con mentalidad de Tech Lead."
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">Diseñado para Junior como Tú</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Lo que necesitas para ganar confianza y pasar tu primera entrevista técnica.
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