'use client';

/**
 * /app/(protected)/dashboard/admin/users/page.tsx
 *
 * Gestión de usuarios del panel admin.
 * Mapea directamente la tabla `usuarios` + `auth_providers` de tu schema.
 *
 * Datos mock → reemplaza los fetch() comentados con tus endpoints reales.
 */

import { useState, useMemo, useEffect } from "react";

// ─── Tipos (coinciden con tu tabla `usuarios` + join con auth_providers) ────

type Rol = "admin" | "developer" | "recruiter";

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  telefono: string | null;
  activo: boolean;
  email_verificado: boolean;
  fecha_creacion: string;      // ISO string
  ultimo_login: string | null; // ISO string
  provider: "password" | "google" | "github"; // de auth_providers
  // stats join (de estadisticas_usuario)
  total_entrevistas?: number;
  puntaje_promedio?: number | null;
}

// ─── Mock data (reemplaza con: const { data } = await fetch("/api/admin/users")) ─

const MOCK_USERS: Usuario[] = [
  { id: "u1", nombre: "Ana",    apellido: "Martínez",  email: "ana@dev.io",     rol: "developer",  avatar_url: null, github_url: "https://github.com/ana",    linkedin_url: null, telefono: "+591 71234567", activo: true,  email_verificado: true,  fecha_creacion: "2024-11-10T09:00:00Z", ultimo_login: "2025-05-09T14:22:00Z", provider: "github",   total_entrevistas: 12, puntaje_promedio: 82.4 },
  { id: "u2", nombre: "Carlos", apellido: "López",     email: "carlos@dev.io",  rol: "developer",  avatar_url: null, github_url: null,                         linkedin_url: "https://linkedin.com/in/carlos", telefono: null, activo: true, email_verificado: false, fecha_creacion: "2024-12-03T11:30:00Z", ultimo_login: "2025-05-08T09:10:00Z", provider: "password", total_entrevistas: 7,  puntaje_promedio: 64.1 },
  { id: "u3", nombre: "María",  apellido: "Torres",    email: "maria@dev.io",   rol: "developer",  avatar_url: null, github_url: "https://github.com/maria",  linkedin_url: "https://linkedin.com/in/maria", telefono: "+591 79876543", activo: true, email_verificado: true, fecha_creacion: "2025-01-15T08:00:00Z", ultimo_login: "2025-05-07T16:45:00Z", provider: "google",   total_entrevistas: 5,  puntaje_promedio: 71.0 },
  { id: "u4", nombre: "Diego",  apellido: "Ruiz",      email: "diego@dev.io",   rol: "developer",  avatar_url: null, github_url: "https://github.com/diego",  linkedin_url: null, telefono: null, activo: true, email_verificado: true, fecha_creacion: "2025-02-20T10:00:00Z", ultimo_login: "2025-05-09T11:00:00Z", provider: "github",   total_entrevistas: 18, puntaje_promedio: 89.7 },
  { id: "u5", nombre: "Sofía",  apellido: "Vega",      email: "sofia@dev.io",   rol: "developer",  avatar_url: null, github_url: null,                         linkedin_url: null, telefono: "+591 76543210", activo: false, email_verificado: true, fecha_creacion: "2025-03-01T07:30:00Z", ultimo_login: "2025-04-10T09:20:00Z", provider: "password", total_entrevistas: 3,  puntaje_promedio: null },
  { id: "u6", nombre: "Tomás",  apellido: "Bravo",     email: "tomas@dev.io",   rol: "developer",  avatar_url: null, github_url: "https://github.com/tomas",  linkedin_url: "https://linkedin.com/in/tomas", telefono: null, activo: true, email_verificado: false, fecha_creacion: "2025-03-15T13:00:00Z", ultimo_login: "2025-05-06T18:00:00Z", provider: "google",   total_entrevistas: 9,  puntaje_promedio: 77.3 },
  { id: "u7", nombre: "Laura",  apellido: "Sánchez",   email: "laura@hr.io",    rol: "recruiter",  avatar_url: null, github_url: null,                         linkedin_url: "https://linkedin.com/in/laura", telefono: "+591 70000001", activo: true, email_verificado: true, fecha_creacion: "2024-10-01T08:00:00Z", ultimo_login: "2025-05-09T09:00:00Z", provider: "password", total_entrevistas: 0, puntaje_promedio: null },
  { id: "u8", nombre: "Admin",  apellido: "Principal", email: "admin@dev.io",   rol: "admin",      avatar_url: null, github_url: null,                         linkedin_url: null, telefono: null, activo: true, email_verificado: true, fecha_creacion: "2024-09-01T00:00:00Z", ultimo_login: "2025-05-10T08:00:00Z", provider: "password", total_entrevistas: 0, puntaje_promedio: null },
];

