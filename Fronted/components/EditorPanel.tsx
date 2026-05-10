// src/components/EditorPanel.tsx
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { HTMLHint } from "htmlhint";
import { useStore } from "../store/useStore";
import PreviewPanel from "./PreviewPanel";

// Función para validar HTML con HTMLHint
function validateHTMLWithHint(code: string) {
  if (!code || code.trim() === "") return [];
  
  const results = HTMLHint.verify(code);
  
  return results.map(r => ({
    line: r.line,
    column: r.col || 1,
    message: r.message,
    rule: r.rule,
  }));
}

// Función para validar HTML con DOMParser (más estricta)
function isValidHTML(html: string) {
  if (!html || html.trim() === "") return true;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const hasError = doc.querySelector("parsererror");
  
  return !hasError;
}

// Función para obtener errores adicionales del DOMParser
function getDOMParserErrors(html: string) {
  if (!html || html.trim() === "") return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const errorElement = doc.querySelector("parsererror");
  
  if (errorElement) {
    const errorMessage = errorElement.textContent || "Error de parseo HTML";
    return [{
      line: 1,
      column: 1,
      message: errorMessage,
      rule: "parsererror",
    }];
  }
  
  return [];
}

// Función para combinar todas las validaciones
function validateHTML(code: string) {
  const hintErrors = validateHTMLWithHint(code);
  const parserErrors = getDOMParserErrors(code);
  
  // Combinar errores y eliminar duplicados
  const allErrors = [...hintErrors, ...parserErrors];
  
  // Agrupar por mensaje para evitar duplicados
  const uniqueErrors = allErrors.filter((error, index, self) =>
    index === self.findIndex((e) => e.message === error.message)
  );
  
  return uniqueErrors;
}

// Función para establecer errores en el editor Monaco
function setEditorErrors(model: monaco.editor.ITextModel | null, errors: any[]) {
  if (!model) return;
  
  const markers = errors.map(err => ({
    startLineNumber: Math.max(1, err.line),
    startColumn: Math.max(1, err.column),
    endLineNumber: Math.max(1, err.line),
    endColumn: 100,
    message: err.message,
    severity: monaco.MarkerSeverity.Warning,
    source: "HTMLHint",
  }));
  
  monaco.editor.setModelMarkers(model, "html-validator", markers);
}

