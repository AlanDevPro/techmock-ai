"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReporteView from "../../../../../../components/dashboard/developer/ReporteView";
import FeedbackView from "../../../../../../components/dashboard/developer/FeedbackView";

// ─── Types alineados con la BD ────────────────────────────────────────────────

export interface CalificacionGeneral {
  nivel: "Excelente" | "Bueno" | "Regular" | "Deficiente" | "Crítico";
  puntaje: number;
  resumen: string;
}

export interface ErrorLLM {
  tipo: string;                              // categoria_error.nombre
  descripcion: string;                       // errores_detectados.descripcion
  impacto: "alto" | "medio" | "bajo";       // mapeado desde severidad
  linea_aproximada?: string | number | null; // errores_detectados.linea_codigo
  es_conceptual?: boolean;                   // errores_detectados.es_error_conceptual
  fragmento_codigo?: string | null;          // errores_detectados.fragmento_codigo
  codigo_corregido?: string | null;          // errores_detectados.codigo_corregido
  explicacion_ia?: string | null;            // errores_detectados.explicacion_ia
}

export interface RecomendacionLLM {
  mensaje: string;                           // recomendaciones_solucion.titulo
  solucion: string;                          // recomendaciones_solucion.descripcion
  prioridad: "alta" | "media" | "baja";     // recomendaciones_solucion.prioridad
  tipo?: "codigo" | "concepto" | "recurso" | "patron"; // recomendaciones_solucion.tipo
  codigo_ejemplo?: string | null;            // recomendaciones_solucion.codigo_ejemplo
  recurso_url?: string | null;              // recomendaciones_solucion.recurso_url
  recurso_titulo?: string | null;           // recomendaciones_solucion.recurso_titulo
}

export interface EvaluacionTecnica {
  // Scores por pilar — evaluaciones.puntaje_*
  puntaje_javascript?: number | null;
  puntaje_arquitectura?: number | null;
  puntaje_buenas_practicas?: number | null;
  puntaje_comunicacion?: number | null;
  puntaje_resolucion?: number | null;
  // Textos descriptivos legacy (compatibilidad)
  manejo_estado?: string;
  legibilidad?: string;
  arquitectura?: string;
  performance?: string;
}

export interface InfoSesion {
  tecnologia?: string;       // tecnologias.nombre
  nivel?: string;            // niveles_dificultad.nombre
  fue_adaptativa?: boolean;  // sesiones_entrevista.fue_adaptativa
  duracion_segundos?: number;
  fecha_inicio?: string;
}

export interface CandidatoInfo {
  // evaluaciones.*
  nivel_candidato?: "descartado" | "revisar" | "promisorio" | "recomendado" | "destacado" | null;
  apto_para_contratacion?: boolean | null;
  fortalezas?: string | null;
  areas_mejora?: string | null;
}

