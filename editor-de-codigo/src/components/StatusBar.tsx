"use client";

import { useTheme } from "./IDE";

export default function StatusBar({ isBooting }: { isBooting: boolean }) {
  const { theme } = useTheme();

  return (
    <div
      className="h-[22px] flex items-center px-4 text-[12px] shrink-0 justify-between select-none font-medium text-white"
      style={{ background: "var(--status-bg)" }}
    >
      <div className="flex items-center gap-4">
        {isBooting ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Iniciando Entorno Web...
          </span>
        ) : (
          <span className="flex items-center gap-2 cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            WebContainer Listo
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          UTF-8
        </span>
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          TypeScript React
        </span>
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </span>
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded transition-colors">
          Next.js Web IDE
        </span>
      </div>
    </div>
  );
}