// ─── Tema (reutiliza el mismo de tu AdminDashboard) ──────────────────────────

const C = {
  bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
  border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
  accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
  danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)",
  warning: "#f59e0b", warningBg: "rgba(245,158,11,0.1)",
  info: "#3b82f6",
  surface2: "#20232a",
  inputBg: "rgba(255,255,255,0.05)", inputBorder: "rgba(255,255,255,0.12)",
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ["#00c96b","#3b82f6","#a855f7","#f59e0b","#ec4899","#14b8a6","#f97316","#8b5cf6"];
const initials = (u: Usuario) => {
  const nombre = u.nombre?.[0] ?? "";
  const apellido = u.apellido?.[0] ?? "";

  return `${nombre}${apellido}`.toUpperCase();
};
const avatarColor = (id: string) => AVATAR_PALETTE[id.charCodeAt(1) % AVATAR_PALETTE.length];

const ROL_STYLES: Record<Rol, { bg: string; c: string; label: string }> = {
  admin:     { bg: "rgba(239,68,68,0.12)",    c: "#f87171", label: "Admin" },
  developer: { bg: "rgba(59,130,246,0.12)",   c: "#60a5fa", label: "Developer" },
  recruiter: { bg: "rgba(245,158,11,0.12)",   c: "#fbbf24", label: "Recruiter" },
};

