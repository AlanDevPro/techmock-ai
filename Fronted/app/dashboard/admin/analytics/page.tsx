'use client';

/**
 * /app/(protected)/dashboard/admin/analytics/page.tsx
 * Evaluaciones & Analytics — mapea tablas:
 *   evaluaciones, detalle_evaluacion, rubricas, sesiones_entrevista, estadisticas_usuario
 */

import { useState, useMemo, useEffect } from "react";
import {
  analyticsService,
  AnalyticsError,
  type Evaluacion,
  RUBRICAS,
} from "@/services/analytics.service";

// ─── Colores / tokens ─────────────────────────────────────────────────────────

const C = {
  bg: "#111214",
  surface: "#1a1c20",
  surface2: "#20232a",
  surfaceHover: "#22252b",
  border: "rgba(255,255,255,0.08)",
  text: "#e8eaed",
  textMuted: "#8b8fa8",
  textFaint: "#555868",
  accent: "#00c96b",
  accentBg: "rgba(0,201,107,0.1)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.1)",
  warning: "#f59e0b",
  warningBg: "rgba(245,158,11,0.1)",
  info: "#3b82f6",
  infoBg: "rgba(59,130,246,0.1)",
  purple: "#a855f7",
  purpleBg: "rgba(168,85,247,0.1)",
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.12)",
};

const AVATAR_PALETTE = [
  "#00c96b",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
];

const RUBRIC_COLORS = ["#00c96b", "#3b82f6", "#a855f7", "#f59e0b"];

const avatarColor = (s: string) =>
  AVATAR_PALETTE[s.charCodeAt(0) % AVATAR_PALETTE.length];

