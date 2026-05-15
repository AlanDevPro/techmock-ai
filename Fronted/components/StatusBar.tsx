// src/components/StatusBar.tsx
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";

export default function StatusBar() {
  const { openTabs, activeTabId } = useStore();
  const t = useTheme();

  const activeTab = openTabs.find(tab => tab.fileId === activeTabId);
  const language = activeTab?.language ?? "plaintext";
  const fileName = activeTab?.name ?? "";

  return (
    <div style={{
      height: 25,
      background: t.bgStatusBar,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 12px",
      color: "#fff",
      fontSize: 11,
      fontFamily: t.fontUI,
      userSelect: "none",
      flexShrink: 0,
    }}>
      {/* Izquierda */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>⎇</span>
          <span>main</span>
        </span>
        <span>✓ 0  ⚠ 0</span>
      </div>

      {/* Derecha */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {fileName && <span>{fileName}</span>}
        <span>Ln 1, Col 1</span>
        <span>UTF-8</span>
        <span>CRLF</span>
        <span style={{ textTransform: "capitalize" }}>{language}</span>
      </div>
    </div>
  );
}