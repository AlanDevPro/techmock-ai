'use client'

import React from 'react';

interface CTASectionProps {
  onStartClick: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onStartClick }) => {
  return (
    <section className="bg-gradient-to-r from-[#00ff00]/10 to-[#00ff00]/5 py-20 border-t border-b border-gray-800">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-6">
          ¿Listo para Tu Primera Entrevista?
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Miles de junior egresados ya practicaron en TechMock AI y consiguieron trabajo
          en empresas como Globant, Grupo Sura, Alkemy y más.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div>
            <div className="text-3xl font-bold text-[#00ff00]">2,500+</div>
            <p className="text-gray-400">Simulaciones Completadas</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#00ff00]">800+</div>
            <p className="text-gray-400">Junior Preparados</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#00ff00]">92%</div>
            <p className="text-gray-400">Tasa de Aprobación</p>
          </div>
        </div>

        <button
          onClick={onStartClick}
          className="bg-[#00ff00] text-black px-10 py-4 rounded-lg font-bold text-lg hover:bg-[#00cc00] transition-colors duration-200 inline-block"
        >
          Comienza tu Simulación Ahora (Gratis)
        </button>

        <p className="text-gray-400 text-sm mt-4">
          Sin tarjeta de crédito. Acceso inmediato.
        </p>
      </div>
    </section>
  );
};
