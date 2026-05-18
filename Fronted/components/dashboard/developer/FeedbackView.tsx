"use client";

import { useState } from "react";
import type { AnalisisPayload, RecomendacionLLM } from "../../../app/dashboard/developer/interviews/page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORIDAD_DOT: Record<string, string> = {
  alta:  "#ef4444",
  media: "#f59e0b",
  baja:  "#64748b",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ListaTexto({ items, accent }: { items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "10px", padding: "9px 0", borderBottom: i < items.length - 1 ? "1px solid #0f172a" : "none", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.6, fontFamily: "'JetBrains Mono',monospace" }}>
          <span style={{ color: accent, flexShrink: 0 }}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RecomendacionCard({ rec, index }: { rec: RecomendacionLLM; index: number }) {
  const [open, setOpen] = useState(false);
  const pc = PRIORIDAD_DOT[rec.prioridad] ?? "#64748b";
  return (
    <div
      style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px 20px", marginBottom: "10px", cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ color: "#1e293b", fontSize: "10px", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginTop: "2px", minWidth: "20px" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5, flex: 1 }}>
          {rec.mensaje}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pc, display: "inline-block" }} />
          <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'JetBrains Mono',monospace" }}>{rec.prioridad}</span>
          <span style={{ color: "#334155", fontSize: "12px", marginLeft: "6px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px" }}>
          <span style={{ fontSize: "10px", color: "#475569", display: "block", fontFamily: "'JetBrains Mono',monospace", marginBottom: "6px" }}>
            SOLUCIÓN SUGERIDA
          </span>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.7 }}>
            {rec.solucion}
          </p>
        </div>
      )}
    </div>
  );
}

function PrioridadSummary({ recs }: { recs: RecomendacionLLM[] }) {
  const count = recs.reduce<Record<string, number>>((acc, r) => {
    acc[r.prioridad] = (acc[r.prioridad] ?? 0) + 1;
    return acc;
  }, {});
  const items = [
    { key: "alta",  label: "ALTA",  color: "#ef4444" },
    { key: "media", label: "MEDIA", color: "#f59e0b" },
    { key: "baja",  label: "BAJA",  color: "#64748b" },
  ].filter((i) => count[i.key]);

  if (!items.length) return null;
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
      {items.map(({ key, label, color }) => (
        <span key={key} style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: `${color}18`, color, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
          {count[key]} {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedbackView({ payload, nivelColor }: { payload: AnalisisPayload; nivelColor: string }) {
  const buenas = payload.buenas_practicas ?? [];
  const malas  = payload.malas_practicas  ?? [];
  const recs   = payload.recomendaciones  ?? [];

  const recsSorted = [...recs].sort((a, b) => {
    const p = { alta: 0, media: 1, baja: 2 };
    return (p[a.prioridad] ?? 3) - (p[b.prioridad] ?? 3);
  });

  const isEmpty = !buenas.length && !malas.length && !recs.length;

  if (isEmpty) {
    return (
      <div className="fi" style={{ textAlign: "center", padding: "60px 0", color: "#1e293b", fontSize: "12px", fontFamily: "'JetBrains Mono',monospace" }}>
        No se generó feedback adicional para este análisis.
      </div>
    );
  }

  return (
    <>
      {/* ── Resumen compacto del puntaje ── */}
      <div className="fi" style={{ background: "#0a1628", border: `1px solid ${nivelColor}18`, borderRadius: "12px", padding: "18px 24px", marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: nivelColor, display: "inline-block" }} />
          <span style={{ fontSize: "13px", color: nivelColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
            {Math.round(payload.calificacion_general.puntaje)}/100 · {payload.calificacion_general.nivel}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "#475569", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6, flex: 1 }}>
          {payload.calificacion_general.resumen}
        </p>
      </div>

      {/* ── Buenas & Malas prácticas ── */}
      {(buenas.length > 0 || malas.length > 0) && (
        <div className="fi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          {buenas.length > 0 && (
            <div style={{ background: "#0f172a", border: "1px solid #22c55e20", borderRadius: "12px", padding: "20px 22px" }}>
              <SectionTitle title="Buenas Prácticas" accent="#22c55e" icon="✓" count={buenas.length} />
              <ListaTexto items={buenas} accent="#22c55e" />
            </div>
          )}
          {malas.length > 0 && (
            <div style={{ background: "#0f172a", border: "1px solid #f59e0b20", borderRadius: "12px", padding: "20px 22px" }}>
              <SectionTitle title="Malas Prácticas" accent="#f59e0b" icon="⚠" count={malas.length} />
              <ListaTexto items={malas} accent="#f59e0b" />
            </div>
          )}
        </div>
      )}

      {/* ── Recomendaciones ── */}
      {recsSorted.length > 0 && (
        <div className="fi" style={{ marginBottom: "20px" }}>
          <SectionTitle title="Recomendaciones" accent="#3b82f6" icon="◈" count={recs.length} />
          <PrioridadSummary recs={recs} />
          {recsSorted.map((r, i) => <RecomendacionCard key={i} rec={r} index={i} />)}
        </div>
      )}
    </>
  );
}