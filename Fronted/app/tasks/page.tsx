'use client'

//import FileExplorer from "../../components/FileExplorer";
import FileExplorer from "../../components/FileExplorer";
import EditorPanel from "../../components/EditorPanel";
import PreviewPanel from "../../components/PreviewPanel";
import OutputPanel from "../../components/OutputPanel";
import StatusBar from "../../components/StatusBar";
import TopBar from "../../components/TopBar";
import { useTheme } from "../../hooks/useTheme";

export default function TasksPage() {
  const t = useTheme();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: t.bg,
      color: t.text,
      overflow: "hidden",
      fontFamily: t.fontUI,
    }}>
      <TopBar />

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: 340 }}>
          <FileExplorer />
        </div>

        <div style={{ flex: 1 }}>
          <EditorPanel />
        </div>
      </div>

      <div style={{ height: 180 }}>
        <OutputPanel />
      </div>

      <StatusBar />
    </div>
  );
}