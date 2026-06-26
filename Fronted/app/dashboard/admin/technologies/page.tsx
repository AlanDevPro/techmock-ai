'use client';

/**
 * /app/(protected)/dashboard/admin/technologies/page.tsx
 *
 * Tecnologías — vista de solo lectura para el administrador.
 * Solo permite activar/desactivar tecnologías.
 * Filtrado para mostrar solo React, Vue y Next.js
 */

import { useEffect, useState, useCallback } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import { getTecnologias, toggleTecnologiaActivo, type Tecnologia } from "@/services/technologies.service";

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

// ─── Mapeo de Tecnologías a Iconos Reales ─────────────────────────────────────

// Solo iconos para React, Vue y Next.js
const TECH_ICONS: Record<string, string> = {
  React: "ti-brand-react",
  "React.js": "ti-brand-react",
  Vue: "ti-brand-vue",
  "Vue.js": "ti-brand-vue",
  "Next.js": "ti-brand-nextjs",
  Next: "ti-brand-nextjs",
};

// Colores oficiales de React, Vue y Next.js
const TECH_COLORS: Record<string, string> = {
  React: "#61DAFB",
  "React.js": "#61DAFB",
  Vue: "#4FC08D",
  "Vue.js": "#4FC08D",
  "Next.js": "#000000",
  Next: "#000000",
};

// Mapeo de Tipos de Tecnología a Iconos Genéricos (fallback)
const TIPO_ICONS: Record<string, string> = {
  Frontend: "ti-layout",
  Backend: "ti-server",
  Database: "ti-database",
  DevOps: "ti-brand-docker",
  Mobile: "ti-device-mobile",
  Cloud: "ti-cloud",
  IA: "ti-robot",
  "Data Science": "ti-robot",
};

const TIPO_COLORS: Record<string, string> = {
  Frontend: "#3b82f6", 
  Backend: "#00c96b", 
  Database: "#a855f7", 
  DevOps: "#f59e0b",
  Mobile: "#ec4899", 
  Cloud: "#14b8a6", 
  IA: "#8b5cf6",
  "Data Science": "#8b5cf6",
};

// ─── Función para obtener icono de tecnología ─────────────────────────────────

function getTechIcon(nombre: string): string {
  // Buscar coincidencia exacta
  if (TECH_ICONS[nombre]) return TECH_ICONS[nombre];
  
  // Buscar coincidencia parcial (case insensitive)
  const lowerName = nombre.toLowerCase();
  for (const [key, icon] of Object.entries(TECH_ICONS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return icon;
    }
  }
  
  // Fallback: icono genérico
  return "ti-cpu";
}

function getTechColor(nombre: string, tokens: ReturnType<typeof getThemeTokens>): string {
  if (TECH_COLORS[nombre]) return TECH_COLORS[nombre];
  
  const lowerName = nombre.toLowerCase();
  for (const [key, color] of Object.entries(TECH_COLORS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return color;
    }
  }
  
  return tokens.textMuted;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getScoreColor(score: number, tokens: ReturnType<typeof getThemeTokens>): string {
  if (score >= 70) return tokens.accent;
  if (score >= 50) return tokens.warning;
  return tokens.danger;
}

// ─── Skeleton card ───────────────────────────────────────────────────────────

const SkeletonCard = ({ tokens }: { tokens: ReturnType<typeof getThemeTokens> }) => (
  <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "1.25rem", overflow: "hidden" }}>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -400px 0 }
        100% { background-position: 400px 0 }
      }
      .sk {
        background: linear-gradient(90deg, ${tokens.border} 25%, rgba(128,128,128,0.04) 50%, ${tokens.border} 75%);
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
    </div>
  </div>
);

// ─── Error state ─────────────────────────────────────────────────────────────

