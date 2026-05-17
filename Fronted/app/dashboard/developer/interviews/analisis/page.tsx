"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── Types aligned 1:1 with DB schema ─────────────────────────────────────────

/** evaluaciones table */
interface Evaluacion {
  id?: number;
  sesion_id?: string;
  puntaje_total: number;
  puntaje_javascript?: number;
  puntaje_arquitectura?: number;
  puntaje_buenas_practicas?: number;
  puntaje_comunicacion?: number;
  puntaje_resolucion?: number;
  nivel_candidato?: "descartado" | "revisar" | "promisorio" | "recomendado" | "destacado";
  apto_para_contratacion?: boolean;
  feedback_general: string;
  resumen_para_reclutador?: string;
  fortalezas?: string;
  areas_mejora?: string;
  sugerencias_recursos?: string;
  generado_por_ia?: boolean;
  modelo_ia_usado?: string;
  tokens_evaluacion?: number;
  fecha?: string;
}

/** errores_detectados table */
interface ErrorDetectado {
  id?: number;
  categoria_error?: string; // joined from categorias_error.nombre
  categoria_tipo?: "conceptual" | "experiencia";
  descripcion: string;
  severidad: "bajo" | "medio" | "alto" | "critico";
  es_error_conceptual: boolean;
  linea_codigo?: number;
  fragmento_codigo?: string;
  codigo_corregido?: string;
  explicacion_ia?: string;
}

/** recomendaciones_solucion table */
interface Recomendacion {
  id?: number;

  tipo?: "codigo" | "concepto" | "recurso" | "patron";

  titulo?: string;

  descripcion?: string;

  codigo_ejemplo?: string;

  recurso_url?: string;

  recurso_titulo?: string;

  categoria_error?: string;

  prioridad?: "alta" | "media" | "baja";

  orden?: number;
}

/** detalle_evaluacion table */
interface DetalleRubrica {
  rubrica_nombre: string;
  rubrica_descripcion?: string;
  peso_porcentual: number;
  puntaje: number;
  comentario?: string;
}

/** Full analysis payload sent by the IDE */
interface AnalisisPayload {
  evaluacion: Evaluacion;
  errores_detectados?: ErrorDetectado[];
  recomendaciones?: Recomendacion[];
  detalles_rubricas?: DetalleRubrica[];
  // Legacy flat format still supported
  calificacion_general?: { nivel: string; puntaje: number; resumen: string };
  errores?: string[];
  buenas_practicas?: string[];
  malas_practicas?: string[];
  recomendaciones_texto?: string[];
  evaluacion_tecnica?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NIVEL_COLOR: Record<string, string> = {
  descartado: "#ef4444",
  revisar: "#f59e0b",
  promisorio: "#3b82f6",
  recomendado: "#22c55e",
  destacado: "#a855f7",
  Excelente: "#22c55e",
  Bueno: "#3b82f6",
  Regular: "#f59e0b",
  Deficiente: "#ef4444",
};

const NIVEL_LABEL: Record<string, string> = {
  descartado: "Descartado",
  revisar: "A Revisar",
  promisorio: "Promisorio",
  recomendado: "Recomendado",
  destacado: "Destacado ★",
};

const SEV_COLOR: Record<string, string> = {
  critico: "#ef4444",
  alto: "#f97316",
  medio: "#f59e0b",
  bajo: "#22c55e",
};

const SEV_LABEL: Record<string, string> = {
  critico: "CRÍTICO",
  alto: "ALTO",
  medio: "MEDIO",
  bajo: "BAJO",
};

const TIPO_COLOR: Record<string, string> = {
  codigo: "#3b82f6",
  concepto: "#a855f7",
  recurso: "#22c55e",
  patron: "#f59e0b",
};

const PRIORIDAD_DOT: Record<string, string> = {
  alta: "#ef4444",
  media: "#f59e0b",
  baja: "#64748b",
};

const scoreColor = (s: number) => (s >= 85 ? "#22c55e" : s >= 65 ? "#f59e0b" : "#ef4444");

function pct(v?: number | null) {
  return v != null ? Math.round(v) : null;
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
      <text x="70" y="66" textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="'JetBrains Mono',monospace">{Math.round(anim)}</text>
      <text x="70" y="82" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="'JetBrains Mono',monospace">/ 100</text>
    </svg>
  );
}

