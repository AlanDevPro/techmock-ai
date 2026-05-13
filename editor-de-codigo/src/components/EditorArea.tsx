"use client";

import { useState, useEffect, useRef } from "react";
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

export default function EditorArea({
  activeFile,
  fileSystem,
  onCursorChange,
  onContentChange,
}: EditorAreaProps) {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>([activeFile]);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!openTabs.includes(activeFile)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenTabs((prev) => [...prev, activeFile]);
    }
    if (fileSystem[activeFile] !== undefined) {
      setContent(fileSystem[activeFile]);
    } else {
      setContent("");
    }
  }, [activeFile, fileSystem]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      onContentChange?.(activeFile, value);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      const timerId = window.setTimeout(() => {
        updateFile(activeFile, value);
      }, 300);
      saveTimerRef.current = timerId;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCursorPositionChange = (editor: any) => {
    const position = editor.getPosition();
    if (position && onCursorChange) {
      onCursorChange(position.lineNumber, position.column);
    }
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => prev.filter((t) => t !== path));
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              onClick={() => {
                if (fileSystem[tab] !== undefined) setContent(fileSystem[tab]);
              }}
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

      <div className="flex-1 w-full pt-1 relative">
        <MonacoEditor
          height="100%"
          language={getLanguage(activeFile)}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={content}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          path={activeFile}
          onMount={(editor) => {
            editor.onDidChangeCursorPosition(() => handleCursorPositionChange(editor));
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
          }}
        />
      </div>
    </div>
  );
}