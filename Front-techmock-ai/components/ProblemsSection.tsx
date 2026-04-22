'use client'

import React from 'react';

interface ProblemCardProps {
  number: string;
  problem: string;
  solution: string;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ number, problem, solution }) => {
  return (
    <div className="p-6 border border-gray-800 rounded-lg hover:border-[#00ff00] transition-colors duration-200">
      <div className="text-[#00ff00] text-3xl font-bold mb-3">{number}</div>
      <h3 className="text-xl font-bold mb-2 text-white">{problem}</h3>
      <p className="text-gray-400">{solution}</p>
    </div>
  );
};

export const ProblemsSection: React.FC = () => {
  const problems = [
    {
      number: "❌",
      problem: "Nerviosismo en la Entrevista Real",
      solution: "Practica simulaciones en TechMock AI para familiarizarte con la presión. Cuando hagas la entrevista real, ya habrás estado en esa situación 10 veces."
    },
    {
      number: "❌",
      problem: "No Sabes si tu Solución es Eficiente",
      solution: "Nuestro IA analiza Big O, identifica bottlenecks y te explica cómo optimizar tu código antes de enfrentarte a un entrevistador real."
    },
    {
      number: "❌",
      problem: "Coordinar con Mentores es Difícil",
      solution: "El IA está disponible 24/7. Simula justo después de estudiar algoritmos o un domingo a las 2 AM. Sin límites."
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">El Problema de Ser Junior</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Y cómo TechMock AI te ayuda a resolverlo
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {problems.map((item, index) => (
          <ProblemCard
            key={index}
            number={item.number}
            problem={item.problem}
            solution={item.solution}
          />
        ))}
      </div>
    </section>
  );
};