function scoreColor(s: number) {
  if (s >= 85) return C.accent;
  if (s >= 70) return C.warning;
  if (s >= 55) return C.info;
  return C.danger;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Mini bar chart component ─────────────────────────────────────────────────

function RubricBar({
  nombre,
  puntaje,
  peso,
  color,
}: {
  nombre: string;
  puntaje: number;
  peso: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
          {nombre}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.textFaint }}>
            peso {peso}%
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color }}>
            {puntaje}
          </span>
        </div>
      </div>
      <div
        style={{
          height: 6,
          background: C.border,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${puntaje}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={C.border}
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.22}
        fontWeight={700}
        fontFamily="'DM Sans', sans-serif"
      >
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

// ─── Detalle modal ────────────────────────────────────────────────────────────

function EvalModal({
  ev,
  onClose,
}: {
  ev: Evaluacion;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <ScoreRing score={ev.puntaje_total} size={72} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                {ev.usuario_nombre}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 13,
                  color: C.textMuted,
                }}
              >
                {ev.tecnologia} · {ev.nivel}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                  color: C.textFaint,
                }}
              >
                {fmtDate(ev.fecha)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.textMuted,
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>

        {/* Rúbricas */}
        <div
          style={{
            background: C.surface2,
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              color: C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Desglose por rúbrica
          </p>
          {ev.detalles.map((d, i) => (
            <div key={d.rubrica_id}>
              <RubricBar
                nombre={d.rubrica_nombre}
                puntaje={d.puntaje}
                peso={
                  RUBRICAS.find((r) => r.id === d.rubrica_id)
                    ?.peso_porcentual ?? 25
                }
                color={RUBRIC_COLORS[i % RUBRIC_COLORS.length]}
              />
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 11,
                  color: C.textFaint,
                  paddingLeft: 2,
                }}
              >
                {d.comentario}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback */}
        {[
          {
            label: "Feedback general",
            value: ev.feedback_general,
            color: C.text,
          },
          {
            label: "Fortalezas",
            value: ev.fortalezas,
            color: C.accent,
          },
          {
            label: "Áreas de mejora",
            value: ev.areas_mejora,
            color: C.warning,
          },
          {
            label: "Recursos sugeridos",
            value: ev.sugerencias_recursos,
            color: C.info,
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 11,
                fontWeight: 700,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color,
                lineHeight: 1.6,
              }}
            >
              {value}
            </p>
          </div>
        ))}

        {/* Meta */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Modelo IA", value: ev.modelo_ia_usado },
            {
              label: "Tokens usados",
              value: ev.tokens_evaluacion.toLocaleString(),
            },
            {
              label: "Sesión ID",
              value: ev.sesion_id.slice(0, 8) + "…",
            },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: C.surface2,
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 11,
              }}
            >
              <span style={{ color: C.textFaint }}>{m.label}: </span>
              <span
                style={{ color: C.textMuted, fontFamily: "monospace" }}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            alignSelf: "flex-end",
            background: C.accentBg,
            border: `1px solid ${C.accent}44`,
            color: C.accent,
            borderRadius: 9,
            padding: "8px 22px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div>
        <div
          style={{
            height: 28,
            width: 180,
            background: C.surface2,
            borderRadius: 8,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 16,
            width: 320,
            background: C.surface2,
            borderRadius: 6,
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
          gap: 12,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "1rem 1.1rem",
              height: 72,
            }}
          >
            <div
              style={{
                height: "100%",
                background: C.surface2,
                borderRadius: 8,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))",
          gap: 14,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "1.25rem",
              height: 180,
            }}
          >
            <div
              style={{
                height: "100%",
                background: C.surface2,
                borderRadius: 8,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        background: C.dangerBg,
        border: `1px solid ${C.danger}44`,
        borderRadius: 12,
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i
          className="ti ti-alert-circle"
          style={{ fontSize: 18, color: C.danger }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: C.danger,
            }}
          >
            Error al cargar evaluaciones
          </p>
          <p
            style={{ margin: "2px 0 0", fontSize: 12, color: C.textMuted }}
          >
            {message}
          </p>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          background: C.dangerBg,
          border: `1px solid ${C.danger}66`,
          color: C.danger,
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <i
        className="ti ti-clipboard-off"
        style={{
          fontSize: 40,
          color: C.textFaint,
          display: "block",
          marginBottom: 12,
        }}
      />
      <p
        style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.textMuted }}
      >
        {filtered
          ? "No se encontraron evaluaciones con los filtros aplicados"
          : "Aún no hay evaluaciones registradas"}
      </p>
      {filtered && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: C.textFaint }}>
          Intenta ajustar los filtros o la búsqueda
        </p>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [selected, setSelected] = useState<Evaluacion | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterNivel, setFilterNivel] = useState("todos");
  const [filterTech, setFilterTech] = useState("todas");
  const [search, setSearch] = useState("");

  const fetchEvaluaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getEvaluaciones();
      setEvaluaciones(data);
    } catch (err) {
      const message =
        err instanceof AnalyticsError
          ? err.message
          : "Ocurrió un error inesperado.";
      setError(message);
      console.error("[AnalyticsPage] fetchEvaluaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluaciones();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const techs = analyticsService.getUniqueTechs(evaluaciones);
  const niveles = analyticsService.getUniqueNiveles(evaluaciones);

  const filtered = useMemo(
    () =>
      analyticsService.filterEvaluaciones(evaluaciones, {
        search,
        nivel: filterNivel,
        tecnologia: filterTech,
      }),
    [evaluaciones, search, filterNivel, filterTech]
  );

  const avgScore = analyticsService.calcAvgScore(evaluaciones);
  const totalTokens = analyticsService.calcTotalTokens(evaluaciones);
  const highScores = analyticsService.calcHighScores(evaluaciones);
  const avgByRubrica = analyticsService.calcAvgByRubrica(evaluaciones);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          rel="stylesheet"
        />
        <LoadingSkeleton />
      </>
    );

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: C.text,
                letterSpacing: "-0.02em",
              }}
            >
              Evaluaciones
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>
              Resultados generados por IA con desglose por rúbrica
            </p>
          </div>
          <button
            onClick={fetchEvaluaciones}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              borderRadius: 9,
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = C.accent + "66")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = C.border)
            }
          >
            <i className="ti ti-refresh" style={{ fontSize: 14 }} />
            Actualizar
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <ErrorBanner message={error} onRetry={fetchEvaluaciones} />
        )}

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
            gap: 12,
          }}
        >
          {[
            {
              label: "Evaluaciones",
              value: evaluaciones.length,
              icon: "ti-clipboard-check",
              color: C.accent,
            },
            {
              label: "Puntaje promedio",
              value: avgScore !== null ? avgScore.toFixed(1) : "—",
              icon: "ti-chart-bar",
              color: C.info,
            },
            {
              label: "Puntaje ≥ 85",
              value: highScores,
              icon: "ti-trophy",
              color: C.warning,
            },
            {
              label: "Tokens IA usados",
              value: totalTokens.toLocaleString(),
              icon: "ti-cpu",
              color: C.purple,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "1rem 1.1rem",
                display: "flex",
                gap: 12,
                alignItems: "center",
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
                <i
                  className={`ti ${kpi.icon}`}
                  style={{ fontSize: 19, color: kpi.color }}
                />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1,
                  }}
                >
                  {kpi.value}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: C.textMuted,
                  }}
                >
                  {kpi.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Promedio por rúbrica */}
        {evaluaciones.length > 0 && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "1.25rem",
            }}
          >
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
              }}
            >
              Promedio global por rúbrica
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
              }}
            >
              {avgByRubrica.map((r, i) => (
                <RubricBar
                  key={r.id}
                  nombre={`${r.nombre} (${r.peso_porcentual}%)`}
                  puntaje={parseFloat(r.avg.toFixed(1))}
                  peso={r.peso_porcentual}
                  color={RUBRIC_COLORS[i]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "0.9rem 1.1rem",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <i
              className="ti ti-search"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: C.textFaint,
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario o tecnología…"
              style={{
                background: C.inputBg,
                border: `1px solid ${C.inputBorder}`,
                borderRadius: 9,
                padding: "7px 12px 7px 30px",
                fontSize: 13,
                color: C.text,
                outline: "none",
                width: "100%",
                fontFamily: "inherit",
                boxSizing: "border-box" as const,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = C.accent + "88")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = C.inputBorder)
              }
            />
          </div>
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            style={{
              background: C.inputBg,
              border: `1px solid ${C.inputBorder}`,
              borderRadius: 9,
              padding: "7px 12px",
              fontSize: 12,
              color: C.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="todos">Todos los niveles</option>
            {niveles.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            style={{
              background: C.inputBg,
              border: `1px solid ${C.inputBorder}`,
              borderRadius: 9,
              padding: "7px 12px",
              fontSize: 12,
              color: C.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="todas">Todas las tecnologías</option>
            {techs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span
            style={{
              fontSize: 12,
              color: C.textFaint,
              marginLeft: "auto",
            }}
          >
            {filtered.length} resultados
          </span>
        </div>

        {/* Cards grid */}
        {evaluaciones.length === 0 && !error ? (
          <EmptyState filtered={false} />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={true} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))",
              gap: 14,
            }}
          >
            {filtered.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelected(ev)}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    scoreColor(Number(ev.puntaje_total)) + "55";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    C.border;
                  (e.currentTarget as HTMLElement).style.transform =
                    "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background:
                          avatarColor(ev.usuario_initials) + "22",
                        border: `1.5px solid ${avatarColor(ev.usuario_initials)}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: avatarColor(ev.usuario_initials),
                      }}
                    >
                      {ev.usuario_initials}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.text,
                        }}
                      >
                        {ev.usuario_nombre}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: C.textMuted,
                        }}
                      >
                        {ev.tecnologia} · {ev.nivel}
                      </p>
                    </div>
                  </div>
                  <ScoreRing score={Number(ev.puntaje_total)} size={52} />
                </div>

                {/* Mini rúbricas */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {(ev.detalles ?? []).map((d, i) => (
                    <div
                      key={d.rubrica_id}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: C.textFaint,
                          width: 90,
                          flexShrink: 0,
                        }}
                      >
                        {d.rubrica_nombre}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          background: C.border,
                          borderRadius: 99,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Number(d.puntaje)}%`,
                            background:
                              RUBRIC_COLORS[i % RUBRIC_COLORS.length],
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: RUBRIC_COLORS[i % RUBRIC_COLORS.length],
                          width: 26,
                          textAlign: "right",
                        }}
                      >
                        {Number(d.puntaje)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 11, color: C.textFaint }}>
                    {fmtDate(ev.fecha)}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {ev.generado_por_ia && (
                      <span
                        style={{
                          fontSize: 10,
                          background: C.purpleBg,
                          color: C.purple,
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontWeight: 600,
                        }}
                      >
                        IA
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: C.accent,
                        fontWeight: 600,
                      }}
                    >
                      Ver detalle →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EvalModal ev={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}