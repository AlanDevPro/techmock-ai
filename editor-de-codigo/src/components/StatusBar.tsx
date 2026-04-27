"use client";

import { useTheme } from "./IDE";
import { useState, useEffect } from "react";

interface StatusBarProps {
  isBooting: boolean;
  // Editor state - ahora todos son dinámicos
  line?: number;
  column?: number;
  indentSize?: number;
  encoding?: string;
  lineEnding?: string;
  language?: string;
  branch?: string;
  errors?: number;
  warnings?: number;
  infos?: number;
  activeFile?: string;
  fileSystem?: { [key: string]: string };
}

export default function StatusBar({
  isBooting,
  line = 1,
  column = 1,
  indentSize = 2,
  encoding = "UTF-8",
  lineEnding = "CRLF",
  language: propLanguage,
  branch = "main",
  errors: propErrors = 0,
  warnings: propWarnings = 0,
  infos: propInfos = 0,
  activeFile = "",
  fileSystem = {},
}: StatusBarProps) {
  const { theme } = useTheme();
  
  // Estados dinámicos para errores/warnings detectados en tiempo real
  const [dynamicErrors, setDynamicErrors] = useState(propErrors);
  const [dynamicWarnings, setDynamicWarnings] = useState(propWarnings);
  const [dynamicInfos, setDynamicInfos] = useState(propInfos);
  const [currentTime, setCurrentTime] = useState("");
  
  // Detectar lenguaje real del archivo activo
  const getRealLanguage = (filePath: string): string => {
    if (!filePath) return "Plain Text";
    
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const languageMap: { [key: string]: string } = {
      "ts": "TypeScript",
      "tsx": "TypeScript JSX",
      "js": "JavaScript",
      "jsx": "JavaScript JSX",
      "vue": "Vue.js",
      "css": "CSS",
      "scss": "SCSS",
      "html": "HTML",
      "json": "JSON",
      "md": "Markdown",
      "py": "Python",
      "go": "Go",
      "rs": "Rust",
      "java": "Java",
      "cpp": "C++",
      "c": "C",
      "php": "PHP",
      "rb": "Ruby",
    };
    
    return languageMap[ext] || "Plain Text";
  };

  const realLanguage = propLanguage || getRealLanguage(activeFile);
  
  // Analizar errores/warnings en el código real del archivo activo
  useEffect(() => {
    if (activeFile && fileSystem[activeFile]) {
      const content = fileSystem[activeFile];
      
      // Análisis real de errores comunes
      let errors = 0;
      let warnings = 0;
      let infos = 0;
      
      if (content) {
        // Errores sintácticos comunes
        const consoleLogCount = content.match(/console\.log/g)?.length || 0;
        if (consoleLogCount > 5) warnings += Math.floor(consoleLogCount / 3);
        if (content.includes("debugger;")) infos++;
        const todoFixmeCount = content.match(/TODO|FIXME/g)?.length || 0;
        infos += todoFixmeCount;
        
        // Errores de sintaxis básica
        if (content.match(/{[^{}]*$/m)) errors++; // Llave sin cerrar
        if (content.match(/\([^()]*$/m)) errors++; // Paréntesis sin cerrar
        if (content.includes("undefined variable")) errors++;
        
        // Advertencias de estilo
        if (content.includes("var ")) warnings++;
        if (content.match(/==/g) && !content.match(/===/g)) warnings++;
        if (content.includes("any")) warnings++;
        
        // Si ya nos pasaron props, las usamos como base
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDynamicErrors(propErrors || errors);
        setDynamicWarnings(propWarnings || warnings);
        setDynamicInfos(propInfos || infos);
      } else {
        setDynamicErrors(propErrors || 0);
        setDynamicWarnings(propWarnings || 0);
        setDynamicInfos(propInfos || 0);
      }
    } else {
      setDynamicErrors(propErrors || 0);
      setDynamicWarnings(propWarnings || 0);
      setDynamicInfos(propInfos || 0);
    }
  }, [activeFile, fileSystem, propErrors, propWarnings, propInfos]);

  // Reloj en tiempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-ES", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="h-[22px] flex items-center px-2 text-[11px] shrink-0 justify-between select-none text-white"
      style={{ background: "var(--status-bg, #007ACC)" }}
    >
      {/* ── LEFT SIDE ── */}
      <div className="flex items-center gap-0">

        {/* Git branch */}
        <StatusItem title="Rama activa">
          <GitBranchIcon />
          <span>{branch}</span>
        </StatusItem>

        {/* Errors - dinámico */}
        {dynamicErrors > 0 && (
          <StatusItem title={`${dynamicErrors} errores`} className="hover:bg-red-600/40">
            <span className="text-red-300">⊗</span>
            <span>{dynamicErrors}</span>
          </StatusItem>
        )}
        {dynamicErrors === 0 && (
          <StatusItem title="Sin errores">
            <span>⊗</span>
            <span>{dynamicErrors}</span>
          </StatusItem>
        )}

        {/* Warnings - dinámico */}
        <StatusItem title={`${dynamicWarnings} advertencias`}>
          <span className="text-yellow-300">△</span>
          <span>{dynamicWarnings}</span>
        </StatusItem>

        {/* Infos - dinámico */}
        <StatusItem title={`${dynamicInfos} mensajes`}>
          <span className="text-blue-200">ⓘ</span>
          <span>{dynamicInfos}</span>
        </StatusItem>

        {/* WebContainer status */}
        <StatusItem title="Estado del entorno">
          {isBooting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              <span>Iniciando...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span>WebContainer Listo</span>
            </>
          )}
        </StatusItem>

        {/* Archivo activo (opcional) */}
        {activeFile && (
          <StatusItem title="Archivo actual">
            <span className="max-w-[200px] truncate">📄 {activeFile.split("/").pop()}</span>
          </StatusItem>
        )}
      </div>

      {/* ── RIGHT SIDE ── */}
      <div className="flex items-center gap-0">

        {/* Cursor position - DINÁMICO */}
        <StatusItem title="Ir a línea/columna">
          <span>Lín {line}, Col {column}</span>
        </StatusItem>

        {/* Indentation - DINÁMICO */}
        <StatusItem title="Tamaño de indentación">
          <span>Espacios: {indentSize}</span>
        </StatusItem>

        {/* Encoding - DINÁMICO */}
        <StatusItem title="Codificación del archivo">
          <span>{encoding}</span>
        </StatusItem>

        {/* Line ending - DINÁMICO */}
        <StatusItem title="Secuencia de fin de línea">
          <span>{lineEnding}</span>
        </StatusItem>

        {/* Language mode - REAL/DINÁMICO */}
        <StatusItem title="Seleccionar modo de lenguaje">
          <span>{realLanguage}</span>
        </StatusItem>

        {/* Theme toggle */}
        <StatusItem title="Cambiar tema">
          <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
        </StatusItem>

        {/* Go Live - Live Server */}
        <StatusItem title="Go Live - Live Server">
          <span>◉</span>
          <span>Go Live</span>
        </StatusItem>

        {/* Prettier */}
        <StatusItem title="Formatear documento con Prettier">
          <span>✓ Prettier</span>
        </StatusItem>

        {/* Reloj */}
        <StatusItem title="Hora actual">
          <span>{currentTime}</span>
        </StatusItem>
      </div>
    </div>
  );
}

/** Item reutilizable con hover y padding de VS Code */
function StatusItem({
  children,
  title,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 px-[6px] h-[22px] cursor-pointer hover:bg-white/20 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
    </svg>
  );
}