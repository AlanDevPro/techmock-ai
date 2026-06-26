"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import ActivityBar, { ActivityView } from "./ActivityBar";
import Sidebar from "./Sidebar";
import EditorArea from "./EditorArea";
import PreviewArea from "./PreviewArea";
import TerminalArea, { TerminalAreaRef } from "./TerminalArea";
import StatusBar from "./StatusBar";
import TopMenuBar from "./TopMenuBar";
import { 
  bootWebContainer, 
  getFileSystem, 
  readWebContainerFiles, 
  updateFile,
  getWebContainer,
  readFileContent,
  fileExists
} from "@/lib/webcontainer";
import codeService from "@/services/codeService";
import { env } from "@/config/env";

export type Theme = "dark" | "light";
export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

function getParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

function getInitialFramework(): "vuejs" | "nextjs" | null {
  const fw = getParam("framework");
  return fw === "vuejs" || fw === "nextjs" ? fw : null;
}

function getInitialActiveFile(framework: "vuejs" | "nextjs" | null): string {
  if (framework === "vuejs")  return "/practica-vue/src/App.vue";
  if (framework === "nextjs") return "/practica-nextjs/pages/index.js";
  return "/src/App.vue";
}

function getInitialSessionId(): string | null {
  return getParam("sesion_id");
}

function getInitialUsuarioId(): string | null {
  return getParam("usuario_id");
}