const ErrorState = ({
  tokens, onRetry, retrying, attemptCount,
}: {
  tokens: ReturnType<typeof getThemeTokens>;
  onRetry: () => void;
  retrying: boolean;
  attemptCount: number;
}) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "60px 24px", gap: 0,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 20, position: "relative",
    }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 30, color: tokens.danger }} />
      <span style={{
        position: "absolute", top: -6, right: -6,
        width: 22, height: 22, borderRadius: 99,
        background: tokens.danger, color: "#fff",
        fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${tokens.bg}`,
      }}>{attemptCount}</span>
    </div>

    <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: tokens.text }}>
      No se pudieron cargar las tecnologías
    </h3>
    <p style={{ margin: "0 0 4px", fontSize: 13, color: tokens.textMuted, textAlign: "center", maxWidth: 340 }}>
      Hubo un problema al conectar con el servidor. Verifica tu conexión o que el backend esté disponible.
    </p>
    {attemptCount > 1 && (
      <p style={{ margin: "0 0 24px", fontSize: 11, color: tokens.textFaint }}>
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
          background: retrying ? "rgba(0,201,107,0.15)" : tokens.accent,
          color: retrying ? tokens.accent : "#fff",
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
          border: `1px solid ${tokens.border}`, background: "transparent",
          color: tokens.textMuted, fontSize: 13, fontWeight: 600,
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

const EmptyState = ({ tokens, hasFilters }: { tokens: ReturnType<typeof getThemeTokens>; hasFilters: boolean }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 24px", gap: 0,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: tokens.searchBg, border: `1.5px solid ${tokens.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
    }}>
      <i className={`ti ${hasFilters ? "ti-filter-off" : "ti-cpu"}`} style={{ fontSize: 28, color: tokens.textFaint }} />
    </div>
    <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: tokens.text }}>
      {hasFilters ? "Sin resultados" : "Sin tecnologías"}
    </h3>
    <p style={{ margin: 0, fontSize: 13, color: tokens.textMuted, textAlign: "center", maxWidth: 300 }}>
      {hasFilters
        ? "Ninguna tecnología coincide con los filtros aplicados."
        : "No hay tecnologías registradas."}
    </p>
  </div>
);

// ─── Modal de detalle ─────────────────────────────────────────────────────────

interface DetailModalProps {
  tech: Tecnologia;
  tokens: ReturnType<typeof getThemeTokens>;
  onClose: () => void;
}

function DetailModal({ tech, tokens, onClose }: DetailModalProps) {
  const techIcon = getTechIcon(tech.nombre);
  const techColor = getTechColor(tech.nombre, tokens);
  const tipoColor = TIPO_COLORS[tech.tipo] ?? tokens.textMuted;
  const tipoIcon = TIPO_ICONS[tech.tipo] ?? "ti-cpu";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 18, padding: "1.75rem", width: 480, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: 12, 
              background: techColor + "18", 
              border: `1.5px solid ${techColor}33`, 
              display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <i className={`ti ${techIcon}`} style={{ fontSize: 28, color: techColor }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>{tech.nombre}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: tokens.textMuted }}>{tech.slug}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Metadata */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: tokens.bg, borderRadius: 10, padding: "12px" }}>
            <span style={{ fontSize: 11, color: tokens.textFaint }}>Tipo</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <i className={`ti ${tipoIcon}`} style={{ fontSize: 14, color: tipoColor }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.text }}>{tech.tipo}</span>
            </div>
          </div>
          <div style={{ background: tokens.bg, borderRadius: 10, padding: "12px" }}>
            <span style={{ fontSize: 11, color: tokens.textFaint }}>Versión</span>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: tokens.text }}>v{tech.version_actual}</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: tokens.bg, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>{tech.total_sesiones}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: tokens.textFaint }}>Sesiones</p>
          </div>
          <div style={{ background: tokens.bg, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: getScoreColor(tech.promedio_puntaje, tokens) }}>{tech.promedio_puntaje}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: tokens.textFaint }}>Puntaje promedio</p>
          </div>
          <div style={{ background: tokens.bg, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>{tech.preguntas_activas}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: tokens.textFaint }}>Preguntas activas</p>
          </div>
        </div>

        {/* Info adicional */}
        <div style={{ background: tokens.bg, borderRadius: 10, padding: "12px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: tokens.textFaint }}>Fecha de creación</span>
            <span style={{ fontSize: 12, color: tokens.textMuted }}>{formatDate(tech.fecha_creacion)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: tokens.textFaint }}>Estado actual</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: tech.activo ? tokens.accent : tokens.danger }}>
              {tech.activo ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>

        {/* Nota informativa */}
        <div style={{ background: tokens.infoBg, borderRadius: 10, padding: "12px" }}>
          <p style={{ margin: 0, fontSize: 12, color: tokens.info, textAlign: "center" }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, marginRight: 6, verticalAlign: "middle" }} />
            Las tecnologías son predefinidas para el sistema de IA. Solo se puede cambiar su estado (activo/inactivo).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente ViewToggle ────────────────────────────────────────────────────

