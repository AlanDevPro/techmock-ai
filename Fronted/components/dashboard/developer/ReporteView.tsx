"use client";

import { useEffect, useState } from "react";
import type { AnalisisPayload } from "../../../app/dashboard/developer/interviews/analisis/[sessionId]/page";
import { NIVEL_COLOR, scoreColor, CANDIDATO_META } from "../../../app/dashboard/developer/interviews/analisis/[sessionId]/page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NIVEL_EMOJI: Record<string, string> = {
  Excelente: "★", Bueno: "✓", Regular: "◎", Deficiente: "⚠", Crítico: "✗",
};

const IMPACTO_COLOR: Record<string, string> = {
  alto: "#ef4444", medio: "#f59e0b", bajo: "#22c55e",
};

const IMPACTO_LABEL: Record<string, string> = {
  alto: "ALTO", medio: "MEDIO", bajo: "BAJO",
};

// Pilares técnicos desde la BD (evaluaciones.puntaje_*)
const PILARES = [
  { key: "puntaje_javascript",      label: "JavaScript",       icon: "JS" },
  { key: "puntaje_arquitectura",    label: "Arquitectura",     icon: "AR" },
  { key: "puntaje_buenas_practicas",label: "Buenas Prácticas", icon: "BP" },
  { key: "puntaje_comunicacion",    label: "Comunicación",     icon: "CM" },
  { key: "puntaje_resolucion",      label: "Resolución",       icon: "RS" },
] as const;

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
    <svg width="136" height="136" viewBox="0 0 136 136" aria-hidden="true">
      <circle cx="68" cy="68" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="68" y="64" textAnchor="middle" fill={color} fontSize="24" fontWeight="700" fontFamily="'JetBrains Mono',monospace">
        {Math.round(anim)}
      </text>
      <text x="68" y="80" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="'JetBrains Mono',monospace">
        / 100
      </text>
    </svg>
  );
}

