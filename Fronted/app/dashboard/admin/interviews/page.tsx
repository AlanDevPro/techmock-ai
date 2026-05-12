'use client';

/**
 * /app/(protected)/dashboard/admin/interviews/page.tsx
 * Sesiones de entrevista — datos reales desde el backend en puerto 4000
 * Mapea tablas: sesiones_entrevista, mensajes, envios_codigo, ejecuciones_ide, evaluaciones
 */

import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Constante base URL ───────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ─── Helper fetch autenticado ─────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  // El token JWT se guarda en localStorage con la clave "access_token".
  // Ajusta la clave si tu auth lo guarda diferente (ej: "token", "jwt", etc.).
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  const json = await res.json();
  // El backend envuelve siempre en { success, data }
  return json.data as T;
}

// ─── Tipos que vienen del backend ─────────────────────────────────────────────

/** Shape que devuelve GET /api/v1/sesiones/historial  (admin ve todas) */
interface SesionAPI {
  id: string;
  usuario_id: string;
  tecnologia_id: number;
  nivel_id: number;
  pregunta_id: number;
  estado: EstadoSesion;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_segundos: number | null;
  tiempo_limite_segundos: number;
  ip_usuario: string;
  user_agent: string | null;
  // Campos JOIN que tu model puede incluir (depende de tu query SQL)
  usuario_nombre?: string;
  usuario_apellido?: string;
  tecnologia_nombre?: string;
  tecnologia_color?: string;
  nivel_nombre?: string;
  pregunta_titulo?: string;
  // Conteos agregados opcionales
  mensajes_count?: number;
  envios_count?: number;
  // Evaluación (si tu query hace JOIN)
  puntaje_total?: number | null;
  // Ejecución IDE
  ultimo_exit_code?: number | null;
  tiempo_ejecucion_ms?: number | null;
}

// ─── Tipo normalizado para la UI ──────────────────────────────────────────────

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
  ultimo_exit_code: number | null;
  tiempo_ejecucion_ms: number | null;
}

