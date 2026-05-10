// src/components/PreviewPanel.tsx
import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";

export default function PreviewPanel() {
  const { openTabs } = useStore();
  const t = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Buscar archivos HTML y JS
  const htmlFile = openTabs.find(tab => tab.name.endsWith(".html"));
  const jsFile = openTabs.find(tab => tab.name.endsWith(".js"));
  const cssFile = openTabs.find(tab => tab.name.endsWith(".css"));
  
  const html = htmlFile?.content || "";
  const js = jsFile?.content || "";
  const css = cssFile?.content || "";

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: #ffffff;
            color: #333333;
          }
          
          /* Estilos CSS en tiempo real */
          ${css}
          
          /* Estilos para errores */
          .preview-error {
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
        </style>
      </head>
      <body>
        ${html}
        
        <div id="preview-error" style="display: none;"></div>
        
        <script>
          try {
            // Ejecutar código JavaScript
            ${js}
          } catch (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'preview-error';
            errorDiv.innerHTML = '⚠️ Error: ' + error.message;
            document.body.appendChild(errorDiv);
            console.error('Preview Error:', error);
          }
          
          // Capturar errores asíncronos
          window.onerror = function(msg, url, line, col, error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'preview-error';
            errorDiv.innerHTML = '⚠️ Error: ' + msg;
            document.body.appendChild(errorDiv);
            return false;
          };
        </script>
      </body>
    </html>
  `;

  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Actualizar el iframe cuando cambie el contenido
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
    }
  }, [srcDoc, refreshKey]);

  const isDark = t.bgPanel === "#2d2d30";

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: t.bgPanel,
    }}>
      {/* Header */}
      <div style={{
        height: 35,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        background: t.bgPanel,
        borderBottom: `1px solid ${t.border}`,
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: t.fontUI,
          color: t.textMuted,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          🌐 Live Preview
        </span>
        
        <div style={{
          flex: 1,
          background: t.bgInput,
          border: `1px solid ${t.border}`,
          borderRadius: 3,
          padding: "2px 8px",
          fontSize: 11,
          color: t.textMuted,
          fontFamily: t.fontMono || "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {htmlFile ? htmlFile.name : "Sin archivo HTML"}
        </div>
        
        <button 
          onClick={refreshPreview}
          style={{
            background: "transparent",
            border: "none",
            color: t.textMuted,
            cursor: "pointer",
            fontSize: 14,
            padding: "4px 6px",
            borderRadius: 3,
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.bgHover;
            e.currentTarget.style.color = t.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = t.textMuted;
          }}
          title="Actualizar preview"
        >
          🔄
        </button>
      </div>

      {/* iframe */}
      <iframe
        ref={iframeRef}
        key={refreshKey}
        title="live-preview"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "#ffffff",
        }}
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
      />
      
      {/* Info footer */}
      <div style={{
        height: 24,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        background: t.bgPanel,
        borderTop: `1px solid ${t.border}`,
        fontSize: 10,
        color: t.textMuted,
        fontFamily: t.fontUI,
        gap: 12,
      }}>
        <span>🟢 Live reload</span>
        <span>📄 {htmlFile ? "HTML cargado" : "Esperando HTML"}</span>
        {jsFile && <span>⚡ JS activo</span>}
        {cssFile && <span>🎨 CSS activo</span>}
      </div>
    </div>
  );
}