function ScoreBar({
  label, value, color, sublabel, icon,
}: {
  label: string; value: number; color?: string; sublabel?: string; icon?: string;
}) {
  const c = color ?? scoreColor(value);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {icon && (
            <span style={{
              fontSize: "9px", fontWeight: 700,
              background: `${c}18`, color: c,
              padding: "1px 5px", borderRadius: "3px",
              fontFamily: "'JetBrains Mono',monospace",
            }}>{icon}</span>
          )}
          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        </div>
        <span style={{ fontSize: "12px", color: c, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
          {value > 0 ? `${Math.round(value)}` : "—"}
        </span>
      </div>
      <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, background: c,
          borderRadius: "2px", transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      {sublabel && (
        <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#334155", lineHeight: 1.5, fontFamily: "'JetBrains Mono',monospace" }}>
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
      style={{
        background: "#0a1628",
        border: `1px solid ${error.es_conceptual ? c + "50" : c + "28"}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: "10px", padding: "14px 18px",
        marginBottom: "8px", cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
          <Badge bg={`${c}20`} color={c}>{IMPACTO_LABEL[error.impacto]}</Badge>
          {error.es_conceptual && (
            <Badge bg="#ef444420" color="#ef4444">CONCEPTUAL</Badge>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: "10px", color: "#475569",
            fontFamily: "'JetBrains Mono',monospace",
            display: "block", marginBottom: "4px",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {error.tipo}
          </span>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.55 }}>
            {error.descripcion}
          </p>
        </div>
        <span style={{ color: "#334155", fontSize: "11px", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Línea */}
          {error.linea_aproximada != null && (
            <div>
              <Label>Línea aproximada</Label>
              <Value>{error.linea_aproximada}</Value>
            </div>
          )}

          {/* Explicación IA */}
          {error.explicacion_ia && (
            <div>
              <Label>Por qué es un error</Label>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, fontFamily: "'JetBrains Mono',monospace" }}>
                {error.explicacion_ia}
              </p>
            </div>
          )}

          {/* Fragmento con error */}
          {error.fragmento_codigo && (
            <div>
              <Label>Fragmento con error</Label>
              <CodeBlock color="#ef4444">{error.fragmento_codigo}</CodeBlock>
            </div>
          )}

          {/* Corrección */}
          {error.codigo_corregido && (
            <div>
              <Label>Cómo debería escribirse</Label>
              <CodeBlock color="#22c55e">{error.codigo_corregido}</CodeBlock>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: bg, color, fontSize: "9px", fontWeight: 700,
      padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.08em",
      fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: "9px", color: "#334155",
      display: "block", marginBottom: "5px",
      fontFamily: "'JetBrains Mono',monospace",
      textTransform: "uppercase", letterSpacing: "0.1em",
    }}>
      {children}
    </span>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </span>
  );
}

function CodeBlock({ children, color }: { children: string; color?: string }) {
  return (
    <pre style={{
      margin: 0,
      background: "#020817",
      border: `1px solid ${color ? color + "30" : "#1e293b"}`,
      borderRadius: "6px",
      padding: "10px 14px",
      fontSize: "11.5px",
      color: color ?? "#94a3b8",
      overflowX: "auto",
      lineHeight: 1.6,
      fontFamily: "'JetBrains Mono',monospace",
    }}>
      {children}
    </pre>
  );
}

function SectionTitle({ accent, icon, title, count }: { accent: string; icon: string; title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <h2 style={{
        margin: 0, fontSize: "10px", color: accent,
        fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace",
      }}>
        {title}
      </h2>
      {count != null && (
        <span style={{
          marginLeft: "auto",
          background: `${accent}20`, color: accent,
          fontSize: "11px", fontWeight: 700,
          padding: "2px 8px", borderRadius: "4px",
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReporteView({
  payload, nivelColor, sesionId,
}: {
  payload: AnalisisPayload;
  nivelColor: string;
  sesionId?: string;
}) {
  const cal      = payload.calificacion_general;
  const puntaje  = Math.max(0, Math.min(100, Math.round(cal.puntaje)));
  const errores  = payload.errores ?? [];
  const buenas   = payload.buenas_practicas ?? [];
  const recs     = payload.recomendaciones ?? [];
  const evalTec  = payload.evaluacion_tecnica ?? {};
  const candidato = payload.candidato;

  const impactoCount = errores.reduce<Record<string, number>>((acc, e) => {
    acc[e.impacto] = (acc[e.impacto] ?? 0) + 1;
    return acc;
  }, {});

  const conceptualesCount = errores.filter(e => e.es_conceptual).length;

  // Pilares numéricos desde la BD
  const pilaresConDatos = PILARES.filter(p => {
    const v = evalTec[p.key as keyof typeof evalTec];
    return typeof v === "number" && v > 0;
  });

  // Fallback: evaluar por texto si no hay números
  const EVAL_TEXT_SCORE: Record<string, number> = {
    excelente: 90, bueno: 75, regular: 55, deficiente: 35,
  };
  function estimarScore(texto: string): number {
    const lower = texto.toLowerCase();
    for (const [k, v] of Object.entries(EVAL_TEXT_SCORE)) {
      if (lower.includes(k)) return v;
    }
    return 60;
  }

  const pilaresTexto = [
    { key: "manejo_estado", label: "Manejo de Estado", icon: "MS" },
    { key: "legibilidad",   label: "Legibilidad",      icon: "LG" },
    { key: "arquitectura",  label: "Arquitectura",     icon: "AR" },
    { key: "performance",   label: "Performance",      icon: "PF" },
  ].filter(p => {
    const v = evalTec[p.key as keyof typeof evalTec];
    return typeof v === "string" && v && v !== "No evaluado";
  });

  const candidatoMeta = candidato?.nivel_candidato
    ? CANDIDATO_META[candidato.nivel_candidato]
    : null;

  return (
    <>
      {/* ── Hero Score ── */}
      <div className="fi" style={{
        background: "#0a1628",
        border: `1px solid ${nivelColor}28`,
        borderRadius: "16px", padding: "24px 28px",
        marginBottom: "18px",
        display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={puntaje} color={nivelColor} />
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: nivelColor, fontFamily: "'Sora',sans-serif" }}>
              {NIVEL_EMOJI[cal.nivel]} {cal.nivel}
            </span>
            {candidatoMeta && (
              <span style={{
                fontSize: "10px", fontWeight: 700,
                background: `${candidatoMeta.color}20`,
                color: candidatoMeta.color,
                padding: "2px 8px", borderRadius: "4px",
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em",
              }}>
                {candidatoMeta.label}
              </span>
            )}
            {candidato?.apto_para_contratacion != null && (
              <span style={{
                fontSize: "10px", fontWeight: 700,
                background: candidato.apto_para_contratacion ? "#22c55e20" : "#ef444420",
                color: candidato.apto_para_contratacion ? "#22c55e" : "#ef4444",
                padding: "2px 8px", borderRadius: "4px",
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em",
              }}>
                {candidato.apto_para_contratacion ? "✓ Apto" : "✗ No apto"}
              </span>
            )}
          </div>
          <p style={{ color: "#64748b", fontSize: "12.5px", lineHeight: 1.7, margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>
            {cal.resumen}
          </p>
        </div>

        {/* Stats rápidos */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "9px", minWidth: "150px" }}>
          {[
            { label: "Errores totales",   count: errores.length,              c: "#ef4444" },
            { label: "Conceptuales",       count: conceptualesCount,           c: "#ef4444" },
            { label: "Impacto alto",       count: impactoCount["alto"] ?? 0,  c: "#f97316" },
            { label: "Buenas prácticas",   count: buenas.length,               c: "#22c55e" },
            { label: "Recomendaciones",    count: recs.length,                 c: "#3b82f6" },
          ].map(({ label, count, c }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "10px", color: "#334155", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
              <span style={{
                fontSize: "11px", fontWeight: 700,
                color: count > 0 ? c : "#1e293b",
                background: count > 0 ? `${c}18` : "transparent",
                padding: "1px 7px", borderRadius: "3px",
                minWidth: "26px", textAlign: "center",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Evaluación Técnica por Pilares (BD) ── */}
      {pilaresConDatos.length > 0 && (
        <div className="fi" style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: "12px", padding: "20px 24px", marginBottom: "18px",
        }}>
          <SectionTitle title="Evaluación por Pilar" accent="#3b82f6" icon="◈" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0 32px" }}>
            {pilaresConDatos.map((p) => {
              const val = evalTec[p.key as keyof typeof evalTec] as number;
              return (
                <ScoreBar key={p.key} label={p.label} value={val} icon={p.icon} />
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback: evaluación por texto (legacy) */}
      {pilaresConDatos.length === 0 && pilaresTexto.length > 0 && (
        <div className="fi" style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: "12px", padding: "20px 24px", marginBottom: "18px",
        }}>
          <SectionTitle title="Evaluación Técnica" accent="#3b82f6" icon="◈" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0 32px" }}>
            {pilaresTexto.map((p) => {
              const texto = evalTec[p.key as keyof typeof evalTec] as string;
              return (
                <ScoreBar key={p.key} label={p.label} value={estimarScore(texto)} sublabel={texto} icon={p.icon} />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Errores detectados ── */}
      <div className="fi" style={{ marginBottom: "18px" }}>
        <SectionTitle title="Errores Detectados" accent="#ef4444" icon="✗" count={errores.length} />

        {errores.length > 0 ? (
          <>
            {/* Pills de impacto + conceptuales */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {(["alto", "medio", "bajo"] as const).map((imp) =>
                impactoCount[imp] ? (
                  <span key={imp} style={{
                    fontSize: "10px", fontWeight: 700,
                    padding: "3px 10px", borderRadius: "4px",
                    background: `${IMPACTO_COLOR[imp]}18`, color: IMPACTO_COLOR[imp],
                    fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em",
                  }}>
                    {impactoCount[imp]} {IMPACTO_LABEL[imp]}
                  </span>
                ) : null
              )}
              {conceptualesCount > 0 && (
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  padding: "3px 10px", borderRadius: "4px",
                  background: "#ef444418", color: "#ef4444",
                  fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em",
                }}>
                  {conceptualesCount} Conceptual{conceptualesCount > 1 ? "es" : ""}
                </span>
              )}
            </div>

            {[...errores]
              .sort((a, b) => {
                // Conceptuales primero, luego por impacto
                if (a.es_conceptual !== b.es_conceptual) return a.es_conceptual ? -1 : 1;
                const order: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };
                return (order[a.impacto] ?? 3) - (order[b.impacto] ?? 3);
              })
              .map((e, i) => <ErrorCard key={i} error={e} />)
            }
          </>
        ) : (
          <div style={{
            textAlign: "center", padding: "36px 0",
            color: "#22c55e", fontSize: "12px", fontFamily: "'JetBrains Mono',monospace",
          }}>
            ✓ No se detectaron errores en el código
          </div>
        )}
      </div>
    </>
  );
}