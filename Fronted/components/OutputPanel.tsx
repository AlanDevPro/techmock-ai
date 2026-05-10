// src/components/OutputPanel.tsx
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";

export default function OutputPanel() {
  const { output, isRunning } = useStore();
  const t = useTheme();

  return (
    <div style={{
      height: "100%",
      background: t.bgOutput,
      display: "flex",
      flexDirection: "column",
      borderTop: `1px solid ${t.border}`,
    }}>
      {/* Tab bar del panel */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: 30,
        background: t.bgPanel,
        borderBottom: `1px solid ${t.border}`,
        padding: "0 12px",
        gap: 4,
        flexShrink: 0,
      }}>
        {["TERMINAL", "OUTPUT", "PROBLEMS", "DEBUG"].map((tab, i) => (
          <span key={tab} style={{
            fontSize: 11,
            fontFamily: t.fontUI,
            color: i === 1 ? t.text : t.textMuted,
            padding: "4px 10px",
            cursor: "pointer",
            borderBottom: i === 1 ? `1px solid ${t.accent}` : "1px solid transparent",
            fontWeight: i === 1 ? 600 : 400,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            {tab}
          </span>
        ))}
      </div>

      {/* Contenido */}
      <div style={{
        flex: 1,
        padding: "8px 14px",
        fontFamily: t.fontMono,
        fontSize: 13,
        color: t.textOutput,
        overflowY: "auto",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {isRunning ? (
          <span style={{ color: t.warning }}>⏳ Running...</span>
        ) : output ? (
          <span>{output}</span>
        ) : (
          <span style={{ color: t.textMuted }}>// No output yet. Press ▶ Run to execute.</span>
        )}
      </div>
    </div>
  );
}