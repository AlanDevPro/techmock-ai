'use client';

/**
 * /app/(protected)/dashboard/admin/analytics/page.tsx
 * Evaluaciones & Analytics — Solo lectura
 * Mapea tablas: evaluaciones, detalle_evaluacion, rubricas, sesiones_entrevista
 */

import { useState, useMemo, useEffect, useId, useRef } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import {
  analyticsService,
  type Evaluacion,
  RUBRICAS,
} from "@/services/analytics.service";
import { getTechIconUrl } from "@/lib/techIcons";

// ─── TEMA ──────────────────────────────────────────────────────────────────────

const getThemeTokens = (isDark: boolean) => ({
  bg: isDark ? "#111214" : "#f0f2f5",
  surface: isDark ? "#1a1c20" : "#ffffff",
  surface2: isDark ? "#20232a" : "#f8f9fb",
  surfaceHover: isDark ? "#22252b" : "#f0f2f5",
  border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  text: isDark ? "#e8eaed" : "#111214",
  textMuted: isDark ? "#8b8fa8" : "#5f6478",
  textFaint: isDark ? "#555868" : "#adb0be",
  accent: isDark ? "#00c96b" : "#00a855",
  accentBg: isDark ? "rgba(0,201,107,0.1)" : "rgba(0,168,85,0.08)",
  danger: isDark ? "#ef4444" : "#dc2626",
  dangerBg: isDark ? "rgba(239,68,68,0.1)" : "rgba(220,38,38,0.08)",
  warning: isDark ? "#f59e0b" : "#d97706",
  warningBg: isDark ? "rgba(245,158,11,0.1)" : "rgba(217,119,6,0.08)",
  info: isDark ? "#3b82f6" : "#2563eb",
  infoBg: isDark ? "rgba(59,130,246,0.1)" : "rgba(37,99,235,0.08)",
  purple: isDark ? "#a855f7" : "#9333ea",
  purpleBg: isDark ? "rgba(168,85,247,0.1)" : "rgba(147,51,234,0.08)",
  inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  inputBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
});

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

type ThemeTokens = ReturnType<typeof getThemeTokens>;

