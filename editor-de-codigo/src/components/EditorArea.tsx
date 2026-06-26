"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { updateFile } from "@/lib/webcontainer";
import { useTheme } from "./IDE";
import {
  X,
  LayoutPanelLeft,
  MoreHorizontal,
  FileCode,
  FileJson,
  FileType2,
  FileBox,
} from "lucide-react";

interface EditorAreaProps {
  activeFile: string;
  fileSystem: { [key: string]: string };
  onCursorChange?: (line: number, column: number) => void;
  onContentChange?: (file: string, content: string) => void;
  onSelectFile?: (file: string) => void;
}

const getFileIcon = (filename: string) => {
  if (filename.endsWith(".vue"))
    return <FileCode size={13} className="text-green-400 shrink-0" />;
  if (filename.endsWith(".ts") || filename.endsWith(".tsx"))
    return <FileType2 size={13} className="text-blue-400 shrink-0" />;
  if (filename.endsWith(".js") || filename.endsWith(".jsx"))
    return <FileType2 size={13} className="text-yellow-400 shrink-0" />;
  if (filename.endsWith(".json"))
    return <FileJson size={13} className="text-yellow-200 shrink-0" />;
  if (filename.endsWith(".css"))
    return <FileBox size={13} className="text-blue-300 shrink-0" />;
  if (filename.endsWith(".html"))
    return <FileCode size={13} className="text-orange-400 shrink-0" />;
  return <FileBox size={13} className="text-gray-400 shrink-0" />;
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center text-xs"
      style={{ color: "var(--text-secondary)" }}
    >
      Cargando editor...
    </div>
  ),
});

