"use client";

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { updateFile } from '@/lib/webcontainer';

interface EditorAreaProps {
  activeFile: string;
  fileSystem: { [key: string]: string };
}

export default function EditorArea({ activeFile, fileSystem }: EditorAreaProps) {
  const [content, setContent] = useState('');
  
  useEffect(() => {
    if (fileSystem[activeFile] !== undefined) {
      setContent(fileSystem[activeFile]);
    } else {
      setContent('');
    }
  }, [activeFile, fileSystem]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      fileSystem[activeFile] = value;
      updateFile(activeFile, value);
    }
  };

  const getLanguage = (file: string) => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) return 'typescript';
    if (file.endsWith('.js') || file.endsWith('.jsx')) return 'javascript';
    if (file.endsWith('.json')) return 'json';
    if (file.endsWith('.css')) return 'css';
    if (file.endsWith('.html')) return 'html';
    if (file.endsWith('.vue')) return 'html'; // default highlight for vue in generic monaco
    return 'plaintext';
  };

  const handleEditorWillMount = (monaco: any) => {
    // 🔥 1. CONFIGURACIÓN PARA TYPESCRIPT (TS / TSX)
    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    // Tipos simulados para React, Vue y el entorno en general JSX/JS
    const extraTypes = `
      declare module 'react' {
        export = React;
      }
      declare namespace React {
        function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
      }
      declare namespace JSX {
        interface IntrinsicElements {
          [elemName: string]: any;
        }
      }
      declare module 'vue' {
        export function ref<T>(value: T): { value: T };
        export function reactive<T>(target: T): T;
        export function computed<T>(getter: () => T): { value: T };
        export function onMounted(callback: () => void): void;
      }
    `;

    // Aplicar a TypeScript (archivos .ts, .tsx)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(extraTypes, 'file:///node_modules/@types/global/index.d.ts');
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // 🔥 2. CONFIGURACIÓN PARA JAVASCRIPT (JS / JSX)
    // Aplicar lo mismo al validador de JS para que no haya falsos errores en archivos .js
    monaco.languages.typescript.javascriptDefaults.addExtraLib(extraTypes, 'file:///node_modules/@types/global/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // 🔥 3. CONFIGURACIÓN PARA HTML / VUE (.html, .vue)
    // Al formatear vue como HTML, evitamos que marque atributos personalizados (como @click, v-if, etc) como erróneos.
    if (monaco.languages.html && monaco.languages.html.htmlDefaults) {
      monaco.languages.html.htmlDefaults.setOptions({
        suggest: { html5: true },
        format: {
          enable: true,
          unformatted: '',
          wrapAttributes: 'auto'
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e]">
      <div className="flex h-9 bg-[#252526] overflow-x-auto shrink-0 border-b border-[#1e1e1e]">
        <div className="flex items-center px-4 bg-[#1e1e1e] border-t-2 border-[#007acc] text-[#cccccc] cursor-pointer min-w-[120px] max-w-[200px] text-[13px]">
           <span className="truncate">{activeFile.split('/').pop()}</span>
        </div>
      </div>
      <div className="flex-1 w-full pt-1 relative">
        <Editor
          height="100%"
          language={getLanguage(activeFile)}
          theme="vs-dark"
          value={content}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          path={activeFile}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 10 }
          }}
        />
      </div>
    </div>
  );
}
