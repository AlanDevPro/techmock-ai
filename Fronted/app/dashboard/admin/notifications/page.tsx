'use client';

import { useState } from "react";

// ─── Theme tokens (mismo sistema que el dashboard) ───────────────────────────
const T = {
  dark: {
    bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
    accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444", topbar: "#16181d", sidebar: "#13151a",
    searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#f0f2f5", surface: "#ffffff", surfaceHover: "#f8f9fb",
    border: "rgba(0,0,0,0.08)", text: "#111214", textMuted: "#5f6478", textFaint: "#adb0be",
    accent: "#00a855", accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626", topbar: "#ffffff", sidebar: "#ffffff",
    searchBg: "rgba(0,0,0,0.04)", searchBorder: "rgba(0,0,0,0.1)",
  },
};

// ─── Mock data (reemplaza con tu API) ────────────────────────────────────────
const MOCK_NOTIFS = [
  { id: 1, tipo: "warning", titulo: "Usuarios inactivos", mensaje: "8 usuarios sin actividad por 30+ días. Considera enviarles un recordatorio.", leida: false, url_accion: "/dashboard/admin/users", fecha_creacion: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, tipo: "info", titulo: "Nueva pregunta IA generada", mensaje: 'Se creó automáticamente: "React Hooks avanzados – useCallback y useMemo".', leida: false, url_accion: "/dashboard/admin/questions", fecha_creacion: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 3, tipo: "success", titulo: "Evaluación completada", mensaje: "Diego Ruiz finalizó su entrevista de PostgreSQL Senior con 91 puntos.", leida: false, url_accion: "/dashboard/admin/analytics", fecha_creacion: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 4, tipo: "info", titulo: "Contacto respondido", mensaje: "Ana Martínez respondió al contacto de reclutamiento para la posición Frontend Senior.", leida: false, url_accion: "/dashboard/admin/recruitment", fecha_creacion: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 5, tipo: "success", titulo: "Nuevo usuario registrado", mensaje: "Laura Gómez se registró con Google OAuth y completó su perfil.", leida: true, url_accion: "/dashboard/admin/users", fecha_creacion: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 6, tipo: "warning", titulo: "Token de sesión expirado", mensaje: "3 sesiones de entrevista quedaron sin completar por timeout (>1 hora).", leida: true, url_accion: "/dashboard/admin/interviews", fecha_creacion: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: 7, tipo: "error", titulo: "Error en ejecución de código", mensaje: "El job de Kubernetes para la sesión #8f2a falló con exit code 137 (OOM Kill).", leida: true, url_accion: "/dashboard/admin/interviews", fecha_creacion: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 8, tipo: "info", titulo: "Actualización del sistema", mensaje: "Se programó mantenimiento para el domingo 15/06 a las 02:00 UTC.", leida: true, url_accion: null, fecha_creacion: new Date(Date.now() - 72 * 3600000).toISOString() },
];

