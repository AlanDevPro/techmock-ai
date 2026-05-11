'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Datos mock (reemplaza con fetch a tu API) ───────────────────────────────

const STATS = [
  { label: "Usuarios activos", value: "142", sub: "+12 este mes", icon: "ti-users", accent: "#00c96b" },
  { label: "Entrevistas hoy", value: "38", sub: "+5 vs ayer", icon: "ti-video", accent: "#3b82f6" },
  { label: "Preguntas en BD", value: "256", sub: "18 por IA", icon: "ti-help-circle", accent: "#a855f7" },
  { label: "Puntaje promedio", value: "71.4", sub: "Global", icon: "ti-chart-bar", accent: "#f59e0b" },
];

const SESSIONS = [
  { user: "Ana Martínez",  initials: "AM", tech: "React",      level: "Senior", score: 88,   status: "completada",  time: "5 min" },
  { user: "Carlos López",  initials: "CL", tech: "Node.js",    level: "Mid",    score: 64,   status: "en_progreso", time: "12 min" },
  { user: "María Torres",  initials: "MT", tech: "Python",     level: "Junior", score: 72,   status: "completada",  time: "28 min" },
  { user: "Diego Ruiz",    initials: "DR", tech: "PostgreSQL", level: "Senior", score: 91,   status: "completada",  time: "1 h" },
  { user: "Sofía Vega",    initials: "SV", tech: "TypeScript", level: "Mid",    score: null, status: "abandonada",  time: "2 h" },
  { user: "Tomás Bravo",   initials: "TB", tech: "Go",         level: "Senior", score: 79,   status: "completada",  time: "3 h" },
];

const TOP_TECHS = [
  { name: "React",      sessions: 54, avg: 73, color: "#61dafb" },
  { name: "Node.js",    sessions: 41, avg: 68, color: "#68a063" },
  { name: "Python",     sessions: 38, avg: 71, color: "#f7c948" },
  { name: "TypeScript", sessions: 29, avg: 75, color: "#3178c6" },
  { name: "PostgreSQL", sessions: 22, avg: 69, color: "#336791" },
];

const CONTACTS = [
  { dev: "Carlos López", subject: "Oportunidad Backend Node.js",   status: "enviado",    time: "1 h" },
  { dev: "Ana Martínez", subject: "Posición Frontend Senior",      status: "respondido", time: "3 h" },
  { dev: "Diego Ruiz",   subject: "Rol DBA PostgreSQL",            status: "enviado",    time: "ayer" },
];

const NOTIFS = [
  { type: "warning", msg: "8 usuarios sin actividad por 30+ días",      time: "2 h" },
  { type: "info",    msg: 'Nueva pregunta IA: "React Hooks avanzados"', time: "4 h" },
  { type: "success", msg: "Evaluación completada — Diego Ruiz 91 pts",  time: "1 h" },
  { type: "info",    msg: "Contacto respondido: Ana Martínez",           time: "3 h" },
];

// ─── Rutas del sidebar ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview",       label: "Overview",       icon: "ti-layout-dashboard", path: "/dashboard/admin" },
  { id: "usuarios",       label: "Usuarios",       icon: "ti-users",            path: "/dashboard/admin/developers" },
  { id: "sesiones",       label: "Sesiones",       icon: "ti-video",            path: "/dashboard/admin/interviews" },
  { id: "preguntas",      label: "Preguntas",      icon: "ti-help-circle",      path: "/dashboard/admin/questions" },
  { id: "tecnologias",    label: "Tecnologías",    icon: "ti-cpu",              path: "/dashboard/admin/technologies" },
  { id: "evaluaciones",   label: "Evaluaciones",   icon: "ti-chart-bar",        path: "/dashboard/admin/analytics" },
  { id: "reclutamiento",  label: "Reclutamiento",  icon: "ti-mail",             path: "/dashboard/admin/recruitment" },
  { id: "notificaciones", label: "Notificaciones", icon: "ti-bell",             path: "/dashboard/admin/notifications", badge: 4 },
  { id: "ajustes",        label: "Ajustes",        icon: "ti-settings",         path: "/dashboard/admin/settings" },
];

