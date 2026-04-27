"use client";

import { ActivityView } from "./ActivityBar";
import ExplorerPanel from "./ExplorerPanel";
import SearchPanel from "./SearchPanel";
import QuestionPanel from "./QuestionPanel";

interface SidebarProps {
  activeView: ActivityView;
  activeFile: string;
  onSelectFile: (file: string, line?: number) => void;
  files: { [key: string]: string };
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
  // Función auxiliar para manejar la selección de archivos con log de depuración
  const handleFileSelect = (file: string, line?: number) => {
    console.log("📁 Sidebar - archivo seleccionado:", file);
    console.log("📁 Sidebar - línea (si existe):", line);
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