const TIPO_CONFIG: Record<string, { bg: string; c: string; icon: string; label: string }> = {
  warning: { bg: "rgba(245,158,11,0.1)", c: "#fbbf24", icon: "ti-alert-triangle", label: "Advertencia" },
  info:    { bg: "rgba(59,130,246,0.1)", c: "#60a5fa", icon: "ti-info-circle",    label: "Información" },
  success: { bg: "rgba(0,201,107,0.1)",  c: "#00c96b", icon: "ti-circle-check",   label: "Éxito" },
  error:   { bg: "rgba(239,68,68,0.1)",  c: "#f87171", icon: "ti-circle-x",       label: "Error" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace menos de 1 h";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? "s" : ""}`;
}

interface Notif {
  id: number; tipo: string; titulo: string; mensaje: string;
  leida: boolean; url_accion: string | null; fecha_creacion: string;
}

export default function NotificationsPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [filter, setFilter] = useState<"todas" | "no_leidas" | "leidas">("todas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [notifs, setNotifs] = useState<Notif[]>(MOCK_NOTIFS);
  const t = T[theme];

  const unreadCount = notifs.filter(n => !n.leida).length;

  const filtered = notifs.filter(n => {
    const readMatch = filter === "todas" ? true : filter === "no_leidas" ? !n.leida : n.leida;
    const tipoMatch = tipoFilter === "todos" ? true : n.tipo === tipoFilter;
    return readMatch && tipoMatch;
  });

  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
  const deleteNotif = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const pill = (active: boolean, label: string, onClick: () => void, color = t.accent) => (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
      background: active ? color + "20" : "transparent",
      border: `1.5px solid ${active ? color : t.border}`,
      color: active ? color : t.textMuted,
      transition: "all 0.15s", fontFamily: "inherit",
    }}>{label}</button>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text }}>
              Notificaciones
              {unreadCount > 0 && (
                <span style={{ marginLeft: 10, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                  {unreadCount} nuevas
                </span>
              )}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>
              Centro de notificaciones del sistema
            </p>
          </div>
          <button onClick={markAllRead} disabled={unreadCount === 0}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${t.border}`, background: "transparent", color: unreadCount > 0 ? t.accent : t.textFaint, fontSize: 13, fontWeight: 600, cursor: unreadCount > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}>
            <i className="ti ti-checks" style={{ fontSize: 16 }} />
            Marcar todas como leídas
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: notifs.length, icon: "ti-bell", color: "#3b82f6" },
            { label: "Sin leer", value: unreadCount, icon: "ti-bell-ringing", color: "#ef4444" },
            { label: "Advertencias", value: notifs.filter(n => n.tipo === "warning").length, icon: "ti-alert-triangle", color: "#f59e0b" },
            { label: "Errores", value: notifs.filter(n => n.tipo === "error").length, icon: "ti-circle-x", color: "#ef4444" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {pill(filter === "todas", "Todas", () => setFilter("todas"))}
          {pill(filter === "no_leidas", `Sin leer (${unreadCount})`, () => setFilter("no_leidas"), "#ef4444")}
          {pill(filter === "leidas", "Leídas", () => setFilter("leidas"))}
          <div style={{ width: 1, height: 20, background: t.border, margin: "0 4px" }} />
          {["todos", "success", "info", "warning", "error"].map(tipo => {
            const cfg = tipo === "todos" ? null : TIPO_CONFIG[tipo];
            return pill(tipoFilter === tipo, cfg ? cfg.label : "Todos los tipos", () => setTipoFilter(tipo), cfg?.c);
          })}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "4rem 2rem", textAlign: "center" }}>
              <i className="ti ti-bell-off" style={{ fontSize: 40, color: t.textFaint, display: "block", marginBottom: 12 }} />
              <p style={{ margin: 0, color: t.textMuted, fontSize: 14 }}>No hay notificaciones con los filtros actuales</p>
            </div>
          ) : filtered.map(n => {
            const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info;
            return (
              <div key={n.id} style={{ background: t.surface, border: `1.5px solid ${n.leida ? t.border : cfg.c + "40"}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start", transition: "all 0.15s", opacity: n.leida ? 0.75 : 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, color: cfg.c }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: n.leida ? 500 : 700, color: t.text }}>{n.titulo}</span>
                    {!n.leida && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.c, flexShrink: 0 }} />}
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{n.mensaje}</p>
                  <span style={{ fontSize: 11, color: t.textFaint }}>{timeAgo(n.fecha_creacion)}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {!n.leida && (
                    <button onClick={() => markRead(n.id)} title="Marcar como leída"
                      style={{ background: "none", border: `1px solid ${t.border}`, cursor: "pointer", color: t.accent, padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                      Leída
                    </button>
                  )}
                  {n.url_accion && (
                    <button title="Ver detalle"
                      style={{ background: t.accentBg, border: "none", cursor: "pointer", color: t.accent, padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                      Ver →
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} title="Eliminar"
                    style={{ background: "none", border: `1px solid ${t.border}`, cursor: "pointer", color: t.textFaint, padding: "5px 8px", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}