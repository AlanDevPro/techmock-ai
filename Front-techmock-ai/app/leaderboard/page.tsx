"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Flame, Star, TrendingUp } from "lucide-react";

// ─── Static leaderboard data ──────────────────────────────────────────────────
const leaders = [
  { rank: 1,  name: "alice_dev",     score: 2840, solved: 142, streak: 34, lang: "TypeScript", badge: "🥇" },
  { rank: 2,  name: "bob_codes",     score: 2705, solved: 131, streak: 21, lang: "Rust",        badge: "🥈" },
  { rank: 3,  name: "carol_js",      score: 2590, solved: 127, streak: 18, lang: "Go",          badge: "🥉" },
  { rank: 4,  name: "dave_react",    score: 2480, solved: 118, streak: 12, lang: "Python",      badge: ""   },
  { rank: 5,  name: "eve_tsx",       score: 2310, solved: 109, streak: 9,  lang: "TypeScript",  badge: ""   },
  { rank: 6,  name: "frank_node",    score: 2200, solved: 103, streak: 7,  lang: "JavaScript",  badge: ""   },
  { rank: 7,  name: "grace_vue",     score: 2080, solved:  97, streak: 5,  lang: "Vue",         badge: ""   },
  { rank: 8,  name: "henry_next",    score: 1960, solved:  91, streak: 4,  lang: "Next.js",     badge: ""   },
  { rank: 9,  name: "iris_svelte",   score: 1830, solved:  85, streak: 3,  lang: "Svelte",      badge: ""   },
  { rank: 10, name: "jack_solid",    score: 1700, solved:  79, streak: 2,  lang: "SolidJS",     badge: ""   },
];

const langColor: Record<string, string> = {
  TypeScript:  "#3b82f6",
  Rust:        "#f97316",
  Go:          "#06b6d4",
  Python:      "#f59e0b",
  JavaScript:  "#facc15",
  Vue:         "#22c55e",
  "Next.js":   "#a855f7",
  Svelte:      "#ef4444",
  SolidJS:     "#6366f1",
};

const rankGlow: Record<number, string> = {
  1: "#f59e0b",
  2: "#94a3b8",
  3: "#b45309",
};

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "#1e293b", width: 80 }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

// ─── Podium (top 3) ───────────────────────────────────────────────────────────
function Podium({ top3 }: { top3: typeof leaders }) {
  const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd
  const heights = ["h-20", "h-28", "h-16"];
  const sizes   = ["text-lg", "text-2xl", "text-base"];

  return (
    <div className="flex items-end justify-center gap-4 pt-6 pb-2">
      {order.map((l, i) => {
        const isFirst = l.rank === 1;
        const glow = rankGlow[l.rank] ?? "transparent";
        return (
          <div key={l.rank} className="flex flex-col items-center gap-2">
            <span className={`${sizes[i]} select-none`}>{l.badge}</span>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-bold text-white truncate max-w-[80px] text-center">
                {l.name}
              </span>
              <span className="text-[10px]" style={{ color: glow }}>
                {l.score.toLocaleString()} pts
              </span>
            </div>
            <div
              className={`${heights[i]} w-20 rounded-t-lg flex items-end justify-center pb-2 relative`}
              style={{
                background: isFirst
                  ? "linear-gradient(180deg, #f59e0b33, #f59e0b11)"
                  : "linear-gradient(180deg, #1e293b, #0f172a)",
                border: `1px solid ${glow}44`,
                boxShadow: isFirst ? `0 0 20px ${glow}33` : "none",
              }}
            >
              <span className="text-[10px] font-black" style={{ color: glow }}>
                #{l.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router = useRouter();
  const maxScore = leaders[0].score;

  // Función para volver al dashboard correctamente
  const goToDashboard = () => {
    // Usar window.location para navegar a la URL específica
    window.location.href = "http://localhost:3000/dashboard";
  };

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: "#0a0f1a", fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 border-b"
        style={{ background: "#0d1525cc", borderColor: "#1e293b", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={goToDashboard}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Volver al Dashboard
        </button>
        <span className="text-slate-700">|</span>
        <Trophy size={14} className="text-yellow-400" />
        <span className="text-xs text-slate-300 tracking-widest uppercase">Leaderboard Global</span>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
          <Flame size={11} className="text-orange-400" />
          <span>Top 10 de la semana</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">

        {/* Podium */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#0d1525", borderColor: "#1e293b" }}
        >
          <div className="px-4 pt-4 flex items-center gap-2">
            <Star size={12} className="text-yellow-400" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              Podio de Honor
            </span>
          </div>
          <Podium top3={leaders.slice(0, 3)} />
        </div>

        {/* Full ranking table */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp size={12} className="text-blue-400" />
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500">
              Clasificación Completa
            </h2>
          </div>

          {/* Header row */}
          <div
            className="grid px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest text-slate-600"
            style={{ gridTemplateColumns: "36px 1fr 80px 60px 60px" }}
          >
            <span>#</span>
            <span>Usuario</span>
            <span className="text-right">Score</span>
            <span className="text-right">Solved</span>
            <span className="text-right">Streak</span>
          </div>

          {leaders.map((l) => {
            const glow = rankGlow[l.rank];
            const langC = langColor[l.lang] ?? "#64748b";
            return (
              <div
                key={l.rank}
                className="grid items-center px-4 py-3 rounded-xl border transition-all hover:border-blue-500/30 group"
                style={{
                  gridTemplateColumns: "36px 1fr 80px 60px 60px",
                  background: "#0d1525",
                  borderColor: glow ? glow + "44" : "#1e293b",
                  boxShadow: glow ? `0 0 12px ${glow}18` : "none",
                }}
              >
                {/* Rank */}
                <span
                  className="text-sm font-black"
                  style={{ color: glow ?? "#334155" }}
                >
                  {l.badge || `#${l.rank}`}
                </span>

                {/* Name + lang + bar */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white truncate">{l.name}</span>
                    <span
                      className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: langC + "22", color: langC }}
                    >
                      {l.lang}
                    </span>
                  </div>
                  <ScoreBar score={l.score} max={maxScore} />
                </div>

                {/* Score */}
                <span className="text-right text-[11px] font-bold text-blue-400">
                  {l.score.toLocaleString()}
                </span>

                {/* Solved */}
                <span className="text-right text-[11px] text-slate-500">
                  {l.solved}
                </span>

                {/* Streak */}
                <div className="flex items-center justify-end gap-1">
                  <Flame size={10} className={l.streak >= 10 ? "text-orange-400" : "text-slate-700"} />
                  <span className="text-[11px] text-slate-500">{l.streak}d</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}