interface ViewToggleProps {
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  tokens: ReturnType<typeof getThemeTokens>;
}

function ViewToggle({ viewMode, setViewMode, tokens }: ViewToggleProps) {
  return (
    <div style={{ display: "flex", background: tokens.searchBg, border: `1px solid ${tokens.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
      {(["grid", "table"] as const).map(mode => (
        <button key={mode} onClick={() => setViewMode(mode)}
          style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === mode ? tokens.surface : "transparent", color: viewMode === mode ? tokens.text : tokens.textMuted, fontSize: 13, fontFamily: "inherit", transition: "all 0.15s" }}>
          <i className={`ti ${mode === "grid" ? "ti-layout-grid" : "ti-list"}`} style={{ fontSize: 15 }} />
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TechnologiesPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);

  const [search, setSearch] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [techs, setTechs] = useState<Tecnologia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [selectedTech, setSelectedTech] = useState<Tecnologia | null>(null);

  // Tecnologías permitidas (solo React, Vue, Next.js)
  const ALLOWED_TECHS = ['React', 'React.js', 'Vue', 'Vue.js', 'Next.js', 'Next'];

  const fetchData = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetrying(true);
      setError(false);
    } else {
      setLoading(true);
    }

    setAttemptCount(prev => prev + 1);

    try {
      const data = await getTecnologias();
      // Filtrar solo React, Vue y Next.js
      const filteredData = data.filter(tech => 
        ALLOWED_TECHS.some(allowed => 
          tech.nombre === allowed || 
          tech.nombre.includes(allowed) ||
          allowed.includes(tech.nombre)
        )
      );
      setTechs(filteredData);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    setTogglingId(id);
    setTechs(prev => prev.map(tech => tech.id === id ? { ...tech, activo: !currentActive } : tech));
    try {
      await toggleTecnologiaActivo(id, !currentActive);
    } catch (err) {
      setTechs(prev => prev.map(tech => tech.id === id ? { ...tech, activo: currentActive } : tech));
      console.error("Error al cambiar estado:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = techs.filter(tech => {
    const s = search.toLowerCase();
    const matchSearch = tech.nombre.toLowerCase().includes(s) || tech.tipo.toLowerCase().includes(s);
    const matchTipo = tipoFilter === "todos" || tech.tipo === tipoFilter;
    const matchStatus = statusFilter === "todos" || (statusFilter === "activo" ? tech.activo : !tech.activo);
    return matchSearch && matchTipo && matchStatus;
  });

  const tipos = ["todos", ...Array.from(new Set(techs.map(t => t.tipo)))];
  const hasFilters = search !== "" || tipoFilter !== "todos" || statusFilter !== "todos";

  const stats = {
    total: techs.length,
    activas: techs.filter(t => t.activo).length,
    inactivas: techs.filter(t => !t.activo).length,
    totalSesiones: techs.reduce((a, t) => a + t.total_sesiones, 0),
    promedioGeneral: techs.length ? Math.round(techs.reduce((a, t) => a + t.promedio_puntaje, 0) / techs.length) : 0,
  };

  const maxSessions = techs.length ? Math.max(...techs.map(t => t.total_sesiones), 1) : 1;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: tokens.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>
              Tecnologías Frontend
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>
              {loading ? "Cargando…" : error ? "No se pudo conectar" : `${stats.activas} activas · ${stats.inactivas} inactivas`}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: loading ? "—" : error ? "!" : stats.total, icon: "ti-cpu", color: tokens.info },
            { label: "Activas", value: loading ? "—" : error ? "!" : stats.activas, icon: "ti-circle-check", color: tokens.accent },
            { label: "Inactivas", value: loading ? "—" : error ? "!" : stats.inactivas, icon: "ti-circle-x", color: tokens.danger },
            { label: "Total sesiones", value: loading ? "—" : error ? "!" : stats.totalSesiones, icon: "ti-video", color: tokens.purple },
            { label: "Score promedio", value: loading ? "—" : error ? "!" : stats.promedioGeneral, icon: "ti-chart-bar", color: tokens.warning },
          ].map(s => (
            <div key={s.label} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.value === "!" ? tokens.danger : tokens.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters - only when not in error */}
        {!error && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: tokens.textFaint, pointerEvents: "none" }} />
              <input type="text" placeholder="Buscar tecnología..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: tokens.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
              style={{ background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: tokens.text, cursor: "pointer", fontFamily: "inherit" }}>
              {tipos.map(o => <option key={o} value={o}>{o === "todos" ? "Todos los tipos" : o}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: tokens.text, cursor: "pointer", fontFamily: "inherit" }}>
              {["todos", "activo", "inactivo"].map(o => <option key={o} value={o}>{o === "todos" ? "Todos los estados" : o === "activo" ? "Activas" : "Inactivas"}</option>)}
            </select>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} tokens={tokens} />
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} tokens={tokens} />)}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div style={{ background: tokens.surface, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ background: "rgba(239,68,68,0.08)", borderBottom: `1px solid rgba(239,68,68,0.15)`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: tokens.danger }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: tokens.danger }}>Error al cargar datos</span>
              {attemptCount > 1 && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: tokens.textFaint }}>
                  {attemptCount} intentos fallidos
                </span>
              )}
            </div>
            <ErrorState tokens={tokens} onRetry={() => fetchData(true)} retrying={retrying} attemptCount={attemptCount} />
          </div>
        )}

        {/* SUCCESS: GRID VIEW */}
        {!loading && !error && viewMode === "grid" && (
          filtered.length === 0
            ? <EmptyState tokens={tokens} hasFilters={hasFilters} />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
                {filtered.map(tech => {
                  const techIcon = getTechIcon(tech.nombre);
                  const techColor = getTechColor(tech.nombre, tokens);
                  const tipoColor = TIPO_COLORS[tech.tipo] ?? tokens.textMuted;
                  const isToggling = togglingId === tech.id;
                  
                  return (
                    <div key={tech.id}
                      style={{ 
                        background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "1.25rem", 
                        position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.15s", 
                        opacity: tech.activo ? 1 : 0.7, cursor: "pointer"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = techColor + "55"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = tokens.border; e.currentTarget.style.transform = "none"; }}
                      onClick={() => setSelectedTech(tech)}
                    >
                      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: techColor + "0d", borderRadius: "0 14px 0 60px" }} />
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div style={{ 
                          width: 44, height: 44, borderRadius: 12, 
                          background: techColor + "18", 
                          border: `1.5px solid ${techColor}33`, 
                          display: "flex", alignItems: "center", justifyContent: "center" 
                        }}>
                          <i className={`ti ${techIcon}`} style={{ fontSize: 24, color: techColor }} />
                        </div>
                        <span style={{ background: tech.activo ? tokens.accentBg : tokens.dangerBg, color: tech.activo ? tokens.accent : tokens.danger, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {tech.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: tokens.text }}>{tech.nombre}</div>
                        <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ background: tipoColor + "18", color: tipoColor, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>{tech.tipo}</span>
                          <span style={{ color: tokens.textFaint }}>v{tech.version_actual}</span>
                        </div>
                      </div>
                      
                      {/* Sessions bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: tokens.textMuted }}><strong style={{ color: tokens.text }}>{tech.total_sesiones}</strong> sesiones</span>
                          <span style={{ fontSize: 11, color: tokens.textMuted }}>prom <strong style={{ color: getScoreColor(tech.promedio_puntaje, tokens) }}>{tech.promedio_puntaje}</strong></span>
                        </div>
                        <div style={{ height: 4, background: tokens.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(tech.total_sesiones / maxSessions) * 100}%`, background: techColor, borderRadius: 99, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 7 }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedTech(tech); }}
                          style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${tokens.border}`, background: "transparent", color: tokens.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          <i className="ti ti-eye" style={{ fontSize: 12, marginRight: 4 }} />
                          Ver detalles
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(tech.id, tech.activo); }}
                          disabled={isToggling}
                          style={{ 
                            flex: 1, padding: "7px", borderRadius: 8, border: "none", 
                            background: tech.activo ? tokens.dangerBg : tokens.accentBg, 
                            color: tech.activo ? tokens.danger : tokens.accent, 
                            fontSize: 12, cursor: isToggling ? "not-allowed" : "pointer", 
                            fontFamily: "inherit", fontWeight: 600,
                            opacity: isToggling ? 0.6 : 1
                          }}
                        >
                          {isToggling ? <i className="ti ti-loader-2" style={{ fontSize: 12, animation: "spin 0.8s linear infinite" }} /> : (tech.activo ? "Desactivar" : "Activar")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        )}

        {/* SUCCESS: TABLE VIEW */}
        {!loading && !error && viewMode === "table" && (
          filtered.length === 0
            ? <EmptyState tokens={tokens} hasFilters={hasFilters} />
            : (
              <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, overflow: "hidden", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
                      {["Tecnología", "Tipo", "Versión", "Sesiones", "Score promedio", "Estado", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tech => {
                      const techIcon = getTechIcon(tech.nombre);
                      const techColor = getTechColor(tech.nombre, tokens);
                      const tipoColor = TIPO_COLORS[tech.tipo] ?? tokens.textMuted;
                      const isToggling = togglingId === tech.id;
                      
                      return (
                        <tr key={tech.id} style={{ borderBottom: `1px solid ${tokens.border}`, transition: "background 0.12s", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background = tokens.surfaceHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onClick={() => setSelectedTech(tech)}
                        >
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ 
                                width: 32, height: 32, borderRadius: 8, 
                                background: techColor + "18", 
                                display: "flex", alignItems: "center", justifyContent: "center" 
                              }}>
                                <i className={`ti ${techIcon}`} style={{ fontSize: 18, color: techColor }} />
                              </div>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>{tech.nombre}</span>
                                <span style={{ fontSize: 11, color: tokens.textFaint, marginLeft: 8 }}>({tech.slug})</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <span style={{ background: tipoColor + "18", color: tipoColor, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99 }}>{tech.tipo}</span>
                          </td>
                          <td style={{ padding: "13px 16px", color: tokens.textMuted, fontSize: 13 }}>v{tech.version_actual}</td>
                          <td style={{ padding: "13px 16px", fontSize: 13, color: tokens.text, fontWeight: 600 }}>{tech.total_sesiones}</td>
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ height: 4, width: 60, background: tokens.border, borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${tech.promedio_puntaje}%`, background: getScoreColor(tech.promedio_puntaje, tokens), borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(tech.promedio_puntaje, tokens) }}>{tech.promedio_puntaje}</span>
                            </div>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleToggleActive(tech.id, tech.activo); }}
                              disabled={isToggling}
                              style={{ 
                                display: "flex", alignItems: "center", gap: 5, 
                                background: tech.activo ? tokens.accentBg : tokens.dangerBg, 
                                border: "none", borderRadius: 99, padding: "4px 10px", 
                                cursor: isToggling ? "not-allowed" : "pointer", 
                                color: tech.activo ? tokens.accent : tokens.danger, 
                                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                                opacity: isToggling ? 0.6 : 1
                              }}
                            >
                              {isToggling ? <i className="ti ti-loader-2" style={{ fontSize: 10, animation: "spin 0.8s linear infinite" }} /> : <i className={`ti ${tech.activo ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: 11 }} />}
                              {tech.activo ? "Activo" : "Inactivo"}
                            </button>
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedTech(tech); }}
                              title="Ver detalles"
                              style={{ background: "none", border: `1px solid ${tokens.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: tokens.accent, fontSize: 13 }}
                            >
                              <i className="ti ti-eye" style={{ fontSize: 14 }} />
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
      </div>

      {/* Modal de detalle */}
      {selectedTech && (
        <DetailModal
          tech={selectedTech}
          tokens={tokens}
          onClose={() => setSelectedTech(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}