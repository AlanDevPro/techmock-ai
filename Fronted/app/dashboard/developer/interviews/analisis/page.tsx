"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── Types aligned with llm_service.py output ─────────────────────────────────

/** llm_service.py → calificacion_general */
interface CalificacionGeneral {
  nivel: "Excelente" | "Bueno" | "Regular" | "Deficiente" | "Crítico";
  puntaje: number; // 0–100
  resumen: string;
}

/** llm_service.py → errores[] */
interface ErrorLLM {
  tipo: string; // "Sintaxis" | "Lógica" | "Performance" | "Seguridad" | "Arquitectura" | "Estilo" | "Sistema"
  descripcion: string;
  impacto: "alto" | "medio" | "bajo";
  linea_aproximada?: string | number | null;
}

/** llm_service.py → recomendaciones[] */
interface RecomendacionLLM {
  mensaje: string;
  solucion: string;
  prioridad: "alta" | "media" | "baja";
}

/** llm_service.py → evaluacion_tecnica */
interface EvaluacionTecnica {
  manejo_estado: string;
  legibilidad: string;
  arquitectura: string;
  performance: string;
}

/** Full payload from llm_service.py → analizar_codigo_llm() */
interface AnalisisPayload {
  calificacion_general: CalificacionGeneral;
  errores: ErrorLLM[];
  buenas_practicas: string[];
  malas_practicas: string[];
  recomendaciones: RecomendacionLLM[];
  evaluacion_tecnica: EvaluacionTecnica;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NIVEL_COLOR: Record<string, string> = {
  Excelente: "#22c55e",
  Bueno: "#3b82f6",
  Regular: "#f59e0b",
  Deficiente: "#f97316",
  Crítico: "#ef4444",
};

const NIVEL_EMOJI: Record<string, string> = {
  Excelente: "★",
  Bueno: "✓",
  Regular: "◎",
  Deficiente: "⚠",
  Crítico: "✗",
};

/** Mapea impacto (llm_service) → severidad visual */
const IMPACTO_COLOR: Record<string, string> = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#22c55e",
};

const IMPACTO_LABEL: Record<string, string> = {
  alto: "ALTO",
  medio: "MEDIO",
  bajo: "BAJO",
};

const PRIORIDAD_DOT: Record<string, string> = {
  alta: "#ef4444",
  media: "#f59e0b",
  baja: "#64748b",
};

/** Puntaje → color de barra */
const scoreColor = (s: number) =>
  s >= 85 ? "#22c55e" : s >= 65 ? "#f59e0b" : s >= 40 ? "#f97316" : "#ef4444";

/** Campos de evaluación_tecnica para mostrar como barras estimadas */
const EVAL_TECNICA_SCORE: Record<string, Record<string, number>> = {
  // Palabras clave → puntaje estimado visual (solo para UI)
  excelente: { score: 90 },
  bueno: { score: 75 },
  regular: { score: 55 },
  deficiente: { score: 35 },
  "no evaluado": { score: 0 },
};

function estimarScore(texto: string): number {
  const lower = texto.toLowerCase();
  for (const key of Object.keys(EVAL_TECNICA_SCORE)) {
    if (lower.includes(key)) return EVAL_TECNICA_SCORE[key].score;
  }
  // Si tiene contenido descriptivo positivo, asumimos Regular
  return texto && texto !== "No evaluado" ? 60 : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnim(score), 200);
    return () => clearTimeout(t);
  }, [score]);
  const dash = (anim / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="70" y="66" textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="'JetBrains Mono',monospace">
        {Math.round(anim)}
      </text>
      <text x="70" y="82" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="'JetBrains Mono',monospace">
        / 100
      </text>
    </svg>
  );
}

