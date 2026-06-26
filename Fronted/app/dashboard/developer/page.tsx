// app/dashboard/developer/page.tsx
'use client';

import { useThemeContext } from '../../../components/providers/ThemeProvider';
import DevelopmentTracks from '../../../components/dashboard/developer/DevelopmentTracks';

export default function DeveloperDashboard() {
  const { themeClasses } = useThemeContext();

  return (
    <>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${themeClasses.textPrimary} mb-2`}>
          AI-powered Mock Interviews
          <span className="ml-3 text-xs font-semibold bg-[#00ff00] text-black px-2 py-0.5 rounded-full align-middle">
            New
          </span>
        </h1>
        <p className={`${themeClasses.textMuted} text-sm max-w-xl`}>
          Acelera tu crecimiento con tracks diseñados por expertos de la industria.
          Domina tecnologías modernas con proyectos reales.
        </p>
      </div>

      <DevelopmentTracks />
    </>
  );
}