export default function IDE() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");

  const [selectedFramework] = useState<"vuejs" | "nextjs" | null>(getInitialFramework);
  const [activeFile, setActiveFile] = useState<string>(() =>
    getInitialActiveFile(getInitialFramework())
  );

  const [sesionId] = useState<string | null>(getInitialSessionId);
  const [usuarioId] = useState<string | null>(getInitialUsuarioId);

  const [fileSystem, setFileSystem] = useState<{ [key: string]: string }>({});
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBootingUi, setIsBootingUi] = useState(true);
  const [activeView, setActiveView] = useState<ActivityView>("explorer");
  const [submitStatus, setSubmitStatus] = useState<null | "running" | "success" | "error">(null);
  const [submitMessage, setSubmitMessage] = useState<string>("");
  
  // 🔥 REFERENCIA PARA EVITAR BUCLE INFINITO
  const loadingFilesRef = useRef<Set<string>>(new Set());
  
  // CONTROL DE VISIBILIDAD DE PREVISUALIZACIÓN PERSISTENTE
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [isResizingPreview, setIsResizingPreview] = useState(false);

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // CONTROL DE VISIBILIDAD DE LA TERMINAL PERSISTENTE
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  
  const terminalAreaRef = useRef<TerminalAreaRef>(null);

  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const diagnostics = useMemo(() => {
    const content = fileSystem[activeFile];
    if (!content) return { errors: 0, warnings: 0, infos: 0 };
    let errors = 0, warnings = 0, infos = 0;
    errors   += (content.match(/error/i)            ?? []).length;
    warnings += (content.match(/warning/i)          ?? []).length;
    infos    += (content.match(/TODO|FIXME|HACK/i) ?? []).length;
    if (content.includes("undefined"))      errors++;
    if (content.includes("null reference")) errors++;
    if (content.includes("console.log"))    infos++;
    if (content.includes("var "))            warnings++;
    if (content.match(/==/g) && !content.match(/===/g)) warnings++;
    return { errors, warnings, infos };
  }, [activeFile, fileSystem]);

  const toggleTheme              = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const togglePreviewVisibility  = () => setIsPreviewVisible((v) => !v);
  const toggleSidebarVisibility  = () => setIsSidebarVisible((v) => !v);
  
  const toggleTerminalVisibility = () => {
    setIsTerminalVisible((v) => {
      const nextState = !v;
      if (nextState) {
        setTimeout(() => {
          terminalAreaRef.current?.fitTerminal();
        }, 80);
      }
      return nextState;
    });
  };

  const handleViewChange = (view: ActivityView) => {
    setActiveView(view);
    if (!isSidebarVisible) setIsSidebarVisible(true);
  };

  const handleCursorChange = (line: number, column: number) => {
    setCursorPosition({ line, column });
  };

  // 🔥 FUNCIÓN: Manejar actualizaciones del fileSystem desde Sidebar/ExplorerPanel
  const handleFsUpdate = (
    updater: (prev: { [key: string]: string }) => { [key: string]: string }
  ) => {
    setFileSystem((prev) => {
      const newState = updater(prev);
      console.log('📁 [IDE] handleFsUpdate - Archivos:', Object.keys(newState).length);
      console.log('📁 [IDE] handleFsUpdate - Nuevo archivo agregado?', 
        Object.keys(newState).length > Object.keys(prev).length ? 'SÍ' : 'NO'
      );
      return newState;
    });
  };

  // 🔥 NUEVA FUNCIÓN: Manejar cambios de contenido desde EditorArea
  const handleContentChange = (file: string, content: string) => {
    console.log(`✏️ [IDE] handleContentChange - ${file}: ${content.length} caracteres`);
    // Actualizar el fileSystem en tiempo real
    setFileSystem(prev => ({ ...prev, [file]: content }));
    // También actualizar en WebContainer
    updateFile(file, content).catch(console.error);
  };

  // 🔥 MEJORADA: handleSelectFileWithLine con carga automática desde WebContainer
  const handleSelectFileWithLine = async (file: string, line?: number) => {
    console.log(`📁 [IDE] Seleccionando archivo: ${file}`);
    
    // 🔥 VERIFICAR SI EL ARCHIVO YA ESTÁ SIENDO CARGADO (EVITAR BUCLE)
    if (loadingFilesRef.current.has(file)) {
      console.log(`⏳ [IDE] Archivo ya está siendo cargado: ${file}`);
      setActiveFile(file);
      return;
    }
    
    // Verificar si el archivo existe en el fileSystem local
    if (!fileSystem[file]) {
      console.warn(`⚠️ [IDE] Archivo no encontrado en fileSystem: ${file}`);
      
      // Marcar que estamos cargando este archivo
      loadingFilesRef.current.add(file);
      
      try {
        const container = getWebContainer();
        if (container) {
          // Verificar si el archivo existe en WebContainer
          const exists = await fileExists(file);
          
          if (exists) {
            // Cargar el contenido desde WebContainer
            const content = await readFileContent(file);
            console.log(`📄 [IDE] Contenido cargado: ${content.length} caracteres`);
            setFileSystem(prev => ({ ...prev, [file]: content }));
            console.log(`✅ [IDE] Archivo cargado desde WebContainer: ${file}`);
          } else {
            // Crear el archivo en WebContainer
            console.log(`🆕 [IDE] Creando archivo en WebContainer: ${file}`);
            await container.fs.writeFile(file.startsWith('/') ? file.substring(1) : file, '');
            setFileSystem(prev => ({ ...prev, [file]: '' }));
            console.log(`✅ [IDE] Archivo creado en WebContainer: ${file}`);
          }
        }
      } catch (error) {
        console.error(`❌ [IDE] Error al cargar archivo ${file}:`, error);
      } finally {
        // Remover la marca de carga
        loadingFilesRef.current.delete(file);
      }
    }
    
    // Activar el archivo
    setActiveFile(file);
    
    // Si hay una línea específica, desplazarse a ella
    if (line !== undefined && line > 0) {
      console.log(`📍 [IDE] Navegando a línea ${line} en ${file}`);
    }
  };

  // 🔥 CORREGIDO: Efecto para sincronizar archivos activos (SIN BUCLE INFINITO)
  useEffect(() => {
    if (!activeFile || isBooting) return;
    
    // 🔥 VERIFICAR SI EL ARCHIVO YA ESTÁ EN fileSystem
    if (fileSystem[activeFile] !== undefined) {
      // El archivo existe, no hacer nada
      return;
    }
    
    // 🔥 VERIFICAR SI YA ESTAMOS CARGANDO ESTE ARCHIVO
    if (loadingFilesRef.current.has(activeFile)) {
      console.log(`⏳ [IDE] Ya cargando: ${activeFile}`);
      return;
    }
    
    console.warn(`⚠️ [IDE] Archivo activo no encontrado en fileSystem: ${activeFile}`);
    
    // Marcar que estamos cargando
    loadingFilesRef.current.add(activeFile);
    
    // Intentar cargar el archivo desde WebContainer
    const loadMissingFile = async () => {
      try {
        const container = getWebContainer();
        if (!container) {
          console.warn('⚠️ [IDE] WebContainer no disponible');
          loadingFilesRef.current.delete(activeFile);
          return;
        }
        
        // Verificar si existe en WebContainer
        const exists = await fileExists(activeFile);
        
        if (exists) {
          // Cargar el contenido
          const content = await readFileContent(activeFile);
          console.log(`📄 [IDE] Contenido cargado: ${content.length} caracteres`);
          
          // Actualizar fileSystem
          setFileSystem(prev => {
            if (prev[activeFile] !== undefined) return prev;
            return { ...prev, [activeFile]: content };
          });
          
          console.log(`✅ [IDE] Archivo activo cargado desde WebContainer: ${activeFile}`);
        } else {
          // Crear el archivo si no existe
          console.log(`🆕 [IDE] Creando archivo activo: ${activeFile}`);
          const normalizedPath = activeFile.startsWith('/') ? activeFile.substring(1) : activeFile;
          await container.fs.writeFile(normalizedPath, '');
          
          // Actualizar fileSystem
          setFileSystem(prev => {
            if (prev[activeFile] !== undefined) return prev;
            return { ...prev, [activeFile]: '' };
          });
          
          console.log(`✅ [IDE] Archivo activo creado en WebContainer: ${activeFile}`);
        }
      } catch (error) {
        console.error(`❌ [IDE] Error en sincronización:`, error);
      } finally {
        // Remover la marca de carga
        loadingFilesRef.current.delete(activeFile);
      }
    };
    
    loadMissingFile();
  }, [activeFile, fileSystem, isBooting]);

  const cssVars: Record<string, string> =
    theme === "dark"
      ? {
          "--bg-primary":       "#1e1e1e",
          "--bg-secondary":     "#252526",
          "--bg-tertiary":      "#2d2d2d",
          "--bg-hover":         "#2a2d2e",
          "--border":           "#3c3c3c",
          "--text-primary":     "#cccccc",
          "--text-secondary":   "#8c8c8c",
          "--text-heading":     "#e8e8e8",
          "--accent":           "#007acc",
          "--accent-hover":     "#005fa3",
          "--tab-active-bg":    "#1e1e1e",
          "--tab-inactive-bg":  "#2d2d2d",
          "--status-bg":        "#007acc",
          "--btn-run-bg":       "#1a73e8",
          "--btn-run-hover":    "#1558b0",
          "--btn-submit-bg":    "#2cba44",
          "--btn-submit-hover": "#1e8e31",
        }
      : {
          "--bg-primary":       "#ffffff",
          "--bg-secondary":     "#f3f3f3",
          "--bg-tertiary":      "#e8e8e8",
          "--bg-hover":         "#e4e4e4",
          "--border":           "#d4d4d4",
          "--text-primary":     "#383838",
          "--text-secondary":   "#6e6e6e",
          "--text-heading":     "#1e1e1e",
          "--accent":           "#005fb8",
          "--accent-hover":     "#003f80",
          "--tab-active-bg":    "#ffffff",
          "--tab-inactive-bg":  "#ececec",
          "--status-bg":        "#005fb8",
          "--btn-run-bg":       "#1a73e8",
          "--btn-run-hover":    "#1558b0",
          "--btn-submit-bg":    "#2cba44",
          "--btn-submit-hover": "#1e8e31",
        };

  useEffect(() => {
    let mounted = true;
    bootWebContainer()
      .then(() => {
        const fs = getFileSystem();
        if (mounted) {
          setIsBooting(false);
          setFileSystem(fs);
        }
      })
      .catch((err) => {
        console.error("❌ [WEBCONTAINER] Error fatal:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isBooting) return;
    const timer = setTimeout(() => setIsBootingUi(false), 2000);
    return () => clearTimeout(timer);
  }, [isBooting]);

  // REDIMENSIONAMIENTO DEL PREVIEW (CON LOGICA ANTI-IFRAME)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingPreview) return;
      // Calculamos la distancia desde el borde derecho de la pantalla
      const clampedWidth = Math.min(Math.max(window.innerWidth - e.clientX, 150), window.innerWidth * 0.85);
      setPreviewWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPreview(false);
    };

    if (isResizingPreview) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingPreview]);

  // Redimensionamiento del sidebar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      if (e.clientX < 50) {
        setIsSidebarVisible(false);
        setIsResizingSidebar(false);
        return;
      }
      setSidebarWidth(Math.min(Math.max(e.clientX, 150), 500));
    };
    const handleMouseUp = () => setIsResizingSidebar(false);

    if (isResizingSidebar) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  // Redimensionamiento de la terminal
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingTerminal) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight < 30) {
        setIsTerminalVisible(false);
        setIsResizingTerminal(false);
        return;
      }
      const clampedHeight = Math.min(Math.max(newHeight, 50), window.innerHeight * 0.7);
      setTerminalHeight(clampedHeight);
      terminalAreaRef.current?.fitTerminal();
    };
    const handleMouseUp = () => setIsResizingTerminal(false);

    if (isResizingTerminal) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingTerminal]);

  const handleRefreshFs = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedFs = await readWebContainerFiles();
    setFileSystem(updatedFs);
    setIsRefreshing(false);
  };

  const handleSubmitCode = async () => {
    setSubmitStatus("running");
    setSubmitMessage("Analizando código...");

    if (!fileSystem[activeFile]) {
      setSubmitStatus("error");
      setSubmitMessage("El archivo activo no existe");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    const codigoCompleto = fileSystem[activeFile];
    const frameworkApi = codeService.resolverFrameworkApi(selectedFramework);

    try {
      await codeService.analizarCodigo({
        codigo: codigoCompleto,
        framework: frameworkApi,
        sesion_id: sesionId,
        active_file: activeFile,
        files: fileSystem,
      });

      setSubmitStatus("success");
      setSubmitMessage("¡Análisis completado!");

      if (sesionId) {
        window.location.href = `${env.FRONTEND_BASE_URL}/dashboard/developer/interviews/analisis/${sesionId}`;
      } else {
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } catch (error) {
      setSubmitStatus("error");
      setSubmitMessage("Error al analizar el código");
      setTimeout(() => setSubmitStatus(null), 3000);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        className="flex flex-col h-full w-full relative font-mono select-none"
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

        {sesionId && (
          <div
            className="flex items-center justify-center px-4 text-[11px] font-semibold uppercase tracking-widest shrink-0"
            style={{ background: "#1a5c1a", color: "#fef3c7", height: "22px" }}
          >
            🎯 Sesión Activa: {sesionId.slice(0, 8)}…
          </div>
        )}

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
                className="opacity-80"
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
                color: isSidebarVisible ? "#ffffff" : "var(--accent)",
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
                color: isPreviewVisible ? "#ffffff" : "var(--accent)",
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
                color: isTerminalVisible ? "#ffffff" : "var(--accent)",
              }}
            >
              {isTerminalVisible ? "Terminal ✓" : "Terminal"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 22px - 36px - 28px)" }}>
          <ActivityBar activeView={activeView} onViewChange={handleViewChange} />

          {isSidebarVisible && (
            <>
              {/* ✅ SIDEBAR CON handleFsUpdate CORRECTAMENTE PASADO */}
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
                onFsUpdate={handleFsUpdate} // ✅ VERIFICAR QUE ESTO EXISTA
              />
              <div
                className="cursor-ew-resize transition-colors w-[4px] hover:bg-[var(--accent)] active:bg-[var(--accent)] shrink-0 z-20"
                style={{
                  background: isResizingSidebar ? "var(--accent)" : "transparent",
                }}
                onMouseDown={() => setIsResizingSidebar(true)}
              />
            </>
          )}

          <div className="flex flex-col flex-1 h-full min-w-0 relative">
            <div
              className="flex-1 min-h-0 relative flex flex-row"
              style={{
                background: "var(--bg-primary)",
                height: isTerminalVisible ? `calc(100% - ${terminalHeight}px)` : "100%",
                transition: isResizingTerminal ? "none" : "height 0.15s ease-out",
              }}
            >
              {isBooting ? (
                <div
                  className="flex items-center justify-center h-full w-full"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Arrancando micro-sistema operativo en la web...
                </div>
              ) : (
                <>
                  <div
                    className="flex-1 min-w-0 h-full"
                    style={{
                      width: isPreviewVisible ? `calc(100% - ${previewWidth}px)` : "100%",
                      transition: isResizingPreview ? "none" : "width 0.15s ease-out",
                    }}
                  >
                    <EditorArea
                      activeFile={activeFile}
                      fileSystem={fileSystem}
                      onCursorChange={handleCursorChange}
                      onSelectFile={setActiveFile}
                      onContentChange={handleContentChange}
                    />
                  </div>

                  {/* BARRA SEPARADORA DE PREVIEW OPTIMIZADA */}
                  <div
                    className="cursor-ew-resize w-[5px] hover:bg-[var(--accent)] active:bg-[var(--accent)] shrink-0 z-20 relative transition-colors"
                    style={{
                      background: isResizingPreview ? "var(--accent)" : "transparent",
                      display: isPreviewVisible ? "block" : "none"
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsResizingPreview(true);
                    }}
                  />

                  {/* CONTENEDOR PREVIEW TOTALMENTE PERSISTENTE */}
                  <div
                    className="h-full flex flex-col shrink-0 relative"
                    style={{
                      width: isPreviewVisible ? `${previewWidth}px` : "0px",
                      minWidth: isPreviewVisible ? "150px" : "0px",
                      maxWidth: "85vw",
                      transition: isResizingPreview ? "none" : "width 0.15s ease-out",
                      overflow: "hidden",
                      visibility: isPreviewVisible ? "visible" : "hidden",
                      opacity: isPreviewVisible ? 1 : 0,
                      pointerEvents: isPreviewVisible ? "auto" : "none"
                    }}
                  >
                    <PreviewArea
                      isVisible={isPreviewVisible}
                      onToggleVisibility={togglePreviewVisibility}
                      isResizingParent={isResizingPreview}
                    />
                  </div>
                </>
              )}
            </div>

            {/* BARRA SEPARADORA DE LA TERMINAL */}
            <div
              className="cursor-ns-resize hover:bg-[var(--accent)] active:bg-[var(--accent)] h-[4px] shrink-0 z-20 transition-colors"
              style={{
                background: isResizingTerminal ? "var(--accent)" : "transparent",
              }}
              onMouseDown={() => setIsResizingTerminal(true)}
            />

            {/* CONTENEDOR DE LA TERMINAL PERSISTENTE */}
            <div
              className="border-t flex flex-col shrink-0"
              style={{
                height: isTerminalVisible ? `${terminalHeight}px` : "0px",
                minHeight: isTerminalVisible ? "50px" : "0px",
                maxHeight: "70vh",
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                transition: isResizingTerminal ? "none" : "height 0.15s ease-out",
                overflow: "hidden",
                visibility: isTerminalVisible ? "visible" : "hidden",
                opacity: isTerminalVisible ? 1 : 0,
                pointerEvents: isTerminalVisible ? "auto" : "none"
              }}
            >
              <div
                className="flex h-9 border-b items-center px-4 select-none"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
              >
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
                  ref={terminalAreaRef}
                  isBooting={isBooting}
                  isVisible={isTerminalVisible}
                  framework={selectedFramework}
                  onReady={() => {
                    setTimeout(() => terminalAreaRef.current?.fitTerminal(), 100);
                  }}
                />
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-3 px-4 py-2 shrink-0 border-t"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              {submitStatus === "running" && (
                <span className="text-[12px] animate-pulse" style={{ color: "var(--text-secondary)" }}>
                  {submitMessage || "Analizando código..."}
                </span>
              )}
              {submitStatus === "success" && (
                <span className="text-[12px] text-green-400 font-semibold">✓ {submitMessage || "Completado"}</span>
              )}
              {submitStatus === "error" && (
                <span className="text-[12px] text-red-400 font-semibold">✗ {submitMessage || "Error al analizar"}</span>
              )}

              <button
                onClick={handleSubmitCode}
                disabled={submitStatus === "running"}
                className="px-5 py-2 rounded text-white text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--btn-submit-bg)" }}
              >
                Submit Code
              </button>
            </div>
          </div>
        </div>

        <StatusBar
          isBooting={isBooting}
          line={cursorPosition.line}
          column={cursorPosition.column}
          indentSize={2}
          encoding="UTF-8"
          lineEnding="CRLF"
          language={
            activeFile?.split(".").pop() === "tsx"
              ? "TypeScript JSX"
              : activeFile?.split(".").pop() === "vue"
              ? "Vue.js"
              : "TypeScript"
          }
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