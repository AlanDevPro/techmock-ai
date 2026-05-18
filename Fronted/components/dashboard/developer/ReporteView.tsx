"use client";

import { useEffect, useState } from "react";
import type { AnalisisPayload } from "../../../app/dashboard/developer/interviews/page";
import { NIVEL_COLOR, scoreColor } from "../../../app/dashboard/developer/interviews/page";

// ─── Types locales ─────────────────────────────────────────────────────────────

const NIVEL_EMOJI: Record<string, string> = {
  Excelente: "★",
  Bueno: "✓",
  Regular: "◎",
  Deficiente: "⚠",
  Crítico: "✗",
};

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

const EVAL_TECNICA_SCORE: Record<string, number> = {
  excelente: 90,
  bueno: 75,
  regular: 55,
  deficiente: 35,
  "no evaluado": 0,
};

function estimarScore(texto: string): number {
  const lower = texto.toLowerCase();
  for (const key of Object.keys(EVAL_TECNICA_SCORE)) {
    if (lower.includes(key)) return EVAL_TECNICA_SCORE[key];
  }
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

function ScoreBar({ label, value, color, sublabel }: { label: string; value: number; color?: string; sublabel?: string }) {
  const c = color ?? scoreColor(value);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 300);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        <span style={{ fontSize: "12px", color: c, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
          {value > 0 ? `${Math.round(value)}` : "—"}
        </span>
      </div>
      <div style={{ height: "5px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: "3px", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      {sublabel && (
        <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#334155", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

function ErrorCard({ error }: { error: AnalisisPayload["errores"][number] }) {
  const [open, setOpen] = useState(false);
  const c = IMPACTO_COLOR[error.impacto] ?? "#94a3b8";
  return (
    <div
      style={{ background: "#0a1628", border: `1px solid ${c}28`, borderRadius: "10px", padding: "16px 20px", marginBottom: "10px", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <Badge bg={`${c}20`} color={c}>{IMPACTO_LABEL[error.impacto]}</Badge>
        <Badge bg="#1e293b" color="#64748b">{error.tipo.toUpperCase()}</Badge>
        <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5, flex: 1 }}>
          {error.descripcion}
        </p>
        <span style={{ color: "#334155", fontSize: "12px", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && error.linea_aproximada != null && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>LÍNEA APROXIMADA → </span>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>{error.linea_aproximada}</span>
        </div>
      )}
    </div>
  );
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color, fontSize: "9px", fontWeight: 700, padding: "3px 7px", borderRadius: "4px", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginTop: "1px" }}>
      {children}
    </span>
  );
}

function SectionTitle({ accent, icon, title, count }: { accent: string; icon: string; title: string; count?: number }) {
  return (
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
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReporteView({ payload, nivelColor }: { payload: AnalisisPayload; nivelColor: string }) {
  const cal = payload.calificacion_general;
  const puntaje = Math.max(0, Math.min(100, Math.round(cal.puntaje)));
  const errores = payload.errores ?? [];
  const buenas = payload.buenas_practicas ?? [];
  const recs = payload.recomendaciones ?? [];

  const impactoCount = errores.reduce<Record<string, number>>((acc, e) => {
    acc[e.impacto] = (acc[e.impacto] ?? 0) + 1;
    return acc;
  }, {});

  const evalTec = payload.evaluacion_tecnica;
  const evalTecEntries = evalTec
    ? [
        { label: "Manejo de Estado", texto: evalTec.manejo_estado, score: estimarScore(evalTec.manejo_estado) },
        { label: "Legibilidad",      texto: evalTec.legibilidad,    score: estimarScore(evalTec.legibilidad) },
        { label: "Arquitectura",     texto: evalTec.arquitectura,   score: estimarScore(evalTec.arquitectura) },
        { label: "Performance",      texto: evalTec.performance,    score: estimarScore(evalTec.performance) },
      ].filter((e) => e.texto && e.texto !== "No evaluado")
    : [];

  return (
    <>
      {/* ── Hero Score ── */}
      <div className="fi" style={{ background: "#0a1628", border: `1px solid ${nivelColor}28`, borderRadius: "16px", padding: "28px 32px", marginBottom: "20px", display: "flex", gap: "36px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={puntaje} color={nivelColor} />
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: nivelColor, fontFamily: "'Sora',sans-serif" }}>
              {NIVEL_EMOJI[cal.nivel]} {cal.nivel}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
            {cal.resumen}
          </p>
        </div>

        {/* Stats rápidos */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", minWidth: "140px" }}>
          {[
            { label: "Errores",       count: errores.length,              c: "#ef4444" },
            { label: "Impacto Alto",  count: impactoCount["alto"] ?? 0,   c: "#ef4444" },
            { label: "Buenas práct.", count: buenas.length,               c: "#22c55e" },
            { label: "Recomendac.",   count: recs.length,                 c: "#3b82f6" },
          ].map(({ label, count, c }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "10.5px", color: "#334155" }}>{label}</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: count > 0 ? c : "#1e293b", background: count > 0 ? `${c}18` : "transparent", padding: "1px 8px", borderRadius: "4px", minWidth: "28px", textAlign: "center" }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Evaluación Técnica ── */}
      {evalTecEntries.length > 0 && (
        <div className="fi" style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "22px 24px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "10px", color: "#334155", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
            Evaluación técnica
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 36px" }}>
            {evalTecEntries.map((e) => (
              <ScoreBar key={e.label} label={e.label} value={e.score} sublabel={e.texto} />
            ))}
          </div>
        </div>
      )}

      {/* ── Errores detectados ── */}
      {errores.length > 0 && (
        <div className="fi" style={{ marginBottom: "20px" }}>
          <SectionTitle title="Errores Detectados" accent="#ef4444" icon="✗" count={errores.length} />

          {/* Impacto pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
            {(["alto", "medio", "bajo"] as const).map((imp) =>
              impactoCount[imp] ? (
                <span key={imp} style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: `${IMPACTO_COLOR[imp]}18`, color: IMPACTO_COLOR[imp], fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
                  {impactoCount[imp]} {IMPACTO_LABEL[imp]}
                </span>
              ) : null
            )}
          </div>

          {[...errores]
            .sort((a, b) => {
              const order = { alto: 0, medio: 1, bajo: 2 };
              return (order[a.impacto] ?? 3) - (order[b.impacto] ?? 3);
            })
            .map((e, i) => <ErrorCard key={i} error={e} />)
          }
        </div>
      )}

      {errores.length === 0 && (
        <div className="fi" style={{ textAlign: "center", padding: "40px 0", color: "#1e293b", fontSize: "12px", fontFamily: "'JetBrains Mono',monospace" }}>
          ✓ No se detectaron errores en el código
        </div>
      )}
    </>
  );
}