const PROFILE_MENU = [
  { id: "perfil",   label: "Mi perfil",              icon: "ti-user",    path: "/dashboard/profile" },
  { id: "ranking",  label: "Tabla de clasificación", icon: "ti-trophy",  path: "/dashboard/ranking" },
  { id: "ajustes",  label: "Ajustes",                icon: "ti-settings",path: "/dashboard/admin/settings" },
  { id: "envios",   label: "Mis envíos",             icon: "ti-send",    path: "/dashboard/submissions" },
  { id: "logout",   label: "Cerrar sesión",          icon: "ti-logout",  path: "/logout", danger: true },
];

// ─── Temas ────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
    accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444", topbar: "#16181d", sidebar: "#13151a",
    searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
    pill: {
      completada:  { bg: "rgba(0,201,107,0.12)",  c: "#00c96b" },
      en_progreso: { bg: "rgba(59,130,246,0.12)",  c: "#60a5fa" },
      abandonada:  { bg: "rgba(239,68,68,0.12)",   c: "#f87171" },
      enviado:     { bg: "rgba(245,158,11,0.12)",  c: "#fbbf24" },
      respondido:  { bg: "rgba(0,201,107,0.12)",   c: "#00c96b" },
    },
    notif: {
      warning: { bg: "rgba(245,158,11,0.1)",  c: "#fbbf24", icon: "ti-alert-triangle" },
      info:    { bg: "rgba(59,130,246,0.1)",   c: "#60a5fa", icon: "ti-info-circle" },
      success: { bg: "rgba(0,201,107,0.1)",   c: "#00c96b", icon: "ti-circle-check" },
    },
  },
  light: {
    bg: "#f0f2f5", surface: "#ffffff", surfaceHover: "#f8f9fb",
    border: "rgba(0,0,0,0.08)", text: "#111214", textMuted: "#5f6478", textFaint: "#adb0be",
    accent: "#00a855", accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626", topbar: "#ffffff", sidebar: "#ffffff",
    searchBg: "rgba(0,0,0,0.04)", searchBorder: "rgba(0,0,0,0.1)",
    pill: {
      completada:  { bg: "#dcfce7", c: "#15803d" },
      en_progreso: { bg: "#dbeafe", c: "#1d4ed8" },
      abandonada:  { bg: "#fee2e2", c: "#b91c1c" },
      enviado:     { bg: "#fef3c7", c: "#92400e" },
      respondido:  { bg: "#dcfce7", c: "#15803d" },
    },
    notif: {
      warning: { bg: "#fef3c7", c: "#92400e", icon: "ti-alert-triangle" },
      info:    { bg: "#dbeafe", c: "#1d4ed8", icon: "ti-info-circle" },
      success: { bg: "#dcfce7", c: "#15803d", icon: "ti-circle-check" },
    },
  },
} as const;

type Theme = keyof typeof T;
type ThemeTokens = (typeof T)[Theme];

