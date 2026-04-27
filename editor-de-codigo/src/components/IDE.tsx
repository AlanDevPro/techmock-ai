"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import ActivityBar, { ActivityView } from "./ActivityBar";
import LeftPanel from "./LeftPanel";
import Sidebar from "./Sidebar";
import EditorArea from "./EditorArea";
import PreviewArea from "./PreviewArea";
import TerminalArea from "./TerminalArea";
import StatusBar from "./StatusBar";
import TopMenuBar from "./TopMenuBar";
import { bootWebContainer, getFileSystem, readWebContainerFiles } from "@/lib/webcontainer";

export type Theme = "dark" | "light";
export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

export default function IDE() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");
  const [activeFile, setActiveFile] = useState("/src/App.vue");
  const [fileSystem, setFileSystem] = useState<{ [key: string]: string }>({});
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBootingUi, setIsBootingUi] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<"vuejs" | "nextjs" | null>(null);
  const [activeView, setActiveView] = useState<ActivityView>("explorer");
  const [submitStatus, setSubmitStatus] = useState<null | "running" | "success" | "error">(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  
  // Estados para la Terminal
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const terminalAreaRef = useRef<{ fitTerminal?: () => void }>(null);
  
  // Estados para el StatusBar dinámico
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [diagnostics, setDiagnostics] = useState({ errors: 0, warnings: 0, infos: 0 });
  
  const hasLoadedQuestionsRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const togglePreviewVisibility = () => setIsPreviewVisible(!isPreviewVisible);
  const toggleSidebarVisibility = () => setIsSidebarVisible(!isSidebarVisible);
  const toggleTerminalVisibility = () => setIsTerminalVisible(!isTerminalVisible);

  // Función para manejar el cambio de vista en ActivityBar
  const handleViewChange = (view: ActivityView) => {
    setActiveView(view);
    if (!isSidebarVisible) {
      setIsSidebarVisible(true);
    }
  };

  // Función para actualizar la posición del cursor desde EditorArea
  const handleCursorChange = (line: number, column: number) => {
    setCursorPosition({ line, column });
  };

  // Detectar errores/warnings reales del archivo activo
  useEffect(() => {
    if (activeFile && fileSystem[activeFile]) {
      const content = fileSystem[activeFile];
      let errors = 0, warnings = 0, infos = 0;
      
      if (content) {
        // Análisis de errores reales
        if (content.match(/error/i)) errors = (content.match(/error/i) || []).length;
        if (content.match(/warning/i)) warnings = (content.match(/warning/i) || []).length;
        if (content.match(/TODO|FIXME|HACK/i)) infos = (content.match(/TODO|FIXME|HACK/i) || []).length;
        
        // Errores de sintaxis adicionales
        if (content.includes("undefined")) errors++;
        if (content.includes("null reference")) errors++;
        if (content.includes("console.log")) infos++;
        
        // Advertencias de estilo
        if (content.includes("var ")) warnings++;
        if (content.match(/==/g) && !content.match(/===/g)) warnings++;
      }
      
      setDiagnostics({ errors, warnings, infos });
    } else {
      setDiagnostics({ errors: 0, warnings: 0, infos: 0 });
    }
  }, [activeFile, fileSystem]);

  const cssVars: Record<string, string> =
    theme === "dark"
      ? {
          "--bg-primary": "#1e1e1e",
          "--bg-secondary": "#252526",
          "--bg-tertiary": "#2d2d2d",
          "--bg-hover": "#2a2d2e",
          "--border": "#3c3c3c",
          "--text-primary": "#cccccc",
          "--text-secondary": "#8c8c8c",
          "--text-heading": "#e8e8e8",
          "--accent": "#007acc",
          "--accent-hover": "#005fa3",
          "--tab-active-bg": "#1e1e1e",
          "--tab-inactive-bg": "#2d2d2d",
          "--status-bg": "#007acc",
          "--btn-run-bg": "#1a73e8",
          "--btn-run-hover": "#1558b0",
          "--btn-submit-bg": "#2cba44",
          "--btn-submit-hover": "#1e8e31",
        }
      : {
          "--bg-primary": "#ffffff",
          "--bg-secondary": "#f3f3f3",
          "--bg-tertiary": "#e8e8e8",
          "--bg-hover": "#e4e4e4",
          "--border": "#d4d4d4",
          "--text-primary": "#383838",
          "--text-secondary": "#6e6e6e",
          "--text-heading": "#1e1e1e",
          "--accent": "#005fb8",
          "--accent-hover": "#003f80",
          "--tab-active-bg": "#ffffff",
          "--tab-inactive-bg": "#ececec",
          "--status-bg": "#005fb8",
          "--btn-run-bg": "#1a73e8",
          "--btn-run-hover": "#1558b0",
          "--btn-submit-bg": "#2cba44",
          "--btn-submit-hover": "#1e8e31",
        };

  useEffect(() => {
    let mounted = true;
    bootWebContainer().then(() => {
      if (mounted) {
        setIsBooting(false);
        setFileSystem(getFileSystem());
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isBooting) return;
    const timer = setTimeout(() => setIsBootingUi(false), 5000);
    return () => clearTimeout(timer);
  }, [isBooting]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasLoadedQuestionsRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const framework = params.get("framework");
    if (framework === "vuejs" || framework === "nextjs") {
      hasLoadedQuestionsRef.current = true;
      setSelectedFramework(framework);
      if (framework === "vuejs") {
        setActiveFile("/practica-vue/src/App.vue");
      } else if (framework === "nextjs") {
        setActiveFile("/practica-nextjs/pages/index.js");
      }
    }
  }, []);

  // Manejar el redimensionamiento del preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingPreview) return;
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.7;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setPreviewWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPreview(false);
    };

    if (isResizingPreview) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingPreview]);

  // Manejar el redimensionamiento del sidebar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const newWidth = e.clientX;
      const maxWidth = 500;
      
      if (newWidth < 10) {
        setIsSidebarVisible(false);
        setIsResizingSidebar(false);
        return;
      }
      
      const clampedWidth = Math.min(newWidth, maxWidth);
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    if (isResizingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  // Manejar el redimensionamiento de la terminal
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingTerminal) return;
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      const maxHeight = windowHeight * 0.7;
      const minHeight = 50;
      const newHeight = windowHeight - mouseY;
      
      if (newHeight < 30) {
        setIsTerminalVisible(false);
        setIsResizingTerminal(false);
        return;
      }
      
      const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
      setTerminalHeight(clampedHeight);
      
      setTimeout(() => {
        if (terminalAreaRef.current?.fitTerminal) {
          terminalAreaRef.current.fitTerminal();
        }
      }, 50);
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
    };

    if (isResizingTerminal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingTerminal]);

  const handleRefreshFs = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedFs = await readWebContainerFiles();
    setFileSystem(updatedFs);
    setIsRefreshing(false);
  };

  const handleSelectFileWithLine = (file: string, line?: number) => {
    console.log("📄 handleSelectFileWithLine llamado con:", file);
    setActiveFile(file);
    if (line) {
      console.log(`Navegar a línea ${line} en el archivo ${file}`);
    }
  };

  const handleSelectFile = (file: string) => {
    console.log("📄 handleSelectFile llamado con:", file);
    setActiveFile(file);
  };

  const handleRunTests = async () => {
    setSubmitStatus("running");
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitStatus("success");
    setTimeout(() => setSubmitStatus(null), 3000);
  };

  const handleSubmitCode = async () => {
    console.log("🚀 Iniciando handleSubmitCode...");
    setSubmitStatus("running");
    console.log("📁 activeFile:", activeFile);
    console.log("📂 fileSystem keys:", Object.keys(fileSystem));
    console.log("📊 Total de archivos en fileSystem:", Object.keys(fileSystem).length);
    
    if (!fileSystem[activeFile]) {
      console.error("❌ El archivo activo no existe en fileSystem:", activeFile);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    const codigoCompleto = fileSystem[activeFile];
    console.log("📄 contenido del archivo activo:");
    console.log("📏 Longitud del código:", codigoCompleto?.length || 0, "caracteres");
    
    if (!codigoCompleto || codigoCompleto.trim().length === 0) {
      console.error("❌ No hay código válido para enviar");
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    const frameworkApi =
      selectedFramework === "vuejs"
        ? "vue"
        : selectedFramework === "nextjs"
        ? "next"
        : "react";

    console.log("🎯 Framework seleccionado:", selectedFramework);
    console.log("🔧 frameworkApi para el endpoint:", frameworkApi);
    
    const payload = {
      codigo: codigoCompleto,
      framework: frameworkApi,
    };
    
    console.log("📦 Payload completo a enviar:");
    console.log("   - framework:", payload.framework);
    console.log("   - codigo length:", payload.codigo.length, "caracteres");
    
    try {
      console.log("✈️ Enviando petición POST al backend...");
      
      const response = await fetch("http://127.0.0.1:8000/api/analizar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 Respuesta recibida del backend:");
      console.log("   - Status:", response.status);
      console.log("   - OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log("✅ Resultado recibido del backend:");
      console.log("   - Claves del resultado:", Object.keys(resultado));

      sessionStorage.setItem("analisis_resultado", JSON.stringify(resultado));
      console.log("💾 Resultado guardado en sessionStorage");

      setSubmitStatus("success");
      console.log("✅ Submit completado con éxito, redirigiendo a /analisis...");

      window.location.href = "http://localhost:3000/analisis";
      
    } catch (error) {
      console.error("❌ Error al analizar código:", error);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        className="flex flex-col h-full w-full relative font-mono"
        style={cssVars as React.CSSProperties}
      >
        {isBootingUi && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="flex flex-col items-center gap-3" style={{ color: "var(--text-primary)" }}>
              <div className="h-2 w-24 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                <div className="h-full w-1/2 animate-pulse" style={{ background: "var(--accent)" }} />
              </div>
              <span className="text-sm uppercase tracking-widest">Cargando editor...</span>
            </div>
          </div>
        )}

        <TopMenuBar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          selectedFramework={selectedFramework}
          activeFile={activeFile}
        />

        <div
          className="flex items-center justify-between px-4 text-[12px] select-none shrink-0 border-b"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-secondary)",
            borderColor: "var(--border)",
            height: "28px",
          }}
        >
          <div className="flex items-center gap-4">
            {["Edit", "Selection", "View", "Go"].map((item) => (
              <span
                key={item}
                className="cursor-pointer hover:opacity-100 opacity-80 transition-opacity"
                style={{ color: "var(--text-primary)" }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span
              onClick={toggleSidebarVisibility}
              className="cursor-pointer px-3 py-0.5 rounded text-[11px] font-semibold border transition-colors hover:opacity-80"
              style={{ 
                borderColor: "var(--accent)", 
                backgroundColor: isSidebarVisible ? "var(--accent)" : "transparent",
                color: isSidebarVisible ? "#ffffff" : "var(--accent)"
              }}
            >
              {isSidebarVisible ? "Sidebar ✓" : "Sidebar"}
            </span>
            <span
              onClick={togglePreviewVisibility}
              className="cursor-pointer px-3 py-0.5 rounded text-[11px] font-semibold border transition-colors hover:opacity-80"
              style={{ 
                borderColor: "var(--accent)", 
                backgroundColor: isPreviewVisible ? "var(--accent)" : "transparent",
                color: isPreviewVisible ? "#ffffff" : "var(--accent)"
              }}
            >
              {isPreviewVisible ? "Preview ✓" : "Preview"}
            </span>
            <span
              onClick={toggleTerminalVisibility}
              className="cursor-pointer px-3 py-0.5 rounded text-[11px] font-semibold border transition-colors hover:opacity-80"
              style={{ 
                borderColor: "var(--accent)", 
                backgroundColor: isTerminalVisible ? "var(--accent)" : "transparent",
                color: isTerminalVisible ? "#ffffff" : "var(--accent)"
              }}
            >
              {isTerminalVisible ? "Terminal ✓" : "Terminal"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 22px - 36px - 28px)" }}>
          <LeftPanel />
          <ActivityBar activeView={activeView} onViewChange={handleViewChange} />
          
          {isSidebarVisible && (
            <>
              <Sidebar
                activeView={activeView}
                activeFile={activeFile}
                onSelectFile={handleSelectFileWithLine}
                files={fileSystem}
                onRefresh={handleRefreshFs}
                selectedFramework={selectedFramework}
                isQuestionOpen={false}
                onToggleOpen={() => {}}
                isVisible={isSidebarVisible}
                width={sidebarWidth}
              />
              <div
                className="cursor-ew-resize hover:bg-accent transition-colors"
                style={{ 
                  background: isResizingSidebar ? "var(--accent)" : "transparent",
                  width: "3px",
                  flexShrink: 0
                }}
                onMouseDown={() => setIsResizingSidebar(true)}
              />
            </>
          )}

          <div className="flex flex-col flex-1 h-full min-w-0">
            <div 
              className="flex-1 min-h-0 relative flex flex-row" 
              style={{ 
                background: "var(--bg-primary)",
                height: isTerminalVisible ? `calc(100% - ${terminalHeight}px)` : '100%',
                transition: isResizingTerminal ? 'none' : 'height 0.2s ease'
              }}
            >
              {isBooting ? (
                <div className="flex items-center justify-center h-full w-full" style={{ color: "var(--text-secondary)" }}>
                  Arrancando micro-sistema operativo en la web...
                </div>
              ) : (
                <>
                  <div 
                    className="flex-1 min-w-0 h-full"
                    style={{ 
                      width: isPreviewVisible ? `calc(100% - ${previewWidth}px)` : '100%',
                      transition: isResizingPreview ? 'none' : 'width 0.2s ease'
                    }}
                  >
                    <EditorArea 
                      activeFile={activeFile} 
                      fileSystem={fileSystem}
                      onCursorChange={handleCursorChange}
                    />
                  </div>
                  
                  {isPreviewVisible && (
                    <div
                      className="cursor-ew-resize hover:bg-accent transition-colors"
                      style={{ 
                        background: isResizingPreview ? "var(--accent)" : "transparent",
                        width: "3px",
                        flexShrink: 0
                      }}
                      onMouseDown={() => setIsResizingPreview(true)}
                    />
                  )}
                  
                  {isPreviewVisible && (
                    <div
                      className="h-full flex flex-col"
                      style={{ 
                        width: `${previewWidth}px`,
                        minWidth: "200px",
                        maxWidth: "70vw",
                        transition: isResizingPreview ? 'none' : 'width 0.2s ease'
                      }}
                    >
                      <PreviewArea 
                        isVisible={isPreviewVisible}
                        onToggleVisibility={togglePreviewVisibility}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {isTerminalVisible && (
              <div
                className="cursor-ns-resize hover:bg-accent transition-colors"
                style={{ 
                  background: isResizingTerminal ? "var(--accent)" : "transparent",
                  height: "3px",
                  flexShrink: 0
                }}
                onMouseDown={() => setIsResizingTerminal(true)}
              />
            )}

            {isTerminalVisible && (
              <div 
                className="border-t flex flex-col shrink-0"
                style={{ 
                  height: `${terminalHeight}px`,
                  minHeight: "50px",
                  maxHeight: "70vh",
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  transition: isResizingTerminal ? 'none' : 'height 0.2s ease'
                }}
              >
                <div className="flex h-9 border-b items-center px-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <span
                    onClick={toggleTerminalVisibility}
                    className="text-[11px] font-semibold uppercase cursor-pointer border-b h-full flex items-center mb-[-1px] hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
                  >
                    Terminal
                  </span>
                </div>
                <div className="flex-1 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                  <TerminalArea 
                    isBooting={isBooting}
                    onReady={() => {
                      setTimeout(() => {
                        if (terminalAreaRef.current?.fitTerminal) {
                          terminalAreaRef.current.fitTerminal();
                        }
                      }, 100);
                    }}
                  />
                </div>
              </div>
            )}

            {!isTerminalVisible && (
              <div
                className="flex items-center justify-end gap-3 px-4 py-2 shrink-0 border-t"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
              >
                {submitStatus === "running" && (
                  <span className="text-[12px] animate-pulse" style={{ color: "var(--text-secondary)" }}>
                    Analizando código...
                  </span>
                )}
                {submitStatus === "success" && (
                  <span className="text-[12px] text-green-400 font-semibold">✓ Completado</span>
                )}
                {submitStatus === "error" && (
                  <span className="text-[12px] text-red-400 font-semibold">✗ Error al analizar</span>
                )}

                
                <button
                  onClick={handleSubmitCode}
                  disabled={submitStatus === "running"}
                  className="px-5 py-2 rounded text-white text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--btn-submit-bg)" }}
                >
                  Submit Code
                </button>
              </div>
            )}
          </div>
        </div>

        <StatusBar 
          isBooting={isBooting}
          line={cursorPosition.line}
          column={cursorPosition.column}
          indentSize={2}
          encoding="UTF-8"
          lineEnding="CRLF"
          language={activeFile?.split(".").pop() === "tsx" ? "TypeScript JSX" : activeFile?.split(".").pop() === "vue" ? "Vue.js" : "TypeScript"}
          branch="main"
          errors={diagnostics.errors}
          warnings={diagnostics.warnings}
          infos={diagnostics.infos}
          activeFile={activeFile}
          fileSystem={fileSystem}
        />
      </div>
    </ThemeContext.Provider>
  );
}