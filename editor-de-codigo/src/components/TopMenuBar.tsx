"use client";

import { Sun, Moon, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "./IDE";

interface TopMenuBarProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  selectedFramework: "vuejs" | "nextjs" | null;
}

export default function TopMenuBar({ theme, toggleTheme, selectedFramework }: TopMenuBarProps) {
  const breadcrumbs = [
    "Prepare",
    selectedFramework === "vuejs" ? "Vue.js" : selectedFramework === "nextjs" ? "Next.js" : "React",
    "Components",
    "Item List Manager",
  ];

  return (
    <div
      className="flex items-center justify-between px-4 shrink-0 select-none border-b"
      style={{
        height: "36px",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Left: Logo + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Logo placeholder */}
        <div
          className="flex items-center gap-1.5 pr-3 border-r"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: "var(--accent)" }}
          >
            HR
          </div>
          <span
            className="text-[13px] font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            HackerRank
          </span>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-40">›</span>}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "font-semibold"
                    : "opacity-60 cursor-pointer hover:opacity-100 transition-opacity"
                }
                style={{ color: i === breadcrumbs.length - 1 ? "var(--text-primary)" : undefined }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Theme toggle + Exit fullscreen */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] transition-all hover:opacity-80 border"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] transition-all hover:opacity-80 border"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
          title="Salir de pantalla completa"
        >
          <Minimize2 size={13} />
          <span className="hidden sm:inline">Exit Full Screen</span>
        </button>
      </div>
    </div>
  );
}