/** Normaliza la respuesta del backend al shape que usa la UI */
function normalizeSesion(s: SesionAPI): Sesion {
  const nombre = s.usuario_nombre ?? "Sin nombre";
  const apellido = s.usuario_apellido ?? "";
  const nombreCompleto = apellido ? `${nombre} ${apellido}` : nombre;
  const initials = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase() || "??";

  return {
    id: s.id,
    usuario_nombre: nombreCompleto,
    usuario_initials: initials,
    tecnologia: s.tecnologia_nombre ?? `Tech #${s.tecnologia_id}`,
    tecnologia_color: s.tecnologia_color ?? "#888",
    nivel: s.nivel_nombre ?? `Nivel #${s.nivel_id}`,
    pregunta_titulo: s.pregunta_titulo ?? `Pregunta #${s.pregunta_id}`,
    estado: s.estado,
    fecha_inicio: s.fecha_inicio,
    fecha_fin: s.fecha_fin,
    duracion_segundos: s.duracion_segundos,
    tiempo_limite_segundos: s.tiempo_limite_segundos,
    ip_usuario: s.ip_usuario ?? "—",
    mensajes_count: s.mensajes_count ?? 0,
    envios_count: s.envios_count ?? 0,
    puntaje_total: s.puntaje_total ?? null,
    ultimo_exit_code: s.ultimo_exit_code ?? null,
    tiempo_ejecucion_ms: s.tiempo_ejecucion_ms ?? null,
  };
}

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
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Componente de estado de carga / error ────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13, color: C.textFaint }}>Cargando sesiones…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 14 }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 32, color: C.danger }} />
      <p style={{ margin: 0, fontSize: 14, color: C.textMuted, textAlign: "center" }}>
        No se pudieron cargar las sesiones
      </p>
      <p style={{ margin: 0, fontSize: 12, color: C.textFaint, fontFamily: "monospace" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${C.accent}44`, background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ─── Panel lateral de detalle ─────────────────────────────────────────────────

function DetailPanel({ sesion, onClose }: { sesion: Sesion; onClose: () => void }) {
  const es = ESTADO_STYLE[sesion.estado];
  const scoreColor = sesion.puntaje_total == null
    ? C.textFaint
    : sesion.puntaje_total >= 80 ? C.accent
    : sesion.puntaje_total >= 60 ? C.warning
    : C.danger;

  return (
    <div style={{
      width: 340, flexShrink: 0, background: C.surface,
      borderLeft: `1px solid ${C.border}`, padding: "1.25rem",
      display: "flex", flexDirection: "column", gap: 18,
      overflowY: "auto", height: "100%",
    }}>
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
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {sesion.puntaje_total != null
  ? Number(sesion.puntaje_total).toFixed(1)
  : "—"}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: C.textFaint }}>PUNTAJE</p>
        </div>
      </div>

      {/* Info del candidato */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: avatarColor(sesion.usuario_initials) + "22",
          border: `1.5px solid ${avatarColor(sesion.usuario_initials)}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: avatarColor(sesion.usuario_initials), flexShrink: 0,
        }}>
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
          { label: "Inicio",   value: fmtDate(sesion.fecha_inicio),                               icon: "ti-player-play",  color: C.accent },
          { label: "Fin",      value: sesion.fecha_fin ? fmtDate(sesion.fecha_fin) : "En curso",   icon: "ti-player-stop",  color: sesion.fecha_fin ? C.danger : C.warning },
          { label: "Duración", value: fmtDuration(sesion.duracion_segundos),                       icon: "ti-clock",        color: C.info },
          { label: "Límite",   value: fmtDuration(sesion.tiempo_limite_segundos),                  icon: "ti-alarm",        color: C.textMuted },
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
          { label: "Mensajes",  value: sesion.mensajes_count,                color: C.info },
          { label: "Envíos",    value: sesion.envios_count,                  color: C.accent },
          { label: "Exit code", value: sesion.ultimo_exit_code ?? "—",       color: sesion.ultimo_exit_code === 0 ? C.accent : sesion.ultimo_exit_code === null ? C.textFaint : C.danger },
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
  const [sesiones, setSesiones]       = useState<Sesion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<Sesion | null>(null);
  const [filterEstado, setFilterEstado] = useState<"todos" | EstadoSesion>("todos");
  const [filterTech, setFilterTech]   = useState("todas");
  const [search, setSearch]           = useState("");
  // Auto-refresh cada 30 seg para ver sesiones en_progreso actualizadas
  // eslint-disable-next-line react-hooks/purity
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // ── Fetch datos reales ────────────────────────────────────────────────────

  const fetchSesiones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin usa GET /api/v1/usuarios (para ver todos los developers),
      // pero para sesiones usa GET /api/v1/sesiones/historial.
      // Este endpoint devuelve las sesiones del usuario autenticado.
      // Si tu backend tiene un endpoint admin que devuelve TODAS las sesiones,
      // cámbia la ruta aquí: por ejemplo "/admin/sesiones".
      const data = await apiFetch<SesionAPI[]>("/sesiones/admin/historial");
      setSesiones(data.map(normalizeSesion));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSesiones();
  }, [fetchSesiones, lastRefresh]);

  // Auto-refresh si hay sesiones en_progreso (polling cada 30 seg)
  useEffect(() => {
    const hayEnProgreso = sesiones.some(s => s.estado === "en_progreso");
    if (!hayEnProgreso) return;
    const interval = setInterval(() => setLastRefresh(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [sesiones]);

  // ── Derivados ─────────────────────────────────────────────────────────────

  const techs = useMemo(
    () => [...new Set(sesiones.map(s => s.tecnologia))].sort(),
    [sesiones]
  );

  const filtered = useMemo(() => {
    return sesiones.filter(s => {
      const q = search.toLowerCase();
      if (search && !s.usuario_nombre.toLowerCase().includes(q) && !s.tecnologia.toLowerCase().includes(q)) return false;
      if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
      if (filterTech   !== "todas" && s.tecnologia !== filterTech) return false;
      return true;
    });
  }, [sesiones, search, filterEstado, filterTech]);

  const counts = useMemo(() => ({
    completada:  sesiones.filter(s => s.estado === "completada").length,
    en_progreso: sesiones.filter(s => s.estado === "en_progreso").length,
    abandonada:  sesiones.filter(s => s.estado === "abandonada").length,
    expirada:    sesiones.filter(s => s.estado === "expirada").length,
  }), [sesiones]);

  // Cuando los datos se recargan, mantener el panel lateral sincronizado
  useEffect(() => {
    if (!selected) return;
    const actualizado = sesiones.find(s => s.id === selected.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (actualizado) setSelected(actualizado);
  }, [sesiones]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", height: "100%", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, paddingRight: selected ? 20 : 0 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                Sesiones de entrevista
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>
                Monitoreo en tiempo real de todas las entrevistas
              </p>
            </div>
            {/* Botón de refresh manual */}
            <button
              onClick={() => setLastRefresh(Date.now())}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9,
                border: `1px solid ${C.border}`, background: C.surface,
                color: loading ? C.textFaint : C.textMuted,
                fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.12s",
              }}
            >
              <i className="ti ti-refresh" style={{ fontSize: 14, animation: loading ? "spin 0.8s linear infinite" : "none" }} />
              Actualizar
            </button>
          </div>

          {/* KPI pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["todos", "en_progreso", "completada", "abandonada", "expirada"] as const).map(key => {
              const info = key === "todos"
                ? { label: `Todas (${sesiones.length})`, bg: C.accentBg, c: C.accent }
                : { label: `${ESTADO_STYLE[key].label} (${counts[key]})`, bg: ESTADO_STYLE[key].bg, c: ESTADO_STYLE[key].c };
              const active = filterEstado === key;
              return (
                <button key={key} onClick={() => setFilterEstado(key)}
                  style={{
                    padding: "6px 14px", borderRadius: 99,
                    border: `1px solid ${active ? info.c + "55" : C.border}`,
                    background: active ? info.bg : "transparent",
                    color: active ? info.c : C.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.12s",
                  }}
                >
                  {info.label}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0.85rem 1rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textFaint }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar candidato o tecnología…"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "7px 12px 7px 30px", fontSize: 13, color: C.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const }}
                onFocus={e => (e.target.style.borderColor = C.accent + "88")}
                onBlur={e => (e.target.style.borderColor = C.inputBorder)}
              />
            </div>
            <select
              value={filterTech} onChange={e => setFilterTech(e.target.value)}
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
            >
              <option value="todas">Todas las tecnologías</option>
              {techs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: C.textFaint, marginLeft: "auto" }}>
              {filtered.length} sesiones
            </span>
          </div>

          {/* Tabla */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  {["Candidato", "Tecnología", "Nivel", "Pregunta", "Estado", "Duración", "Puntaje", "Inicio", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Estado de carga */}
                {loading && (
                  <tr><td colSpan={9}><LoadingState /></td></tr>
                )}

                {/* Error */}
                {!loading && error && (
                  <tr><td colSpan={9}><ErrorState message={error} onRetry={() => setLastRefresh(Date.now())} /></td></tr>
                )}

                {/* Sin resultados */}
                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: C.textFaint }}>
                      {sesiones.length === 0 ? "No hay sesiones registradas todavía" : "Sin resultados para los filtros aplicados"}
                    </td>
                  </tr>
                )}

                {/* Filas */}
                {!loading && !error && filtered.map(s => {
                  const es = ESTADO_STYLE[s.estado];
                  const scoreColor = s.puntaje_total == null ? C.textFaint : s.puntaje_total >= 80 ? C.accent : s.puntaje_total >= 60 ? C.warning : C.danger;
                  const isSelected = selected?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(isSelected ? null : s)}
                      style={{ transition: "background 0.12s", cursor: "pointer", background: isSelected ? C.accentBg : "transparent" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = C.surfaceHover; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(s.usuario_initials) + "22", border: `1.5px solid ${avatarColor(s.usuario_initials)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: avatarColor(s.usuario_initials), flexShrink: 0 }}>
                            {s.usuario_initials}
                          </div>
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
                          {s.estado === "en_progreso" && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: es.c, animation: "pulse 1.5s infinite" }} />
                          )}
                          {es.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{fmtDuration(s.duracion_segundos)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 15, fontWeight: 700, color: scoreColor, borderBottom: `1px solid ${C.border}` }}>{s.puntaje_total != null
  ? Number(s.puntaje_total).toFixed(1)
  : "—"}</td>
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

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}