export type RadarAxis = {
  label: string;
  value: number;
  sublabel?: string;
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ["#00c96b", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"];

const getNivelCandidatoColors = (tokens: ThemeTokens): Record<string, string> => ({
  destacado: tokens.accent,
  recomendado: tokens.info,
  promisorio: tokens.warning,
  revisar: tokens.danger,
  descartado: tokens.textMuted,
  sin_evaluar: tokens.textFaint,
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const avatarColor = (s: string) => AVATAR_PALETTE[s.charCodeAt(0) % AVATAR_PALETTE.length];

const getScoreColor = (score: number | string | null | undefined, tokens: ThemeTokens) => {
  const numericScore = typeof score === "number" ? score : typeof score === "string" ? parseFloat(score) : 0;
  const finalScore = isNaN(numericScore) ? 0 : numericScore;
  if (finalScore >= 85) return tokens.accent;
  if (finalScore >= 70) return tokens.warning;
  if (finalScore >= 55) return tokens.info;
  return tokens.danger;
};

const toSafeNumber = (value: unknown, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : defaultValue;
  return isNaN(num) ? defaultValue : num;
};

const fmtDate = (iso: string) => {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
};

const formatNumber = (value: number | string | null | undefined): string => {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "—" : num.toLocaleString();
};

// ─── RADAR CHART (COMPLETO) ──────────────────────────────────────────────────

function RadarChart({
  axes,
  size = 240,
  color,
  colorTo,
  tokens,
  showValues = true,
  levels = 4,
}: {
  axes: RadarAxis[];
  size?: number;
  color: string;
  colorTo?: string;
  tokens: ThemeTokens;
  showValues?: boolean;
  levels?: number;
}) {
  const gradId = useId().replace(/:/g, "");
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setProgress(1);
      return;
    }

    let start: number | null = null;
    const duration = 700;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [axes.length]);

  const n = axes.length;
  const center = size / 2;
  const maxR = size / 2 - (showValues ? 38 : 18);
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, ratio: number) => {
    const a = angleFor(i);
    const r = maxR * ratio;
    return {
      x: center + r * Math.cos(a),
      y: center + r * Math.sin(a),
    };
  };

  const dataPoints = axes.map((ax, i) => {
    const ratio = (Math.min(Math.max(ax.value, 0), 100) / 100) * progress;
    return pointAt(i, ratio);
  });

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const gridLevels = Array.from({ length: levels }, (_, lvl) => {
    const ratio = (lvl + 1) / levels;
    const pts = axes.map((_, i) => pointAt(i, ratio));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  });

  const finalColorTo = colorTo ?? color;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`grad-${gradId}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={finalColorTo} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color} stopOpacity={0.12} />
        </radialGradient>
      </defs>

      {gridLevels.map((d, i) => (
        <path key={`grid-${i}`} d={d} fill="none" stroke={tokens.border} strokeWidth={1} />
      ))}

      {axes.map((_, i) => {
        const p = pointAt(i, 1);
        return (
          <line key={`spoke-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} stroke={tokens.border} strokeWidth={1} />
        );
      })}

      <path
        d={dataPath}
        fill={`url(#grad-${gradId})`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ transition: "d 0.05s linear" }}
      />

      {dataPoints.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {axes.map((ax, i) => {
        const labelPoint = pointAt(i, 1.28);
        const anchor =
          Math.abs(Math.cos(angleFor(i))) < 0.35
            ? "middle"
            : Math.cos(angleFor(i)) > 0
            ? "start"
            : "end";
        return (
          <text
            key={`label-${i}`}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={700}
            fill={tokens.text}
            fontFamily="'DM Sans', sans-serif"
          >
            {ax.label}
          </text>
        );
      })}

      {showValues &&
        axes.map((ax, i) => {
          const valuePoint = pointAt(i, 1.28);
          const anchor =
            Math.abs(Math.cos(angleFor(i))) < 0.35
              ? "middle"
              : Math.cos(angleFor(i)) > 0
              ? "start"
              : "end";
          return (
            <text
              key={`value-${i}`}
              x={valuePoint.x}
              y={valuePoint.y + 14}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              fill={tokens.textFaint}
              fontFamily="'DM Sans', sans-serif"
            >
              {ax.value.toFixed(0)}
              {ax.sublabel ? ` · ${ax.sublabel}` : ""}
            </text>
          );
        })}
    </svg>
  );
}

// ─── MINI RADAR CON ETIQUETAS ──────────────────────────────────────────────

