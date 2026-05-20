"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReporteView from "../../../../components/dashboard/developer/ReporteView";
import FeedbackView from "../../../../components/dashboard/developer/FeedbackView";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CalificacionGeneral {
  nivel: "Excelente" | "Bueno" | "Regular" | "Deficiente" | "Crítico";
  puntaje: number;
  resumen: string;
}

export interface ErrorLLM {
  tipo: string;
  descripcion: string;
  impacto: "alto" | "medio" | "bajo";
  linea_aproximada?: string | number | null;
}

export interface RecomendacionLLM {
  mensaje: string;
  solucion: string;
  prioridad: "alta" | "media" | "baja";
}

export interface EvaluacionTecnica {
  manejo_estado: string;
  legibilidad: string;
  arquitectura: string;
  performance: string;
}

export interface AnalisisPayload {
  calificacion_general: CalificacionGeneral;
  errores: ErrorLLM[];
  buenas_practicas: string[];
  malas_practicas: string[];
  recomendaciones: RecomendacionLLM[];
  evaluacion_tecnica: EvaluacionTecnica;
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

export const NIVEL_COLOR: Record<string, string> = {
  Excelente: "#22c55e",
  Bueno: "#3b82f6",
  Regular: "#f59e0b",
  Deficiente: "#f97316",
  Crítico: "#ef4444",
};

export const scoreColor = (s: number) =>
  s >= 85 ? "#22c55e" : s >= 65 ? "#f59e0b" : s >= 40 ? "#f97316" : "#ef4444";

type Tab = "reporte" | "feedback";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<AnalisisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("reporte");
  const listenerAttached = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:3001") return;
      if (event.data?.type === "analysis_result" && event.data?.payload) {
        setPayload(event.data.payload);
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
        setPayload(JSON.parse(stored));
        setLoading(false);
        sessionStorage.removeItem("analisis_resultado");
        return;
      }
    } catch { /* ignore */ }

    const q = searchParams.get("analysis");
    if (q) {
      try {
        setPayload(JSON.parse(decodeURIComponent(q)));
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
        setError("No se recibió ningún resultado. Vuelve a ejecutar el análisis desde el IDE.");
        setLoading(false);
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ── Loading ──
  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", color: "#64748b" }}>
          Recibiendo análisis del IDE...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error || !payload) {
    return (
      <div style={{ ...styles.center, color: "#ef4444", gap: "16px", padding: "40px", textAlign: "center" }}>
        <span style={{ fontSize: "40px" }}>✗</span>
        <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.7, fontFamily: "'JetBrains Mono',monospace" }}>
          {error ?? "No se encontraron datos de análisis."}
        </p>
        <button onClick={() => router.push("/dashboard/developer/interviews")} style={styles.backBtn}>
          ← Volver a entrevistas
        </button>
      </div>
    );
  }

  const cal = payload.calificacion_general;
  const nivelColor = NIVEL_COLOR[cal.nivel] ?? scoreColor(Math.round(cal.puntaje));

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "reporte",  label: "Reporte",  icon: "◈" },
    { id: "feedback", label: "Feedback", icon: "◎" },
  ];

  return (
    <>
      <GlobalStyles />
      <div className="grid-bg" style={styles.root}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="fi" style={{ marginBottom: "28px" }}>
            <button onClick={() => router.push("/dashboard/developer")} style={styles.backLink}>
              ← Volver a entrevistas
            </button>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "8px" }}>
              <MetaChip>Code Review</MetaChip>
              <Divider />
              <MetaChip>
                {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
              </MetaChip>
              <Divider />
              <MetaChip>qwen2.5-coder:1.5b</MetaChip>
            </div>
            <h1 style={styles.title}>Análisis de Código</h1>
          </div>

          {/* ── Tab Bar ── */}
          <div className="fi" style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.tabBtn,
                    color: isActive ? nivelColor : "#334155",
                    borderBottom: isActive ? `2px solid ${nivelColor}` : "2px solid transparent",
                    background: isActive ? `${nivelColor}08` : "transparent",
                  }}
                >
                  <span style={{ marginRight: "6px", fontSize: "13px" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}

            {/* Indicador de nivel a la derecha */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: nivelColor, display: "inline-block" }} />
              <span style={{ fontSize: "11px", color: nivelColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                {cal.nivel} · {Math.round(cal.puntaje)}/100
              </span>
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div style={{ marginTop: "20px" }}>
            {activeTab === "reporte"
              ? <ReporteView payload={payload} nivelColor={nivelColor} />
              : <FeedbackView payload={payload} nivelColor={nivelColor} />
            }
          </div>

          {/* ── Footer ── */}
          <div className="fi" style={styles.footer}>
            ANÁLISIS GENERADO AUTOMÁTICAMENTE · AI CODE REVIEW · TECHMOCK
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function MetaChip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "10px", color: "#1e293b", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>{children}</span>;
}
function Divider() {
  return <span style={{ width: "1px", height: "10px", background: "#1e293b", display: "inline-block" }} />;
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Sora:wght@400;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #020817; }
      .fi { animation: fadeUp 0.45s ease both; }
      .fi:nth-child(1){animation-delay:.04s}
      .fi:nth-child(2){animation-delay:.10s}
      .fi:nth-child(3){animation-delay:.17s}
      .fi:nth-child(4){animation-delay:.23s}
      .fi:nth-child(5){animation-delay:.30s}
      @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      .grid-bg {
        background-image: linear-gradient(rgba(34,197,94,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.025) 1px,transparent 1px);
        background-size: 40px 40px;
      }
      ::-webkit-scrollbar{width:5px}
      ::-webkit-scrollbar-track{background:#0f172a}
      ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
    `}</style>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#020817",
    padding: "32px 24px 80px",
    fontFamily: "'JetBrains Mono',monospace",
  },
  center: {
    minHeight: "100vh",
    background: "#020817",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono',monospace",
    gap: "20px",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid #1e293b",
    borderTop: "3px solid #22c55e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  backBtn: {
    marginTop: "12px",
    padding: "10px 24px",
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono',monospace",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#334155",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono',monospace",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "18px",
    padding: 0,
    letterSpacing: "0.05em",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#f1f5f9",
    fontFamily: "'Sora',sans-serif",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  tabBar: {
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    gap: "0",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono',monospace",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "12px 20px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
  },
  footer: {
    marginTop: "48px",
    textAlign: "center",
    color: "#1e293b",
    fontSize: "10px",
    letterSpacing: "0.12em",
  },
};