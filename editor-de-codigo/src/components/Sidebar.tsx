"use client";

import { ActivityView } from "./ActivityBar";
import ExplorerPanel from "./ExplorerPanel";
import SearchPanel from "./SearchPanel";
import QuestionPanel from "./QuestionPanel";
import { getWebContainer, fileExists, readFileContent } from "@/lib/webcontainer";

interface SidebarProps {
  activeView: ActivityView;
  activeFile: string;
  onSelectFile: (file: string, line?: number) => void;
  files: { [key: string]: string };
  onFsUpdate: (
    updater: (prev: { [key: string]: string }) => { [key: string]: string }
  ) => void;
  onRefresh: () => void;
  selectedFramework: "vuejs" | "nextjs" | null;
  isQuestionOpen: boolean;
  onToggleOpen: () => void;
  isVisible?: boolean;
  width?: number;
  onResize?: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export default function Sidebar({
  activeView,
  activeFile,
  onSelectFile,
  files,
  onFsUpdate,
  onRefresh,
  selectedFramework,
  isQuestionOpen,
  onToggleOpen,
  isVisible = true,
  width = 256,
  onResize,
  onResizeStart,
  onResizeEnd,
}: SidebarProps) {
  // 🔥 MEJORADA: handleFileSelect con carga automática desde WebContainer
  const handleFileSelect = async (file: string, line?: number) => {
    console.log("📁 Sidebar - archivo seleccionado:", file);
    
    // Si el archivo no existe en fileSystem, intentar cargarlo desde WebContainer
    if (!files[file]) {
      console.warn(`⚠️ Archivo no encontrado en fileSystem: ${file}`);
      
      try {
        const container = getWebContainer();
        if (container) {
          // Verificar si el archivo existe en WebContainer
          const exists = await fileExists(file);
          
          if (exists) {
            // Cargar el contenido desde WebContainer
            const content = await readFileContent(file);
            // Actualizar fileSystem con el contenido
            onFsUpdate(prev => ({ ...prev, [file]: content }));
            console.log(`✅ Archivo cargado desde WebContainer: ${file}`);
          } else {
            // Crear el archivo en WebContainer
            await container.fs.writeFile(file.startsWith('/') ? file.substring(1) : file, '');
            onFsUpdate(prev => ({ ...prev, [file]: '' }));
            console.log(`✅ Archivo creado en WebContainer: ${file}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error al cargar archivo ${file}:`, error);
      }
    }
    
    // Abrir el archivo
    onSelectFile(file, line);
  };

  const renderContent = () => {
    switch (activeView) {
      case "problem":
        return (
          <QuestionPanel 
            selectedFramework={selectedFramework} 
            isQuestionOpen={isQuestionOpen} 
            onToggleOpen={onToggleOpen} 
          />
        );
      case "explorer":
        return (
          <ExplorerPanel
            activeFile={activeFile}
            onSelectFile={handleFileSelect}
            files={files}
            onFsUpdate={onFsUpdate}
            onRefresh={onRefresh}
          />
        );
      case "search":
        return (
          <SearchPanel 
            files={files} 
            onSelectFile={handleFileSelect} 
          />
        );
      case "settings":
        return (
          <div className="p-4" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
            <h2 className="text-sm font-semibold mb-4">Configuración</h2>
            <p className="text-sm opacity-70">Configuración del IDE (próximamente)</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="flex flex-col shrink-0 border-r overflow-hidden"
      style={{
        width: `${width}px`,
        minWidth: "0px",
        maxWidth: "500px",
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
        transition: 'width 0.2s ease'
      }}
    >
      {renderContent()}
    </div>
  );
}