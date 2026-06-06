"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext, useCallback } from "react";
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
import codeService from "@/services/codeService";
import { env } from "@/config/env";

export type Theme = "dark" | "light";
export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});
export const useTheme = () => useContext(ThemeContext);

// ─── URL helpers (solo cliente) ───────────────────────────────────────────────

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

// ─── Componente principal ──────────────────────────────────────────────────────

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
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [isResizingPreview, setIsResizingPreview] = useState(false);

  // ✅ AHORA EL SIDEBAR SIEMPRE ES VISIBLE
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // ✅ AHORA LA TERMINAL SIEMPRE ES VISIBLE
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const terminalAreaRef = useRef<{ fitTerminal?: () => void }>(null);

  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  console.log("🧠 [IDE INIT] Query params detectados:");
  console.log("framework:", selectedFramework);
  console.log("sesionId:", sesionId);
  console.log("usuarioId:", usuarioId);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Diagnósticos derivados
  const diagnostics = useMemo(() => {
    const content = fileSystem[activeFile];
    if (!content) return { errors: 0, warnings: 0, infos: 0 };

    let errors = 0, warnings = 0, infos = 0;

    errors   += (content.match(/error/i)           ?? []).length;
    warnings += (content.match(/warning/i)         ?? []).length;
    infos    += (content.match(/TODO|FIXME|HACK/i) ?? []).length;

    if (content.includes("undefined"))      errors++;
    if (content.includes("null reference")) errors++;
    if (content.includes("console.log"))    infos++;
    if (content.includes("var "))           warnings++;
    if (content.match(/==/g) && !content.match(/===/g)) warnings++;

    return { errors, warnings, infos };
  }, [activeFile, fileSystem]);

  const toggleTheme              = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const togglePreviewVisibility  = () => setIsPreviewVisible((v) => !v);
  const toggleSidebarVisibility  = () => setIsSidebarVisible((v) => !v);
  const toggleTerminalVisibility = () => setIsTerminalVisible((v) => !v);

  const handleViewChange = (view: ActivityView) => {
    setActiveView(view);
    if (!isSidebarVisible) setIsSidebarVisible(true);
  };

  const handleCursorChange = (line: number, column: number) => {
    setCursorPosition({ line, column });
  };

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

  // Boot WebContainer
  useEffect(() => {
    let mounted = true;

    console.log("🚀 [WEBCONTAINER] Iniciando boot...");

    bootWebContainer()
      .then(() => {
        console.log("✅ [WEBCONTAINER] Boot exitoso");
        const fs = getFileSystem();
        console.log("📁 [WEBCONTAINER] FileSystem:", fs);
        if (mounted) {
          setIsBooting(false);
          setFileSystem(fs);
          console.log("✅ [WEBCONTAINER] Estado actualizado");
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
    const timer = setTimeout(() => setIsBootingUi(false), 5000);
    return () => clearTimeout(timer);
  }, [isBooting]);

  

  // Redimensionamiento del preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingPreview) return;
      const clampedWidth = Math.min(Math.max(window.innerWidth - e.clientX, 200), window.innerWidth * 0.7);
      setPreviewWidth(clampedWidth);
    };
    const handleMouseUp = () => setIsResizingPreview(false);

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
      if (e.clientX < 10) {
        setIsSidebarVisible(false);
        setIsResizingSidebar(false);
        return;
      }
      setSidebarWidth(Math.min(e.clientX, 500));
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
      setTimeout(() => terminalAreaRef.current?.fitTerminal?.(), 50);
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

  const handleSelectFileWithLine = (file: string, line?: number) => {
    setActiveFile(file);
    if (line) console.log(`Navegar a línea ${line} en el archivo ${file}`);
  };

  const handleSelectFile = (file: string) => {
    handleSelectFileWithLine(file);
  };

  // ─── Submit Code ──────────────────────────────────────────────────────────────
  const handleSubmitCode = async () => {
    console.log("🚀 [SUBMIT] Iniciando análisis");
    console.log("📄 activeFile:", activeFile);
    console.log("🧠 sesionId:", sesionId);
    console.log("👤 usuarioId:", usuarioId);

    if (!sesionId) {
      console.warn("⚠️ No hay sesion_id — enviando en modo libre sin persistencia");
    }

    setSubmitStatus("running");
    setSubmitMessage("Analizando código...");

    if (!fileSystem[activeFile]) {
      console.error("❌ El archivo activo no existe en fileSystem:", activeFile);
      setSubmitStatus("error");
      setSubmitMessage("El archivo activo no existe");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    const codigoCompleto = fileSystem[activeFile];
    if (!codigoCompleto || codigoCompleto.trim().length === 0) {
      console.error("❌ No hay código válido para enviar");
      setSubmitStatus("error");
      setSubmitMessage("No hay código para enviar");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }
    console.log("📦 código length:", codigoCompleto?.length);

    const frameworkApi = codeService.resolverFrameworkApi(selectedFramework);
    console.log("🎯 Framework:", selectedFramework, "→ API:", frameworkApi);

    try {
      const resultado = await codeService.analizarCodigo({
        codigo: codigoCompleto,
        framework: frameworkApi,
        sesion_id: sesionId,
        usuario_id: usuarioId,
        active_file: activeFile,
        files: fileSystem,
      });

      console.log("📦 resultado backend:", resultado);

      setSubmitStatus("success");
      setSubmitMessage("¡Análisis completado!");

      if (sesionId) {
        console.log("➡️ REDIRECT A:", `/dashboard/developer/interviews/analisis/${sesionId}`);
        window.location.href = `${env.FRONTEND_BASE_URL}/dashboard/developer/interviews/analisis/${sesionId}`;
      } else {
        console.log("ℹ️ Sin sesion_id, no hay redirección");
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } catch (error) {
      console.error("❌ Error al analizar código:", error);
      setSubmitStatus("error");
      setSubmitMessage("Error al analizar el código");
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

        {/* Banner informativo (ya no es modo entrevista restrictivo) */}
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
          <LeftPanel />
          <ActivityBar activeView={activeView} onViewChange={handleViewChange} />

          {/* Sidebar — SIEMPRE RENDERIZADO si isSidebarVisible es true */}
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
                  flexShrink: 0,
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
                height: isTerminalVisible
                  ? `calc(100% - ${terminalHeight}px)`
                  : "100%",
                transition: isResizingTerminal ? "none" : "height 0.2s ease",
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
                      transition: isResizingPreview ? "none" : "width 0.2s ease",
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
                        flexShrink: 0,
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
                        transition: isResizingPreview ? "none" : "width 0.2s ease",
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

            {/* Terminal — SIEMPRE RENDERIZADA si isTerminalVisible es true */}
            {isTerminalVisible && (
              <div
                className="cursor-ns-resize hover:bg-accent transition-colors"
                style={{
                  background: isResizingTerminal ? "var(--accent)" : "transparent",
                  height: "3px",
                  flexShrink: 0,
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
                  transition: isResizingTerminal ? "none" : "height 0.2s ease",
                }}
              >
                <div
                  className="flex h-9 border-b items-center px-4"
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
                    isBooting={isBooting}
                    onReady={() => {
                      setTimeout(() => terminalAreaRef.current?.fitTerminal?.(), 100);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Barra inferior con Submit */}
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