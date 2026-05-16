"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvaluacionTecnica {
  manejo_estado: string;
  legibilidad: string;
  arquitectura: string;
  performance: string;
}

interface CalificacionGeneral {
  nivel: string;
  puntaje: number;
  resumen: string;
}

interface AnalisisResultado {
  calificacion_general: CalificacionGeneral;
  errores: string[];
  buenas_practicas: string[];
  malas_practicas: string[];
  recomendaciones: string[];
  evaluacion_tecnica: EvaluacionTecnica;
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

const scoreColor = (score: number) => {
  if (score >= 85) return "#22c55e";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
};

const scoreGlow = (score: number) => {
  if (score >= 85) return "0 0 32px #22c55e55";
  if (score >= 65) return "0 0 32px #f59e0b55";
  return "0 0 32px #ef444455";
};

const levelIcon: Record<string, string> = {
  Excelente: "◆",
  Bueno: "▲",
  Regular: "●",
  Deficiente: "▼",
};

const technicalLabel: Record<string, string> = {
  manejo_estado: "State Mgmt",
  legibilidad: "Readability",
  arquitectura: "Architecture",
  performance: "Performance",
};

const techScore: Record<string, number> = {
  Excelente: 100,
  Bueno: 75,
  Regular: 50,
  Deficiente: 25,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 200);
    return () => clearTimeout(t);
  }, [score]);

  const animatedDash = (animated / 100) * circ;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${animatedDash} ${circ - animatedDash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {animated}
      </text>
      <text x="70" y="83" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="'JetBrains Mono', monospace">
        / 100
      </text>
    </svg>
  );
}

