'use client'

import React from 'react';

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => {
  return (
    <li>
      <a
        href={href}
        className="hover:text-[#00ff00] transition-colors duration-200"
      >
        {children}
      </a>
    </li>
  );
};

interface FooterSectionProps {
  title: string;
  links: Array<{ href: string; label: string }>;
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, links }) => {
  return (
    <div>
      <h4 className="text-white font-semibold mb-4">{title}</h4>
      <ul className="space-y-2 text-gray-400">
        {links.map((link, index) => (
          <FooterLink key={index} href={link.href}>
            {link.label}
          </FooterLink>
        ))}
      </ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  const footerSections = [
    {
      title: "Aprende",
      links: [
        { href: "#", label: "Guía de Inicio" },
        { href: "#", label: "Algoritmos Básicos" },
        { href: "#", label: "Estructuras de Datos" }
      ]
    },
    {
      title: "Práctica",
      links: [
        { href: "#", label: "Problemas Junior" },
        { href: "#", label: "Entrevistas Simuladas" },
        { href: "#", label: "Reportes" }
      ]
    },
    {
      title: "Comunidad",
      links: [
        { href: "#", label: "Discord Junior" },
        { href: "#", label: "Blog de Tips" },
        { href: "#", label: "Preguntas Frecuentes" }
      ]
    }
  ];

  return (
    <footer className="bg-black border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-[#00ff00] text-xl font-bold mb-4">TechMock AI</h3>
            <p className="text-gray-400">
              La plataforma para que junior egresados dominen entrevistas técnicas y consigan su primer trabajo.
            </p>
          </div>

          {/* Links Sections */}
          {footerSections.map((section, index) => (
            <FooterSection
              key={index}
              title={section.title}
              links={section.links}
            />
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2026 TechMock AI. Hecho para Junior Developers.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-[#00ff00] transition-colors duration-200">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00ff00] transition-colors duration-200">
                Términos
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};