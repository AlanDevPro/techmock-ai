'use client';

/**
 * /app/(protected)/dashboard/admin/interviews/page.tsx
 *
 * Sesiones de entrevista — monitoreo en tiempo real.
 * Mapea tablas: sesiones_entrevista, mensajes, envios_codigo, ejecuciones_ide, evaluaciones.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";

import {
  type EstadoSesion,
  type Sesion,
  getSesiones,
} from "@/services/interviews.service";

// ─── Tema basado en ThemeProvider ─────────────────────────────────────────────

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

// ─── Constantes UI ────────────────────────────────────────────────────────────

const getEstadoStyle = (estado: string, isDark: boolean) => {
  const tokens = getThemeTokens(isDark);
  const styles: Record<string, { bg: string; c: string; label: string; icon: string }> = {
    completada:     { bg: isDark ? "rgba(0,201,107,0.12)" : "rgba(0,168,85,0.08)", c: tokens.accent, label: "Completada",      icon: "ti-circle-check" },
    en_progreso:    { bg: isDark ? "rgba(59,130,246,0.12)" : "rgba(37,99,235,0.08)", c: tokens.info, label: "En progreso",     icon: "ti-clock" },
    abandonada:     { bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)", c: tokens.danger, label: "Abandonada",      icon: "ti-circle-x" },
    tiempo_agotado: { bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(217,119,6,0.08)", c: tokens.warning, label: "Tiempo agotado",  icon: "ti-alarm" },
    unknown:        { bg: isDark ? "rgba(128,128,128,0.12)" : "rgba(128,128,128,0.08)", c: tokens.textFaint, label: "Desconocido",    icon: "ti-help" },
  };
  return styles[estado] ?? styles.unknown;
};

const AVATAR_PALETTE = [
  "#00c96b","#3b82f6","#a855f7","#f59e0b",
  "#ec4899","#14b8a6","#f97316","#8b5cf6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarColor = (s: string) =>
  AVATAR_PALETTE[s.charCodeAt(0) % AVATAR_PALETTE.length];

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

const getScoreColor = (puntaje: number | null, tokens: ReturnType<typeof getThemeTokens>) => {
  if (puntaje == null) return tokens.textFaint;
  if (puntaje >= 80) return tokens.accent;
  if (puntaje >= 60) return tokens.warning;
  return tokens.danger;
};

const getNivelColor = (nivel: string | null, tokens: ReturnType<typeof getThemeTokens>) => {
  if (!nivel) return tokens.textFaint;
  switch (nivel) {
    case 'destacado': return tokens.accent;
    case 'recomendado': return tokens.info;
    case 'promisorio': return tokens.warning;
    default: return tokens.danger;
  }
};

// ─── Componentes de estado ────────────────────────────────────────────────────

function LoadingState({ tokens }: { tokens: ReturnType<typeof getThemeTokens> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${tokens.border}`, borderTop: `3px solid ${tokens.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13, color: tokens.textFaint }}>Cargando sesiones…</span>
    </div>
  );
}

function ErrorState({ message, onRetry, tokens }: { message: string; onRetry: () => void; tokens: ReturnType<typeof getThemeTokens> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 14 }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 32, color: tokens.danger }} />
      <p style={{ margin: 0, fontSize: 14, color: tokens.textMuted, textAlign: "center" }}>
        No se pudieron cargar las sesiones
      </p>
      <p style={{ margin: 0, fontSize: 12, color: tokens.textFaint, fontFamily: "monospace" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${tokens.accent}44`, background: tokens.accentBg, color: tokens.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ─── Panel lateral de detalle ─────────────────────────────────────────────────

function DetailPanel({ sesion, onClose, tokens }: { sesion: Sesion; onClose: () => void; tokens: ReturnType<typeof getThemeTokens> }) {
  const es = getEstadoStyle(sesion.estado, tokens.accent === "#00c96b");
  const sColor = getScoreColor(sesion.puntaje_total, tokens);
  const nivelColor = getNivelColor(sesion.nivel_candidato, tokens);

  return (
    <div style={{
      width: 380, flexShrink: 0, background: tokens.surface,
      borderLeft: `1px solid ${tokens.border}`, padding: "1.25rem",
      display: "flex", flexDirection: "column", gap: 18,
      overflowY: "auto", height: "100%",
    }}>
      {/* Header panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>Detalle de sesión</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted, fontSize: 18 }}>✕</button>
      </div>

      {/* Indicador adaptativo */}
      {sesion.fue_adaptativa && (
        <div style={{ background: tokens.infoBg, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-robot" style={{ fontSize: 14, color: tokens.info }} />
            <span style={{ fontSize: 12, color: tokens.textMuted }}>Pregunta adaptativa generada por IA</span>
          </div>
        </div>
      )}

      {/* Estado + puntaje */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: es.bg, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`ti ${es.icon}`} style={{ fontSize: 16, color: es.c }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: es.c }}>{es.label}</span>
        </div>
        <div style={{ flex: 1, background: tokens.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: sColor, lineHeight: 1 }}>
            {sesion.puntaje_total != null ? Number(sesion.puntaje_total).toFixed(1) : "—"}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: tokens.textFaint }}>PUNTAJE</p>
        </div>
      </div>

      {/* Nivel candidato y aptitud */}
      {(sesion.nivel_candidato || sesion.apto_para_contratacion !== null) && (
        <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px" }}>
          {sesion.nivel_candidato && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sesion.apto_para_contratacion !== null ? 8 : 0 }}>
              <span style={{ fontSize: 11, color: tokens.textFaint }}>Nivel del candidato</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: nivelColor }}>
                {sesion.nivel_candidato.toUpperCase()}
              </span>
            </div>
          )}
          {sesion.apto_para_contratacion !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className={`ti ${sesion.apto_para_contratacion ? "ti-check" : "ti-x"}`} 
                 style={{ fontSize: 14, color: sesion.apto_para_contratacion ? tokens.accent : tokens.danger }} />
              <span style={{ fontSize: 12, color: sesion.apto_para_contratacion ? tokens.accent : tokens.danger }}>
                {sesion.apto_para_contratacion ? "Apto para contratación" : "No apto para contratación"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Resumen para reclutador */}
      {sesion.resumen_para_reclutador && (
        <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Resumen para reclutador</p>
          <p style={{ margin: 0, fontSize: 12, color: tokens.text, lineHeight: 1.5 }}>{sesion.resumen_para_reclutador}</p>
        </div>
      )}

      {/* Análisis de errores */}
      <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: tokens.textMuted }}>
          Análisis de errores
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: tokens.textFaint }}>Total errores</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>{sesion.errores_detectados_count}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: tokens.textFaint }}>Errores conceptuales</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: tokens.danger }}>{sesion.errores_conceptuales_count}</span>
        </div>
      </div>

      {/* Candidato */}
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
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tokens.text }}>{sesion.usuario_nombre}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 11, background: sesion.tecnologia_color + "22", color: sesion.tecnologia_color, padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{sesion.tecnologia}</span>
            <span style={{ fontSize: 11, background: tokens.surface2, color: tokens.textMuted, padding: "2px 8px", borderRadius: 99 }}>{sesion.nivel}</span>
          </div>
        </div>
      </div>

      {/* Pregunta */}
      <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 10, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Pregunta</p>
        <p style={{ margin: 0, fontSize: 12, color: tokens.text, lineHeight: 1.5 }}>{sesion.pregunta_titulo}</p>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Timeline</p>
        {[
          { label: "Inicio",   value: fmtDate(sesion.fecha_inicio),                             icon: "ti-player-play", color: tokens.accent },
          { label: "Fin",      value: sesion.fecha_fin ? fmtDate(sesion.fecha_fin) : "En curso", icon: "ti-player-stop", color: sesion.fecha_fin ? tokens.danger : tokens.warning },
          { label: "Duración", value: fmtDuration(sesion.duracion_segundos),                     icon: "ti-clock",       color: tokens.info },
          { label: "Límite",   value: fmtDuration(sesion.tiempo_limite_segundos),                icon: "ti-alarm",       color: tokens.textMuted },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: row.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${row.icon}`} style={{ fontSize: 13, color: row.color }} />
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: tokens.textMuted }}>{row.label}</span>
              <span style={{ fontSize: 12, color: tokens.text, fontWeight: 600 }}>{row.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Mensajes",  value: sesion.mensajes_count,          color: tokens.info },
          { label: "Envíos",    value: sesion.envios_count,            color: tokens.accent },
          {
            label: "Exit code",
            value: sesion.ultimo_exit_code ?? "—",
            color: sesion.ultimo_exit_code === 0 ? tokens.accent : sesion.ultimo_exit_code === null ? tokens.textFaint : tokens.danger,
          },
        ].map(m => (
          <div key={m.label} style={{ background: tokens.surface2, borderRadius: 9, padding: "10px 6px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: tokens.textFaint }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tiempo ejecución IDE (condicional) */}
      {sesion.tiempo_ejecucion_ms != null && (
        <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: tokens.textMuted }}>Tiempo ejecución IDE</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: tokens.text }}>{sesion.tiempo_ejecucion_ms} ms</span>
        </div>
      )}

      {/* Memoria usada (condicional) */}
      {sesion.memoria_usada_mb != null && (
        <div style={{ background: tokens.surface2, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: tokens.textMuted }}>Memoria usada</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: tokens.text }}>{sesion.memoria_usada_mb} MB</span>
        </div>
      )}

      {/* IP */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-network" style={{ fontSize: 14, color: tokens.textFaint }} />
        <span style={{ fontSize: 12, color: tokens.textFaint, fontFamily: "monospace" }}>{sesion.ip_usuario}</span>
      </div>

      {/* ID sesión */}
      <div style={{ background: tokens.surface2, borderRadius: 8, padding: "8px 12px" }}>
        <p style={{ margin: 0, fontSize: 10, color: tokens.textFaint }}>ID DE SESIÓN</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, fontFamily: "monospace", color: tokens.textMuted, wordBreak: "break-all" }}>{sesion.id}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);

  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sesion | null>(null);
  const [filterEstado, setFilterEstado] = useState<"todos" | EstadoSesion>("todos");
  const [filterTech, setFilterTech] = useState("todas");
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState(() => Date.now());

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSesiones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSesiones();
      setSesiones(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSesiones();
  }, [fetchSesiones, lastRefresh]);

  // Auto-refresh cada 30 seg si hay sesiones en_progreso
  useEffect(() => {
    const hayEnProgreso = sesiones.some(s => s.estado === "en_progreso");
    if (!hayEnProgreso) return;
    const interval = setInterval(() => setLastRefresh(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [sesiones]);

  // Sincronizar panel lateral cuando los datos se recargan
  useEffect(() => {
    if (!selected) return;
    const actualizado = sesiones.find(s => s.id === selected.id);
    if (actualizado) setSelected(actualizado);
  }, [sesiones]);

  // ── Derivados ──────────────────────────────────────────────────────────────

  const techs = useMemo(
    () => [...new Set(sesiones.map(s => s.tecnologia))].sort(),
    [sesiones]
  );

  const filtered = useMemo(() => {
    return sesiones.filter(s => {
      const q = search.toLowerCase();
      if (search && !s.usuario_nombre.toLowerCase().includes(q) && !s.tecnologia.toLowerCase().includes(q)) return false;
      if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
      if (filterTech !== "todas" && s.tecnologia !== filterTech) return false;
      return true;
    });
  }, [sesiones, search, filterEstado, filterTech]);

  const counts = useMemo(() => ({
    completada:     sesiones.filter(s => s.estado === "completada").length,
    en_progreso:    sesiones.filter(s => s.estado === "en_progreso").length,
    abandonada:     sesiones.filter(s => s.estado === "abandonada").length,
    tiempo_agotado: sesiones.filter(s => s.estado === "tiempo_agotado").length,
  }), [sesiones]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", height: "100%", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0, paddingRight: selected ? 20 : 0 }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>
                Sesiones de entrevista
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>
                Monitoreo en tiempo real de todas las entrevistas
              </p>
            </div>
            <button
              onClick={() => setLastRefresh(Date.now())}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9,
                border: `1px solid ${tokens.border}`, background: tokens.surface,
                color: loading ? tokens.textFaint : tokens.textMuted,
                fontSize: 12, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.12s",
              }}
            >
              <i className="ti ti-refresh" style={{ fontSize: 14, animation: loading ? "spin 0.8s linear infinite" : "none" }} />
              Actualizar
            </button>
          </div>

          {/* ── Pills de estado ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["todos", "en_progreso", "completada", "abandonada", "tiempo_agotado"] as const).map(key => {
              const estadoStyle = key === "todos" 
                ? { label: `Todas (${sesiones.length})`, bg: tokens.accentBg, c: tokens.accent }
                : getEstadoStyle(key, isDark);
              const active = filterEstado === key;
              return (
                <button key={key} onClick={() => setFilterEstado(key)}
                  style={{
                    padding: "6px 14px", borderRadius: 99,
                    border: `1px solid ${active ? (estadoStyle.c + "55") : tokens.border}`,
                    background: active ? estadoStyle.bg : "transparent",
                    color: active ? estadoStyle.c : tokens.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.12s",
                  }}
                >
                  {estadoStyle.label}
                </button>
              );
            })}
          </div>

          {/* ── Toolbar ── */}
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "0.85rem 1rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: tokens.textFaint }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar candidato o tecnología…"
                style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 9, padding: "7px 12px 7px 30px", fontSize: 13, color: tokens.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const }}
                onFocus={e => (e.target.style.borderColor = tokens.accent + "88")}
                onBlur={e  => (e.target.style.borderColor = tokens.inputBorder)}
              />
            </div>
            <select
              value={filterTech}
              onChange={e => setFilterTech(e.target.value)}
              style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: tokens.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
            >
              <option value="todas">Todas las tecnologías</option>
              {techs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: tokens.textFaint, marginLeft: "auto" }}>
              {filtered.length} sesiones
            </span>
          </div>

          {/* ── Tabla ── */}
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, overflow: "hidden", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: tokens.surface2 }}>
                  {["Candidato","Tecnología","Nivel","Pregunta","Estado","Duración","Puntaje","Inicio",""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${tokens.border}`, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9}><LoadingState tokens={tokens} /></td></tr>
                )}

                {!loading && error && (
                  <tr><td colSpan={9}><ErrorState message={error} onRetry={() => setLastRefresh(Date.now())} tokens={tokens} /></td></tr>
                )}

                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: tokens.textFaint }}>
                      {sesiones.length === 0 ? "No hay sesiones registradas todavía" : "Sin resultados para los filtros aplicados"}
                    </td>
                  </tr>
                )}

                {!loading && !error && filtered.map(s => {
                  const es = getEstadoStyle(s.estado, isDark);
                  const sc = getScoreColor(s.puntaje_total, tokens);
                  const isSelected = selected?.id === s.id;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(isSelected ? null : s)}
                      style={{ transition: "background 0.12s", cursor: "pointer", background: isSelected ? tokens.accentBg : "transparent" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = tokens.surfaceHover; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {/* Candidato */}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${tokens.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(s.usuario_initials) + "22", border: `1.5px solid ${avatarColor(s.usuario_initials)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: avatarColor(s.usuario_initials), flexShrink: 0 }}>
                            {s.usuario_initials}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: tokens.text, whiteSpace: "nowrap" }}>{s.usuario_nombre}</span>
                        </div>
                      </td>

                      {/* Tecnología */}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${tokens.border}` }}>
                        <span style={{ fontSize: 12, background: s.tecnologia_color + "20", color: s.tecnologia_color, padding: "3px 9px", borderRadius: 99, fontWeight: 600 }}>
                          {s.tecnologia}
                        </span>
                      </td>

                      {/* Nivel */}
                      <td style={{ padding: "11px 14px", fontSize: 12, color: tokens.textMuted, borderBottom: `1px solid ${tokens.border}` }}>
                        {s.nivel}
                      </td>

                      {/* Pregunta */}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${tokens.border}`, maxWidth: 200 }}>
                        <span style={{ fontSize: 12, color: tokens.textMuted, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.pregunta_titulo}
                        </span>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${tokens.border}` }}>
                        <span style={{ background: es.bg, color: es.c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {s.estado === "en_progreso" && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: es.c, animation: "pulse 1.5s infinite" }} />
                          )}
                          {es.label}
                        </span>
                      </td>

                      {/* Duración */}
                      <td style={{ padding: "11px 14px", fontSize: 13, color: tokens.text, borderBottom: `1px solid ${tokens.border}`, whiteSpace: "nowrap" }}>
                        {fmtDuration(s.duracion_segundos)}
                      </td>

                      {/* Puntaje */}
                      <td style={{ padding: "11px 14px", fontSize: 15, fontWeight: 700, color: sc, borderBottom: `1px solid ${tokens.border}` }}>
                        {s.puntaje_total != null ? Number(s.puntaje_total).toFixed(1) : "—"}
                      </td>

                      {/* Inicio */}
                      <td style={{ padding: "11px 14px", fontSize: 12, color: tokens.textFaint, borderBottom: `1px solid ${tokens.border}`, whiteSpace: "nowrap" }}>
                        {fmtDate(s.fecha_inicio)}
                      </td>

                      {/* Acción */}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${tokens.border}` }}>
                        <i className={`ti ${isSelected ? "ti-chevron-right" : "ti-eye"}`} style={{ fontSize: 15, color: isSelected ? tokens.accent : tokens.textFaint }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel lateral */}
        {selected && (
          <DetailPanel sesion={selected} onClose={() => setSelected(null)} tokens={tokens} />
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}