export interface AnalisisPayload {
  calificacion_general: CalificacionGeneral;
  errores: ErrorLLM[];
  buenas_practicas: string[];
  malas_practicas: string[];
  recomendaciones: RecomendacionLLM[];
  evaluacion_tecnica: EvaluacionTecnica;
  // Campos enriquecidos de la BD
  sesion?: InfoSesion;
  candidato?: CandidatoInfo;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const NIVEL_COLOR: Record<string, string> = {
  Excelente:  "#22c55e",
  Bueno:      "#3b82f6",
  Regular:    "#f59e0b",
  Deficiente: "#f97316",
  Crítico:    "#ef4444",
};

export const scoreColor = (s: number) =>
  s >= 85 ? "#22c55e" : s >= 65 ? "#f59e0b" : s >= 40 ? "#f97316" : "#ef4444";

export const CANDIDATO_META: Record<string, { label: string; color: string }> = {
  descartado:  { label: "Descartado",  color: "#ef4444" },
  revisar:     { label: "Revisar",     color: "#f97316" },
  promisorio:  { label: "Promisorio",  color: "#f59e0b" },
  recomendado: { label: "Recomendado", color: "#3b82f6" },
  destacado:   { label: "Destacado",   color: "#22c55e" },
};

type Tab = "reporte" | "feedback";

// ─── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_RAG_API_URL ?? "http://localhost:8000";

async function fetchResultado(sesionId: string): Promise<AnalisisPayload> {
  const res = await fetch(
    `${API_BASE}/codigo/sesion/${sesionId}/analisis`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("Sesión no encontrada. Puede que el análisis aún no esté disponible.");
    throw new Error(`Error del servidor (${res.status}). Intenta de nuevo.`);
  }
  return res.json();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const params   = useParams();
  const router   = useRouter();
  const sesionId = params?.sessionId as string | undefined;

  const [payload,   setPayload]   = useState<AnalisisPayload | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("reporte");

  useEffect(() => {
    if (!sesionId) { setError("ID de sesión no válido."); setLoading(false); return; }
    let cancelled = false;
    fetchResultado(sesionId)
      .then((data) => { if (!cancelled) { setPayload(data); setLoading(false); } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sesionId]);

  if (loading) return (
    <div style={styles.center}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Cargando análisis...</p>
    </div>
  );

  if (error || !payload) return (
    <div style={{ ...styles.center, gap: "16px", padding: "40px", textAlign: "center" }}>
      <span style={{ fontSize: "36px", color: "#ef4444" }}>✗</span>
      <p style={styles.errorText}>{error ?? "No se encontraron datos de análisis."}</p>
      <button onClick={() => router.push("/dashboard/developer")} style={styles.backBtn}>
        ← Volver a entrevistas
      </button>
    </div>
  );

  const cal        = payload.calificacion_general;
  const nivelColor = NIVEL_COLOR[cal.nivel] ?? scoreColor(Math.round(cal.puntaje));
  const sesion     = payload.sesion;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "reporte",  label: "Reporte",  icon: "◈" },
    { id: "feedback", label: "Feedback", icon: "◎" },
  ];

  const duracionStr = sesion?.duracion_segundos
    ? `${Math.floor(sesion.duracion_segundos / 60)}m ${sesion.duracion_segundos % 60}s`
    : null;

  return (
    <>
      <GlobalStyles />
      <div className="grid-bg" style={styles.root}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="fi" style={{ marginBottom: "28px" }}>
            <button onClick={() => router.push("/dashboard/developer")} style={styles.backLink}>
              ← Volver
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <MetaChip>Code Review</MetaChip>
              {sesion?.tecnologia && <><Divider /><MetaChip>{sesion.tecnologia}</MetaChip></>}
              {sesion?.nivel      && <><Divider /><MetaChip>{sesion.nivel}</MetaChip></>}
              {duracionStr        && <><Divider /><MetaChip>⏱ {duracionStr}</MetaChip></>}
              {sesion?.fue_adaptativa && (
                <><Divider /><MetaChip style={{ color: "#3b82f6" }}>⚡ Adaptativa</MetaChip></>
              )}
              {sesionId && (
                <><Divider /><MetaChip title={sesionId}>#{sesionId.slice(0, 8)}</MetaChip></>
              )}
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
                    color:        isActive ? nivelColor : "#475569",
                    borderBottom: isActive ? `2px solid ${nivelColor}` : "2px solid transparent",
                    background:   isActive ? `${nivelColor}08` : "transparent",
                  }}
                >
                  <span style={{ marginRight: "6px", fontSize: "12px" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}

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
              ? <ReporteView  payload={payload} nivelColor={nivelColor} sesionId={sesionId} />
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

function MetaChip({ children, title, style }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <span
      title={title}
      style={{
        fontSize: "10px", color: "#64748b",
        letterSpacing: "0.12em", textTransform: "uppercase" as const,
        fontFamily: "'JetBrains Mono',monospace",
        ...style,
      }}
    >
      {children}
    </span>
  );
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
      .fi { animation: fadeUp 0.4s ease both; }
      .fi:nth-child(1){animation-delay:.04s}
      .fi:nth-child(2){animation-delay:.10s}
      .fi:nth-child(3){animation-delay:.16s}
      .fi:nth-child(4){animation-delay:.22s}
      .fi:nth-child(5){animation-delay:.28s}
      @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .grid-bg {
        background-image:
          linear-gradient(rgba(34,197,94,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,94,0.025) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      ::-webkit-scrollbar { width: 5px }
      ::-webkit-scrollbar-track { background: #0f172a }
      ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px }
      pre { font-family: 'JetBrains Mono',monospace; }
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
    width: "40px", height: "40px",
    border: "3px solid #1e293b",
    borderTop: "3px solid #22c55e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { margin: 0, fontSize: "11px", letterSpacing: "0.1em", color: "#475569" },
  errorText:   { margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.7 },
  backBtn: {
    marginTop: "12px", padding: "10px 24px",
    background: "#1e293b", color: "#e2e8f0",
    border: "1px solid #334155", borderRadius: "8px",
    cursor: "pointer", fontSize: "13px", fontFamily: "'JetBrains Mono',monospace",
  },
  backLink: {
    background: "none", border: "none", color: "#334155",
    cursor: "pointer", fontSize: "11px", fontFamily: "'JetBrains Mono',monospace",
    display: "flex", alignItems: "center", gap: "6px",
    marginBottom: "18px", padding: 0, letterSpacing: "0.06em",
  },
  title: {
    fontSize: "24px", fontWeight: 700, color: "#f1f5f9",
    fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  tabBar: {
    display: "flex", alignItems: "center",
    borderBottom: "1px solid #1e293b",
  },
  tabBtn: {
    background: "transparent", border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer", fontSize: "11px",
    fontFamily: "'JetBrains Mono',monospace",
    fontWeight: 700, letterSpacing: "0.08em",
    padding: "12px 20px",
    transition: "all 0.2s ease",
    display: "flex", alignItems: "center",
  },
  footer: {
    marginTop: "48px", textAlign: "center",
    color: "#1e293b", fontSize: "10px", letterSpacing: "0.12em",
  },
};