function ScoreBar({ label, value, color }: { label: string; value?: number | null; color?: string }) {
  const v = pct(value);
  const c = color ?? (v != null ? scoreColor(v) : "#334155");
  const [w, setW] = useState(0);
  useEffect(() => {
    if (v == null) return;
    const t = setTimeout(() => setW(v), 300);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        <span style={{ fontSize: "12px", color: c, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
          {v != null ? `${v}` : "—"}
        </span>
      </div>
      <div style={{ height: "5px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        {v != null && (
          <div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: "3px", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
        )}
      </div>
    </div>
  );
}

function RubricaBar({ rubrica }: { rubrica: DetalleRubrica }) {
  const v = Math.round(rubrica.puntaje);
  const c = scoreColor(v);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(v), 400);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#cbd5e1", fontFamily: "'JetBrains Mono',monospace" }}>{rubrica.rubrica_nombre}</span>
        <span style={{ fontSize: "12px", color: c, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{v} / 100</span>
      </div>
      <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: "2px", transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      {rubrica.comentario && (
        <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#475569", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
          {rubrica.comentario}
        </p>
      )}
      <span style={{ fontSize: "10px", color: "#334155", fontFamily: "'JetBrains Mono',monospace" }}>peso {rubrica.peso_porcentual}%</span>
    </div>
  );
}

function ErrorCard({ error }: { error: ErrorDetectado }) {
  const [open, setOpen] = useState(false);
  const sevColor = SEV_COLOR[error.severidad] ?? "#94a3b8";
  return (
    <div
      style={{ background: "#0a1628", border: `1px solid ${sevColor}28`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ background: `${sevColor}20`, color: sevColor, fontSize: "9px", fontWeight: 700, padding: "3px 7px", borderRadius: "4px", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginTop: "1px" }}>
          {SEV_LABEL[error.severidad]}
        </span>
        {error.es_error_conceptual && (
          <span style={{ background: "#a855f720", color: "#a855f7", fontSize: "9px", fontWeight: 700, padding: "3px 7px", borderRadius: "4px", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginTop: "1px" }}>
            CONCEPTUAL
          </span>
        )}
        <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5, flex: 1 }}>
          {error.descripcion}
        </p>
        <span style={{ color: "#334155", fontSize: "12px", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
            {error.categoria_error && (
              <div>
                <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "2px" }}>CATEGORÍA</span>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>{error.categoria_error}</span>
              </div>
            )}
            {error.linea_codigo != null && (
              <div>
                <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "2px" }}>LÍNEA</span>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>:{error.linea_codigo}</span>
              </div>
            )}
          </div>

          {error.fragmento_codigo && (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "6px" }}>CÓDIGO PROBLEMÁTICO</span>
              <pre style={{ margin: 0, padding: "10px 14px", background: "#020817", border: "1px solid #ef444430", borderRadius: "6px", fontSize: "12px", color: "#fca5a5", fontFamily: "'JetBrains Mono',monospace", overflowX: "auto", lineHeight: 1.6 }}>
                {error.fragmento_codigo}
              </pre>
            </div>
          )}
          {error.codigo_corregido && (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "6px" }}>CORRECCIÓN SUGERIDA</span>
              <pre style={{ margin: 0, padding: "10px 14px", background: "#020817", border: "1px solid #22c55e30", borderRadius: "6px", fontSize: "12px", color: "#86efac", fontFamily: "'JetBrains Mono',monospace", overflowX: "auto", lineHeight: 1.6 }}>
                {error.codigo_corregido}
              </pre>
            </div>
          )}
          {error.explicacion_ia && (
            <div>
              <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "6px" }}>EXPLICACIÓN IA</span>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.7 }}>{error.explicacion_ia}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecomendacionCard({ rec }: { rec: Recomendacion }) {
  const [open, setOpen] = useState(false);
  const tc = TIPO_COLOR[rec.tipo ?? "general"] ?? "#64748b";
  const pc = PRIORIDAD_DOT[rec.prioridad ?? "media"] ?? "#64748b";
  return (
    <div
      style={{ background: "#0a1628", border: `1px solid ${tc}28`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ background: `${tc}20`, color: tc, fontSize: "9px", fontWeight: 700, padding: "3px 7px", borderRadius: "4px", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginTop: "1px" }}>
          {(rec.tipo ?? "general").toUpperCase()}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
            {rec.titulo}
          </p>
          {rec.categoria_error && (
            <span style={{ fontSize: "10.5px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>{rec.categoria_error}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pc, display: "inline-block" }} />
          <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>{rec.prioridad}</span>
          <span style={{ color: "#334155", fontSize: "12px", marginLeft: "6px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.7 }}>{rec.descripcion}</p>
          {rec.codigo_ejemplo && (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "6px" }}>EJEMPLO</span>
              <pre style={{ margin: 0, padding: "10px 14px", background: "#020817", border: `1px solid ${tc}30`, borderRadius: "6px", fontSize: "12px", color: "#bae6fd", fontFamily: "'JetBrains Mono',monospace", overflowX: "auto", lineHeight: 1.6 }}>
                {rec.codigo_ejemplo}
              </pre>
            </div>
          )}
          {rec.recurso_url && (
            <a
              href={rec.recurso_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontFamily: "'JetBrains Mono',monospace", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              ↗ {rec.recurso_titulo ?? rec.recurso_url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, accent, icon, children, count }: { title: string; accent: string; icon: string; children: React.ReactNode; count?: number }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: "11px", color: accent, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
          {title}
        </h2>
        {count != null && (
          <span style={{ marginLeft: "auto", background: `${accent}20`, color: accent, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono',monospace" }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TextBlock({ text, accent }: { text: string; accent: string }) {
  const lines = text.split(/[\n•\-]/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 1) {
    return <p style={{ margin: 0, fontSize: "13.5px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.7 }}>{text}</p>;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {lines.map((l, i) => (
        <li key={i} style={{ display: "flex", gap: "10px", padding: "9px 0", borderBottom: i < lines.length - 1 ? "1px solid #0f172a" : "none", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.6, fontFamily: "'JetBrains Mono',monospace" }}>
          <span style={{ color: accent, flexShrink: 0 }}>›</span>{l}
        </li>
      ))}
    </ul>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<AnalisisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const listenerAttached = useRef(false);

  useEffect(() => { setMounted(true); }, []);

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
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", color: "#64748b", gap: "20px" }}>
        <div style={{ width: "44px", height: "44px", border: "3px solid #1e293b", borderTop: "3px solid #22c55e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.1em" }}>Recibiendo análisis del IDE...</p>
      </div>
    );
  }

  // ── Error ──
  if (error || !payload) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", color: "#ef4444", gap: "16px", padding: "40px", textAlign: "center" }}>
        <span style={{ fontSize: "40px" }}>✗</span>
        <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.7 }}>
          {error ?? "No se encontraron datos de análisis."}
        </p>
        <button onClick={() => router.push("/dashboard/developer/interviews")} style={{ marginTop: "12px", padding: "10px 24px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "'JetBrains Mono',monospace" }}>
          ← Volver a entrevistas
        </button>
      </div>
    );
  }

  // ── Normalize: support both new (DB-structured) and legacy flat format ──
  const ev = payload.evaluacion ?? ({
    puntaje_total: payload.calificacion_general?.puntaje ?? 0,
    feedback_general: payload.calificacion_general?.resumen ?? "",
    nivel_candidato: undefined,
    fortalezas: (payload.buenas_practicas ?? []).join("\n"),
    areas_mejora: (payload.malas_practicas ?? []).join("\n"),
  } as Evaluacion);

  const errores: ErrorDetectado[] = payload.errores_detectados?.length
    ? payload.errores_detectados
    : (payload.errores ?? []).map(d => ({ descripcion: d, severidad: "medio" as const, es_error_conceptual: false }));

  const recs: Recomendacion[] = payload.recomendaciones?.length
    ? payload.recomendaciones
    : (payload.recomendaciones_texto ?? []).map((d, i) => ({ tipo: "concepto" as const, titulo: `Recomendación ${i + 1}`, descripcion: d, prioridad: "media" as const }));

  const rubricas: DetalleRubrica[] = payload.detalles_rubricas ?? [];

  const puntaje = pct(ev.puntaje_total) ?? 0;
  const nivelKey = ev.nivel_candidato ?? payload.calificacion_general?.nivel ?? "promisorio";
  const color = NIVEL_COLOR[nivelKey] ?? scoreColor(puntaje);

  const scoreBreakdown = [
    { label: "JavaScript", value: ev.puntaje_javascript },
    { label: "Arquitectura", value: ev.puntaje_arquitectura },
    { label: "Buenas Prácticas", value: ev.puntaje_buenas_practicas },
    { label: "Comunicación", value: ev.puntaje_comunicacion },
    { label: "Resolución", value: ev.puntaje_resolucion },
  ].filter(s => s.value != null);

  const sevCount = errores.reduce<Record<string, number>>((acc, e) => {
    acc[e.severidad] = (acc[e.severidad] ?? 0) + 1;
    return acc;
  }, {});

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
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .grid-bg {
          background-image: linear-gradient(rgba(34,197,94,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.025) 1px,transparent 1px);
          background-size: 40px 40px;
        }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>

      <div className="grid-bg" style={{ minHeight: "100vh", background: "#020817", padding: "32px 24px 80px", fontFamily: "'JetBrains Mono',monospace" }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="fi" style={{ marginBottom: "36px" }}>
            <button onClick={() => router.push("/dashboard/developer/interviews")} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: "12px", fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: "6px", marginBottom: "18px", padding: 0, letterSpacing: "0.05em" }}>
              ← Volver a entrevistas
            </button>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "#1e293b", letterSpacing: "0.15em", textTransform: "uppercase" }}>Code Review</span>
              <span style={{ width: "1px", height: "10px", background: "#1e293b", display: "inline-block" }} />
              <span style={{ fontSize: "10px", color: "#1e293b", letterSpacing: "0.15em" }}>
                {ev.fecha ? new Date(ev.fecha).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {ev.modelo_ia_usado && (
                <>
                  <span style={{ width: "1px", height: "10px", background: "#1e293b", display: "inline-block" }} />
                  <span style={{ fontSize: "10px", color: "#1e293b", letterSpacing: "0.12em" }}>{ev.modelo_ia_usado}</span>
                </>
              )}
            </div>
            <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#f1f5f9", fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Análisis de Código
            </h1>
          </div>

          {/* ── Hero: Score + Nivel ── */}
          <div className="fi" style={{ background: "#0a1628", border: `1px solid ${color}28`, borderRadius: "16px", padding: "28px 32px", marginBottom: "20px", display: "flex", gap: "36px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={puntaje} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "20px", fontWeight: 700, color, fontFamily: "'Sora',sans-serif" }}>
                  {NIVEL_LABEL[nivelKey] ?? nivelKey}
                </span>
                {ev.apto_para_contratacion != null && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", letterSpacing: "0.08em",
                    background: ev.apto_para_contratacion ? "#22c55e20" : "#ef444420",
                    color: ev.apto_para_contratacion ? "#22c55e" : "#ef4444",
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {ev.apto_para_contratacion ? "APTO PARA CONTRATACIÓN" : "NO APTO"}
                  </span>
                )}
              </div>
              <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>{ev.feedback_general}</p>
            </div>
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", minWidth: "140px" }}>
              {[
                { label: "Errores", count: errores.length, c: "#ef4444" },
                { label: "Críticos", count: sevCount["critico"] ?? 0, c: "#ef4444" },
                { label: "Recomendac.", count: recs.length, c: "#3b82f6" },
                { label: "Rúbricas", count: rubricas.length, c: "#f59e0b" },
              ].map(({ label, count, c }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "10.5px", color: "#334155" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: count > 0 ? c : "#1e293b", background: count > 0 ? `${c}18` : "transparent", padding: "1px 8px", borderRadius: "4px", minWidth: "28px", textAlign: "center" }}>
                    {count}
                  </span>
                </div>
              ))}
              {ev.tokens_evaluacion != null && (
                <div style={{ borderTop: "1px solid #0f172a", paddingTop: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#1e293b" }}>tokens: {ev.tokens_evaluacion.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Score Breakdown ── */}
          {scoreBreakdown.length > 0 && (
            <div className="fi" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "22px 24px", marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 18px", fontSize: "10px", color: "#334155", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Desglose técnico
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 36px" }}>
                {scoreBreakdown.map(s => (
                  <ScoreBar key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            </div>
          )}

          {/* ── Resumen reclutador ── */}
          {ev.resumen_para_reclutador && (
            <div className="fi" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "22px 24px", marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "10px", color: "#334155", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Resumen para reclutador
              </h2>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#94a3b8", lineHeight: 1.7 }}>{ev.resumen_para_reclutador}</p>
            </div>
          )}

          {/* ── Fortalezas & Áreas de Mejora ── */}
          {(ev.fortalezas || ev.areas_mejora) && (
            <div className="fi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              {ev.fortalezas && (
                <div style={{ background: "#0f172a", border: "1px solid #22c55e20", borderRadius: "12px", padding: "20px 22px" }}>
                  <Section title="Fortalezas" accent="#22c55e" icon="✓">
                    <TextBlock text={ev.fortalezas} accent="#22c55e" />
                  </Section>
                </div>
              )}
              {ev.areas_mejora && (
                <div style={{ background: "#0f172a", border: "1px solid #f59e0b20", borderRadius: "12px", padding: "20px 22px" }}>
                  <Section title="Áreas de Mejora" accent="#f59e0b" icon="⚠">
                    <TextBlock text={ev.areas_mejora} accent="#f59e0b" />
                  </Section>
                </div>
              )}
            </div>
          )}

          {/* ── Sugerencias de recursos ── */}
          {ev.sugerencias_recursos && (
            <div className="fi" style={{ background: "#0f172a", border: "1px solid #3b82f620", borderRadius: "12px", padding: "20px 22px", marginBottom: "20px" }}>
              <Section title="Recursos Sugeridos" accent="#3b82f6" icon="→">
                <TextBlock text={ev.sugerencias_recursos} accent="#3b82f6" />
              </Section>
            </div>
          )}

          {/* ── Errores Detectados ── */}
          {errores.length > 0 && (
            <div className="fi" style={{ marginBottom: "20px" }}>
              <Section title="Errores Detectados" accent="#ef4444" icon="✗" count={errores.length}>
                {/* Severity summary pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {(["critico", "alto", "medio", "bajo"] as const).map(s =>
                    sevCount[s] ? (
                      <span key={s} style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: `${SEV_COLOR[s]}18`, color: SEV_COLOR[s], fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
                        {sevCount[s]} {SEV_LABEL[s]}
                      </span>
                    ) : null
                  )}
                </div>
                {errores.sort((a, b) => {
                  const order = { critico: 0, alto: 1, medio: 2, bajo: 3 };
                  return (order[a.severidad] ?? 4) - (order[b.severidad] ?? 4);
                }).map((e, i) => <ErrorCard key={i} error={e} />)}
              </Section>
            </div>
          )}

          {/* ── Recomendaciones de Solución ── */}
          {recs.length > 0 && (
            <div className="fi" style={{ marginBottom: "20px" }}>
              <Section title="Recomendaciones de Solución" accent="#3b82f6" icon="◈" count={recs.length}>
                {recs.sort((a, b) => {
                  const p = { alta: 0, media: 1, baja: 2 };
                  return (p[a.prioridad ?? "media"] ?? 3) - (p[b.prioridad ?? "media"] ?? 3);
                }).map((r, i) => <RecomendacionCard key={i} rec={r} />)}
              </Section>
            </div>
          )}

          {/* ── Detalle por Rúbrica ── */}
          {rubricas.length > 0 && (
            <div className="fi" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "22px 24px", marginBottom: "20px" }}>
              <Section title="Evaluación por Rúbrica" accent="#a855f7" icon="◆" count={rubricas.length}>
                {rubricas.map((r, i) => <RubricaBar key={i} rubrica={r} />)}
              </Section>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="fi" style={{ marginTop: "48px", textAlign: "center", color: "#1e293b", fontSize: "10px", letterSpacing: "0.12em" }}>
            ANÁLISIS GENERADO AUTOMÁTICAMENTE · AI CODE REVIEW · TECHMOCK
          </div>

        </div>
      </div>
    </>
  );
}