const STATUS_LABELS: Record<string, string> = {
  completada: "Completada", en_progreso: "En progreso", abandonada: "Abandonada",
  enviado: "Enviado", respondido: "Respondido",
};
const maxSessions = Math.max(...TOP_TECHS.map(t => t.sessions));
const AVATAR_COLORS = ["#00c96b", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ status, t }: { status: string; t: ThemeTokens }) {
  const s = (t.pill as any)[status] || { bg: "rgba(0,0,0,0.05)", c: t.textMuted };
  return (
    <span style={{ background: s.bg, color: s.c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function Avatar({ initials, size = 30, color = "#00c96b" }: { initials: string; size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "22", border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function IconBtn({ icon, label, onClick, children, t }: { icon: string; label: string; onClick?: () => void; children?: React.ReactNode; t: ThemeTokens }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, transition: "all 0.12s", position: "relative", flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.searchBg; (e.currentTarget as HTMLElement).style.color = t.text; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 19 }} aria-hidden />
      {children}
    </button>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ t, onNavigate }: { t: ThemeTokens; onNavigate: (path: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 16 }}>
        {STATS.map((s, i) => (
          <div key={i}
            style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.15s", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.accent + "55"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.transform = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 70, height: 70, background: s.accent + "0d", borderRadius: "0 14px 0 70px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 17, color: s.accent }} aria-hidden />
              </div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: t.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.sub.startsWith("+") ? t.accent : t.textMuted }}>{s.sub.startsWith("+") ? "↑ " : ""}{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Sesiones + side widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>Sesiones recientes</h3>
            <button onClick={() => onNavigate("/dashboard/admin/interviews")} style={{ fontSize: 12, color: t.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todas →</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Usuario", "Tecnología", "Nivel", "Puntaje", "Estado"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px 10px", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${t.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {SESSIONS.map((s, i) => (
                <tr key={i} style={{ transition: "background 0.12s", cursor: "default" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar initials={s.initials} size={28} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.user}</div>
                        <div style={{ fontSize: 11, color: t.textFaint }}>hace {s.time}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "9px 8px", fontSize: 13, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{s.tech}</td>
                  <td style={{ padding: "9px 8px", fontSize: 12, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{s.level}</td>
                  <td style={{ padding: "9px 8px", fontSize: 14, fontWeight: 700, color: s.score === null ? t.textFaint : s.score >= 80 ? t.accent : s.score >= 60 ? "#f59e0b" : t.danger, borderBottom: `1px solid ${t.border}` }}>{s.score ?? "—"}</td>
                  <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}><Pill status={s.status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top techs */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: t.text }}>Top tecnologías</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TOP_TECHS.map(tech => (
                <div key={tech.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tech.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{tech.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{tech.sessions} · avg <strong style={{ color: t.text }}>{tech.avg}</strong></span>
                  </div>
                  <div style={{ height: 5, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(tech.sessions / maxSessions) * 100}%`, background: tech.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notificaciones */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem", flex: 1 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: t.text }}>Notificaciones</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {NOTIFS.map((n, i) => {
                const ns = (t.notif as any)[n.type];
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", background: ns.bg, borderRadius: 10 }}>
                    <i className={`ti ${ns.icon}`} aria-hidden style={{ color: ns.c, fontSize: 15, marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: t.text, lineHeight: 1.4 }}>{n.msg}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: t.textFaint }}>hace {n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reclutamiento */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>Reclutamiento reciente</h3>
          <button onClick={() => onNavigate("/dashboard/admin/recruitment")} style={{ fontSize: 12, color: t.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Developer", "Asunto", "Estado", "Enviado"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "6px 8px 10px", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${t.border}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {CONTACTS.map((c, i) => (
              <tr key={i} style={{ transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <td style={{ padding: "10px 8px", fontSize: 13, fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}` }}>{c.dev}</td>
                <td style={{ padding: "10px 8px", fontSize: 13, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{c.subject}</td>
                <td style={{ padding: "10px 8px", borderBottom: `1px solid ${t.border}` }}><Pill status={c.status} t={t} /></td>
                <td style={{ padding: "10px 8px", fontSize: 12, color: t.textFaint, borderBottom: `1px solid ${t.border}` }}>hace {c.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones rápidas */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: t.text }}>Acciones rápidas</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
          {[
            { label: "Nuevo desarrollador",    icon: "ti-user-plus", color: "#3b82f6", path: "/dashboard/admin/developers" },
            { label: "Nueva pregunta",   icon: "ti-plus",      color: "#00c96b", path: "/dashboard/admin/questions" },
            { label: "Ver evaluaciones", icon: "ti-chart-bar", color: "#a855f7", path: "/dashboard/admin/analytics" },
            { label: "Enviar contacto",  icon: "ti-mail",      color: "#f59e0b", path: "/dashboard/admin/recruitment" },
            { label: "Nueva tecnología", icon: "ti-cpu",       color: "#14b8a6", path: "/dashboard/admin/technologies" },
            { label: "Notificaciones",   icon: "ti-bell",      color: "#ec4899", path: "/dashboard/admin/notifications" },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.path)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: a.color + "12", border: `1px solid ${a.color}30`, borderRadius: 12, padding: "1.1rem 0.75rem", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = a.color + "22"; (e.currentTarget as HTMLElement).style.borderColor = a.color + "60"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = a.color + "12"; (e.currentTarget as HTMLElement).style.borderColor = a.color + "30"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: a.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${a.icon}`} aria-hidden style={{ fontSize: 20, color: a.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text, textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const t = T[theme];

  // Detecta si el pathname coincide con el item
  const isActive = (path: string) => {
    if (path === "/dashboard/admin") return pathname === "/dashboard/admin";
    return pathname.startsWith(path);
  };

  const activeNav = NAV_ITEMS.find(n => isActive(n.path)) ?? NAV_ITEMS[0];

  // Es la ruta raíz del admin → renderizamos OverviewTab como children
  const isOverview = pathname === "/dashboard/admin";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = (path: string) => router.push(path);
  const SIDEBAR_W = sidebarOpen ? 220 : 60;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>

        {/* ── TOP BAR ── */}
        <header style={{ height: 54, background: t.topbar, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>

          {/* Logo */}
          <div style={{ width: SIDEBAR_W, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 1rem", borderRight: `1px solid ${t.border}`, height: "100%", transition: "width 0.22s ease", overflow: "hidden" }}>
            <div style={{ width: 30, height: 30, background: t.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ti ti-code" aria-hidden style={{ fontSize: 16, color: "#fff" }} />
            </div>
            {sidebarOpen && <span style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>DevInterview</span>}
          </div>

          {/* Título de página */}
          <div style={{ padding: "0 1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
            <i className={`ti ${activeNav?.icon}`} aria-hidden style={{ fontSize: 15, color: t.accent }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{activeNav?.label}</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative", marginRight: 4 }}>
            <i className="ti ti-search" aria-hidden style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textFaint, pointerEvents: "none" }} />
            <input type="text" placeholder="Buscar..." value={searchVal} onChange={e => setSearchVal(e.target.value)}
              style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 20, padding: "7px 14px 7px 32px", fontSize: 13, color: t.text, outline: "none", width: 200, fontFamily: "inherit", transition: "border-color 0.15s, width 0.2s" }}
              onFocus={e => { e.target.style.borderColor = t.accent + "66"; e.target.style.width = "240px"; }}
              onBlur={e => { e.target.style.borderColor = t.searchBorder; e.target.style.width = "200px"; }}
            />
          </div>

          {/* Mensajes */}
          <div style={{ position: "relative" }}>
            <IconBtn icon="ti-message-circle" label="Mensajes" t={t}>
              <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: "#3b82f6", borderRadius: "50%", border: `1.5px solid ${t.topbar}` }} />
            </IconBtn>
          </div>

          {/* Notificaciones */}
          <div style={{ position: "relative" }}>
            <IconBtn icon="ti-bell" label="Notificaciones" onClick={() => router.push("/dashboard/admin/notifications")} t={t}>
              <span style={{ position: "absolute", top: 5, right: 5, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 99, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${t.topbar}`, lineHeight: 1 }}>4</span>
            </IconBtn>
          </div>

          {/* Tema */}
          <IconBtn icon={theme === "dark" ? "ti-sun" : "ti-moon"} label="Cambiar tema" onClick={() => setTheme(th => th === "dark" ? "light" : "dark")} t={t} />

          {/* Acciones rápidas */}
          <IconBtn icon="ti-layout-grid" label="Acciones rápidas" t={t} />

          <div style={{ width: 1, height: 20, background: t.border, margin: "0 6px" }} />

          {/* Perfil */}
          <div style={{ position: "relative", marginRight: 8 }} ref={profileRef}>
            <button onClick={() => setProfileOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.searchBg}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", border: `2px solid ${t.accent}50`, flexShrink: 0 }}>A</div>
              <i className={`ti ti-chevron-${profileOpen ? "up" : "down"}`} aria-hidden style={{ fontSize: 12, color: t.textMuted }} />
            </button>

            {profileOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: theme === "dark" ? "0 20px 50px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.14)", width: 215, zIndex: 200, overflow: "hidden", padding: 6 }}>
                <div style={{ padding: "10px 12px 12px", borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>A</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Admin</div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>admin@devinterview.io</div>
                    </div>
                  </div>
                  <div style={{ background: t.accentBg, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
                    <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>Administrador</span>
                  </div>
                </div>

                {PROFILE_MENU.map((item, i) => (
                  <div key={item.id}>
                    {i === PROFILE_MENU.length - 1 && <div style={{ height: 1, background: t.border, margin: "4px 0" }} />}
                    <button
                      onClick={() => { setProfileOpen(false); router.push(item.path); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "9px 12px", borderRadius: 8, color: item.danger ? t.danger : t.text, fontSize: 13, fontWeight: 500, transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = item.danger ? t.danger + "14" : t.surfaceHover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                    >
                      <i className={`ti ${item.icon}`} aria-hidden style={{ fontSize: 16, flexShrink: 0 }} />
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ display: "flex", flex: 1 }}>

          {/* SIDEBAR */}
          <aside style={{ width: SIDEBAR_W, background: t.sidebar, borderRight: `1px solid ${t.border}`, flexShrink: 0, transition: "width 0.22s ease", overflow: "hidden", display: "flex", flexDirection: "column", position: "sticky", top: 54, height: "calc(100vh - 54px)" }}>
            <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              {NAV_ITEMS.map(item => {
                const active = isActive(item.path);
                return (
                  <button key={item.id}
                    onClick={() => router.push(item.path)}
                    title={!sidebarOpen ? item.label : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? t.accentBg : "transparent", color: active ? t.accent : t.textMuted, fontWeight: active ? 700 : 500, fontSize: 13, textAlign: "left", width: "100%", whiteSpace: "nowrap", transition: "all 0.12s", borderLeft: `3px solid ${active ? t.accent : "transparent"}`, position: "relative", fontFamily: "inherit" }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = t.surfaceHover; (e.currentTarget as HTMLElement).style.color = t.text; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = t.textMuted; } }}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden style={{ fontSize: 18, flexShrink: 0 }} />
                    {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                    {sidebarOpen && item.badge && (
                      <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{item.badge}</span>
                    )}
                    {!sidebarOpen && item.badge && (
                      <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: "#ef4444", borderRadius: "50%", border: `1.5px solid ${t.sidebar}` }} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Toggle */}
            <div style={{ padding: "8px", borderTop: `1px solid ${t.border}` }}>
              <button onClick={() => setSidebarOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 10, color: t.textMuted, fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "all 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.surfaceHover; (e.currentTarget as HTMLElement).style.color = t.text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
              >
                <i className={`ti ${sidebarOpen ? "ti-arrow-bar-left" : "ti-arrow-bar-right"}`} aria-hidden style={{ fontSize: 18, flexShrink: 0 }} />
                {sidebarOpen && <span>Colapsar</span>}
              </button>
            </div>
          </aside>

          {/* CONTENT: overview en raíz, children en subrutas */}
          <main style={{ flex: 1, minWidth: 0, padding: "1.5rem", overflowX: "hidden" }}>
          {pathname === "/dashboard/admin" ? (
            <OverviewTab t={t} onNavigate={navigate} />
          ) : (
            children
          )}
        </main>
        </div>
      </div>
    </>
  );
}