function ScoreBar({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}) {
  const c = color ?? scoreColor(value);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 300);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>
          {label}
        </span>
        <span style={{ fontSize: "12px", color: c, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
          {value > 0 ? `${Math.round(value)}` : "—"}
        </span>
      </div>
      <div style={{ height: "5px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${w}%`,
            background: c,
            borderRadius: "3px",
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      {sublabel && (
        <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#334155", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

function ErrorCard({ error }: { error: ErrorLLM }) {
  const [open, setOpen] = useState(false);
  const c = IMPACTO_COLOR[error.impacto] ?? "#94a3b8";
  return (
    <div
      style={{
        background: "#0a1628",
        border: `1px solid ${c}28`,
        borderRadius: "10px",
        padding: "16px 20px",
        marginBottom: "10px",
        cursor: "pointer",
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {/* Impacto badge */}
        <span
          style={{
            background: `${c}20`,
            color: c,
            fontSize: "9px",
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: "4px",
            letterSpacing: "0.08em",
            fontFamily: "'JetBrains Mono',monospace",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {IMPACTO_LABEL[error.impacto]}
        </span>
        {/* Tipo badge */}
        <span
          style={{
            background: "#1e293b",
            color: "#64748b",
            fontSize: "9px",
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: "4px",
            letterSpacing: "0.06em",
            fontFamily: "'JetBrains Mono',monospace",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {error.tipo.toUpperCase()}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono',monospace",
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {error.descripcion}
        </p>
        <span style={{ color: "#334155", fontSize: "12px", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && error.linea_aproximada != null && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>
            LÍNEA APROXIMADA →{" "}
          </span>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>
            {error.linea_aproximada}
          </span>
        </div>
      )}
    </div>
  );
}

function RecomendacionCard({ rec, index }: { rec: RecomendacionLLM; index: number }) {
  const [open, setOpen] = useState(false);
  const pc = PRIORIDAD_DOT[rec.prioridad] ?? "#64748b";
  return (
    <div
      style={{
        background: "#0a1628",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        padding: "16px 20px",
        marginBottom: "10px",
        cursor: "pointer",
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span
          style={{
            color: "#1e293b",
            fontSize: "10px",
            fontFamily: "'JetBrains Mono',monospace",
            flexShrink: 0,
            marginTop: "2px",
            minWidth: "20px",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono',monospace",
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {rec.mensaje}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: pc,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>
            {rec.prioridad}
          </span>
          <span style={{ color: "#334155", fontSize: "12px", marginLeft: "6px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <span
            style={{
              fontSize: "10px",
              color: "#475569",
              display: "block",
              fontFamily: "'JetBrains Mono',monospace",
              marginBottom: "6px",
            }}
          >
            SOLUCIÓN SUGERIDA
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "12.5px",
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono',monospace",
              lineHeight: 1.7,
            }}
          >
            {rec.solucion}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  accent,
  icon,
  children,
  count,
}: {
  title: string;
  accent: string;
  icon: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <h2
          style={{
            margin: 0,
            fontSize: "11px",
            color: accent,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          {title}
        </h2>
        {count != null && (
          <span
            style={{
              marginLeft: "auto",
              background: `${accent}20`,
              color: accent,
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ListaTexto({ items, accent }: { items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: "10px",
            padding: "9px 0",
            borderBottom: i < items.length - 1 ? "1px solid #0f172a" : "none",
            color: "#cbd5e1",
            fontSize: "13px",
            lineHeight: 1.6,
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          <span style={{ color: accent, flexShrink: 0 }}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<AnalisisPayload | null>(null);
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
        setPayload(event.data.payload);
        setLoading(false);
      }
    };

    if (!listenerAttached.current) {
      window.addEventListener("message", handleMessage);
      listenerAttached.current = true;
    }

    // SessionStorage
    try {
      const stored = sessionStorage.getItem("analisis_resultado");
      if (stored) {
        setPayload(JSON.parse(stored));
        setLoading(false);
        sessionStorage.removeItem("analisis_resultado");
        return;
      }
    } catch {
      /* ignore */
    }

    // Query param
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
      <div
        style={{
          minHeight: "100vh",
          background: "#020817",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono',monospace",
          color: "#64748b",
          gap: "20px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            border: "3px solid #1e293b",
            borderTop: "3px solid #22c55e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.1em" }}>
          Recibiendo análisis del IDE...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error || !payload) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020817",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono',monospace",
          color: "#ef4444",
          gap: "16px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "40px" }}>✗</span>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#94a3b8",
            maxWidth: "480px",
            lineHeight: 1.7,
          }}
        >
          {error ?? "No se encontraron datos de análisis."}
        </p>
        <button
          onClick={() => router.push("/dashboard/developer/interviews")}
          style={{
            marginTop: "12px",
            padding: "10px 24px",
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          ← Volver a entrevistas
        </button>
      </div>
    );
  }

  // ── Datos del LLM ──
  const cal = payload.calificacion_general;
  const puntaje = Math.max(0, Math.min(100, Math.round(cal.puntaje)));
  const nivelColor = NIVEL_COLOR[cal.nivel] ?? scoreColor(puntaje);

  const errores = payload.errores ?? [];
  const recs = payload.recomendaciones ?? [];
  const buenas = payload.buenas_practicas ?? [];
  const malas = payload.malas_practicas ?? [];
  const evalTec = payload.evaluacion_tecnica;

  // Conteo por impacto
  const impactoCount = errores.reduce<Record<string, number>>((acc, e) => {
    acc[e.impacto] = (acc[e.impacto] ?? 0) + 1;
    return acc;
  }, {});

  // Campos evaluacion_tecnica para barras
  const evalTecEntries: { label: string; texto: string; score: number }[] = evalTec
    ? [
        { label: "Manejo de Estado", texto: evalTec.manejo_estado, score: estimarScore(evalTec.manejo_estado) },
        { label: "Legibilidad", texto: evalTec.legibilidad, score: estimarScore(evalTec.legibilidad) },
        { label: "Arquitectura", texto: evalTec.arquitectura, score: estimarScore(evalTec.arquitectura) },
        { label: "Performance", texto: evalTec.performance, score: estimarScore(evalTec.performance) },
      ].filter((e) => e.texto && e.texto !== "No evaluado")
    : [];

  return (
    <>
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
        .fi:nth-child(6){animation-delay:.37s}
        .fi:nth-child(7){animation-delay:.44s}
        .fi:nth-child(8){animation-delay:.51s}
        .fi:nth-child(9){animation-delay:.58s}
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .grid-bg {
          background-image: linear-gradient(rgba(34,197,94,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.025) 1px,transparent 1px);
          background-size: 40px 40px;
        }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>

      <div
        className="grid-bg"
        style={{
          minHeight: "100vh",
          background: "#020817",
          padding: "32px 24px 80px",
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="fi" style={{ marginBottom: "36px" }}>
            <button
              onClick={() => router.push("/dashboard/developer/interviews")}
              style={{
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
              }}
            >
              ← Volver a entrevistas
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#1e293b",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Code Review
              </span>
              <span
                style={{
                  width: "1px",
                  height: "10px",
                  background: "#1e293b",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  color: "#1e293b",
                  letterSpacing: "0.15em",
                }}
              >
                {new Date().toLocaleDateString("es-BO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span
                style={{
                  width: "1px",
                  height: "10px",
                  background: "#1e293b",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  color: "#1e293b",
                  letterSpacing: "0.12em",
                }}
              >
                qwen2.5-coder:1.5b
              </span>
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#f1f5f9",
                fontFamily: "'Sora',sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Análisis de Código
            </h1>
          </div>

          {/* ── Hero: Score + Nivel ── */}
          <div
            className="fi"
            style={{
              background: "#0a1628",
              border: `1px solid ${nivelColor}28`,
              borderRadius: "16px",
              padding: "28px 32px",
              marginBottom: "20px",
              display: "flex",
              gap: "36px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={puntaje} color={nivelColor} />
            </div>

            <div style={{ flex: 1, minWidth: "200px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: nivelColor,
                    fontFamily: "'Sora',sans-serif",
                  }}
                >
                  {NIVEL_EMOJI[cal.nivel]} {cal.nivel}
                </span>
              </div>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {cal.resumen}
              </p>
            </div>

            {/* Stats rápidos */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minWidth: "140px",
              }}
            >
              {[
                { label: "Errores", count: errores.length, c: "#ef4444" },
                { label: "Impacto Alto", count: impactoCount["alto"] ?? 0, c: "#ef4444" },
                { label: "Buenas práct.", count: buenas.length, c: "#22c55e" },
                { label: "Recomendac.", count: recs.length, c: "#3b82f6" },
              ].map(({ label, count, c }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <span style={{ fontSize: "10.5px", color: "#334155" }}>{label}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: count > 0 ? c : "#1e293b",
                      background: count > 0 ? `${c}18` : "transparent",
                      padding: "1px 8px",
                      borderRadius: "4px",
                      minWidth: "28px",
                      textAlign: "center",
                    }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Evaluación Técnica (barras + texto) ── */}
          {evalTecEntries.length > 0 && (
            <div
              className="fi"
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "22px 24px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  fontSize: "10px",
                  color: "#334155",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Evaluación técnica
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0 36px",
                }}
              >
                {evalTecEntries.map((e) => (
                  <ScoreBar
                    key={e.label}
                    label={e.label}
                    value={e.score}
                    sublabel={e.texto}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Buenas & Malas prácticas ── */}
          {(buenas.length > 0 || malas.length > 0) && (
            <div
              className="fi"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {buenas.length > 0 && (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #22c55e20",
                    borderRadius: "12px",
                    padding: "20px 22px",
                  }}
                >
                  <Section title="Buenas Prácticas" accent="#22c55e" icon="✓" count={buenas.length}>
                    <ListaTexto items={buenas} accent="#22c55e" />
                  </Section>
                </div>
              )}
              {malas.length > 0 && (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #f59e0b20",
                    borderRadius: "12px",
                    padding: "20px 22px",
                  }}
                >
                  <Section title="Malas Prácticas" accent="#f59e0b" icon="⚠" count={malas.length}>
                    <ListaTexto items={malas} accent="#f59e0b" />
                  </Section>
                </div>
              )}
            </div>
          )}

          {/* ── Errores detectados ── */}
          {errores.length > 0 && (
            <div className="fi" style={{ marginBottom: "20px" }}>
              <Section
                title="Errores Detectados"
                accent="#ef4444"
                icon="✗"
                count={errores.length}
              >
                {/* Impacto pills */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "14px",
                  }}
                >
                  {(["alto", "medio", "bajo"] as const).map((imp) =>
                    impactoCount[imp] ? (
                      <span
                        key={imp}
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "4px",
                          background: `${IMPACTO_COLOR[imp]}18`,
                          color: IMPACTO_COLOR[imp],
                          fontFamily: "'JetBrains Mono',monospace",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {impactoCount[imp]} {IMPACTO_LABEL[imp]}
                      </span>
                    ) : null
                  )}
                </div>

                {/* Ordenar: alto → medio → bajo */}
                {[...errores]
                  .sort((a, b) => {
                    const order = { alto: 0, medio: 1, bajo: 2 };
                    return (order[a.impacto] ?? 3) - (order[b.impacto] ?? 3);
                  })
                  .map((e, i) => (
                    <ErrorCard key={i} error={e} />
                  ))}
              </Section>
            </div>
          )}

          {/* ── Recomendaciones ── */}
          {recs.length > 0 && (
            <div className="fi" style={{ marginBottom: "20px" }}>
              <Section
                title="Recomendaciones"
                accent="#3b82f6"
                icon="◈"
                count={recs.length}
              >
                {/* Ordenar: alta → media → baja */}
                {[...recs]
                  .sort((a, b) => {
                    const p = { alta: 0, media: 1, baja: 2 };
                    return (p[a.prioridad] ?? 3) - (p[b.prioridad] ?? 3);
                  })
                  .map((r, i) => (
                    <RecomendacionCard key={i} rec={r} index={i} />
                  ))}
              </Section>
            </div>
          )}

          {/* ── Footer ── */}
          <div
            className="fi"
            style={{
              marginTop: "48px",
              textAlign: "center",
              color: "#1e293b",
              fontSize: "10px",
              letterSpacing: "0.12em",
            }}
          >
            ANÁLISIS GENERADO AUTOMÁTICAMENTE · AI CODE REVIEW · TECHMOCK
          </div>
        </div>
      </div>
    </>
  );
}