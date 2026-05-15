// src/components/TopBar.tsx
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";
import RunButton from "./RunButton";

export default function TopBar() {
  const { theme, setTheme } = useStore();
  const t = useTheme();

  return (
    <div style={{
      height: 40,
      background: t.bgTopBar,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      color: t.text,
      justifyContent: "space-between",
      borderBottom: `1px solid ${t.border}`,
      userSelect: "none",
      fontFamily: t.fontUI,
      fontSize: 13,
    }}>
      

      

      {/* Derecha: acciones */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <RunButton />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
          style={{
            background: "transparent",
            border: `1px solid ${t.border}`,
            color: t.text,
            borderRadius: 4,
            padding: "3px 8px",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>
      </div>
    </div>
  );
}