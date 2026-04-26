"use client";

import { useState } from "react";
import { BookOpen, ClipboardList, Trophy, type LucideIcon } from "lucide-react";

type PanelId = "problem" | "submissions" | "leaderboard";

const panelItems: { id: PanelId; icon: LucideIcon; label: string }[] = [
  { id: "problem",     icon: BookOpen,      label: "Problem"     },
  { id: "submissions", icon: ClipboardList, label: "Submissions" },
  { id: "leaderboard", icon: Trophy,        label: "Leaderboard" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function LeftPanel() {
  const [active, setActive] = useState<PanelId>("problem");

  const handleClick = (id: PanelId) => {
    setActive(id);

    if (id === "submissions") {
      window.open(
        "http://localhost:3000/analisis",
        "_blank"
      );
    }

    if (id === "leaderboard") {
      window.open(
        "http://localhost:3000/leaderboard",
        "_blank"
      );
    }

    // "problem" → no hace nada
  };

  return (
    <div
      className="flex shrink-0 border-r"
      style={{ borderColor: "var(--border)" }}
    >
      {/* ── Vertical tab rail ── */}
      <div
        className="flex flex-col items-center py-2 gap-1 border-r shrink-0"
        style={{
          width: "44px",
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        {panelItems.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              title={label}
              className="relative group flex flex-col items-center justify-center w-full py-3 gap-1 transition-all"
              style={{
                borderLeft: isActive
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                color: isActive
                  ? "var(--text-heading)"
                  : "var(--text-secondary)",
                background: isActive
                  ? "var(--bg-hover)"
                  : "transparent",
              }}
            >
              <Icon size={18} strokeWidth={1.5} />

              <span
                className="uppercase font-semibold tracking-wider leading-none opacity-70"
                style={{
                  fontSize: "8px",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  marginTop: "4px",
                }}
              >
                {label}
              </span>

              {/* Tooltip */}
              <span
                className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}