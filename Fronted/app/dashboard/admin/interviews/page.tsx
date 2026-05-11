'use client';

/**
 * /app/(protected)/dashboard/admin/interviews/page.tsx
 * Sesiones de entrevista — mapea tablas:
 *   sesiones_entrevista, mensajes, envios_codigo, ejecuciones_ide, evaluaciones
 */

import { useState, useMemo } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoSesion = "en_progreso" | "completada" | "abandonada" | "expirada";

interface Sesion {
  id: string;
  usuario_nombre: string;
  usuario_initials: string;
  tecnologia: string;
  tecnologia_color: string;
  nivel: string;
  pregunta_titulo: string;
  estado: EstadoSesion;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_segundos: number | null;
  tiempo_limite_segundos: number;
  ip_usuario: string;
  mensajes_count: number;
  envios_count: number;
  puntaje_total: number | null;
  // ejecuciones_ide
  ultimo_exit_code: number | null;
  tiempo_ejecucion_ms: number | null;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK_SESIONES: Sesion[] = [
  { id: "a1b2c3d4-0001", usuario_nombre: "Diego Ruiz",    usuario_initials: "DR", tecnologia: "PostgreSQL", tecnologia_color: "#336791", nivel: "Senior", pregunta_titulo: "Optimiza esta query con millones de registros", estado: "completada",  fecha_inicio: "2025-05-09T10:00:00Z", fecha_fin: "2025-05-09T11:02:00Z", duracion_segundos: 3720, tiempo_limite_segundos: 3600, ip_usuario: "192.168.1.10", mensajes_count: 14, envios_count: 3, puntaje_total: 91.5, ultimo_exit_code: 0, tiempo_ejecucion_ms: 142 },
  { id: "a1b2c3d4-0002", usuario_nombre: "Ana Martínez",  usuario_initials: "AM", tecnologia: "React",      tecnologia_color: "#61dafb", nivel: "Senior", pregunta_titulo: "Implementa un hook de paginación infinita", estado: "completada",  fecha_inicio: "2025-05-09T13:30:00Z", fecha_fin: "2025-05-09T14:20:00Z", duracion_segundos: 3000, tiempo_limite_segundos: 3600, ip_usuario: "10.0.0.22",    mensajes_count: 18, envios_count: 4, puntaje_total: 88.2, ultimo_exit_code: 0, tiempo_ejecucion_ms: 87 },
  { id: "a1b2c3d4-0003", usuario_nombre: "Carlos López",  usuario_initials: "CL", tecnologia: "Node.js",    tecnologia_color: "#68a063", nivel: "Mid",    pregunta_titulo: "Diseña una API REST con autenticación JWT", estado: "en_progreso", fecha_inicio: "2025-05-10T08:00:00Z", fecha_fin: null,                      duracion_segundos: null, tiempo_limite_segundos: 3600, ip_usuario: "172.16.0.5",  mensajes_count: 7,  envios_count: 1, puntaje_total: null, ultimo_exit_code: 1, tiempo_ejecucion_ms: 203 },
  { id: "a1b2c3d4-0004", usuario_nombre: "María Torres",  usuario_initials: "MT", tecnologia: "Python",     tecnologia_color: "#f7c948", nivel: "Junior", pregunta_titulo: "Implementa un árbol binario de búsqueda",   estado: "completada",  fecha_inicio: "2025-05-08T15:00:00Z", fecha_fin: "2025-05-08T16:45:00Z", duracion_segundos: 6300, tiempo_limite_segundos: 7200, ip_usuario: "10.10.10.1",   mensajes_count: 11, envios_count: 2, puntaje_total: 72.0, ultimo_exit_code: 0, tiempo_ejecucion_ms: 55 },
  { id: "a1b2c3d4-0005", usuario_nombre: "Sofía Vega",    usuario_initials: "SV", tecnologia: "TypeScript", tecnologia_color: "#3178c6", nivel: "Mid",    pregunta_titulo: "Crea un sistema de tipos para una API genérica",estado: "abandonada", fecha_inicio: "2025-05-08T09:00:00Z", fecha_fin: "2025-05-08T09:40:00Z", duracion_segundos: 2400, tiempo_limite_segundos: 3600, ip_usuario: "192.168.0.44",  mensajes_count: 4,  envios_count: 0, puntaje_total: null, ultimo_exit_code: null, tiempo_ejecucion_ms: null },
  { id: "a1b2c3d4-0006", usuario_nombre: "Tomás Bravo",   usuario_initials: "TB", tecnologia: "Go",         tecnologia_color: "#00acd7", nivel: "Senior", pregunta_titulo: "Implementa un pool de workers con goroutines",  estado: "completada",  fecha_inicio: "2025-05-07T17:00:00Z", fecha_fin: "2025-05-07T18:05:00Z", duracion_segundos: 3900, tiempo_limite_segundos: 3600, ip_usuario: "10.0.1.7",     mensajes_count: 16, envios_count: 3, puntaje_total: 79.3, ultimo_exit_code: 0, tiempo_ejecucion_ms: 310 },
  { id: "a1b2c3d4-0007", usuario_nombre: "Laura Sánchez", usuario_initials: "LS", tecnologia: "React",      tecnologia_color: "#61dafb", nivel: "Junior", pregunta_titulo: "Crea un formulario controlado con validación",   estado: "expirada",   fecha_inicio: "2025-05-06T10:00:00Z", fecha_fin: "2025-05-06T11:00:00Z", duracion_segundos: 3600, tiempo_limite_segundos: 3600, ip_usuario: "172.20.0.3",  mensajes_count: 6,  envios_count: 1, puntaje_total: null, ultimo_exit_code: 1, tiempo_ejecucion_ms: 512 },
];

// ─── Tokens de color ──────────────────────────────────────────────────────────

const C = {
  bg: "#111214", surface: "#1a1c20", surface2: "#20232a", surfaceHover: "#22252b",
  border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
  accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
  danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)",
  warning: "#f59e0b", warningBg: "rgba(245,158,11,0.1)",
  info: "#3b82f6", infoBg: "rgba(59,130,246,0.1)",
  inputBg: "rgba(255,255,255,0.05)", inputBorder: "rgba(255,255,255,0.12)",
};