export default function EditorPanel() {
  const { openTabs, activeTabId, setActiveTabId, setOpenTabs, theme } = useStore();
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);

  const tab = openTabs.find(t => t.fileId === activeTabId);
  
  // Extraer archivos HTML, JS y CSS de las pestañas abiertas
  const htmlFile = openTabs.find(t => t.name.endsWith(".html"));
  const jsFile = openTabs.find(t => t.name.endsWith(".js"));
  const cssFile = openTabs.find(t => t.name.endsWith(".css"));

  const htmlCode = htmlFile?.content || "";
  const jsCode = jsFile?.content || "";
  const cssCode = cssFile?.content || "";

  const updateCode = (val: string) => {
    setOpenTabs(
      openTabs.map(t =>
        t.fileId === activeTabId ? { ...t, content: val } : t
      )
    );
  };

  // Manejar cambios en el editor con validación
  const handleEditorChange = (val: string | undefined) => {
    const code = val ?? "";
    updateCode(code);
    
    // Solo validar HTML si el archivo actual es HTML
    if (tab?.name.endsWith(".html")) {
      const errors = validateHTML(code);
      setValidationErrors(errors);
      
      // Establecer errores en el editor Monaco
      if (modelRef.current) {
        setEditorErrors(modelRef.current, errors);
      }
    } else {
      // Limpiar errores si no es HTML
      setValidationErrors([]);
      if (modelRef.current) {
        monaco.editor.setModelMarkers(modelRef.current, "html-validator", []);
      }
    }
  };

  // Cuando el editor se monta, guardar la referencia y el modelo
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    const model = editor.getModel();
    modelRef.current = model;
    
    // Si es HTML, validar el contenido inicial
    if (tab?.name.endsWith(".html") && tab?.content) {
      const errors = validateHTML(tab.content);
      setValidationErrors(errors);
      setEditorErrors(model, errors);
    }
  };

  const closeTab = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.fileId !== fileId);
    setOpenTabs(newTabs);
    
    // Si cerramos la pestaña activa, activamos la primera pestaña restante
    if (activeTabId === fileId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].fileId);
    } else if (newTabs.length === 0) {
      setActiveTabId("");
    }
  };

  // Función para guardar archivos en el backend
  async function saveFiles(html: string, js: string, css: string) {
    // Validar HTML antes de guardar
    const isValid = isValidHTML(html);
    
    try {
      const response = await fetch("http://localhost:3001/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          html, 
          js, 
          css,
          isValid,
          errors: validationErrors 
        }),
      });
      
      if (response.ok) {
        console.log("✅ Archivos guardados correctamente en el servidor");
        if (!isValid) {
          console.warn("⚠️ El HTML contiene errores de validación");
        }
      } else {
        console.error("❌ Error al guardar archivos:", response.statusText);
      }
    } catch (err) {
      console.error("❌ Error enviando código al servidor:", err);
    }
  }

  // Auto-guardado con debounce
  useEffect(() => {
    // Evitar enviar vacío al inicio
    if (!htmlCode && !jsCode && !cssCode) return;

    const timeout = setTimeout(() => {
      saveFiles(htmlCode, jsCode, cssCode);
    }, 500); // debounce de 500ms para evitar saturar el servidor

    return () => clearTimeout(timeout);
  }, [htmlCode, jsCode, cssCode, validationErrors]);

  const isDark = theme === "dark";

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      background: isDark ? "#1e1e1e" : "#ffffff",
    }}>
      {/* TABS BAR */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: isDark ? "#2d2d2d" : "#f3f3f3",
        borderBottom: `1px solid ${isDark ? "#3e3e42" : "#e0e0e0"}`,
        paddingRight: 8,
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
          {openTabs.map(tab => (
            <div
              key={tab.fileId}
              onClick={() => setActiveTabId(tab.fileId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                cursor: "pointer",
                background: activeTabId === tab.fileId
                  ? isDark ? "#1e1e1e" : "#ffffff"
                  : "transparent",
                borderRight: `1px solid ${isDark ? "#3e3e42" : "#e0e0e0"}`,
                fontSize: 12,
                fontFamily: "Segoe UI, sans-serif",
                color: activeTabId === tab.fileId
                  ? isDark ? "#ffffff" : "#000000"
                  : isDark ? "#cccccc" : "#666666",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                if (activeTabId !== tab.fileId) {
                  e.currentTarget.style.background = isDark ? "#2a2d2e" : "#e8e8e8";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTabId !== tab.fileId) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span>{tab.name}</span>
              <span
                onClick={(e) => closeTab(e, tab.fileId)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  fontSize: 12,
                  cursor: "pointer",
                  color: isDark ? "#cccccc" : "#666666",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "#3e3e42" : "#d0d0d0";
                  e.currentTarget.style.color = isDark ? "#ffffff" : "#000000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = isDark ? "#cccccc" : "#666666";
                }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>

        {/* Indicador de errores de validación */}
        {validationErrors.length > 0 && tab?.name.endsWith(".html") && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginRight: 8,
            padding: "2px 8px",
            background: "#f44336",
            borderRadius: 4,
          }}>
            <span style={{ fontSize: 12 }}>⚠️</span>
            <span style={{
              fontSize: 10,
              color: "#ffffff",
              fontFamily: "Segoe UI, sans-serif",
            }}>
              {validationErrors.length} error(es) HTML
            </span>
          </div>
        )}

        {/* Info de auto-guardado */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginRight: 8,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: (htmlCode || jsCode || cssCode) ? "#4caf50" : "#858585",
            animation: (htmlCode || jsCode || cssCode) ? "pulse 1.5s infinite" : "none",
          }} />
          <span style={{
            fontSize: 10,
            color: isDark ? "#858585" : "#999",
            fontFamily: "Segoe UI, sans-serif",
          }}>
            Auto-save
          </span>
        </div>

        {/* Preview Toggle Button */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: showPreview 
              ? isDark ? "#007acc" : "#0066b3"
              : "transparent",
            border: `1px solid ${isDark ? "#3e3e42" : "#d0d0d0"}`,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "Segoe UI, sans-serif",
            color: showPreview 
              ? "#ffffff"
              : isDark ? "#cccccc" : "#666666",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!showPreview) {
              e.currentTarget.style.background = isDark ? "#2a2d2e" : "#e8e8e8";
              e.currentTarget.style.color = isDark ? "#ffffff" : "#000000";
            }
          }}
          onMouseLeave={(e) => {
            if (!showPreview) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#cccccc" : "#666666";
            }
          }}
          title={showPreview ? "Ocultar preview" : "Mostrar preview"}
        >
          <span style={{ fontSize: 14 }}>🌐</span>
          <span>Preview</span>
        </button>
      </div>

      {/* EDITOR + PREVIEW SPLIT VIEW */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: showPreview ? "row" : "column",
        overflow: "hidden",
      }}>
        {/* Editor Area */}
        <div style={{
          flex: showPreview ? 1 : 1,
          minWidth: showPreview ? "300px" : "auto",
          height: "100%",
          overflow: "hidden",
        }}>
          {tab ? (
            <Editor
              height="100%"
              theme={isDark ? "vs-dark" : "light"}
              language={tab.language}
              value={tab.content}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "Consolas, 'Courier New', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderValidationDecorations: "on",
              }}
            />
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: isDark ? "#cccccc" : "#666666",
              fontFamily: "Segoe UI, sans-serif",
              fontSize: 14,
              background: isDark ? "#1e1e1e" : "#ffffff",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <div>No hay archivos abiertos</div>
                <div style={{ fontSize: 12, marginTop: 8, color: isDark ? "#858585" : "#999" }}>
                  Selecciona un archivo del explorador para comenzar
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel (condicional) */}
        {showPreview && (
          <>
            {/* Resize Handle */}
            <div
              style={{
                width: 4,
                cursor: "col-resize",
                background: isDark ? "#3e3e42" : "#e0e0e0",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#007acc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#3e3e42" : "#e0e0e0";
              }}
            />
            
            {/* Preview Area */}
            <div style={{
              flex: 1,
              minWidth: "300px",
              overflow: "hidden",
              background: isDark ? "#252526" : "#f5f5f5",
            }}>
              <PreviewPanel />
            </div>
          </>
        )}
      </div>

      {/* Panel de errores de validación (parte inferior) */}
      {validationErrors.length > 0 && tab?.name.endsWith(".html") && (
        <div style={{
          height: 120,
          background: isDark ? "#252526" : "#f3f3f3",
          borderTop: `1px solid ${isDark ? "#3e3e42" : "#e0e0e0"}`,
          overflowY: "auto",
          padding: "8px 12px",
          fontSize: 12,
          fontFamily: "Consolas, monospace",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: `1px solid ${isDark ? "#3e3e42" : "#e0e0e0"}`,
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontWeight: 600, color: isDark ? "#f48771" : "#d32f2f" }}>
              Problemas de validación HTML ({validationErrors.length})
            </span>
          </div>
          {validationErrors.map((error, idx) => (
            <div key={idx} style={{
              display: "flex",
              gap: 12,
              padding: "4px 0",
              color: isDark ? "#cccccc" : "#666666",
              borderBottom: `1px solid ${isDark ? "#2d2d2d" : "#e8e8e8"}`,
            }}>
              <span style={{ minWidth: 50, color: isDark ? "#858585" : "#999" }}>
                Línea {error.line}
              </span>
              <span style={{ flex: 1, color: isDark ? "#f48771" : "#d32f2f" }}>
                {error.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Estilos CSS para la animación del indicador de auto-guardado */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}