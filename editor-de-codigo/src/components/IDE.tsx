"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import ActivityBar from "./ActivityBar";
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
  const [questionData, setQuestionData] = useState<{
    pregunta_practica: string;
    comprension_a_evaluar: string;
    explicacion_codigo_esperado: string;
    error_por_falta_de_contexto?: string | null;
  } | null>(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(true);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<null | "running" | "success" | "error">(null);
  const hasLoadedQuestionsRef = useRef(false);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

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
      loadQuestions(framework);
    }
  }, []);

  const handleRefreshFs = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedFs = await readWebContainerFiles();
    setFileSystem(updatedFs);
    setIsRefreshing(false);
  };

  const loadQuestions = async (framework: "vuejs" | "nextjs") => {
    const endpoint = framework === "vuejs" ? "vue" : "next";
    setIsQuestionLoading(true);
    setQuestionError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/generar-preguntas/${endpoint}`);
      if (!response.ok) throw new Error("No se pudo obtener las preguntas");
      const data = await response.json();
      setQuestionData(data);
    } catch (error) {
      setQuestionData(null);
      setQuestionError("No se pudieron cargar las preguntas. Verifica la API RAG.");
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const handleRunTests = async () => {
    setSubmitStatus("running");
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitStatus("success");
    setTimeout(() => setSubmitStatus(null), 3000);
  };

  // ─── Submit Code: recopila fileSystem, llama al endpoint y redirige ──────────
  const handleSubmitCode = async () => {
    console.log("🚀 Iniciando handleSubmitCode...");
    
    setSubmitStatus("running");

    // 📍 LOG: Información del archivo activo
    console.log("📁 activeFile:", activeFile);
    
    // 📍 LOG: Todos los archivos disponibles en fileSystem
    console.log("📂 fileSystem keys:", Object.keys(fileSystem));
    console.log("📊 Total de archivos en fileSystem:", Object.keys(fileSystem).length);
    
    // 📍 LOG: Verificar si el archivo activo existe
    if (!fileSystem[activeFile]) {
      console.error("❌ El archivo activo no existe en fileSystem:", activeFile);
      console.log("📂 Archivos disponibles:", Object.keys(fileSystem));
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    // 📍 LOG: Contenido del archivo activo
    const codigoCompleto = fileSystem[activeFile];
    console.log("📄 contenido del archivo activo:");
    console.log("📏 Longitud del código:", codigoCompleto?.length || 0, "caracteres");
    console.log("📝 Primeros 500 caracteres del código:");
    console.log(codigoCompleto?.substring(0, 500));
    console.log("📝 Últimos 200 caracteres del código:");
    console.log(codigoCompleto?.substring(Math.max(0, codigoCompleto.length - 200)));
    
    // 🔍 VALIDACIÓN: Verificar si hay código para enviar
    if (!codigoCompleto || codigoCompleto.trim().length === 0) {
      console.error("❌ No hay código válido para enviar");
      console.log("📄 codigoCompleto está:", codigoCompleto ? "presente" : "ausente");
      if (codigoCompleto) {
        console.log("📄 codigoCompleto.trim().length:", codigoCompleto.trim().length);
      }
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    // Determinar el framework para enviarlo al endpoint
    const frameworkApi =
      selectedFramework === "vuejs"
        ? "vue"
        : selectedFramework === "nextjs"
        ? "next"
        : "react";

    // 📍 LOG: Framework seleccionado
    console.log("🎯 Framework seleccionado:", selectedFramework);
    console.log("🔧 frameworkApi para el endpoint:", frameworkApi);
    
    // 📍 LOG: Construcción del objeto a enviar
    const payload = {
      codigo: codigoCompleto,
      framework: frameworkApi,
    };
    
    console.log("📦 Payload completo a enviar:");
    console.log("   - framework:", payload.framework);
    console.log("   - codigo length:", payload.codigo.length, "caracteres");
    console.log("   - codigo preview (primeros 200 chars):", payload.codigo.substring(0, 200));
    
    // 📍 LOG: Información adicional útil para debug
    console.log("🌐 URL del endpoint:", "http://127.0.0.1:8000/api/analizar-codigo");
    console.log("📋 Headers:", { "Content-Type": "application/json" });
    
    try {
      console.log("✈️ Enviando petición POST al backend...");
      
      const response = await fetch("http://127.0.0.1:8000/api/analizar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📡 Respuesta recibida del backend:");
      console.log("   - Status:", response.status);
      console.log("   - Status Text:", response.statusText);
      console.log("   - OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log("✅ Resultado recibido del backend:");
      console.log("   - Estructura completa:", resultado);
      console.log("   - Claves del resultado:", Object.keys(resultado));

      // 3. Guardar el resultado en sessionStorage para que /analisis lo lea
      sessionStorage.setItem("analisis_resultado", JSON.stringify(resultado));
      console.log("💾 Resultado guardado en sessionStorage con clave 'analisis_resultado'");

      setSubmitStatus("success");
      console.log("✅ Submit completado con éxito, redirigiendo a /analisis...");

      // 4. Redirigir a la página de análisis
      window.location.href = "http://localhost:3000/analisis";
      
    } catch (error) {
      console.error("❌ Error al analizar código:", error);
      console.error("Detalles del error:", {
        message: error instanceof Error ? error.message : "Error desconocido",
        stack: error instanceof Error ? error.stack : undefined,
      });
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

        <TopMenuBar theme={theme} toggleTheme={toggleTheme} selectedFramework={selectedFramework} />

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
              className="cursor-pointer px-3 py-0.5 rounded text-[11px] font-semibold border transition-colors"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Preview
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 22px - 36px - 28px)" }}>
          <LeftPanel />
          <ActivityBar />
          <Sidebar
            activeFile={activeFile}
            onSelectFile={setActiveFile}
            files={fileSystem}
            onRefresh={handleRefreshFs}
          />

          <div className="flex flex-col flex-1 h-full min-w-0">
            {/* Question panel */}
            <div
              className="border-b shrink-0"
              style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
            >
              <details
                open={isQuestionOpen}
                onToggle={(e) => setIsQuestionOpen((e.currentTarget as HTMLDetailsElement).open)}
              >
                <summary className="w-full flex items-center justify-between px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-widest cursor-pointer list-none">
                  <span>Preguntas de la prueba</span>
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {selectedFramework ? (selectedFramework === "vuejs" ? "Vue.js" : "Next.js") : "Sin seleccionar"}
                  </span>
                </summary>
                <div className="px-4 pb-3 text-[12px] max-h-56 overflow-auto" style={{ color: "var(--text-secondary)" }}>
                  {isQuestionLoading && <p>Cargando preguntas...</p>}
                  {questionError && (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-red-400">{questionError}</p>
                      {selectedFramework && (
                        <button onClick={() => loadQuestions(selectedFramework)} className="text-[11px] hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
                          Reintentar
                        </button>
                      )}
                    </div>
                  )}
                  {!isQuestionLoading && !questionError && !questionData && (
                    <p>Selecciona Vue.js o Next.js para cargar la pregunta técnica.</p>
                  )}
                  {!isQuestionLoading && !questionError && questionData && (
                    <div className="space-y-2">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--text-heading)" }}>
                        {questionData.pregunta_practica}
                      </p>
                      <p>{questionData.comprension_a_evaluar}</p>
                      <p className="whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                        {questionData.explicacion_codigo_esperado}
                      </p>
                      {questionData.error_por_falta_de_contexto && (
                        <p className="text-yellow-400">{questionData.error_por_falta_de_contexto}</p>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </div>

            {/* Editor + Preview */}
            <div className="flex-1 min-h-0 relative flex flex-row" style={{ background: "var(--bg-primary)" }}>
              {isBooting ? (
                <div className="flex items-center justify-center h-full w-full" style={{ color: "var(--text-secondary)" }}>
                  Arrancando micro-sistema operativo en la web...
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0 h-full">
                    <EditorArea activeFile={activeFile} fileSystem={fileSystem} />
                  </div>
                  <div
                    className="w-1/3 min-w-[300px] h-full hidden md:flex flex-col"
                    style={{ borderLeft: "1px solid var(--border)" }}
                  >
                    <div
                      className="h-9 flex items-center justify-between px-4 shrink-0 border-b text-[12px] font-semibold uppercase tracking-wider"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
                    >
                      <span>Output</span>
                      <div className="flex gap-1">
                        <button className="p-1 hover:opacity-70 rounded" title="Maximizar" style={{ color: "var(--text-secondary)" }}>⛶</button>
                        <button className="p-1 hover:opacity-70 rounded" title="Cerrar" style={{ color: "var(--text-secondary)" }}>✕</button>
                      </div>
                    </div>
                    <PreviewArea />
                  </div>
                </>
              )}
            </div>

            {/* Terminal */}
            <div className="h-64 border-t flex flex-col shrink-0" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
              <div className="flex h-9 border-b items-center px-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <span
                  className="text-[11px] font-semibold uppercase cursor-pointer border-b h-full flex items-center mb-[-1px]"
                  style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
                >
                  Terminal
                </span>
              </div>
              <div className="flex-1 relative overflow-hidden p-2" style={{ background: "var(--bg-primary)" }}>
                <TerminalArea isBooting={isBooting} />
              </div>
            </div>

            {/* Action bar */}
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
                onClick={handleRunTests}
                disabled={submitStatus === "running"}
                className="px-5 py-2 rounded text-white text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--btn-run-bg)" }}
              >
                Run Tests
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={submitStatus === "running"}
                className="px-5 py-2 rounded text-white text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--btn-submit-bg)" }}
              >
                Submit Code
              </button>
            </div>
          </div>
        </div>

        <StatusBar isBooting={isBooting} />
      </div>
    </ThemeContext.Provider>
  );
}