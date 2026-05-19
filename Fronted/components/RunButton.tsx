// src/components/RunButton.tsx

import { useState } from "react";
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";
import { runCode } from "../services/api";

export default function RunButton() {

  const {
    openTabs,
    activeTabId,
    setOutput,
    setIsRunning,
    isRunning
  } = useStore();

  const t = useTheme();

  const [hovered, setHovered] = useState(false);

  const run = async () => {

    const tab = openTabs.find(
      tab => tab.fileId === activeTabId
    );

    if (!tab) return;

    const { content, language, name } = tab;

    // HTML / JSX preview
    if (
      language === "html" ||
      name.endsWith(".jsx")
    ) {
      setOutput("Renderizando en preview...");
      return;
    }

    try {

      setIsRunning(true);
      setOutput("");

      const res = await runCode(
        content,
        language
      );

      setOutput(
        res.output || JSON.stringify(res)
      );

    } catch (err: unknown) {

      // Manejo seguro del error
      if (err instanceof Error) {

        setOutput(
          `❌ Error: ${err.message}`
        );

      } else {

        setOutput(
          "❌ Error desconocido"
        );

      }

    } finally {

      setIsRunning(false);

    }
  };

  return (
    <button
      onClick={run}
      disabled={isRunning}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? t.bgButtonHover
          : t.bgButton,

        color: "#fff",
        border: "none",
        padding: "4px 12px",
        borderRadius: 4,

        cursor: isRunning
          ? "not-allowed"
          : "pointer",

        fontFamily: t.fontUI,
        fontSize: 12,
        fontWeight: 600,

        display: "flex",
        alignItems: "center",
        gap: 6,

        opacity: isRunning ? 0.7 : 1,

        transition: "background 0.15s",
      }}
    >
      {isRunning ? "⏳" : "▶"}

      {isRunning
        ? "Running..."
        : "Run"}
    </button>
  );
}