const EditorArea = memo(function EditorArea({
  activeFile,
  fileSystem,
  onCursorChange,
  onContentChange,
  onSelectFile,
}: EditorAreaProps) {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>([activeFile]);
  const saveTimerRef = useRef<number | null>(null);
  const editorRef = useRef<any>(null);
  const isInternalUpdate = useRef(false);
  const isUserTyping = useRef(false);
  const lastSavedContent = useRef("");

  // 🔥 OBTENER EL CONTENIDO ACTUAL DEL SISTEMA DE ARCHIVOS
  const getCurrentContent = useCallback(() => {
    return fileSystem[activeFile] || "";
  }, [fileSystem, activeFile]);

  // 🔥 ACTUALIZAR CONTENIDO CUANDO CAMBIA EL ARCHIVO (NO cuando cambia fileSystem)
  useEffect(() => {
    const newContent = getCurrentContent();
    
    // Solo actualizar si el archivo cambió y no estamos en medio de una escritura
    if (!isUserTyping.current && newContent !== content) {
      console.log(`📄 EditorArea - Actualizando contenido para: ${activeFile}`);
      setContent(newContent);
    }
    
    // Agregar el archivo a las pestañas abiertas si no existe
    if (!openTabs.includes(activeFile)) {
      setOpenTabs((prev) => [...prev, activeFile]);
    }
  }, [activeFile]); // 🔥 SOLO DEPENDE DE activeFile, NO de fileSystem

  // 🔥 EFECTO PARA SINCronizar EL EDITOR CON EL CONTENIDO (SOLO CUANDO CAMBIA EL ARCHIVO)
  useEffect(() => {
    if (editorRef.current && content !== undefined && !isUserTyping.current) {
      const currentValue = editorRef.current.getValue();
      // Solo actualizar si el contenido es diferente y no estamos escribiendo
      if (currentValue !== content) {
        isInternalUpdate.current = true;
        editorRef.current.setValue(content);
        isInternalUpdate.current = false;
      }
    }
  }, [content]); // 🔥 SOLO DEPENDE DE content

  // 🔥 MANEJO DE CAMBIOS EN EL EDITOR - CORREGIDO
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || isInternalUpdate.current) return;
    
    // Marcar que el usuario está escribiendo
    isUserTyping.current = true;
    
    // Actualizar el estado local
    setContent(value);
    
    // Debounce para guardar en WebContainer y fileSystem
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    
    // Guardar después de que el usuario deje de escribir (500ms)
    const timerId = window.setTimeout(() => {
      // Actualizar fileSystem
      onContentChange?.(activeFile, value);
      
      // Guardar en WebContainer
      updateFile(activeFile, value)
        .then(() => {
          console.log(`✅ Archivo ${activeFile} guardado correctamente`);
          lastSavedContent.current = value;
          // Desmarcar que el usuario está escribiendo DESPUÉS de guardar
          isUserTyping.current = false;
        })
        .catch((error) => {
          console.error(`❌ Error al guardar ${activeFile}:`, error);
          isUserTyping.current = false;
        });
    }, 500); // 🔥 AUMENTADO A 500ms PARA MEJOR RENDIMIENTO
    
    saveTimerRef.current = timerId;
  };

  const handleCursorPositionChange = (editor: any) => {
    const position = editor.getPosition();
    if (position && onCursorChange) {
      onCursorChange(position.lineNumber, position.column);
    }
  };

  // Cerrar pestaña
  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (openTabs.length <= 1) return;
    
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    
    if (path === activeFile && newTabs.length > 0) {
      const newActiveFile = newTabs[0];
      const newContent = fileSystem[newActiveFile] || "";
      setContent(newContent);
      onSelectFile?.(newActiveFile);
    }
  };

  // Seleccionar pestaña
  const selectTab = (path: string) => {
    if (path !== activeFile) {
      // Si hay un timer de guardado pendiente, ejecutarlo antes de cambiar
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        const currentValue = editorRef.current?.getValue() || "";
        if (currentValue !== lastSavedContent.current) {
          onContentChange?.(activeFile, currentValue);
          updateFile(activeFile, currentValue).catch(console.error);
        }
        saveTimerRef.current = null;
      }
      
      const newContent = fileSystem[path] || "";
      setContent(newContent);
      isUserTyping.current = false;
      onSelectFile?.(path);
    }
  };

  const getLanguage = (file: string) => {
    if (file.endsWith(".ts") || file.endsWith(".tsx")) return "typescript";
    if (file.endsWith(".js") || file.endsWith(".jsx")) return "javascript";
    if (file.endsWith(".json")) return "json";
    if (file.endsWith(".css")) return "css";
    if (file.endsWith(".html")) return "html";
    if (file.endsWith(".vue")) return "html";
    return "plaintext";
  };

  const handleEditorWillMount = (monaco: any) => {
    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    const extraTypes = `
      declare module 'react' { export = React; }
      declare namespace React {
        function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
      }
      declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }
      declare module 'vue' {
        export function ref<T>(value: T): { value: T };
        export function reactive<T>(target: T): T;
        export function computed<T>(getter: () => T): { value: T };
        export function onMounted(callback: () => void): void;
      }
    `;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      extraTypes,
      "file:///node_modules/@types/global/index.d.ts"
    );
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      extraTypes,
      "file:///node_modules/@types/global/index.d.ts"
    );
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    if (monaco.languages.html?.htmlDefaults) {
      monaco.languages.html.htmlDefaults.setOptions({
        suggest: { html5: true },
        format: { enable: true, unformatted: "", wrapAttributes: "auto" },
      });
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* BARRA DE PESTAÑAS */}
      <div
        className="flex h-9 overflow-x-auto shrink-0 border-b items-end"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        {openTabs.map((tab) => {
          const isActive = tab === activeFile;
          const fileName = tab.split("/").pop() ?? tab;
          return (
            <div
              key={tab}
              onClick={() => selectTab(tab)}
              className="flex items-center gap-1.5 px-3 cursor-pointer group shrink-0 border-r transition-colors"
              style={{
                height: "36px",
                background: isActive ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                borderTop: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                borderRight: `1px solid var(--border)`,
                color: isActive ? "var(--text-heading)" : "var(--text-secondary)",
                minWidth: "120px",
                maxWidth: "180px",
              }}
            >
              {getFileIcon(fileName)}
              <span className="text-[12px] truncate flex-1">{fileName}</span>
              <button
                onClick={(e) => closeTab(tab, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0 rounded p-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <div className="ml-auto flex items-center px-2 gap-1">
          <button
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-secondary)" }}
            title="Split editor"
          >
            <LayoutPanelLeft size={14} />
          </button>
          <button
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-secondary)" }}
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* EDITOR */}
      <div className="flex-1 w-full pt-1 relative">
        <MonacoEditor
          key={activeFile} // Solo cambia cuando cambia el archivo, no el contenido
          height="100%"
          language={getLanguage(activeFile)}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={content}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          path={activeFile}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.onDidChangeCursorPosition(() => handleCursorPositionChange(editor));
            
            // Asegurar que el contenido correcto se muestre al montar
            const currentContent = getCurrentContent();
            if (currentContent && editor.getValue() !== currentContent) {
              isInternalUpdate.current = true;
              editor.setValue(currentContent);
              isInternalUpdate.current = false;
              lastSavedContent.current = currentContent;
            }
            
            editor.updateOptions({
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              minimap: { enabled: false },
              scrollbar: { 
                vertical: 'visible', 
                horizontal: 'visible',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 10 },
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            renderLineHighlight: "line",
            automaticLayout: true,
            tabSize: 2,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
});

export default EditorArea;