// app/dashboard/developer/progress/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useThemeContext } from "../../../../components/providers/ThemeProvider";
import { ProgresoService, type TechData, type EstadisticasGenerales } from "../../../../services/progreso.service";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type TextAnchor = "inherit" | "end" | "start" | "middle";

type NivelKey = "descartado" | "revisar" | "promisorio" | "recomendado" | "destacado";
type SeveridadKey = "bajo" | "medio" | "alto" | "critico";
type TipoKey = "codigo" | "concepto" | "recurso" | "patron";
type PrioridadKey = "alta" | "media" | "baja";
type TendenciaKey = "↑" | "→" | "↓";

// ─── Configuraciones tipadas ──────────────────────────────────────────────────

const NIVEL_CFG: Record<NivelKey, { bg: string; text: string; label: string }> = {
  descartado:  { bg: "#7f1d1d30", text: "#f87171", label: "Descartado" },
  revisar:     { bg: "#7c2d1230", text: "#fb923c", label: "A revisar" },
  promisorio:  { bg: "#78350f30", text: "#fbbf24", label: "Promisorio" },
  recomendado: { bg: "#14532d30", text: "#34d399", label: "Recomendado" },
  destacado:   { bg: "#065f4630", text: "#6ee7b7", label: "Destacado" },
};

const SEV_CFG: Record<SeveridadKey, { bg: string; text: string }> = {
  bajo:    { bg: "#1e3a5f40", text: "#60a5fa" },
  medio:   { bg: "#78350f40", text: "#fbbf24" },
  alto:    { bg: "#7c2d1240", text: "#fb923c" },
  critico: { bg: "#7f1d1d40", text: "#f87171" },
};

const TIPO_CFG: Record<TipoKey, { bg: string; text: string }> = {
  codigo:   { bg: "#4c1d9540", text: "#a78bfa" },
  concepto: { bg: "#1e3a5f40", text: "#60a5fa" },
  recurso:  { bg: "#164e6340", text: "#67e8f9" },
  patron:   { bg: "#14532d40", text: "#4ade80" },
};

const PRIO_COLOR: Record<PrioridadKey, string> = { 
  alta: "#f87171", 
  media: "#fbbf24", 
  baja: "#6b7280" 
};

const TEND_CFG: Record<TendenciaKey, { label: string; bg: string; text: string }> = {
  "↑": { label: "Mejorando", bg: "#14532d30", text: "#34d399" },
  "→": { label: "Estable",   bg: "#78350f30", text: "#fbbf24" },
  "↓": { label: "Bajando",   bg: "#7f1d1d30", text: "#f87171" },
};

// ─── Helpers con validación de tipo ──────────────────────────────────────────

function getTendenciaCfg(tendencia?: string): { label: string; bg: string; text: string } {
  if (tendencia && tendencia in TEND_CFG) {
    return TEND_CFG[tendencia as TendenciaKey];
  }
  return TEND_CFG["→"];
}

function getNivelCfg(nivel?: string): { bg: string; text: string; label: string } {
  if (nivel && nivel in NIVEL_CFG) {
    return NIVEL_CFG[nivel as NivelKey];
  }
  return NIVEL_CFG["revisar"];
}

function getSeveridadCfg(severidad?: string): { bg: string; text: string } {
  if (severidad && severidad in SEV_CFG) {
    return SEV_CFG[severidad as SeveridadKey];
  }
  return SEV_CFG["medio"];
}

function getTipoCfg(tipo?: string): { bg: string; text: string } {
  if (tipo && tipo in TIPO_CFG) {
    return TIPO_CFG[tipo as TipoKey];
  }
  return TIPO_CFG["concepto"];
}

