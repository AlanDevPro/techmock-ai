"use client";

import { Sun, Moon, Minimize2 } from "lucide-react";

interface TopMenuBarProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  selectedFramework: "vuejs" | "nextjs" | null;
  activeFile: string;
  timerLabel?: string;
  timerState?: "running" | "ended" | "idle";
}

export default function TopMenuBar({
  theme,
  toggleTheme,
  selectedFramework,
  activeFile,
  timerLabel,
  timerState = "idle",
}: TopMenuBarProps) {
  const showTimer = Boolean(selectedFramework);
  const displayLabel = timerLabel ?? "--:--";
  // Función para generar las migas de pan basadas en el archivo activo
  const generateBreadcrumbs = (filePath: string) => {
    console.log("🔍 generateBreadcrumbs - filePath recibido:", filePath);
    
    if (!filePath || filePath === "") {
      console.log("⚠️ filePath vacío");
      return ["No hay archivo abierto"];
    }

    // Limpiar la ruta para obtener solo la parte relativa
    let cleanPath = filePath;
    
    // Remover el prefijo del framework si existe para mostrar la ruta real
    if (selectedFramework === "vuejs") {
      if (cleanPath.startsWith("/practica-vue/")) {
        cleanPath = cleanPath.replace("/practica-vue/", "");
      } else if (cleanPath.startsWith("/practica-vue")) {
        cleanPath = cleanPath.replace("/practica-vue", "");
      }
    } else if (selectedFramework === "nextjs") {
      if (cleanPath.startsWith("/practica-nextjs/")) {
        cleanPath = cleanPath.replace("/practica-nextjs/", "");
      } else if (cleanPath.startsWith("/practica-nextjs")) {
        cleanPath = cleanPath.replace("/practica-nextjs", "");
      }
    }

    // Si cleanPath empieza con /, lo removemos
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    console.log("🧹 cleanPath después de limpiar:", cleanPath);

    // Dividir la ruta en partes reales
    const parts = cleanPath.split("/").filter(part => part !== "");
    console.log("📂 parts (rutas reales):", parts);
    
    if (parts.length === 0) {
      return ["Raíz"];
    }

    // Formatear cada parte de la ruta (capitalizar y limpiar)
    const formattedParts = parts.map(part => {
      // Remover extensión si es la última parte (archivo)
      let formatted = part;
      if (part === parts[parts.length - 1]) {
        formatted = part.replace(/\.[^/.]+$/, ""); // Remover extensión
      }
      // Reemplazar guiones y guiones bajos con espacios
      formatted = formatted.replace(/-/g, " ").replace(/_/g, " ");
      // Capitalizar cada palabra
      formatted = formatted
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return formatted;
    });

    console.log("✅ Breadcrumbs generados (ruta real):", formattedParts);
    return formattedParts;
  };

  const breadcrumbs = generateBreadcrumbs(activeFile);

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
        {/* Logo */}
        <div
          className="flex items-center gap-1.5 pr-3 border-r"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: "var(--accent)" }}
          >
            TA
          </div>
          <span
            className="text-[13px] font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            TechMock AI
          </span>
        </div>

        {/* Breadcrumb - Ahora muestra la ruta REAL del directorio */}
        <nav className="flex items-center gap-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-40">›</span>}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "font-semibold"
                    : "opacity-60"
                }
                style={{ 
                  color: i === breadcrumbs.length - 1 ? "var(--text-primary)" : undefined,
                  cursor: "default"
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Timer */}
      <div className="flex-1 flex items-center justify-center">
        {showTimer && (
          <div
            className="px-2.5 py-1 rounded text-[12px] border"
            style={{
              background: timerState === "ended" ? "#7f1d1d" : "var(--bg-tertiary)",
              color: timerState === "ended" ? "#fecaca" : "var(--text-primary)",
              borderColor: timerState === "ended" ? "#991b1b" : "var(--border)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            title="Tiempo restante"
          >
            ⏱ {displayLabel}
          </div>
        )}
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