'use client';

/**
 * /app/(protected)/dashboard/admin/users/page.tsx
 *
 * Gestión de developers del panel admin.
 * Muestra información del perfil técnico desde perfil_tecnico_usuario
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";

import {
  type Rol,
  type Usuario,
  getUsuarios,
  createUsuario,
  updateUsuario,
  toggleUsuarioActivo,
} from "@/services/developers.service";

// ─── Tema basado en ThemeProvider ─────────────────────────────────────────────

const getThemeTokens = (isDark: boolean) => ({
  bg: isDark ? "#111214" : "#f0f2f5",
  surface: isDark ? "#1a1c20" : "#ffffff",
  surfaceHover: isDark ? "#22252b" : "#f8f9fb",
  surface2: isDark ? "#20232a" : "#f8f9fb",
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
  inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  inputBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
});

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#00c96b","#3b82f6","#a855f7","#f59e0b",
  "#ec4899","#14b8a6","#f97316","#8b5cf6",
];

const initials = (u: Usuario) =>
  `${u.nombre?.[0] ?? ""}${u.apellido?.[0] ?? ""}`.toUpperCase();

const avatarColor = (id: string) =>
  AVATAR_PALETTE[id.charCodeAt(1) % AVATAR_PALETTE.length];

const getNivelStyle = (nivel: string | null | undefined, isDark: boolean) => {
  const styles: Record<string, { bg: string; c: string; label: string }> = {
    destacado:   { bg: isDark ? "rgba(0,201,107,0.12)" : "rgba(0,168,85,0.08)", c: isDark ? "#00c96b" : "#00a855", label: "Destacado" },
    recomendado: { bg: isDark ? "rgba(59,130,246,0.12)" : "rgba(37,99,235,0.08)", c: "#60a5fa", label: "Recomendado" },
    promisorio:  { bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(217,119,6,0.08)", c: "#fbbf24", label: "Promisorio" },
    revisar:     { bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)", c: "#f87171", label: "Revisar" },
    descartado:  { bg: isDark ? "rgba(128,128,128,0.12)" : "rgba(128,128,128,0.08)", c: "#a0a0a0", label: "Descartado" },
    unknown:     { bg: isDark ? "rgba(128,128,128,0.12)" : "rgba(128,128,128,0.08)", c: "#a0a0a0", label: "Sin evaluar" },
  };
  if (!nivel) return styles.unknown;
  return styles[nivel] ?? styles.unknown;
};

const PROVIDER_ICON: Record<string, string> = {
  password: "ti-lock",
  google:   "ti-brand-google",
  github:   "ti-brand-github",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtRelative(iso: string | null | undefined) {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Badge({ children, bg, c }: { children: React.ReactNode; bg: string; c: string }) {
  return (
    <span style={{
      background: bg, color: c, fontSize: 11, fontWeight: 600,
      padding: "3px 9px", borderRadius: 99, letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Avatar({ u, size = 34 }: { u: Usuario; size?: number }) {
  const color = avatarColor(u.id);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials(u)}
    </div>
  );
}

// ─── Modal detalle / edición ──────────────────────────────────────────────────

interface UserModalProps {
  user:    Usuario;
  onClose: () => void;
  onSave:  (u: Usuario) => void;
  isDark:  boolean;
}

function UserModal({ user, onClose, onSave, isDark }: UserModalProps) {
  const t = getThemeTokens(isDark);
  const [draft, setDraft] = useState<Usuario>({ ...user });
  const [saving, setSaving] = useState(false);

  const update = (k: keyof Usuario, v: unknown) =>
    setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const isNew = !user.nombre && !user.apellido;

      const saved = isNew
        ? await createUsuario(draft)
        : await updateUsuario(draft.id, draft);

      onSave(saved);
      onClose();
    } catch (err) {
      console.error("Error guardando usuario:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatPuntaje = (puntaje: number | null | undefined): string => {
    if (puntaje == null) return "—";
    return puntaje.toFixed(1);
  };

  const inputStyle = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 9, padding: "8px 12px", fontSize: 13, color: t.text,
    outline: "none", width: "100%", fontFamily: "inherit",
    boxSizing: "border-box" as const, transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: t.textMuted,
    textTransform: "uppercase" as const, letterSpacing: "0.07em",
    marginBottom: 5, display: "block",
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16,
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        padding: "1.5rem", display: "flex", flexDirection: "column", gap: 20,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar u={draft} size={44} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>
                {draft.nombre || "Nuevo"} {draft.apellido || "developer"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>{draft.email || "—"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 20, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Stats rápidos del perfil técnico */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Sesiones",     value: draft.total_sesiones ?? 0, color: t.info },
            { label: "Score Global", value: formatPuntaje(draft.score_global), color: t.accent },
            { label: "Consistencia", value: draft.consistencia != null ? `${draft.consistencia}%` : "—", color: t.warning },
          ].map(s => (
            <div key={s.label} style={{ background: t.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={draft.nombre} onChange={e => update("nombre", e.target.value)}
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>Apellido</label>
            <input style={inputStyle} value={draft.apellido} onChange={e => update("apellido", e.target.value)}
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={draft.email} onChange={e => update("email", e.target.value)}
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={inputStyle} value={draft.telefono ?? ""} onChange={e => update("telefono", e.target.value || null)}
              placeholder="+591 7…"
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>GitHub URL</label>
            <input style={inputStyle} value={draft.github_url ?? ""} onChange={e => update("github_url", e.target.value || null)}
              placeholder="https://github.com/…"
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input style={inputStyle} value={draft.linkedin_url ?? ""} onChange={e => update("linkedin_url", e.target.value || null)}
              placeholder="https://linkedin.com/in/…"
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e  => e.target.style.borderColor = t.inputBorder} />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 20 }}>
          {([
            { key: "activo" as const, label: "Cuenta activa" },
            { key: "email_verificado" as const, label: "Email verificado" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => update(key, !draft[key])}
              style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0, color: t.text, fontSize: 13, fontWeight: 500 }}
            >
              <div style={{ width: 38, height: 22, borderRadius: 99, background: draft[key] ? t.accent : t.inputBorder, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: draft[key] ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </div>
              {label}
            </button>
          ))}
        </div>

        {/* Scores por pilar */}
        <div style={{ background: t.surface2, borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>Puntajes por habilidad</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "JavaScript", value: draft.score_javascript },
              { label: "Arquitectura", value: draft.score_arquitectura },
              { label: "Buenas prácticas", value: draft.score_buenas_practicas },
              { label: "Comunicación", value: draft.score_comunicacion },
              { label: "Resolución", value: draft.score_resolucion },
            ].map(skill => (
              <div key={skill.label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: t.textFaint }}>{skill.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: skill.value && skill.value >= 80 ? t.accent : skill.value && skill.value >= 60 ? t.warning : t.textMuted }}>
                  {skill.value != null ? skill.value.toFixed(1) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata de solo lectura */}
        <div style={{ background: t.surface2, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "ID", value: draft.id },
            { label: "Proveedor auth", value: draft.provider },
            { label: "Miembro desde", value: fmtDate(draft.fecha_creacion) },
            { label: "Último acceso", value: fmtDate(draft.ultimo_login) },
            { label: "Mejor tecnología", value: draft.mejor_tecnologia ?? "—" },
            { label: "Tecnología a mejorar", value: draft.peor_tecnologia ?? "—" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: t.textFaint }}>{row.label}</span>
              <span style={{ color: t.textMuted, fontFamily: row.label === "ID" ? "monospace" : "inherit", fontSize: row.label === "ID" ? 11 : 12 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ background: "none", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 9, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 9, padding: "8px 22px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", opacity: saving ? 0.7 : 1, transition: "opacity 0.15s" }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Filter = "todos" | "activos" | "inactivos" | "aptos" | "no_aptos";

const EMPTY_USER: Usuario = {
  id:               crypto.randomUUID(),
  nombre:           "",
  apellido:         "",
  email:            "",
  rol:              "developer",
  avatar_url:       null,
  github_url:       null,
  linkedin_url:     null,
  telefono:         null,
  activo:           true,
  email_verificado: false,
  fecha_creacion:   new Date().toISOString(),
  ultimo_login:     null,
  provider:         "password",
  total_entrevistas: 0,
  puntaje_promedio:  null,
  score_global:     null,
  score_javascript: null,
  score_arquitectura: null,
  score_buenas_practicas: null,
  score_comunicacion: null,
  score_resolucion: null,
  consistencia:     null,
  tendencia:        null,
  nivel_actual:     null,
  total_sesiones:   0,
  sesiones_completadas: 0,
  mejor_tecnologia: null,
  peor_tecnologia:  null,
  ultimo_feedback:  null,
  ultimo_resumen_reclutador: null,
  apto_para_contratacion: null,
  ultima_evaluacion_fecha: null,
};

const formatPuntaje = (puntaje: number | null | undefined): string => {
  if (puntaje == null) return "—";
  return puntaje.toFixed(1);
};

const getPuntajeColor = (puntaje: number | null | undefined, isDark: boolean): string => {
  const tokens = getThemeTokens(isDark);
  if (puntaje == null) return tokens.textFaint;
  if (puntaje >= 80) return tokens.accent;
  if (puntaje >= 60) return tokens.warning;
  return tokens.danger;
};

export default function UsersPage() {
  const { isDark } = useThemeContext();
  const t = getThemeTokens(isDark);

  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sortBy, setSortBy] = useState<"score" | "nombre" | "sesiones">("score");
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [showNew, setShowNew] = useState(false);

  const isInitialMount = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ✅ SOLUCIÓN: Debounce manual para evitar múltiples re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Establecer nuevo timer
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300); // 300ms de espera
  }, []);

  // Cleanup del timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Carga inicial con mejor manejo de errores
  useEffect(() => {
    const load = async () => {
      // Solo cargar en el montaje inicial
      if (!isInitialMount.current) return;
      isInitialMount.current = false;

      try {
        setError(null);
        setLoading(true);
        
        const data = await getUsuarios();
        
        // Filtrar solo developers y normalizar datos
        const developers = data
          .filter(u => u.rol === "developer")
          .map(u => ({
            ...u,
            score_global: u.score_global != null ? Number(u.score_global) : null,
            total_sesiones: u.total_sesiones != null ? Number(u.total_sesiones) : 0,
          }));
        setUsers(developers);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
        
        // Mensaje más amigable para el usuario
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        if (errorMessage.includes('Demasiadas solicitudes') || errorMessage.includes('rate limit')) {
          setError('El sistema está procesando muchas solicitudes. Por favor, espera un momento y vuelve a intentar.');
        } else {
          setError('Error al cargar los usuarios. Por favor, intenta de nuevo.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, []);

  const handleSave = (updated: Usuario) =>
    setUsers(prev =>
      prev.some(u => u.id === updated.id)
        ? prev.map(u => u.id === updated.id ? updated : u)
        : [updated, ...prev]
    );

  const handleToggleActive = async (u: Usuario) => {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x));
    try {
      await toggleUsuarioActivo(u.id, !u.activo);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, activo: u.activo } : x));
    }
  };

  // Lista filtrada y ordenada - usando debouncedSearch
  const filtered = useMemo(() => {
    let res = [...users];

    // ✅ CORREGIDO: Manejo seguro de valores null con nullish coalescing
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim();
      res = res.filter(u =>
        (u.nombre ?? "").toLowerCase().includes(q) ||
        (u.apellido ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    }

    if (filter === "activos") res = res.filter(u => u.activo);
    else if (filter === "inactivos") res = res.filter(u => !u.activo);
    else if (filter === "aptos") res = res.filter(u => u.apto_para_contratacion === true);
    else if (filter === "no_aptos") res = res.filter(u => u.apto_para_contratacion === false);

    res.sort((a, b) => {
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre);
      if (sortBy === "sesiones") return (b.total_sesiones ?? 0) - (a.total_sesiones ?? 0);
      return (b.score_global ?? 0) - (a.score_global ?? 0);
    });

    return res;
  }, [users, debouncedSearch, filter, sortBy]);

  const totalActivos = users.filter(u => u.activo).length;
  const totalInactivos = users.filter(u => !u.activo).length;
  const totalAptos = users.filter(u => u.apto_para_contratacion === true).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "activos", label: "Activos" },
    { key: "inactivos", label: "Inactivos" },
    { key: "aptos", label: "Aptos" },
    { key: "no_aptos", label: "No aptos" },
  ];

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>Developers</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>Perfil técnico y evaluación de candidatos</p>
          </div>
        </div>

        {/* ✅ ERROR UI - Mejor manejo de errores */}
        {error && (
          <div style={{
            background: t.dangerBg,
            color: t.danger,
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            border: `1px solid ${t.danger}44`,
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 18 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: t.danger,
                cursor: 'pointer',
                fontSize: 16,
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Total developers", value: users.length, accent: t.accent, icon: "ti-users" },
            { label: "Cuentas activas", value: totalActivos, accent: t.info, icon: "ti-circle-check" },
            { label: "Cuentas inactivas", value: totalInactivos, accent: t.danger, icon: "ti-circle-x" },
            { label: "Aptos para contratar", value: totalAptos, accent: "#a855f7", icon: "ti-star" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1rem 1.1rem", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: kpi.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${kpi.icon}`} style={{ fontSize: 18, color: kpi.accent }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text, lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: t.textMuted }}>{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>

          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textFaint }} />
            <input
              value={search}
              onChange={handleSearchChange} // ✅ Usa el handler con debounce
              placeholder="Buscar por nombre o email…"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 9, padding: "8px 12px 8px 32px", fontSize: 13, color: t.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = t.accent + "88"}
              onBlur={e => e.target.style.borderColor = t.inputBorder}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${filter === f.key ? t.accent + "66" : t.border}`, background: filter === f.key ? t.accentBg : "transparent", color: filter === f.key ? t.accent : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: t.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="score">Mayor score global</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="sesiones">Más sesiones</option>
          </select>

          <span style={{ fontSize: 12, color: t.textFaint, marginLeft: "auto" }}>
            {filtered.length} developer{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabla */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: t.surface2 }}>
                {["Developer","Nivel","Score","Sesiones","Consistencia","Estado","Última evaluación",""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: t.textFaint, fontSize: 14 }}>
                    Cargando developers…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: t.textFaint, fontSize: 14 }}>
                    No se encontraron developers
                  </td>
                </tr>
              )}
              {filtered.map(u => {
                const nivelStyle = getNivelStyle(u.nivel_actual, isDark);
                return (
                  <tr
                    key={u.id}
                    style={{ transition: "background 0.12s", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    {/* Developer */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ position: "relative" }}>
                          <Avatar u={u} size={34} />
                          {u.email_verificado && (
                            <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: t.accent, border: `1.5px solid ${t.surface}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="ti ti-check" style={{ fontSize: 7, color: "#fff" }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.text }}>{u.nombre} {u.apellido}</p>
                          <p style={{ margin: 0, fontSize: 11, color: t.textFaint }}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Nivel */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <Badge bg={nivelStyle.bg} c={nivelStyle.c}>{nivelStyle.label}</Badge>
                    </td>

                    {/* Score Global */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: getPuntajeColor(u.score_global, isDark) }}>
                        {formatPuntaje(u.score_global)}
                      </span>
                    </td>

                    {/* Sesiones completadas */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 14, fontWeight: 700, color: t.text }}>
                      {u.sesiones_completadas ?? 0}
                    </td>

                    {/* Consistencia */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: 13, color: u.consistencia && u.consistencia >= 70 ? t.accent : u.consistencia && u.consistencia >= 50 ? t.warning : t.textFaint }}>
                        {u.consistencia != null ? `${u.consistencia}%` : "—"}
                      </span>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.activo ? "Clic para desactivar" : "Clic para activar"}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: u.activo ? t.accentBg : t.dangerBg, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.activo ? t.accent : t.danger }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: u.activo ? t.accent : t.danger }}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </button>
                    </td>

                    {/* Última evaluación */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.textFaint, whiteSpace: "nowrap" }}>
                      {fmtRelative(u.ultima_evaluacion_fecha)}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setSelected(u)} title="Ver perfil completo"
                          style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: "5px", borderRadius: 6, transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.accentBg; (e.currentTarget as HTMLElement).style.color = t.accent; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 15 }} />
                        </button>
                        {u.github_url && (
                          <a href={u.github_url} target="_blank" rel="noreferrer" title="Ver GitHub"
                            style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: "5px", borderRadius: 6, display: "flex", alignItems: "center", textDecoration: "none", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = t.text; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                          >
                            <i className="ti ti-brand-github" style={{ fontSize: 15 }} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar */}
      {selected && (
        <UserModal
          user={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          isDark={isDark}
        />
      )}

      {/* Modal nuevo */}
      {showNew && (
        <UserModal
          user={{ ...EMPTY_USER, id: crypto.randomUUID() }}
          onClose={() => setShowNew(false)}
          onSave={handleSave}
          isDark={isDark}
        />
      )}
    </>
  );
}