function getPrioridadColor(prioridad?: string): string {
  if (prioridad && prioridad in PRIO_COLOR) {
    return PRIO_COLOR[prioridad as PrioridadKey];
  }
  return PRIO_COLOR["media"];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return "#34d399";
  if (s >= 65) return "#fbbf24";
  if (s >= 50) return "#f97316";
  return "#f87171";
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function Chip({ children, bg, text }: { children: React.ReactNode; bg: string; text: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
      background: bg, color: text, letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

// ─── Radar Chart (SVG) ───────────────────────────────────────────────────────

interface PilarData {
  label: string;
  key: string;
  score: number;
}

interface RadarChartProps {
  pilares: PilarData[];
  size?: number;
  isDark?: boolean;
}

function RadarChart({ pilares, size = 280, isDark = true }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const n = pilares.length;
  const rings = [20, 40, 60, 80, 100];
  
  const strokeColor = isDark ? "#2e2e2e" : "#e5e7eb";
  const textColor = isDark ? "#999" : "#6b7280";
  const surfaceColor = isDark ? "#111111" : "#ffffff";

  function polar(pct: number, i: number, r: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + r * (pct / 100) * Math.cos(angle),
      y: cy + r * (pct / 100) * Math.sin(angle),
    };
  }

  const dataPoints = pilares.map((p, i) => polar(p.score, i, maxR));
  const dataPath = dataPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";

  const labelOffset = 1.28;
  const labels = pilares.map((p, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cosA = Math.cos(angle);
    let anchor: TextAnchor = "middle";
    if (cosA > 0.1) anchor = "start";
    else if (cosA < -0.1) anchor = "end";
    return {
      label: p.label,
      score: p.score,
      x: cx + maxR * labelOffset * cosA,
      y: cy + maxR * labelOffset * Math.sin(angle),
      anchor,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {rings.map((r) => {
        const pts = Array.from({ length: n }, (_, i) => polar(r, i, maxR));
        const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";
        return <path key={r} d={path} fill="none" stroke={strokeColor} strokeWidth={1} />;
      })}

      {pilares.map((_, i) => {
        const outer = polar(100, i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke={strokeColor} strokeWidth={1} />;
      })}

      <path d={dataPath} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" />

      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={5} fill="#6366f1" stroke={surfaceColor} strokeWidth={2.5} />
      ))}

      {labels.map((l) => (
        <g key={l.label}>
          <text
            x={l.x}
            y={l.y - 8}
            textAnchor={l.anchor}
            fontSize={11}
            fill={textColor}
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {l.label}
          </text>
          <text
            x={l.x}
            y={l.y + 7}
            textAnchor={l.anchor}
            fontSize={14}
            fontWeight="800"
            fill={scoreColor(l.score)}
            fontFamily="system-ui, sans-serif"
          >
            {l.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Small Radar Chart for comparison ─────────────────────────────────────────

function SmallRadarChart({ pilares, size = 160, isDark = true }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const n = pilares.length;
  const strokeColor = isDark ? "#2e2e2e" : "#e5e7eb";

  function polar(pct: number, i: number, r: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + r * (pct / 100) * Math.cos(angle),
      y: cy + r * (pct / 100) * Math.sin(angle),
    };
  }

  const dataPoints = pilares.map((p, i) => polar(p.score, i, maxR));
  const dataPath = dataPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {[20, 40, 60, 80, 100].map((r) => {
        const pts = Array.from({ length: n }, (_, i) => polar(r, i, maxR));
        const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";
        return <path key={r} d={path} fill="none" stroke={strokeColor} strokeWidth={0.8} />;
      })}

      {pilares.map((_, i) => {
        const outer = polar(100, i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke={strokeColor} strokeWidth={0.8} />;
      })}

      <path d={dataPath} fill="#6366f1" fillOpacity={0.12} stroke="#6366f1" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120, label, isDark = true }: { score: number; size?: number; label: string; isDark?: boolean }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col = scoreColor(score);
  const strokeColor = isDark ? "#2e2e2e" : "#e5e7eb";
  const mutedColor = isDark ? "#666" : "#9ca3af";
  const subColor = isDark ? "#999" : "#6b7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={10} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={col} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size * 0.24, fontWeight: 800, color: col, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{score}</span>
          <span style={{ fontSize: 10, color: mutedColor, marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: subColor, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { isDark } = useThemeContext();
  const [activeTech, setActiveTech] = useState<string>("");
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [techData, setTechData] = useState<TechData[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener la tecnología activa
  const tech = techData.find((t) => t.slug === activeTech) || techData[0];

  // ─── Cargar datos del backend ──────────────────────────────────────────────
  
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await ProgresoService.obtenerProgresoCompleto();
        
        if (response.success) {
          setTechData(response.data.tecnologias);
          setEstadisticas(response.data.estadisticas);
          
          if (response.data.tecnologias.length > 0) {
            setActiveTech(response.data.tecnologias[0].slug);
          }
        } else {
          throw new Error('Error al cargar los datos');
        }
      } catch (err) {
        console.error('Error cargando progreso:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ─── Manejar estados de carga y error ──────────────────────────────────────

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#f9fafb",
        color: isDark ? "#f0f0f0" : "#111827"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: `4px solid ${isDark ? "#333" : "#e5e7eb"}`,
            borderTop: "4px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ fontSize: 16, color: isDark ? "#999" : "#6b7280" }}>
            Cargando tu progreso...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#f9fafb",
        color: isDark ? "#f0f0f0" : "#111827"
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Error al cargar tu progreso
          </h2>
          <p style={{ color: isDark ? "#999" : "#6b7280", marginBottom: 20 }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (techData.length === 0) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#f9fafb",
        color: isDark ? "#f0f0f0" : "#111827"
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Aún no tienes progreso registrado
          </h2>
          <p style={{ color: isDark ? "#999" : "#6b7280" }}>
            Completa tu primera entrevista técnica para comenzar a ver tu progreso.
          </p>
        </div>
      </div>
    );
  }

  // ─── Theme-based styles ─────────────────────────────────────────────────────

  const bgColor = isDark ? "#0a0a0a" : "#f9fafb";
  const surfaceColor = isDark ? "#111111" : "#ffffff";
  const surface2Color = isDark ? "#181818" : "#f3f4f6";
  const borderColor = isDark ? "#242424" : "#e5e7eb";
  const border2Color = isDark ? "#2e2e2e" : "#d1d5db";
  const textColor = isDark ? "#f0f0f0" : "#111827";
  const mutedColor = isDark ? "#666" : "#6b7280";
  const subColor = isDark ? "#999" : "#9ca3af";
  const accentColor = "#6366f1";

  const cardStyle = (extra?: React.CSSProperties) => ({
    background: surfaceColor,
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    padding: "20px 22px",
    ...extra,
  });

  // ─── Configuraciones para estadísticas (usando helpers seguros) ───────────

  const tendCfg = getTendenciaCfg(estadisticas?.tendencia);
  const nivelCfg = getNivelCfg(estadisticas?.nivel_actual);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: bgColor, 
      color: textColor, 
      fontFamily: "system-ui, -apple-system, sans-serif", 
      padding: "32px 20px 80px" 
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Top bar: status strip ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: textColor, letterSpacing: "-0.02em" }}>
            Mi progreso
          </span>
          <Chip bg={tendCfg.bg} text={tendCfg.text}>
            {estadisticas?.tendencia || "→"} {tendCfg.label}
          </Chip>
          <Chip bg={nivelCfg.bg} text={nivelCfg.text}>
            {nivelCfg.label}
          </Chip>
          <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
            {[
              { label: "Racha", val: `${estadisticas?.racha_actual || 0}d` },
              { label: "Sesiones", val: `${estadisticas?.entrevistas_finalizadas || 0}/${estadisticas?.total_entrevistas || 0}` },
              { label: "Consistencia", val: `${estadisticas?.consistencia || 0}%` },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: textColor }}>{stat.val}</div>
                <div style={{ fontSize: 11, color: mutedColor }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tech selector tabs ── */}
        <div style={{ 
          display: "flex", 
          gap: 4, 
          background: surface2Color, 
          borderRadius: 12, 
          padding: 4, 
          width: "fit-content", 
          border: `1px solid ${borderColor}`,
          flexWrap: "wrap"
        }}>
          {techData.map((t) => {
            const active = t.slug === activeTech;
            const tc = getTendenciaCfg(t.tendencia);
            return (
              <button
                key={t.slug}
                onClick={() => setActiveTech(t.slug)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s",
                  background: active ? accentColor : "transparent",
                  color: active ? "#fff" : subColor,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {t.nombre}
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 700, 
                  padding: "1px 7px", 
                  borderRadius: 99,
                  background: active ? "rgba(255,255,255,0.2)" : tc.bg, 
                  color: active ? "#fff" : tc.text 
                }}>
                  {t.score_global}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Main grid ── */}
        {tech && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "28px 22px" }}>
                <ScoreRing 
                  score={tech.score_global} 
                  size={140} 
                  label={`Score en ${tech.nombre}`} 
                  isDark={isDark} 
                />

                <div style={{ width: "100%", height: 1, background: borderColor }} />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{ fontSize: 11, color: mutedColor, letterSpacing: "0.08em", textTransform: "uppercase", alignSelf: "flex-start" }}>
                    Pilares técnicos
                  </span>
                  <RadarChart pilares={tech.pilares} size={260} isDark={isDark} />
                </div>
              </div>

              <div style={{ ...cardStyle(), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: mutedColor }}>Consistencia</span>
                  <div style={{ height: 6, background: border2Color, borderRadius: 99 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${tech.consistencia}%`, 
                      background: scoreColor(tech.consistencia), 
                      borderRadius: 99, 
                      transition: "width 0.7s ease" 
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(tech.consistencia) }}>
                    {tech.consistencia}%
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: mutedColor }}>Sesiones</span>
                  <div style={{ height: 6, background: border2Color, borderRadius: 99 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${Math.min((tech.sesiones_completadas / 10) * 100, 100)}%`, 
                      background: accentColor, 
                      borderRadius: 99, 
                      transition: "width 0.7s ease" 
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
                    {tech.sesiones_completadas} completadas
                  </span>
                </div>
              </div>

              <div style={cardStyle()}>
                <p style={{ fontSize: 11, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Fortalezas
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {tech.fortalezas && tech.fortalezas.length > 0 ? (
                    tech.fortalezas.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: subColor }}>
                        <span style={{ color: "#34d399", marginTop: 2 }}>✓</span>{f}
                      </li>
                    ))
                  ) : (
                    <li style={{ fontSize: 13, color: mutedColor }}>No hay fortalezas registradas</li>
                  )}
                </ul>
                <div style={{ height: 1, background: borderColor, marginBottom: 14 }} />
                <p style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Áreas de mejora
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {tech.debilidades && tech.debilidades.length > 0 ? (
                    tech.debilidades.map((d) => (
                      <li key={d} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: subColor }}>
                        <span style={{ color: "#f87171", marginTop: 2 }}>✗</span>{d}
                      </li>
                    ))
                  ) : (
                    <li style={{ fontSize: 13, color: mutedColor }}>No hay áreas de mejora registradas</li>
                  )}
                </ul>
              </div>
            </div>

            {/* RIGHT COLUMN - Sessions, Errors, Recommendations */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Sessions */}
              <div style={cardStyle()}>
                <p style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 14 }}>
                  Sesiones recientes — {tech.nombre}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tech.sessions && tech.sessions.length > 0 ? (
                    tech.sessions.map((s) => {
                      const nc = getNivelCfg(s.nivel_candidato);
                      const col = scoreColor(s.puntaje);
                      const isHovered = hoveredSession === s.id;
                      return (
                        <div 
                          key={s.id} 
                          style={{
                            background: surface2Color, 
                            border: `1px solid ${isHovered ? accentColor : borderColor}`, 
                            borderRadius: 12,
                            padding: "14px 16px", 
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                            position: "relative",
                          }}
                          onMouseEnter={() => setHoveredSession(s.id)}
                          onMouseLeave={() => setHoveredSession(null)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ position: "relative" }}>
                              <div style={{ position: "relative", width: 52, height: 52 }}>
                                <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
                                  <circle cx={26} cy={26} r={22} fill="none" stroke={border2Color} strokeWidth={6} />
                                  <circle 
                                    cx={26} cy={26} r={22} fill="none" 
                                    stroke={col} strokeWidth={6}
                                    strokeDasharray={`${(s.puntaje / 100) * (2 * Math.PI * 22)} ${2 * Math.PI * 22}`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: col }}>{s.puntaje}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
                                <Chip bg={border2Color} text={subColor}>{s.tipo || "General"}</Chip>
                                <Chip bg={nc.bg} text={nc.text}>{nc.label}</Chip>
                                {s.fue_adaptativa && (
                                  <Chip bg={`${accentColor}25`} text={accentColor}>IA adaptativa</Chip>
                                )}
                              </div>
                              <p style={{ fontSize: 13, color: textColor, margin: "4px 0", fontWeight: 500 }}>
                                {s.pregunta_resumen || s.pregunta?.substring(0, 60) || "Sin descripción"}
                              </p>
                              <span style={{ fontSize: 12, color: mutedColor }}>
                                {s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES') : 'Fecha no disponible'} · {s.duracion || "N/A"}
                              </span>
                            </div>
                          </div>

                          {isHovered && s.pregunta && (
                            <div style={{
                              position: "absolute",
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              marginBottom: 12,
                              background: surfaceColor,
                              border: `1px solid ${accentColor}`,
                              borderRadius: 12,
                              padding: "12px 16px",
                              minWidth: 280,
                              maxWidth: 400,
                              zIndex: 1000,
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                              pointerEvents: "none",
                            }}>
                              <div style={{ 
                                position: "absolute", 
                                bottom: -6, 
                                left: "50%", 
                                transform: "translateX(-50%)",
                                width: 12, 
                                height: 12, 
                                background: surfaceColor, 
                                borderRight: `1px solid ${accentColor}`,
                                borderBottom: `1px solid ${accentColor}`,
                                rotate: "45deg"
                              }} />
                              <p style={{ fontSize: 13, color: textColor, margin: 0, lineHeight: 1.5 }}>
                                {s.pregunta}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: mutedColor, textAlign: "center", padding: "20px 0" }}>
                      No hay sesiones completadas para esta tecnología
                    </p>
                  )}
                </div>
              </div>

              {/* Errors */}
              <div style={cardStyle()}>
                <p style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 4 }}>
                  Errores detectados por la IA
                </p>
                <p style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
                  Basado en sesiones completadas en {tech.nombre}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tech.errores && tech.errores.length > 0 ? (
                    tech.errores.map((e, i) => {
                      const sc = getSeveridadCfg(e.severidad);
                      return (
                        <div key={i} style={{ background: surface2Color, border: `1px solid ${borderColor}`, borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Chip bg={sc.bg} text={sc.text}>{e.severidad?.toUpperCase() || "MEDIO"}</Chip>
                              <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{e.categoria || "Error"}</span>
                            </div>
                            <span style={{ fontSize: 12, color: mutedColor }}>×{e.veces || 1}</span>
                          </div>
                          <p style={{ fontSize: 13, color: subColor, margin: 0 }}>{e.descripcion || "Sin descripción"}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: mutedColor, textAlign: "center", padding: "20px 0" }}>
                      ¡Excelente! No se han detectado errores en tus sesiones
                    </p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div style={cardStyle()}>
                <p style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 4 }}>
                  Recomendaciones de la IA
                </p>
                <p style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
                  Acciones concretas para mejorar en {tech.nombre}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tech.recomendaciones && tech.recomendaciones.length > 0 ? (
                    tech.recomendaciones.map((r, i) => {
                      const tc = getTipoCfg(r.tipo);
                      return (
                        <div key={i} style={{ background: surface2Color, border: `1px solid ${borderColor}`, borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <Chip bg={tc.bg} text={tc.text}>{r.tipo || "concepto"}</Chip>
                              <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{r.titulo || "Recomendación"}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              <span style={{ 
                                width: 7, 
                                height: 7, 
                                borderRadius: "50%", 
                                background: getPrioridadColor(r.prioridad), 
                                display: "inline-block" 
                              }} />
                              <span style={{ fontSize: 11, color: mutedColor }}>{r.prioridad || "media"}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: subColor, margin: 0 }}>{r.descripcion || "Sin descripción"}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: mutedColor, textAlign: "center", padding: "20px 0" }}>
                      No hay recomendaciones disponibles
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison grid */}
        <div style={cardStyle()}>
          <p style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 16 }}>
            Comparativo entre tecnologías
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {techData.map((t) => {
              const active = t.slug === activeTech;
              const tc = getTendenciaCfg(t.tendencia);
              return (
                <button
                  key={t.slug}
                  onClick={() => setActiveTech(t.slug)}
                  style={{
                    textAlign: "left", 
                    background: active ? `${accentColor}12` : surface2Color,
                    border: `1px solid ${active ? accentColor : borderColor}`,
                    borderRadius: 12, 
                    padding: "16px 18px", 
                    cursor: "pointer", 
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ position: "relative", width: 48, height: 48 }}>
                        <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={24} cy={24} r={20} fill="none" stroke={border2Color} strokeWidth={5} />
                          <circle 
                            cx={24} cy={24} r={20} fill="none" 
                            stroke={scoreColor(t.score_global)} strokeWidth={5}
                            strokeDasharray={`${(t.score_global / 100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(t.score_global) }}>{t.score_global}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{t.nombre}</div>
                        <div style={{ fontSize: 11, color: mutedColor }}>{t.sesiones_completadas || 0} sesiones</div>
                      </div>
                    </div>
                    <Chip bg={tc.bg} text={tc.text}>{t.tendencia || "→"} {tc.label}</Chip>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    <SmallRadarChart pilares={t.pilares} size={140} isDark={isDark} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}