function MiniRadarWithLabels({
  axes,
  size = 160,
  color,
  tokens,
  showValues = true,
}: {
  axes: RadarAxis[];
  size?: number;
  color: string;
  tokens: ThemeTokens;
  showValues?: boolean;
}) {
  const gradId = useId().replace(/:/g, "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setProgress(1);
      return;
    }
    let start: number | null = null;
    const duration = 600;
    let raf: number;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [axes.length]);

  const n = axes.length;
  const center = size / 2;
  const maxR = size / 2 - (showValues ? 32 : 12);
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, ratio: number) => {
    const a = angleFor(i);
    const r = maxR * ratio;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };

  const dataPoints = axes.map((ax, i) =>
    pointAt(i, (Math.min(Math.max(ax.value, 0), 100) / 100) * progress)
  );
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const gridPath = (ratio: number) =>
    axes.map((_, i) => pointAt(i, ratio)).map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`mgrad-${gradId}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0.1} />
        </radialGradient>
      </defs>

      {/* Grid */}
      <path d={gridPath(1)} fill="none" stroke={tokens.border} strokeWidth={1} />
      <path d={gridPath(0.5)} fill="none" stroke={tokens.border} strokeWidth={1} />

      {/* Spokes */}
      {axes.map((_, i) => {
        const p = pointAt(i, 1);
        return (
          <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke={tokens.border} strokeWidth={1} />
        );
      })}

      {/* Data area */}
      <path d={dataPath} fill={`url(#mgrad-${gradId})`} stroke={color} strokeWidth={1.75} strokeLinejoin="round" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}

      {/* Etiquetas abreviadas */}
      {axes.map((ax, i) => {
        const labelPoint = pointAt(i, 1.25);
        const anchor =
          Math.abs(Math.cos(angleFor(i))) < 0.35
            ? "middle"
            : Math.cos(angleFor(i)) > 0
            ? "start"
            : "end";
        return (
          <text
            key={`label-${i}`}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={600}
            fill={tokens.text}
            fontFamily="'DM Sans', sans-serif"
          >
            {ax.label}
          </text>
        );
      })}

      {/* Valores + sublabel */}
      {showValues &&
        axes.map((ax, i) => {
          const valuePoint = pointAt(i, 1.25);
          const anchor =
            Math.abs(Math.cos(angleFor(i))) < 0.35
              ? "middle"
              : Math.cos(angleFor(i)) > 0
              ? "start"
              : "end";
          const yOffset = 12;
          return (
            <text
              key={`value-${i}`}
              x={valuePoint.x}
              y={valuePoint.y + yOffset}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={7}
              fontWeight={600}
              fill={tokens.textFaint}
              fontFamily="'DM Sans', sans-serif"
            >
              {ax.value.toFixed(0)}
              {ax.sublabel ? ` · ${ax.sublabel}` : ""}
            </text>
          );
        })}
    </svg>
  );
}

// ─── FUNCIONES PARA CONSTRUIR EJES DEL RADAR ─────────────────────────────────

const buildRubricAxes = (ev: Evaluacion): RadarAxis[] => {
  return (ev.detalles ?? []).map((d) => {
    const rubrica = RUBRICAS.find((r) => r.id === d.rubrica_id);
    const label = d.rubrica_nombre;
    return {
      label: label,
      value: toSafeNumber(d.puntaje, 0),
      sublabel: `${rubrica?.peso_porcentual ?? 20}%`,
    };
  });
};

// ─── TIPO PARA PILARES TÉCNICOS ──────────────────────────────────────────────

// Extiende Evaluacion con los campos de pilares técnicos que pueden existir
type EvaluacionWithPilares = Evaluacion & {
  puntaje_javascript?: number | string | null;
  puntaje_arquitectura?: number | string | null;
  puntaje_buenas_practicas?: number | string | null;
  puntaje_comunicacion?: number | string | null;
  puntaje_resolucion?: number | string | null;
};

// ─── FUNCIONES PARA CONSTRUIR EJES DEL RADAR ─────────────────────────────────

const buildPilarAxes = (ev: Evaluacion): RadarAxis[] => {
  const evWithPilares = ev as EvaluacionWithPilares;
  const pilares: { label: string; value: unknown }[] = [
    { label: "JavaScript", value: evWithPilares.puntaje_javascript },
    { label: "Arquitectura", value: evWithPilares.puntaje_arquitectura },
    { label: "Buenas prácticas", value: evWithPilares.puntaje_buenas_practicas },
    { label: "Comunicación", value: evWithPilares.puntaje_comunicacion },
    { label: "Resolución", value: evWithPilares.puntaje_resolucion },
  ];
  return pilares
    .filter((p) => p.value !== null && p.value !== undefined)
    .map((p) => ({ label: p.label, value: toSafeNumber(p.value, 0) }));
};

// ─── ICONO DE TECNOLOGÍA ─────────────────────────────────────────────────────

function TechIcon({ nombre, size = 22 }: { nombre: string | null | undefined; size?: number }) {
  const url = getTechIconUrl(nombre);
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
        }}
        title={nombre ?? undefined}
      >
        <i className="ti ti-code" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={nombre ?? "tecnología"}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

// ─── DETALLE MODAL ────────────────────────────────────────────────────────────