const PROVIDER_ICON: Record<string, string> = {
  password: "ti-lock",
  google:   "ti-brand-google",
  github:   "ti-brand-github",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRelative(iso: string | null) {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return "ahora";
  if (mins < 60)  return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

function Badge({ children, bg, c }: { children: React.ReactNode; bg: string; c: string }) {
  return <span style={{ background: bg, color: c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{children}</span>;
}

function Avatar({ u, size = 34 }: { u: Usuario; size?: number }) {
  const color = avatarColor(u.id);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "22", border: `1.5px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, color, flexShrink: 0 }}>
      {initials(u)}
    </div>
  );
}

// ─── Modal de detalle / edición ───────────────────────────────────────────────

function UserModal({ user, onClose, onSave }: { user: Usuario; onClose: () => void; onSave: (u: Usuario) => void }) {
  const [draft, setDraft] = useState<Usuario>({ ...user });
  const update = (k: keyof Usuario, v: unknown) => setDraft(d => ({ ...d, [k]: v }));

  const inputStyle = {
    background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "8px 12px",
    fontSize: 13, color: C.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 5, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar u={draft} size={44} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{draft.nombre} {draft.apellido}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{draft.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Stats rápidos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Entrevistas", value: draft.total_entrevistas ?? 0, color: C.info },
            { label: "Puntaje avg",  value: draft.puntaje_promedio != null ? draft.puntaje_promedio.toFixed(1) : "—", color: C.accent },
            { label: "Último login", value: fmtRelative(draft.ultimo_login), color: C.warning },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={draft.nombre} onChange={e => update("nombre", e.target.value)} onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>Apellido</label>
            <input style={inputStyle} value={draft.apellido} onChange={e => update("apellido", e.target.value)} onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={draft.email} onChange={e => update("email", e.target.value)} onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={inputStyle} value={draft.telefono ?? ""} onChange={e => update("telefono", e.target.value || null)} placeholder="+591 7..." onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>Rol</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={draft.rol} onChange={e => update("rol", e.target.value as Rol)}>
              <option value="developer">Developer</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>GitHub URL</label>
            <input style={inputStyle} value={draft.github_url ?? ""} onChange={e => update("github_url", e.target.value || null)} placeholder="https://github.com/..." onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input style={inputStyle} value={draft.linkedin_url ?? ""} onChange={e => update("linkedin_url", e.target.value || null)} placeholder="https://linkedin.com/in/..." onFocus={e => e.target.style.borderColor = C.accent + "88"} onBlur={e => e.target.style.borderColor = C.inputBorder} />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { key: "activo" as const,            label: "Cuenta activa" },
            { key: "email_verificado" as const,  label: "Email verificado" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => update(key, !draft[key])}
              style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0, color: C.text, fontSize: 13, fontWeight: 500 }}
            >
              <div style={{ width: 38, height: 22, borderRadius: 99, background: draft[key] ? C.accent : C.inputBorder, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: draft[key] ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </div>
              {label}
            </button>
          ))}
        </div>

        {/* Metadata de solo lectura */}
        <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "ID",               value: draft.id },
            { label: "Proveedor auth",   value: draft.provider },
            { label: "Miembro desde",    value: fmtDate(draft.fecha_creacion) },
            { label: "Último acceso",    value: fmtDate(draft.ultimo_login) },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textFaint }}>{row.label}</span>
              <span style={{ color: C.textMuted, fontFamily: row.label === "ID" ? "monospace" : "inherit", fontSize: row.label === "ID" ? 11 : 12 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 9, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={() => { onSave(draft); onClose(); }}
            style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 9, padding: "8px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Filter = "todos" | Rol | "inactivo" | "no_verificado";

export default function UsersPage() {
  //const [users, setUsers]         = useState<Usuario[]>(MOCK_USERS);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<Filter>("todos");
  const [sortBy, setSortBy]       = useState<"fecha" | "nombre" | "puntaje">("fecha");
  const [selected, setSelected]   = useState<Usuario | null>(null);
  const [showNew, setShowNew]     = useState(false);

  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const response = await fetch(
          "http://localhost:4000/api/v1/admin/usuarios",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Si el token expiró o no existe
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();

        console.log("Usuarios recibidos:", result);

        // Tu backend responde:
        // { success: true, data: [...] }

        if (result.success) {
          setUsers(result.data);
        }

      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    };

    fetchUsers();
  }, []);



  const filtered = useMemo(() => {
    let res = [...users];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (filter === "inactivo")     res = res.filter(u => !u.activo);
    else if (filter === "no_verificado") res = res.filter(u => !u.email_verificado);
    else if (filter !== "todos")   res = res.filter(u => u.rol === filter);

    res.sort((a, b) => {
      if (sortBy === "nombre")  return a.nombre.localeCompare(b.nombre);
      if (sortBy === "puntaje") return (b.puntaje_promedio ?? -1) - (a.puntaje_promedio ?? -1);
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });
    return res;
  }, [users, search, filter, sortBy]);

  const handleSave = (updated: Usuario) =>
    setUsers(us => us.map(u => u.id === updated.id ? updated : u));

  const handleToggleActive = (id: string) =>
    setUsers(us => us.map(u => u.id === id ? { ...u, activo: !u.activo } : u));

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "todos",         label: "Todos" },
    { key: "developer",     label: "Developers" },
    { key: "recruiter",     label: "Recruiters" },
    { key: "admin",         label: "Admins" },
    { key: "inactivo",      label: "Inactivos" },
    { key: "no_verificado", label: "Sin verificar" },
  ];

  const totalActive    = users.filter(u => u.activo).length;
  const totalInactive  = users.filter(u => !u.activo).length;
  const totalDevs      = users.filter(u => u.rol === "developer").length;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Usuarios</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Gestiona cuentas, roles y permisos de la plataforma</p>
          </div>
          <button onClick={() => setShowNew(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            <i className="ti ti-user-plus" style={{ fontSize: 16 }} />
            Nuevo usuario
          </button>
        </div>

        {/* ── KPI cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Total usuarios",   value: users.length,  accent: C.accent, icon: "ti-users" },
            { label: "Activos",          value: totalActive,   accent: C.info,   icon: "ti-circle-check" },
            { label: "Inactivos",        value: totalInactive, accent: C.danger, icon: "ti-circle-x" },
            { label: "Developers",       value: totalDevs,     accent: "#a855f7", icon: "ti-code" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: kpi.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${kpi.icon}`} style={{ fontSize: 18, color: kpi.accent }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted }}>{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>

          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textFaint }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email…"
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "8px 12px 8px 32px", fontSize: 13, color: C.text, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = C.accent + "88"}
              onBlur={e  => e.target.style.borderColor = C.inputBorder}
            />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${filter === f.key ? C.accent + "66" : C.border}`, background: filter === f.key ? C.accentBg : "transparent", color: filter === f.key ? C.accent : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
              >{f.label}</button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="fecha">Más recientes</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="puntaje">Mayor puntaje</option>
          </select>

          <span style={{ fontSize: 12, color: C.textFaint, marginLeft: "auto" }}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── Tabla ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surface2 }}>
                {["Usuario", "Rol", "Auth", "Entrevistas", "Puntaje avg", "Estado", "Último acceso", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: C.textFaint, fontSize: 14 }}>No se encontraron usuarios</td>
                </tr>
              )}
              {filtered.map(u => {
                const rol = ROL_STYLES[u.rol];
                return (
                  <tr key={u.id} style={{ transition: "background 0.12s", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.surfaceHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    {/* Usuario */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ position: "relative" }}>
                          <Avatar u={u} size={34} />
                          {u.email_verificado && (
                            <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: C.accent, border: `1.5px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="ti ti-check" style={{ fontSize: 7, color: "#fff" }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{u.nombre} {u.apellido}</p>
                          <p style={{ margin: 0, fontSize: 11, color: C.textFaint }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Rol */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <Badge bg={rol.bg} c={rol.c}>{rol.label}</Badge>
                    </td>
                    {/* Auth provider */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted }}>
                        <i className={`ti ${PROVIDER_ICON[u.provider]}`} style={{ fontSize: 15 }} />
                        <span style={{ fontSize: 12 }}>{u.provider}</span>
                      </div>
                    </td>
                    {/* Entrevistas */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: C.text }}>
                      {u.total_entrevistas ?? 0}
                    </td>
                    {/* Puntaje */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      {u.puntaje_promedio != null
                        ? <span style={{ fontSize: 14, fontWeight: 700, color: u.puntaje_promedio >= 80 ? C.accent : u.puntaje_promedio >= 60 ? C.warning : C.danger }}>{u.puntaje_promedio.toFixed(1)}</span>
                        : <span style={{ fontSize: 13, color: C.textFaint }}>—</span>
                      }
                    </td>
                    {/* Estado */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <button onClick={() => handleToggleActive(u.id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: u.activo ? C.accentBg : C.dangerBg, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}
                        title={u.activo ? "Clic para desactivar" : "Clic para activar"}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.activo ? C.accent : C.danger }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: u.activo ? C.accent : C.danger }}>{u.activo ? "Activo" : "Inactivo"}</span>
                      </button>
                    </td>
                    {/* Último acceso */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.textFaint, whiteSpace: "nowrap" }}>
                      {fmtRelative(u.ultimo_login)}
                    </td>
                    {/* Acciones */}
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setSelected(u)} title="Editar usuario"
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "5px", borderRadius: 6, transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.accentBg; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 15 }} />
                        </button>
                        {u.github_url && (
                          <a href={u.github_url} target="_blank" rel="noreferrer" title="Ver GitHub"
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "5px", borderRadius: 6, display: "flex", alignItems: "center", textDecoration: "none", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = C.text; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
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

        {/* Paginación placeholder */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {[1, 2, 3].map(p => (
            <button key={p}
              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${p === 1 ? C.accent + "66" : C.border}`, background: p === 1 ? C.accentBg : "transparent", color: p === 1 ? C.accent : C.textMuted, fontSize: 13, fontWeight: p === 1 ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Modal editar */}
      {selected && (
        <UserModal user={selected} onClose={() => setSelected(null)} onSave={handleSave} />
      )}

      {/* Modal nuevo (reutiliza el mismo con un usuario vacío) */}
      {showNew && (
        <UserModal
          user={{
            id: crypto.randomUUID(),
            nombre: "", apellido: "", email: "", rol: "developer",
            avatar_url: null, github_url: null, linkedin_url: null, telefono: null,
            activo: true, email_verificado: false,
            fecha_creacion: new Date().toISOString(), ultimo_login: null,
            provider: "password", total_entrevistas: 0, puntaje_promedio: null,
          }}
          onClose={() => setShowNew(false)}
          onSave={u => setUsers(prev => [u, ...prev])}
        />
      )}
    </>
  );
}