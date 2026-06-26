'use client';

/**
 * /app/(protected)/dashboard/admin/questions/page.tsx
 *
 * Preguntas — vista de solo lectura para el administrador.
 * Las preguntas son generadas automáticamente por el sistema de IA adaptativa.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";

import {
  type PreguntaAPI,
  type Tecnologia,
  type Nivel,
  getPreguntasConCatalogos,
} from "@/services/questions.service";

// ─── Tema basado en ThemeProvider ─────────────────────────────────────────────

const getThemeTokens = (isDark: boolean) => ({
  bg: isDark ? "#111214" : "#f0f2f5",
  surface: isDark ? "#1a1c20" : "#ffffff",
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
  searchBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  searchBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
});

// ─── Constantes ───────────────────────────────────────────────────────────────

const getNivelColors = (tokens: ReturnType<typeof getThemeTokens>): Record<string, string> => ({
  Junior: tokens.accent,
  "Junior+": tokens.info,
  Mid: tokens.purple,
  "Mid+": tokens.warning,
  Senior: tokens.danger,
});

const TIPO_LABELS: Record<string, string> = {
  live_coding: "Live Coding",
  teoria: "Teoría",
  debugging: "Debugging",
  arquitectura: "Arquitectura",
  optimizacion: "Optimización",
};

const getTipoColors = (tokens: ReturnType<typeof getThemeTokens>): Record<string, string> => ({
  live_coding: tokens.accent,
  teoria: tokens.warning,
  debugging: tokens.danger,
  arquitectura: tokens.purple,
  optimizacion: tokens.info,
});

// ─── Componentes base ─────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SelectFilter({
  value, onChange, options, tokens,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  tokens: ReturnType<typeof getThemeTokens>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: tokens.text, outline: "none", cursor: "pointer", fontFamily: "inherit" }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Spinner({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, border: `3px solid rgba(128,128,128,0.2)`, borderTop: `3px solid ${color || "#00c96b"}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Modal de detalle de pregunta ─────────────────────────────────────────────

interface DetailModalProps {
  pregunta: PreguntaAPI;
  onClose: () => void;
  tokens: ReturnType<typeof getThemeTokens>;
}

function DetailModal({ pregunta, onClose, tokens }: DetailModalProps) {
  const nivelColors = getNivelColors(tokens);
  const tipoColors = getTipoColors(tokens);
  
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 18, padding: "1.75rem", width: 620, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>{pregunta.titulo}</h2>
            {pregunta.generada_por_ia && (
              <span style={{ background: tokens.infoBg, color: tokens.info, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>
                <i className="ti ti-robot" style={{ fontSize: 12, marginRight: 4 }} />
                IA
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Metadata tags */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Badge label={pregunta.tecnologia} color={tokens.accent} />
          <Badge label={pregunta.nivel} color={nivelColors[pregunta.nivel] ?? tokens.textMuted} />
          <Badge label={TIPO_LABELS[pregunta.tipo]} color={tipoColors[pregunta.tipo] ?? tokens.textMuted} />
          <span style={{ fontSize: 12, color: tokens.textFaint }}>
            <i className="ti ti-clock" style={{ fontSize: 12, marginRight: 4 }} />
            {pregunta.tiempo_estimado_min} min
          </span>
          <span style={{ fontSize: 12, color: tokens.textFaint }}>
            <i className="ti ti-calendar" style={{ fontSize: 12, marginRight: 4 }} />
            {formatDate(pregunta.fecha_creacion)}
          </span>
        </div>

        {/* Enunciado */}
        <div style={{ background: tokens.bg, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Enunciado</p>
          <p style={{ margin: 0, fontSize: 14, color: tokens.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{pregunta.enunciado}</p>
        </div>

        {/* Categorías de error objetivo */}
        {pregunta.categorias_error_objetivo && pregunta.categorias_error_objetivo.length > 0 && (
          <div style={{ background: tokens.surfaceHover, borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <i className="ti ti-chart-bubble" style={{ fontSize: 12, marginRight: 6 }} />
              Categorías de error evaluadas
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {pregunta.categorias_error_objetivo.map(cat => (
                <span key={cat} style={{ background: tokens.warningBg, color: tokens.warning, fontSize: 11, padding: "3px 9px", borderRadius: 99 }}>
                  {cat.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contexto adaptativo */}
        {pregunta.contexto_adaptativo && (
          <div style={{ background: tokens.surfaceHover, borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <i className="ti ti-adjustments" style={{ fontSize: 12, marginRight: 6 }} />
              Contexto adaptativo
            </p>
            <pre style={{ margin: 0, fontSize: 12, color: tokens.textMuted, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {JSON.stringify(pregunta.contexto_adaptativo, null, 2)}
            </pre>
          </div>
        )}

        {/* Prompt contexto */}
        {pregunta.prompt_contexto && (
          <div style={{ background: tokens.surfaceHover, borderRadius: 12, padding: "16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <i className="ti ti-message-code" style={{ fontSize: 12, marginRight: 6 }} />
              Instrucciones para la IA
            </p>
            <p style={{ margin: 0, fontSize: 13, color: tokens.textMuted, lineHeight: 1.5 }}>{pregunta.prompt_contexto}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal (solo lectura) ─────────────────────────────────────────

export default function QuestionsPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);
  const nivelColors = getNivelColors(tokens);
  const tipoColors = getTipoColors(tokens);

  const [preguntas, setPreguntas] = useState<PreguntaAPI[]>([]);
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [tecnologiaFilter, setTecnologiaFilter] = useState("todas");
  const [selectedPregunta, setSelectedPregunta] = useState<PreguntaAPI | null>(null);

  // ── Fetch inicial ──────────────────────────────────────────────────────────

  const fetchTodo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { preguntas: preg, tecnologias: techs, niveles: nivs } =
        await getPreguntasConCatalogos();
      setPreguntas(preg);
      setTecnologias(techs);
      setNiveles(nivs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  // ── Derivados ──────────────────────────────────────────────────────────────

  const nivelesUnicos = useMemo(() => [...new Set(preguntas.map(q => q.nivel))].sort(), [preguntas]);
  const tiposUnicos = useMemo(() => [...new Set(preguntas.map(q => q.tipo))].sort(), [preguntas]);
  const tecnologiasUnicas = useMemo(() => [...new Set(preguntas.map(q => q.tecnologia))].sort(), [preguntas]);

  const filtered = useMemo(() => {
    return preguntas.filter(q => {
      const s = search.toLowerCase();
      if (search && !q.titulo.toLowerCase().includes(s) && !q.tecnologia.toLowerCase().includes(s)) return false;
      if (nivelFilter !== "todos" && q.nivel !== nivelFilter) return false;
      if (tipoFilter !== "todos" && q.tipo !== tipoFilter) return false;
      if (tecnologiaFilter !== "todas" && q.tecnologia !== tecnologiaFilter) return false;
      return true;
    });
  }, [preguntas, search, nivelFilter, tipoFilter, tecnologiaFilter]);

  const stats = useMemo(() => ({
    total: preguntas.length,
    activas: preguntas.filter(q => q.activa).length,
    porIa: preguntas.filter(q => q.generada_por_ia).length,
    adaptativas: preguntas.filter(q => q.categorias_error_objetivo && q.categorias_error_objetivo.length > 0).length,
    tiempoProm: preguntas.length > 0
      ? Math.round(preguntas.reduce((a, q) => a + q.tiempo_estimado_min, 0) / preguntas.length)
      : 0,
  }), [preguntas]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: tokens.text, fontSize: 14 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>
              Banco de Preguntas
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>
              {loading ? "Cargando…" : `${preguntas.length} preguntas · ${stats.porIa} generadas por IA · ${stats.adaptativas} adaptativas`}
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: stats.total, icon: "ti-help-circle", color: tokens.purple },
            { label: "Activas", value: stats.activas, icon: "ti-circle-check", color: tokens.accent },
            { label: "Generadas IA", value: stats.porIa, icon: "ti-sparkles", color: tokens.info },
            { label: "Adaptativas", value: stats.adaptativas, icon: "ti-robot", color: tokens.warning },
            { label: "Tiempo prom.", value: `${stats.tiempoProm} min`, icon: "ti-clock", color: "#ec4899" },
          ].map(s => (
            <div key={s.label} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: loading ? tokens.textFaint : tokens.text, lineHeight: 1 }}>
                  {loading ? <div style={{ width: 40, height: 20, background: tokens.searchBg, borderRadius: 4 }} /> : s.value}
                </div>
                <div style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: tokens.textFaint, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Buscar por título o tecnología…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "7px 12px 7px 32px", fontSize: 13, color: tokens.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
            />
          </div>
          <SelectFilter
            value={tecnologiaFilter}
            onChange={setTecnologiaFilter}
            options={[{ value: "todas", label: "Todas las tecnologías" }, ...tecnologiasUnicas.map(t => ({ value: t, label: t }))]}
            tokens={tokens}
          />
          <SelectFilter
            value={nivelFilter}
            onChange={setNivelFilter}
            options={[{ value: "todos", label: "Todos los niveles" }, ...nivelesUnicos.map(n => ({ value: n, label: n }))]}
            tokens={tokens}
          />
          <SelectFilter
            value={tipoFilter}
            onChange={setTipoFilter}
            options={[{ value: "todos", label: "Todos los tipos" }, ...tiposUnicos.map(t => ({ value: t, label: TIPO_LABELS[t] ?? t }))]}
            tokens={tokens}
          />
          <span style={{ fontSize: 12, color: tokens.textFaint, marginLeft: "auto" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Tabla ── */}
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
                {["Pregunta", "Tecnología", "Nivel", "Tipo", "Tiempo", "Origen", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Loading */}
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <Spinner size={32} color={tokens.accent} />
                      <span style={{ fontSize: 13, color: tokens.textFaint }}>Cargando preguntas…</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Error */}
              {!loading && error && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <i className="ti ti-wifi-off" style={{ fontSize: 32, color: tokens.danger }} />
                      <p style={{ margin: 0, fontSize: 14, color: tokens.textMuted }}>Error al cargar preguntas</p>
                      <p style={{ margin: 0, fontSize: 12, color: tokens.textFaint, fontFamily: "monospace" }}>{error}</p>
                      <button
                        onClick={fetchTodo}
                        style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${tokens.accent}44`, background: tokens.accentBg, color: tokens.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Sin resultados */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center", color: tokens.textMuted }}>
                    {preguntas.length === 0 ? "No hay preguntas generadas todavía" : "No se encontraron preguntas con esos filtros"}
                  </td>
                </tr>
              )}

              {/* Filas */}
              {!loading && !error && filtered.map(q => (
                <tr
                  key={q.id}
                  style={{ borderBottom: `1px solid ${tokens.border}`, transition: "background 0.12s", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = tokens.surfaceHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => setSelectedPregunta(q)}
                >
                  {/* Pregunta */}
                  <td style={{ padding: "13px 16px", maxWidth: 320 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tokens.text, lineHeight: 1.4 }}>{q.titulo}</div>
                    <div style={{ fontSize: 11, color: tokens.textFaint, marginTop: 3 }}>
                      {formatDate(q.fecha_creacion)}
                      {q.generada_por_ia && (
                        <span style={{ marginLeft: 8, color: tokens.info, fontWeight: 600 }}>✦ IA</span>
                      )}
                      {q.categorias_error_objetivo && q.categorias_error_objetivo.length > 0 && (
                        <span style={{ marginLeft: 8, color: tokens.warning, fontSize: 10 }}>🎯 Adaptativa</span>
                      )}
                    </div>
                  </td>

                  {/* Tecnología */}
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 13, color: tokens.textMuted }}>{q.tecnologia}</span>
                  </td>

                  {/* Nivel */}
                  <td style={{ padding: "13px 16px" }}>
                    <Badge label={q.nivel} color={nivelColors[q.nivel] ?? tokens.textMuted} />
                  </td>

                  {/* Tipo */}
                  <td style={{ padding: "13px 16px" }}>
                    <Badge label={TIPO_LABELS[q.tipo]} color={tipoColors[q.tipo] ?? tokens.textMuted} />
                  </td>

                  {/* Tiempo */}
                  <td style={{ padding: "13px 16px", color: tokens.textMuted, fontSize: 13 }}>
                    {q.tiempo_estimado_min} min
                  </td>

                  {/* Origen */}
                  <td style={{ padding: "13px 16px" }}>
                    {q.generada_por_ia ? (
                      <span style={{ fontSize: 12, color: tokens.info }}>
                        <i className="ti ti-robot" style={{ fontSize: 12, marginRight: 4 }} />
                        IA Adaptativa
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: tokens.textFaint }}>
                        <i className="ti ti-user" style={{ fontSize: 12, marginRight: 4 }} />
                        Manual
                      </span>
                    )}
                  </td>

                  {/* Acción */}
                  <td style={{ padding: "13px 16px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPregunta(q); }}
                      style={{ background: "none", border: `1px solid ${tokens.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: tokens.accent, fontSize: 13 }}
                    >
                      <i className="ti ti-eye" style={{ marginRight: 4 }} />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie de página informativo */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 10, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: tokens.textFaint }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, marginRight: 6, verticalAlign: "middle" }} />
            Las preguntas son generadas automáticamente por el sistema de IA adaptativa basado en el desempeño de los candidatos.
            Los administradores tienen acceso de solo lectura para monitorear el banco de preguntas.
          </p>
        </div>
      </div>

      {/* Modal de detalle */}
      {selectedPregunta && (
        <DetailModal
          pregunta={selectedPregunta}
          onClose={() => setSelectedPregunta(null)}
          tokens={tokens}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}