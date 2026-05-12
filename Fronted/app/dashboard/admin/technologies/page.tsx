'use client';

import { useEffect, useState, useCallback } from "react";
import { getTecnologias } from "@/services/technologies.service";

const T = {
  dark: {
    bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
    accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444", searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#f0f2f5", surface: "#ffffff", surfaceHover: "#f8f9fb",
    border: "rgba(0,0,0,0.08)", text: "#111214", textMuted: "#5f6478", textFaint: "#adb0be",
    accent: "#00a855", accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626", searchBg: "rgba(0,0,0,0.04)", searchBorder: "rgba(0,0,0,0.1)",
  },
};

const TIPO_COLORS: Record<string, string> = {
  Frontend: "#3b82f6", Backend: "#00c96b", Database: "#a855f7", DevOps: "#f59e0b",
};

const TIPO_ICONS: Record<string, string> = {
  Frontend: "ti-layout", Backend: "ti-server", Database: "ti-database", DevOps: "ti-brand-docker",
};

interface Tech {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  version_actual: string;
  activo: boolean;
  sesiones: number;
  avg_score: number;
}

// ─── Skeleton card ───────────────────────────────────────────────────────────
const SkeletonCard = ({ t }: { t: typeof T.dark }) => (
  <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem", overflow: "hidden" }}>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -400px 0 }
        100% { background-position: 400px 0 }
      }
      .sk {
        background: linear-gradient(90deg, ${t.border} 25%, rgba(255,255,255,0.04) 50%, ${t.border} 75%);
        background-size: 800px 100%;
        animation: shimmer 1.4s infinite linear;
        border-radius: 6px;
      }
    `}</style>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
      <div className="sk" style={{ width: 44, height: 44, borderRadius: 12 }} />
      <div className="sk" style={{ width: 60, height: 20, borderRadius: 99 }} />
    </div>
    <div className="sk" style={{ width: "55%", height: 16, marginBottom: 8 }} />
    <div className="sk" style={{ width: "35%", height: 12, marginBottom: 16 }} />
    <div className="sk" style={{ width: "100%", height: 4, borderRadius: 99, marginBottom: 12 }} />
    <div style={{ display: "flex", gap: 7 }}>
      <div className="sk" style={{ flex: 1, height: 32, borderRadius: 8 }} />
      <div className="sk" style={{ flex: 1, height: 32, borderRadius: 8 }} />
    </div>
  </div>
);

// ─── Error state ─────────────────────────────────────────────────────────────
const ErrorState = ({
  t, onRetry, retrying, attemptCount,
}: {
  t: typeof T.dark;
  onRetry: () => void;
  retrying: boolean;
  attemptCount: number;
}) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "60px 24px", gap: 0,
  }}>
    {/* Animated icon container */}
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 20, position: "relative",
    }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 30, color: "#ef4444" }} />
      <span style={{
        position: "absolute", top: -6, right: -6,
        width: 22, height: 22, borderRadius: 99,
        background: "#ef4444", color: "#fff",
        fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${t.bg}`,
      }}>{attemptCount}</span>
    </div>

    <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: t.text }}>
      No se pudieron cargar las tecnologías
    </h3>
    <p style={{ margin: "0 0 4px", fontSize: 13, color: t.textMuted, textAlign: "center", maxWidth: 340 }}>
      Hubo un problema al conectar con el servidor. Verifica tu conexión o que el backend esté disponible.
    </p>
    {attemptCount > 1 && (
      <p style={{ margin: "0 0 24px", fontSize: 11, color: t.textFaint }}>
        Intento {attemptCount} fallido
      </p>
    )}
    {attemptCount <= 1 && <div style={{ height: 24 }} />}

    <div style={{ display: "flex", gap: 10 }}>
      <button
        onClick={onRetry}
        disabled={retrying}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 10, border: "none",
          background: retrying ? "rgba(0,201,107,0.15)" : t.accent,
          color: retrying ? t.accent : "#fff",
          fontSize: 13, fontWeight: 600, cursor: retrying ? "not-allowed" : "pointer",
          fontFamily: "inherit", transition: "all 0.2s",
        }}>
        <i className={`ti ${retrying ? "ti-loader-2" : "ti-refresh"}`}
          style={{ fontSize: 16, animation: retrying ? "spin 0.8s linear infinite" : "none" }} />
        {retrying ? "Reintentando…" : "Reintentar"}
      </button>
      <button
        onClick={() => window.location.reload()}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 10,
          border: `1px solid ${t.border}`, background: "transparent",
          color: t.textMuted, fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>
        <i className="ti ti-reload" style={{ fontSize: 15 }} />
        Recargar página
      </button>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ t, hasFilters }: { t: typeof T.dark; hasFilters: boolean }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 24px", gap: 0,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: t.searchBg, border: `1.5px solid ${t.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
    }}>
      <i className={`ti ${hasFilters ? "ti-filter-off" : "ti-cpu"}`} style={{ fontSize: 28, color: t.textFaint }} />
    </div>
    <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: t.text }}>
      {hasFilters ? "Sin resultados" : "Sin tecnologías"}
    </h3>
    <p style={{ margin: 0, fontSize: 13, color: t.textMuted, textAlign: "center", maxWidth: 300 }}>
      {hasFilters
        ? "Ninguna tecnología coincide con los filtros aplicados."
        : "Aún no hay tecnologías registradas. Crea la primera."}
    </p>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TechnologiesPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const t = T[theme];

  const fetchData = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetrying(true);
      setError(false);
    } else {
      setLoading(true);
    }

    setAttemptCount(prev => prev + 1);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError(true);
        return;
      }
      const data = await getTecnologias(token);
      setTechs(data.data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = (id: number) =>
    setTechs(prev => prev.map(tech => tech.id === id ? { ...tech, activo: !tech.activo } : tech));

  const filtered = techs.filter(tech => {
    const s = search.toLowerCase();
    const matchSearch = tech.nombre.toLowerCase().includes(s) || tech.tipo.toLowerCase().includes(s);
    const matchTipo = tipoFilter === "todos" || tech.tipo === tipoFilter;
    const matchStatus = statusFilter === "todos" || (statusFilter === "activo" ? tech.activo : !tech.activo);
    return matchSearch && matchTipo && matchStatus;
  });

  const tipos = ["todos", ...Array.from(new Set(techs.map(t => t.tipo)))];
  const hasFilters = search !== "" || tipoFilter !== "todos" || statusFilter !== "todos";
  const maxSessions = techs.length ? Math.max(...techs.map(t => t.sesiones), 1) : 1;

  const ViewToggle = () => (
    <div style={{ display: "flex", background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
      {(["grid", "table"] as const).map(mode => (
        <button key={mode} onClick={() => setViewMode(mode)}
          style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === mode ? t.surface : "transparent", color: viewMode === mode ? t.text : t.textMuted, fontSize: 13, fontFamily: "inherit", transition: "all 0.15s" }}>
          <i className={`ti ${mode === "grid" ? "ti-layout-grid" : "ti-list"}`} style={{ fontSize: 15 }} />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text }}>Tecnologías</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>
              {loading
                ? "Cargando…"
                : error
                  ? "No se pudo conectar"
                  : `${techs.filter(t => t.activo).length} activas · ${techs.filter(t => !t.activo).length} inactivas`}
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} /> Nueva tecnología
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total",          value: loading ? "—" : error ? "!" : techs.length,                                                              icon: "ti-cpu",          color: "#3b82f6" },
            { label: "Activas",        value: loading ? "—" : error ? "!" : techs.filter(t => t.activo).length,                                        icon: "ti-circle-check", color: "#00c96b" },
            { label: "Total sesiones", value: loading ? "—" : error ? "!" : techs.reduce((a, t) => a + t.sesiones, 0),                                 icon: "ti-video",        color: "#a855f7" },
            { label: "Score promedio", value: loading ? "—" : error ? "!" : techs.length ? Math.round(techs.reduce((a, t) => a + t.avg_score, 0) / techs.length) : 0, icon: "ti-chart-bar", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.value === "!" ? "#ef4444" : t.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters — only when not in error */}
        {!error && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textFaint, pointerEvents: "none" }} />
              <input type="text" placeholder="Buscar tecnología..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
              style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, cursor: "pointer", fontFamily: "inherit" }}>
              {tipos.map(o => <option key={o} value={o}>{o === "todos" ? "Todos los tipos" : o}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, cursor: "pointer", fontFamily: "inherit" }}>
              {["todos", "activo", "inactivo"].map(o => <option key={o} value={o}>{o === "todos" ? "Todos los estados" : o}</option>)}
            </select>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} t={t} />)}
          </div>
        )}

        {/* ── ERROR ── */}
        {!loading && error && (
          <div style={{ background: t.surface, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 14, overflow: "hidden" }}>
            {/* Top warning bar */}
            <div style={{ background: "rgba(239,68,68,0.08)", borderBottom: `1px solid rgba(239,68,68,0.15)`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: "#ef4444" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>Error al cargar datos</span>
              {attemptCount > 1 && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: t.textFaint }}>
                  {attemptCount} intentos fallidos
                </span>
              )}
            </div>
            <ErrorState t={t} onRetry={() => fetchData(true)} retrying={retrying} attemptCount={attemptCount} />
          </div>
        )}

        {/* ── SUCCESS: GRID ── */}
        {!loading && !error && viewMode === "grid" && (
          filtered.length === 0
            ? <EmptyState t={t} hasFilters={hasFilters} />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
                {filtered.map(tech => {
                  const tipoColor = TIPO_COLORS[tech.tipo] ?? "#8b8fa8";
                  const tipoIcon = TIPO_ICONS[tech.tipo] ?? "ti-cpu";
                  return (
                    <div key={tech.id}
                      style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem", position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.15s", opacity: tech.activo ? 1 : 0.6 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = tipoColor + "55"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: tipoColor + "0d", borderRadius: "0 14px 0 60px" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: tipoColor + "18", border: `1.5px solid ${tipoColor}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`ti ${tipoIcon}`} style={{ fontSize: 22, color: tipoColor }} />
                        </div>
                        <span style={{ background: tech.activo ? "rgba(0,201,107,0.1)" : "rgba(239,68,68,0.1)", color: tech.activo ? "#00c96b" : "#f87171", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {tech.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{tech.nombre}</div>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ background: tipoColor + "18", color: tipoColor, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>{tech.tipo}</span>
                          <span style={{ color: t.textFaint }}>v{tech.version_actual}</span>
                        </div>
                      </div>
                      {/* Sessions bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: t.textMuted }}><strong style={{ color: t.text }}>{tech.sesiones}</strong> sesiones</span>
                          <span style={{ fontSize: 11, color: t.textMuted }}>avg <strong style={{ color: tech.avg_score >= 70 ? "#00c96b" : "#f59e0b" }}>{tech.avg_score}</strong></span>
                        </div>
                        <div style={{ height: 4, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(tech.sesiones / maxSessions) * 100}%`, background: tipoColor, borderRadius: 99, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
                        <button onClick={() => toggleActive(tech.id)}
                          style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: tech.activo ? "rgba(239,68,68,0.1)" : "rgba(0,201,107,0.1)", color: tech.activo ? "#f87171" : "#00c96b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                          {tech.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        )}

        {/* ── SUCCESS: TABLE ── */}
        {!loading && !error && viewMode === "table" && (
          filtered.length === 0
            ? <EmptyState t={t} hasFilters={hasFilters} />
            : (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                      {["Tecnología", "Tipo", "Versión", "Sesiones", "Score promedio", "Estado", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tech => {
                      const tipoColor = TIPO_COLORS[tech.tipo] ?? "#8b8fa8";
                      const tipoIcon = TIPO_ICONS[tech.tipo] ?? "ti-cpu";
                      return (
                        <tr key={tech.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = t.surfaceHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: tipoColor + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <i className={`ti ${tipoIcon}`} style={{ fontSize: 16, color: tipoColor }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{tech.nombre}</span>
                            </div>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <span style={{ background: tipoColor + "18", color: tipoColor, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99 }}>{tech.tipo}</span>
                          </td>
                          <td style={{ padding: "13px 16px", color: t.textMuted, fontSize: 13 }}>v{tech.version_actual}</td>
                          <td style={{ padding: "13px 16px", fontSize: 13, color: t.text, fontWeight: 600 }}>{tech.sesiones}</td>
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ height: 4, width: 60, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${tech.avg_score}%`, background: tech.avg_score >= 70 ? "#00c96b" : "#f59e0b", borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{tech.avg_score}</span>
                            </div>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <button onClick={() => toggleActive(tech.id)}
                              style={{ display: "flex", alignItems: "center", gap: 5, background: tech.activo ? "rgba(0,201,107,0.1)" : "rgba(239,68,68,0.1)", border: "none", borderRadius: 99, padding: "4px 10px", cursor: "pointer", color: tech.activo ? "#00c96b" : "#f87171", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                              {tech.activo ? "Activo" : "Inactivo"}
                            </button>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <button title="Editar" style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: t.textMuted, fontSize: 14 }}>
                              <i className="ti ti-pencil" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowModal(false)}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: "2rem", width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: t.text }}>Nueva tecnología</h2>
              <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 20px" }}>Conecta con tu API: <code style={{ color: t.accent }}>POST /api/tecnologias</code></p>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}