'use client';

import { useState } from "react";

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

const MOCK_TECHS = [
  { id: 1, nombre: "React",      slug: "react",      tipo: "Frontend",  version_actual: "18.3",  activo: true,  sesiones: 54, avg_score: 73, color: "#61dafb" },
  { id: 2, nombre: "Node.js",    slug: "nodejs",     tipo: "Backend",   version_actual: "20.12", activo: true,  sesiones: 41, avg_score: 68, color: "#68a063" },
  { id: 3, nombre: "Python",     slug: "python",     tipo: "Backend",   version_actual: "3.12",  activo: true,  sesiones: 38, avg_score: 71, color: "#f7c948" },
  { id: 4, nombre: "TypeScript", slug: "typescript", tipo: "Frontend",  version_actual: "5.4",   activo: true,  sesiones: 29, avg_score: 75, color: "#3178c6" },
  { id: 5, nombre: "PostgreSQL", slug: "postgresql", tipo: "Database",  version_actual: "16.2",  activo: true,  sesiones: 22, avg_score: 69, color: "#336791" },
  { id: 6, nombre: "Go",         slug: "go",         tipo: "Backend",   version_actual: "1.22",  activo: true,  sesiones: 15, avg_score: 74, color: "#00add8" },
  { id: 7, nombre: "Docker",     slug: "docker",     tipo: "DevOps",    version_actual: "25.0",  activo: false, sesiones: 8,  avg_score: 66, color: "#2496ed" },
  { id: 8, nombre: "GraphQL",    slug: "graphql",    tipo: "Backend",   version_actual: "16.8",  activo: false, sesiones: 6,  avg_score: 70, color: "#e535ab" },
];

const TIPO_COLORS: Record<string, string> = {
  Frontend: "#3b82f6", Backend: "#00c96b", Database: "#a855f7", DevOps: "#f59e0b",
};

interface Tech {
  id: number; nombre: string; slug: string; tipo: string;
  version_actual: string; activo: boolean; sesiones: number; avg_score: number; color: string;
}

const maxSessions = Math.max(...MOCK_TECHS.map(t => t.sesiones));

export default function TechnologiesPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [techs, setTechs] = useState<Tech[]>(MOCK_TECHS);
  const [showModal, setShowModal] = useState(false);
  const t = T[theme];

  const filtered = techs.filter(tech => {
    const s = search.toLowerCase();
    const matchSearch = tech.nombre.toLowerCase().includes(s) || tech.tipo.toLowerCase().includes(s);
    const matchTipo = tipoFilter === "todos" || tech.tipo === tipoFilter;
    const matchStatus = statusFilter === "todos" || (statusFilter === "activo" ? tech.activo : !tech.activo);
    return matchSearch && matchTipo && matchStatus;
  });

  const toggleActive = (id: number) => setTechs(prev => prev.map(tech => tech.id === id ? { ...tech, activo: !tech.activo } : tech));

  const tipos = ["todos", ...Array.from(new Set(MOCK_TECHS.map(t => t.tipo)))];

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
              {techs.filter(t => t.activo).length} activas · {techs.filter(t => !t.activo).length} inactivas
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
            { label: "Total",         value: techs.length,                            icon: "ti-cpu",        color: "#3b82f6" },
            { label: "Activas",       value: techs.filter(t => t.activo).length,       icon: "ti-circle-check", color: "#00c96b" },
            { label: "Total sesiones",value: techs.reduce((a, t) => a + t.sesiones, 0), icon: "ti-video",      color: "#a855f7" },
            { label: "Score promedio",value: Math.round(techs.reduce((a, t) => a + t.avg_score, 0) / techs.length), icon: "ti-chart-bar", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
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
          <ViewToggle />
        </div>

        {/* Grid view */}
        {viewMode === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
            {filtered.map(tech => (
              <div key={tech.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem", position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.15s", opacity: tech.activo ? 1 : 0.6 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = tech.color + "60"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: tech.color + "0d", borderRadius: "0 14px 0 60px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: tech.color + "18", border: `1.5px solid ${tech.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-cpu" style={{ fontSize: 22, color: tech.color }} />
                  </div>
                  <span style={{ background: tech.activo ? "rgba(0,201,107,0.1)" : "rgba(239,68,68,0.1)", color: tech.activo ? "#00c96b" : "#f87171", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {tech.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{tech.nombre}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    <span style={{ background: TIPO_COLORS[tech.tipo] + "18", color: TIPO_COLORS[tech.tipo], fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>{tech.tipo}</span>
                    <span style={{ marginLeft: 8, color: t.textFaint }}>v{tech.version_actual}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{tech.sesiones} sesiones</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>avg <strong style={{ color: t.text }}>{tech.avg_score}</strong></span>
                  </div>
                  <div style={{ height: 4, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(tech.sesiones / maxSessions) * 100}%`, background: tech.color, borderRadius: 99 }} />
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
            ))}
          </div>
        )}

        {/* Table view */}
        {viewMode === "table" && (
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
                {filtered.map(tech => (
                  <tr key={tech.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: tech.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-cpu" style={{ fontSize: 16, color: tech.color }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{tech.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: TIPO_COLORS[tech.tipo] + "18", color: TIPO_COLORS[tech.tipo], fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99 }}>{tech.tipo}</span>
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
                ))}
              </tbody>
            </table>
          </div>
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