const ESTADO_STYLE: Record<EstadoSesion, { bg: string; c: string; label: string; icon: string }> = {
  completada:  { bg: "rgba(0,201,107,0.12)",  c: "#00c96b", label: "Completada",  icon: "ti-circle-check" },
  en_progreso: { bg: "rgba(59,130,246,0.12)", c: "#60a5fa", label: "En progreso", icon: "ti-clock" },
  abandonada:  { bg: "rgba(239,68,68,0.12)",  c: "#f87171", label: "Abandonada",  icon: "ti-circle-x" },
  expirada:    { bg: "rgba(245,158,11,0.12)", c: "#fbbf24", label: "Expirada",    icon: "ti-alarm" },
};

const AVATAR_PALETTE = ["#00c96b","#3b82f6","#a855f7","#f59e0b","#ec4899","#14b8a6","#f97316","#8b5cf6"];
const avatarColor = (s: string) => AVATAR_PALETTE[s.charCodeAt(0) % AVATAR_PALETTE.length];

function fmtDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Panel lateral de detalle ─────────────────────────────────────────────────

function DetailPanel({ sesion, onClose }: { sesion: Sesion; onClose: () => void }) {
  const es = ESTADO_STYLE[sesion.estado];
  const scoreColor = sesion.puntaje_total == null ? C.textFaint : sesion.puntaje_total >= 80 ? C.accent : sesion.puntaje_total >= 60 ? C.warning : C.danger;

  return (
    <div style={{ width: 340, flexShrink: 0, background: C.surface, borderLeft: `1px solid ${C.border}`, padding: "1.25rem", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Detalle de sesión</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 18 }}>✕</button>
      </div>

      {/* Estado + score */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: es.bg, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`ti ${es.icon}`} style={{ fontSize: 16, color: es.c }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: es.c }}>{es.label}</span>
        </div>
        <div style={{ flex: 1, background: C.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{sesion.puntaje_total?.toFixed(1) ?? "—"}</p>
          <p style={{ margin: 0, fontSize: 10, color: C.textFaint }}>PUNTAJE</p>
        </div>
      </div>

      {/* Info del candidato */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(sesion.usuario_initials) + "22", border: `1.5px solid ${avatarColor(sesion.usuario_initials)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: avatarColor(sesion.usuario_initials), flexShrink: 0 }}>
          {sesion.usuario_initials}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{sesion.usuario_nombre}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 11, background: sesion.tecnologia_color + "22", color: sesion.tecnologia_color, padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{sesion.tecnologia}</span>
            <span style={{ fontSize: 11, background: C.surface2, color: C.textMuted, padding: "2px 8px", borderRadius: 99 }}>{sesion.nivel}</span>
          </div>
        </div>
      </div>

      {/* Pregunta */}
      <div style={{ background: C.surface2, borderRadius: 10, padding: "10px 12px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 10, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Pregunta</p>
        <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{sesion.pregunta_titulo}</p>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Timeline</p>
        {[
          { label: "Inicio",    value: fmtDate(sesion.fecha_inicio), icon: "ti-player-play", color: C.accent },
          { label: "Fin",       value: sesion.fecha_fin ? fmtDate(sesion.fecha_fin) : "En curso", icon: "ti-player-stop", color: sesion.fecha_fin ? C.danger : C.warning },
          { label: "Duración",  value: fmtDuration(sesion.duracion_segundos), icon: "ti-clock", color: C.info },
          { label: "Límite",    value: fmtDuration(sesion.tiempo_limite_segundos), icon: "ti-alarm", color: C.textMuted },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: row.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${row.icon}`} style={{ fontSize: 13, color: row.color }} />
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>{row.label}</span>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{row.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Mensajes", value: sesion.mensajes_count, color: C.info },
          { label: "Envíos",   value: sesion.envios_count,  color: C.accent },
          { label: "Exit code",value: sesion.ultimo_exit_code ?? "—", color: sesion.ultimo_exit_code === 0 ? C.accent : sesion.ultimo_exit_code === null ? C.textFaint : C.danger },
        ].map(m => (
          <div key={m.label} style={{ background: C.surface2, borderRadius: 9, padding: "10px 6px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textFaint }}>{m.label}</p>
          </div>
        ))}
      </div>

      {sesion.tiempo_ejecucion_ms != null && (
        <div style={{ background: C.surface2, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Tiempo ejecución IDE</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{sesion.tiempo_ejecucion_ms} ms</span>
        </div>
      )}

      {/* IP */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-network" style={{ fontSize: 14, color: C.textFaint }} />
        <span style={{ fontSize: 12, color: C.textFaint, fontFamily: "monospace" }}>{sesion.ip_usuario}</span>
      </div>

      {/* ID */}
      <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 12px" }}>
        <p style={{ margin: 0, fontSize: 10, color: C.textFaint }}>ID DE SESIÓN</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, fontFamily: "monospace", color: C.textMuted, wordBreak: "break-all" }}>{sesion.id}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const [selected, setSelected] = useState<Sesion | null>(null);
  const [filterEstado, setFilterEstado] = useState<"todos" | EstadoSesion>("todos");
  const [filterTech, setFilterTech]     = useState("todas");
  const [search, setSearch]             = useState("");

  const techs = [...new Set(MOCK_SESIONES.map(s => s.tecnologia))];

  const filtered = useMemo(() => {
    return MOCK_SESIONES.filter(s => {
      const q = search.toLowerCase();
      if (search && !s.usuario_nombre.toLowerCase().includes(q) && !s.tecnologia.toLowerCase().includes(q)) return false;
      if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
      if (filterTech   !== "todas" && s.tecnologia !== filterTech) return false;
      return true;
    });
  }, [search, filterEstado, filterTech]);

  const counts = {
    completada:  MOCK_SESIONES.filter(s => s.estado === "completada").length,
    en_progreso: MOCK_SESIONES.filter(s => s.estado === "en_progreso").length,
    abandonada:  MOCK_SESIONES.filter(s => s.estado === "abandonada").length,
    expirada:    MOCK_SESIONES.filter(s => s.estado === "expirada").length,
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", height: "100%", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, paddingRight: selected ? 20 : 0 }}>

          {/* Header */}
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Sesiones de entrevista</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Monitoreo en tiempo real de todas las entrevistas</p>
          </div>

          {/* KPI pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["todos", "en_progreso", "completada", "abandonada", "expirada"] as const).map(key => {
              const info = key === "todos"
                ? { label: `Todas (${MOCK_SESIONES.length})`, bg: C.accentBg, c: C.accent }
                : { label: `${ESTADO_STYLE[key].label} (${counts[key]})`, bg: ESTADO_STYLE[key].bg, c: ESTADO_STYLE[key].c };
              const active = filterEstado === key;
              return (
                <button key={key} onClick={() => setFilterEstado(key)}
                  style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${active ? info.c + "55" : C.border}`, background: active ? info.bg : "transparent", color: active ? info.c : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
                >{info.label}</button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0.85rem 1rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textFaint }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar candidato…"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "7px 12px 7px 30px", fontSize: 13, color: C.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const }}
                onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder}
              />
            </div>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
              <option value="todas">Todas las tecnologías</option>
              {techs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: C.textFaint, marginLeft: "auto" }}>{filtered.length} sesiones</span>
          </div>

          {/* Tabla */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  {["Candidato", "Tecnología", "Nivel", "Pregunta", "Estado", "Duración", "Puntaje", "Inicio", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: C.textFaint }}>Sin resultados</td></tr>
                )}
                {filtered.map(s => {
                  const es = ESTADO_STYLE[s.estado];
                  const scoreColor = s.puntaje_total == null ? C.textFaint : s.puntaje_total >= 80 ? C.accent : s.puntaje_total >= 60 ? C.warning : C.danger;
                  const isSelected = selected?.id === s.id;
                  return (
                    <tr key={s.id}
                      onClick={() => setSelected(isSelected ? null : s)}
                      style={{ transition: "background 0.12s", cursor: "pointer", background: isSelected ? C.accentBg : "transparent" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = C.surfaceHover; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(s.usuario_initials) + "22", border: `1.5px solid ${avatarColor(s.usuario_initials)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: avatarColor(s.usuario_initials), flexShrink: 0 }}>{s.usuario_initials}</div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>{s.usuario_nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, background: s.tecnologia_color + "20", color: s.tecnologia_color, padding: "3px 9px", borderRadius: 99, fontWeight: 600 }}>{s.tecnologia}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{s.nivel}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, maxWidth: 200 }}>
                        <span style={{ fontSize: 12, color: C.textMuted, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pregunta_titulo}</span>
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ background: es.bg, color: es.c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {s.estado === "en_progreso" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: es.c, animation: "pulse 1.5s infinite" }} />}
                          {es.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{fmtDuration(s.duracion_segundos)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 15, fontWeight: 700, color: scoreColor, borderBottom: `1px solid ${C.border}` }}>{s.puntaje_total?.toFixed(1) ?? "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: C.textFaint, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{fmtDate(s.fecha_inicio)}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <i className={`ti ${isSelected ? "ti-chevron-right" : "ti-eye"}`} style={{ fontSize: 15, color: isSelected ? C.accent : C.textFaint }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel lateral */}
        {selected && <DetailPanel sesion={selected} onClose={() => setSelected(null)} />}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </>
  );
}