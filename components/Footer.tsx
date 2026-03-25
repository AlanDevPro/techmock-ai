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
      title: "Producto",
      links: [
        { href: "#", label: "Características" },
        { href: "#", label: "Precios" },
        { href: "#", label: "API" }
      ]
    },
    {
      title: "Empresa",
      links: [
        { href: "#", label: "Acerca de" },
        { href: "#", label: "Blog" },
        { href: "#", label: "Carreras" }
      ]
    },
    {
      title: "Soporte",
      links: [
        { href: "#", label: "Documentación" },
        { href: "#", label: "Contacto" },
        { href: "#", label: "Estado" }
      ]
    }
  ];

  return (
    <footer className="bg-black border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-[#00ff00] text-xl font-bold mb-4">DEV_STREAM</h3>
            <p className="text-gray-400">
              Plataforma de análisis arquitectónico para equipos de desarrollo modernos.
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
              © 2026 DEV_STREAM. Todos los derechos reservados.
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