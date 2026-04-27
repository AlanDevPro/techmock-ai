"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  LayoutDashboard,
  Gauge,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalificacionGeneral {
  nivel: string;
  puntaje: number;
  resumen: string;
}
interface ErrorDetectado {
  tipo: string;
  descripcion: string;
  impacto: "alto" | "medio" | "bajo";
  linea_aproximada?: string | null;
}
interface RecomendacionItem {
  mensaje: string;
  solucion: string;
  prioridad: "alta" | "media" | "baja";
}
interface EvaluacionTecnica {
  manejo_estado: string;
  legibilidad: string;
  arquitectura: string;
  performance: string;
}
interface AnalysisResult {
  calificacion_general: CalificacionGeneral;
  errores: ErrorDetectado[];
  buenas_practicas: string[];
  malas_practicas: string[];
  recomendaciones: RecomendacionItem[];
  evaluacion_tecnica: EvaluacionTecnica;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const nivelColor: Record<string, string> = {
  Excelente: "#22c55e",
  Bueno:     "#3b82f6",
  Regular:   "#f59e0b",
  Deficiente:"#f97316",
  Crítico:   "#ef4444",
};

const impactoColor: Record<string, string> = {
  alto:  "#ef4444",
  medio: "#f59e0b",
  bajo:  "#22c55e",
};

const prioridadColor: Record<string, string> = {
  alta:  "#ef4444",
  media: "#f59e0b",
  baja:  "#3b82f6",
};

function ScoreRing({ puntaje, nivel }: { puntaje: number; nivel: string }) {
  const color = nivelColor[nivel] ?? "#6b7280";
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (puntaje / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 56 56)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
          {puntaje}
        </span>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "#64748b" }}>pts</span>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ background: color + "22", color, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  );
}

const tecnicaIcons: Record<string, React.ReactNode> = {
  manejo_estado: <Cpu size={13} />,
  legibilidad:   <Eye size={13} />,
  arquitectura:  <LayoutDashboard size={13} />,
  performance:   <Gauge size={13} />,
};

const tecnicaLabels: Record<string, string> = {
  manejo_estado: "Manejo de Estado",
  legibilidad:   "Legibilidad",
  arquitectura:  "Arquitectura",
  performance:   "Performance",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Nuevo useEffect: solo lee de sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("analisis_resultado");

      if (!stored) {
        throw new Error("No hay resultado en sessionStorage");
      }

      const json: AnalysisResult = JSON.parse(stored);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para volver al IDE (puerto 3001)
  const goToIDE = () => {
    window.location.href = "http://localhost:3001/";
  };

  const nivel = data?.calificacion_general.nivel ?? "";
  const color = nivelColor[nivel] ?? "#6b7280";

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#0a0f1a", fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
        </div>
        <p className="text-sm text-slate-400 tracking-widest animate-pulse">CARGANDO RESULTADOS…</p>
      </div>
    );
  }

  // ── Error / Sin análisis ──
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        style={{ background: "#0a0f1a" }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Code2 size={48} color="#f59e0b" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-amber-500 tracking-tight">
            ¡Aún no hay análisis!
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            Para ver los resultados, primero debes enviar un código para analizar desde el IDE.
          </p>
          <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 max-w-md">
            <p className="text-xs text-slate-400 leading-relaxed">
              💡 <span className="text-amber-400">Consejo:</span> Vuelve al IDE, escribe o pega tu código React, 
              haz clic en &quot;Analizar&quot; y luego visita esta página para ver los resultados detallados.
            </p>
          </div>
        </div>
        <button onClick={goToIDE}
          className="mt-4 px-6 py-2.5 rounded-lg text-sm font-medium border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 transition-all flex items-center gap-2">
          <ArrowLeft size={16} /> Volver al IDE
        </button>
      </div>
    );
  }

  // ── Result ──
  return (
    <div className="min-h-screen pb-16"
      style={{ background: "#0a0f1a", fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>

      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 border-b"
        style={{ background: "#0d1525cc", borderColor: "#1e293b", backdropFilter: "blur(12px)" }}>
        <button onClick={goToIDE}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Volver al IDE
        </button>
        <span className="text-slate-700">|</span>
        <Code2 size={14} className="text-blue-400" />
        <span className="text-xs text-slate-300 tracking-widest uppercase">Análisis de Código</span>
        <div className="ml-auto">
          <Badge label={nivel} color={color} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 space-y-6">

        {/* ── Hero: score + resumen ── */}
        <div className="flex gap-6 items-start p-6 rounded-xl border"
          style={{ background: "#0d1525", borderColor: "#1e293b" }}>
          <ScoreRing puntaje={data.calificacion_general.puntaje} nivel={nivel} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight" style={{ color }}>
                {nivel}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-400">
              {data.calificacion_general.resumen}
            </p>
          </div>
        </div>

        {/* ── Evaluación técnica ── */}
        <section className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 px-1">
            Evaluación Técnica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(data.evaluacion_tecnica).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1.5 p-4 rounded-xl border"
                style={{ background: "#0d1525", borderColor: "#1e293b" }}>
                <div className="flex items-center gap-2 text-blue-400">
                  {tecnicaIcons[key]}
                  <span className="text-[10px] uppercase tracking-wider font-bold">
                    {tecnicaLabels[key] ?? key}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Errores ── */}
        {data.errores.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 px-1">
              Errores Detectados ({data.errores.length})
            </h2>
            <div className="space-y-2">
              {data.errores.map((err, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border"
                  style={{ background: "#0d1525", borderColor: impactoColor[err.impacto] + "44" }}>
                  <AlertTriangle size={15} style={{ color: impactoColor[err.impacto], flexShrink: 0, marginTop: 1 }} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-white">{err.tipo}</span>
                      <Badge label={err.impacto} color={impactoColor[err.impacto]} />
                      {err.linea_aproximada && (
                        <span className="text-[10px] text-slate-500">línea {err.linea_aproximada}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{err.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Buenas / Malas prácticas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.buenas_practicas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest text-slate-500 px-1">
                ✅ Buenas Prácticas
              </h2>
              <div className="p-4 rounded-xl border space-y-2"
                style={{ background: "#0d1525", borderColor: "#1e293b" }}>
                {data.buenas_practicas.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={12} className="shrink-0 mt-0.5" color="#22c55e" />
                    <span className="text-[11px] text-slate-400">{p}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.malas_practicas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest text-slate-500 px-1">
                ❌ Malas Prácticas
              </h2>
              <div className="p-4 rounded-xl border space-y-2"
                style={{ background: "#0d1525", borderColor: "#1e293b" }}>
                {data.malas_practicas.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle size={12} className="shrink-0 mt-0.5" color="#ef4444" />
                    <span className="text-[11px] text-slate-400">{p}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Recomendaciones ── */}
        {data.recomendaciones.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 px-1">
              Recomendaciones
            </h2>
            <div className="space-y-2">
              {data.recomendaciones.map((r, i) => (
                <div key={i} className="p-4 rounded-xl border"
                  style={{ background: "#0d1525", borderColor: "#1e293b" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} style={{ color: prioridadColor[r.prioridad] }} />
                    <span className="text-[11px] font-bold text-white">{r.mensaje}</span>
                    <div className="ml-auto">
                      <Badge label={r.prioridad} color={prioridadColor[r.prioridad]} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight size={11} className="mt-0.5 shrink-0 text-slate-600" />
                    <p className="text-[11px] text-slate-400">{r.solucion}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}