function TechBar({ label, value, color }: { label: string; value: string; color: string }) {
  const pct = techScore[value] ?? 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
        <span style={{ fontSize: "12px", color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      </div>
      <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: color,
            borderRadius: "3px",
            boxShadow: `0 0 8px ${color}88`,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function ListSection({ title, items, accent, icon }: { title: string; items: string[]; accent: string; icon: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ background: "#0f172a", border: `1px solid ${accent}33`, borderRadius: "12px", padding: "20px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: "13px", color: accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
          {title}
        </h3>
        <span style={{ marginLeft: "auto", background: `${accent}22`, color: accent, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
          {items.length}
        </span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: i < items.length - 1 ? "1px solid #1e293b" : "none", color: "#cbd5e1", fontSize: "13.5px", lineHeight: "1.6", fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: accent, marginTop: "2px", flexShrink: 0 }}>›</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resultado, setResultado] = useState<AnalisisResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const listenerAttached = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:3001") return;
      if (event.data?.type === "analysis_result" && event.data?.payload) {
        setResultado(event.data.payload);
        setLoading(false);
      }
    };

    if (!listenerAttached.current) {
      window.addEventListener("message", handleMessage);
      listenerAttached.current = true;
    }

    try {
      const stored = sessionStorage.getItem("analisis_resultado");
      if (stored) {
        setResultado(JSON.parse(stored));
        setLoading(false);
        sessionStorage.removeItem("analisis_resultado");
        return;
      }
    } catch {/* ignore */}

    const queryAnalysis = searchParams.get("analysis");
    if (queryAnalysis) {
      try {
        setResultado(JSON.parse(decodeURIComponent(queryAnalysis)));
        setLoading(false);
        return;
      } catch {
        setError("No se pudo parsear el resultado del análisis.");
        setLoading(false);
        return;
      }
    }

    const timeout = setTimeout(() => {
      if (loading) {
        setError("No se recibió ningún resultado. Por favor vuelve a ejecutar el análisis desde el IDE.");
        setLoading(false);
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", gap: "20px" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid #1e293b", borderTop: "3px solid #22c55e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: "13px", letterSpacing: "0.1em" }}>Recibiendo análisis del IDE...</p>
      </div>
    );
  }

  if (error || !resultado) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", color: "#ef4444", gap: "16px", padding: "40px", textAlign: "center" }}>
        <span style={{ fontSize: "48px" }}>✗</span>
        <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.7 }}>
          {error ?? "No se encontraron datos de análisis."}
        </p>
        <button
          onClick={() => router.push("/dashboard/developer/interviews")}
          style={{ marginTop: "12px", padding: "10px 24px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}
        >
          ← Volver a entrevistas
        </button>
      </div>
    );
  }

  const { calificacion_general, errores, buenas_practicas, malas_practicas, recomendaciones, evaluacion_tecnica } = resultado;
  const color = scoreColor(calificacion_general.puntaje);
  const glow = scoreGlow(calificacion_general.puntaje);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Sora:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020817; }
        .fade-in { animation: fadeUp 0.5s ease both; }
        .fade-in:nth-child(1) { animation-delay: 0.05s; }
        .fade-in:nth-child(2) { animation-delay: 0.12s; }
        .fade-in:nth-child(3) { animation-delay: 0.19s; }
        .fade-in:nth-child(4) { animation-delay: 0.26s; }
        .fade-in:nth-child(5) { animation-delay: 0.33s; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .grid-bg {
          background-image: linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>

      <div className="grid-bg" style={{ minHeight: "100vh", background: "#020817", padding: "32px 24px 64px", fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>

          <div className="fade-in" style={{ marginBottom: "40px" }}>
            <button
              onClick={() => router.push("/dashboard/developer/interviews")}
              style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px", padding: 0, letterSpacing: "0.05em" }}
            >
              ← Volver a entrevistas
            </button>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", color: "#334155", letterSpacing: "0.15em", textTransform: "uppercase" }}>Code Review</span>
              <span style={{ width: "1px", height: "12px", background: "#1e293b" }} />
              <span style={{ fontSize: "11px", color: "#334155", letterSpacing: "0.15em" }}>
                {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Análisis de Código
            </h1>
          </div>

          <div className="fade-in" style={{ background: "#0a1628", border: `1px solid ${color}33`, borderRadius: "16px", padding: "32px", marginBottom: "24px", display: "flex", gap: "40px", alignItems: "center", boxShadow: glow, flexWrap: "wrap" }}>
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={calificacion_general.puntaje} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ color, fontSize: "20px" }}>{levelIcon[calificacion_general.nivel] ?? "●"}</span>
                <span style={{ fontSize: "22px", fontWeight: 700, color, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em" }}>
                  {calificacion_general.nivel}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: "1.7", margin: 0 }}>
                {calificacion_general.resumen}
              </p>
            </div>
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", minWidth: "120px" }}>
              {[
                { label: "Errores", count: errores?.length ?? 0, color: "#ef4444" },
                { label: "Buenas práct.", count: buenas_practicas?.length ?? 0, color: "#22c55e" },
                { label: "Recomendac.", count: recomendaciones?.length ?? 0, color: "#3b82f6" },
              ].map(({ label, count, color: c }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#475569" }}>{label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: count > 0 ? c : "#1e293b", background: count > 0 ? `${c}18` : "transparent", padding: "1px 8px", borderRadius: "4px", minWidth: "28px", textAlign: "center" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-in" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "11px", color: "#475569", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
              Evaluación Técnica
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 40px" }}>
              {Object.entries(evaluacion_tecnica).map(([key, val]) => (
                <TechBar key={key} label={technicalLabel[key] ?? key} value={val} color={scoreColor(techScore[val] ?? 50)} />
              ))}
            </div>
          </div>

          <div className="fade-in">
            <ListSection title="Buenas Prácticas" items={buenas_practicas} accent="#22c55e" icon="✓" />
            <ListSection title="Errores Detectados" items={errores} accent="#ef4444" icon="✗" />
            <ListSection title="Malas Prácticas" items={malas_practicas} accent="#f59e0b" icon="⚠" />
            <ListSection title="Recomendaciones" items={recomendaciones} accent="#3b82f6" icon="→" />
          </div>

          <div className="fade-in" style={{ marginTop: "40px", textAlign: "center", color: "#1e293b", fontSize: "11px", letterSpacing: "0.1em" }}>
            ANÁLISIS GENERADO AUTOMÁTICAMENTE · AI CODE REVIEW
          </div>
        </div>
      </div>
    </>
  );
}