function EvalModal({
  ev,
  onClose,
  tokens,
}: {
  ev: Evaluacion;
  onClose: () => void;
  tokens: ThemeTokens;
}) {
  const nivelCandidatoColors = getNivelCandidatoColors(tokens);
  const nivelCandidatoColor = nivelCandidatoColors[ev.nivel_candidato ?? "sin_evaluar"];
  const puntajeTotal = toSafeNumber(ev.puntaje_total, 0);
  const scoreColor = getScoreColor(puntajeTotal, tokens);

  const rubricAxes = buildRubricAxes(ev);
  const pilarAxes = buildPilarAxes(ev);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.18s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          animation: "modalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: avatarColor(ev.usuario_initials) + "22",
                border: `1.5px solid ${avatarColor(ev.usuario_initials)}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 700,
                color: avatarColor(ev.usuario_initials),
                flexShrink: 0,
              }}
            >
              {ev.usuario_initials}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>
                {ev.usuario_nombre}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                  color: tokens.textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TechIcon nombre={ev.tecnologia} size={15} />
                {ev.tecnologia} · {ev.nivel}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: tokens.textFaint }}>{fmtDate(ev.fecha)}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {puntajeTotal.toFixed(0)}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: tokens.textFaint, textTransform: "uppercase" }}>
                Puntaje total
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: tokens.surface2,
                border: `1px solid ${tokens.border}`,
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: "pointer",
                color: tokens.textMuted,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = tokens.danger;
                (e.currentTarget as HTMLElement).style.borderColor = tokens.danger + "55";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = tokens.textMuted;
                (e.currentTarget as HTMLElement).style.borderColor = tokens.border;
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nivel candidato y aptitud */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            background: tokens.surface2,
            borderRadius: 12,
            padding: "1rem 1.25rem",
          }}
        >
          <div>
            <span style={{ fontSize: 10, color: tokens.textFaint, textTransform: "uppercase" }}>
              Nivel del candidato
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: nivelCandidatoColor }}>
              {ev.nivel_candidato ? ev.nivel_candidato.toUpperCase() : "Sin evaluar"}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 10, color: tokens.textFaint, textTransform: "uppercase" }}>
              Aptitud para contratación
            </span>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                fontWeight: 700,
                color: ev.apto_para_contratacion ? tokens.accent : tokens.danger,
              }}
            >
              {ev.apto_para_contratacion === true
                ? "✅ Apto"
                : ev.apto_para_contratacion === false
                ? "❌ No apto"
                : "—"}
            </p>
          </div>
        </div>

        {/* Resumen para reclutador */}
        {ev.resumen_para_reclutador && (
          <div style={{ background: tokens.infoBg, borderRadius: 12, padding: "0.9rem 1.25rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: tokens.info,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Resumen para reclutador
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: tokens.text, lineHeight: 1.5 }}>
              {ev.resumen_para_reclutador}
            </p>
          </div>
        )}

        {/* Dos radares lado a lado: rúbricas y pilares */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: pilarAxes.length >= 3 ? "1fr 1fr" : "1fr",
            gap: 18,
          }}
        >
          {rubricAxes.length >= 3 && (
            <div
              style={{
                background: tokens.surface2,
                borderRadius: 14,
                padding: "1.1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: tokens.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  alignSelf: "flex-start",
                }}
              >
                Desglose por rúbrica
              </p>
              <RadarChart axes={rubricAxes} size={260} color={tokens.accent} colorTo={tokens.info} tokens={tokens} />
            </div>
          )}

          {pilarAxes.length >= 3 && (
            <div
              style={{
                background: tokens.surface2,
                borderRadius: 14,
                padding: "1.1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: tokens.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  alignSelf: "flex-start",
                }}
              >
                Score por pilar técnico
              </p>
              <RadarChart axes={pilarAxes} size={260} color={tokens.purple} colorTo={tokens.danger} tokens={tokens} />
            </div>
          )}
        </div>

        {/* Feedback */}
        {[
          { label: "Feedback general", value: ev.feedback_general, color: tokens.text },
          { label: "Fortalezas", value: ev.fortalezas, color: tokens.accent },
          { label: "Áreas de mejora", value: ev.areas_mejora, color: tokens.warning },
        ].map(({ label, value, color }) => (
          <div key={`feedback-${label}`}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 11,
                fontWeight: 700,
                color: tokens.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {label}
            </p>
            <p style={{ margin: 0, fontSize: 13, color, lineHeight: 1.6 }}>{value || "—"}</p>
          </div>
        ))}

        {/* Meta */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Modelo IA", value: ev.modelo_ia_usado || "—" },
            { label: "Tokens usados", value: formatNumber(ev.tokens_evaluacion) },
            { label: "Generado por IA", value: ev.generado_por_ia ? "Sí" : "No" },
            { label: "Sesión ID", value: ev.sesion_id ? ev.sesion_id.slice(0, 8) + "…" : "—" },
          ].map((m) => (
            <div
              key={`meta-${m.label}`}
              style={{ background: tokens.surface2, borderRadius: 8, padding: "7px 12px", fontSize: 11 }}
            >
              <span style={{ color: tokens.textFaint }}>{m.label}: </span>
              <span style={{ color: tokens.textMuted, fontFamily: "monospace" }}>{m.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            alignSelf: "flex-end",
            background: tokens.accentBg,
            border: `1px solid ${tokens.accent}44`,
            color: tokens.accent,
            borderRadius: 9,
            padding: "8px 22px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            transition: "transform 0.12s",
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(0.96)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
        >
          Cerrar
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function LoadingSkeleton({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "'DM Sans', sans-serif" }}>
      <div>
        <div style={{ height: 28, width: 180, background: tokens.surface2, borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 16, width: 320, background: tokens.surface2, borderRadius: 6 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={`skeleton-kpi-${i}`}
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "1rem 1.1rem", height: 72 }}
          >
            <div style={{ height: "100%", background: tokens.surface2, borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 14 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={`skeleton-card-${i}`}
            style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "1.25rem", height: 280 }}
          >
            <div style={{ height: "100%", background: tokens.surface2, borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry, tokens }: { message: string; onRetry: () => void; tokens: ThemeTokens }) {
  return (
    <div
      style={{
        background: tokens.dangerBg,
        border: `1px solid ${tokens.danger}44`,
        borderRadius: 12,
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 18, color: tokens.danger }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tokens.danger }}>Error al cargar evaluaciones</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: tokens.textMuted }}>{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          background: tokens.dangerBg,
          border: `1px solid ${tokens.danger}66`,
          color: tokens.danger,
          borderRadius: 8,
          padding: "7px 16px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ filtered, tokens }: { filtered: boolean; tokens: ThemeTokens }) {
  return (
    <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "4rem 2rem", textAlign: "center" }}>
      <i className="ti ti-clipboard-off" style={{ fontSize: 40, color: tokens.textFaint, display: "block", marginBottom: 12 }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.textMuted }}>
        {filtered ? "No se encontraron evaluaciones con los filtros aplicados" : "Aún no hay evaluaciones registradas"}
      </p>
      {filtered && <p style={{ margin: "6px 0 0", fontSize: 12, color: tokens.textFaint }}>Intenta ajustar los filtros o la búsqueda</p>}
    </div>
  );
}

// ─── CLASE DE ERROR PERSONALIZADA ─────────────────────────────────────────────

/**
 * Error personalizado para el módulo de analytics
 * Permite un manejo más granular de errores en la capa de servicios
 */
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AnalyticsError';
    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AnalyticsError);
    }
  }

  /**
   * Crea un AnalyticsError desde un error desconocido
   */
  static fromUnknown(err: unknown): AnalyticsError {
    if (err instanceof AnalyticsError) {
      return err;
    }
    
    if (err instanceof Error) {
      return new AnalyticsError(err.message, 'UNKNOWN_ERROR', undefined, err);
    }
    
    return new AnalyticsError(
      'Ocurrió un error inesperado al procesar la solicitud',
      'UNKNOWN_ERROR',
      undefined,
      err
    );
  }

  /**
   * Determina si el error es de tipo "no autorizado"
   */
  isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Determina si el error es de tipo "no encontrado"
   */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Determina si el error es de tipo "timeout"
   */
  isTimeout(): boolean {
    return this.code === 'TIMEOUT' || this.code === 'ECONNABORTED';
  }
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);
  const nivelCandidatoColors = getNivelCandidatoColors(tokens);

  const [selected, setSelected] = useState<Evaluacion | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterNivel, setFilterNivel] = useState("todos");
  const [filterTech, setFilterTech] = useState("todas");
  const [filterApto, setFilterApto] = useState("todos");
  const [search, setSearch] = useState("");

  const fetchEvaluaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getEvaluaciones();
      setEvaluaciones(data);
    } catch (err) {
      // Manejo de errores usando la clase AnalyticsError
      const analyticsError = AnalyticsError.fromUnknown(err);
      
      // Mensajes personalizados según el tipo de error
      let userMessage: string;
      
      if (analyticsError.isUnauthorized()) {
        userMessage = 'No tienes permisos para ver las evaluaciones. Por favor, inicia sesión nuevamente.';
      } else if (analyticsError.isNotFound()) {
        userMessage = 'No se encontraron evaluaciones en el sistema.';
      } else if (analyticsError.isTimeout()) {
        userMessage = 'La solicitud ha tardado demasiado. Por favor, verifica tu conexión e intenta nuevamente.';
      } else {
        // Usar el mensaje del error o uno genérico
        userMessage = analyticsError.message || 'Ocurrió un error inesperado al cargar las evaluaciones.';
      }
      
      setError(userMessage);
      console.error("[AnalyticsPage] fetchEvaluaciones:", {
        originalError: err,
        analyticsError,
        userMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluaciones();
  }, []);

  const niveles = useMemo(() => {
    const set = new Set(evaluaciones.map((e) => e.nivel).filter((n): n is string => !!n));
    return Array.from(set).sort();
  }, [evaluaciones]);

  const techs = useMemo(() => {
    const set = new Set(evaluaciones.map((e) => e.tecnologia).filter((t): t is string => !!t));
    return Array.from(set).sort();
  }, [evaluaciones]);

  const nivelCandidatoStats = useMemo(() => analyticsService.getNivelCandidatoStats(evaluaciones), [evaluaciones]);

  const filtered = useMemo(
    () => analyticsService.filterEvaluaciones(evaluaciones, { search, nivel: filterNivel, tecnologia: filterTech, apto: filterApto }),
    [evaluaciones, search, filterNivel, filterTech, filterApto]
  );

  const metrics = useMemo(() => {
    return {
      avgScore: analyticsService.calcAvgScore(evaluaciones),
      totalTokens: analyticsService.calcTotalTokens(evaluaciones),
      highScores: analyticsService.calcHighScores(evaluaciones),
      lowScores: analyticsService.calcLowScores(evaluaciones),
      aptosContratacion: analyticsService.calcAptosContratacion(evaluaciones),
      avgByRubrica: analyticsService.calcAvgByRubrica(evaluaciones),
    };
  }, [evaluaciones]);

  const avgRubricaAxes: RadarAxis[] = useMemo(
    () =>
      metrics.avgByRubrica.map((r) => ({
        label: r.nombre,
        value: toSafeNumber(r.avg, 0),
        sublabel: `${r.peso_porcentual}%`,
      })),
    [metrics.avgByRubrica]
  );

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />
        <LoadingSkeleton tokens={tokens} />
      </>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "'DM Sans', sans-serif" }}>
        {/* ── HEADER ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>
              Evaluaciones
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>
              Resultados generados por IA con desglose por rúbrica
            </p>
          </div>
          <div style={{ background: tokens.infoBg, padding: "8px 14px", borderRadius: 10, fontSize: 12, color: tokens.info }}>
            <i className="ti ti-eye" style={{ fontSize: 13, marginRight: 6 }} />
            Solo lectura · Datos generados por IA
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchEvaluaciones} tokens={tokens} />}

        {/* ── KPIS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
          {[
            { label: "Evaluaciones", value: evaluaciones.length, icon: "ti-clipboard-check", color: tokens.accent },
            { label: "Puntaje promedio", value: metrics.avgScore !== null ? metrics.avgScore.toFixed(1) : "—", icon: "ti-chart-bar", color: tokens.info },
            { label: "Puntaje ≥ 85", value: metrics.highScores, icon: "ti-trophy", color: tokens.warning },
            { label: "Puntaje < 55", value: metrics.lowScores, icon: "ti-alert-triangle", color: tokens.danger },
            { label: "Aptos para contratar", value: metrics.aptosContratacion, icon: "ti-star", color: tokens.purple },
            { label: "Tokens IA", value: formatNumber(metrics.totalTokens), icon: "ti-cpu", color: "#14b8a6" },
          ].map((kpi, i) => (
            <div
              key={`kpi-${kpi.label}`}
              className="kpi-card"
              style={{
                background: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                padding: "1rem 1.1rem",
                display: "flex",
                gap: 12,
                alignItems: "center",
                animation: `kpiIn 0.4s ease ${i * 0.05}s both`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: kpi.color + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i className={`ti ${kpi.icon}`} style={{ fontSize: 19, color: kpi.color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: tokens.text, lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: tokens.textMuted }}>{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── PROMEDIO GLOBAL POR RÚBRICA (RADAR) ── */}
        {evaluaciones.length > 0 && avgRubricaAxes.length >= 3 && (
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 14,
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tokens.text, alignSelf: "flex-start" }}>
              Promedio global por rúbrica
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: tokens.textMuted, alignSelf: "flex-start" }}>
              Desempeño agregado de todas las evaluaciones, ponderado por rúbrica
            </p>
            <RadarChart axes={avgRubricaAxes} size={320} color={tokens.accent} colorTo={tokens.info} tokens={tokens} />
          </div>
        )}

        {/* ── CLASIFICACIÓN DE CANDIDATOS ── */}
        {evaluaciones.length > 0 && Object.keys(nivelCandidatoStats).length > 0 && (
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: tokens.text }}>Clasificación de candidatos</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {Object.entries(nivelCandidatoStats).map(([nivel, count]) => (
                <div key={`nivel-stat-${nivel}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: nivelCandidatoColors[nivel] || tokens.textFaint }} />
                  <span style={{ fontSize: 13, color: tokens.textMuted }}>{nivel.replace("_", " ").toUpperCase()}:</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: tokens.text }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOOLBAR CON FILTROS ── */}
        <div
          style={{
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: 14,
            padding: "0.9rem 1.1rem",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: tokens.textFaint }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario o tecnología…"
              style={{
                background: tokens.inputBg,
                border: `1px solid ${tokens.inputBorder}`,
                borderRadius: 9,
                padding: "7px 12px 7px 30px",
                fontSize: 13,
                color: tokens.text,
                outline: "none",
                width: "100%",
                fontFamily: "inherit",
                boxSizing: "border-box" as const,
              }}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: tokens.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="todos">Todos los niveles</option>
            {niveles.map((nivel, index) => (
              <option key={`nivel-filter-${index}-${nivel}`} value={nivel}>{nivel}</option>
            ))}
          </select>

          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: tokens.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="todas">Todas las tecnologías</option>
            {techs.map((tech, index) => (
              <option key={`tech-filter-${index}-${tech}`} value={tech}>{tech}</option>
            ))}
          </select>

          <select
            value={filterApto}
            onChange={(e) => setFilterApto(e.target.value)}
            style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: tokens.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="todos">Todos los candidatos</option>
            <option value="apto">Aptos para contratación</option>
            <option value="no_apto">No aptos</option>
          </select>

          <span style={{ fontSize: 12, color: tokens.textFaint, marginLeft: "auto" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── CARDS GRID ── */}
        {evaluaciones.length === 0 && !error ? (
          <EmptyState filtered={false} tokens={tokens} />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={true} tokens={tokens} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))", gap: 16 }}>
            {filtered.map((ev, i) => {
              const nivelCandidatoColor = nivelCandidatoColors[ev.nivel_candidato ?? "sin_evaluar"];
              const puntajeTotal = toSafeNumber(ev.puntaje_total, 0);
              const scoreColor = getScoreColor(puntajeTotal, tokens);
              const rubricAxes = buildRubricAxes(ev);

              return (
                <div
                  key={`evaluacion-${ev.id}`}
                  onClick={() => setSelected(ev)}
                  className="eval-card"
                  style={{
                    background: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 16,
                    padding: "1.25rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    animation: `cardIn 0.35s ease ${Math.min(i, 10) * 0.04}s both`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = scoreColor + "55";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 24px -10px ${scoreColor}33`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = tokens.border;
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Header: avatar + nombre + score */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: avatarColor(ev.usuario_initials) + "22",
                          border: `1.5px solid ${avatarColor(ev.usuario_initials)}44`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          color: avatarColor(ev.usuario_initials),
                          flexShrink: 0,
                        }}
                      >
                        {ev.usuario_initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 700,
                            color: tokens.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ev.usuario_nombre}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: tokens.surface2,
                              borderRadius: 4,
                              padding: 2,
                            }}
                          >
                            <TechIcon nombre={ev.tecnologia} size={12} />
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: tokens.textMuted, whiteSpace: "nowrap" }}>
                            {ev.tecnologia} · {ev.nivel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                        background: scoreColor + "14",
                        borderRadius: 10,
                        padding: "4px 10px",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                        {puntajeTotal.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Badge nivel candidato */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {ev.nivel_candidato && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: nivelCandidatoColor + "18",
                          color: nivelCandidatoColor,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                        }}
                      >
                        {ev.nivel_candidato.toUpperCase()}
                      </div>
                    )}
                    {ev.apto_para_contratacion === true && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: tokens.accentBg,
                          color: tokens.accent,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                        }}
                      >
                        ✅ Apto
                      </div>
                    )}
                    {ev.generado_por_ia && (
                      <span
                        style={{
                          fontSize: 10,
                          background: tokens.purpleBg,
                          color: tokens.purple,
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <i className="ti ti-robot" style={{ fontSize: 10 }} />
                        IA
                      </span>
                    )}
                  </div>

                  {/* Radar con etiquetas y valores */}
                  {rubricAxes.length >= 3 ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "2px 0", marginTop: -4 }}>
                      <MiniRadarWithLabels 
                        axes={rubricAxes} 
                        size={170} 
                        color={tokens.accent} 
                        tokens={tokens}
                        showValues={true}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 140,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: tokens.textFaint,
                      }}
                    >
                      Sin rúbricas suficientes
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
                    <span style={{ fontSize: 11, color: tokens.textFaint }}>{fmtDate(ev.fecha)}</span>
                    <span style={{ fontSize: 11, color: tokens.accent, fontWeight: 600 }}>Ver detalle →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FOOTER INFORMATIVO ── */}
        <div style={{ marginTop: 8, padding: "12px 16px", background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 10, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: tokens.textFaint }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, marginRight: 6, verticalAlign: "middle" }} />
            Las evaluaciones son generadas automáticamente por el sistema de IA.
            Los administradores tienen acceso de solo lectura para revisar los resultados.
          </p>
        </div>
      </div>

      {selected && <EvalModal ev={selected} onClose={() => setSelected(null)} tokens={tokens} />}

      <style>{`
        @keyframes kpiIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .eval-card {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .eval-card, .kpi-card { animation: none !important; transition: none !important; }
        }
      `}</style>
    </>
  );
}