'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import {
  dashboardService,
  type DashboardStats,
  type RecentSession,
  type TopTech,
  type RecentContact,
  type RecentNotif,
} from "@/services/dashboard.service";
import { estadisticasService } from "@/services/estadisticas.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly badge?: boolean;
};

type NavSection = {
  readonly label: string;
  readonly items: readonly NavItem[];
};

type ProfileMenuItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly danger?: boolean;
};

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: "Principal",
    items: [
      { id: "overview",     label: "Overview",       icon: "ti-layout-dashboard", path: "/dashboard/admin" },
      { id: "usuarios",     label: "Usuarios",       icon: "ti-users",            path: "/dashboard/admin/developers" },
      { id: "sesiones",     label: "Sesiones",       icon: "ti-video",            path: "/dashboard/admin/interviews" },
      { id: "preguntas",    label: "Preguntas",      icon: "ti-help-circle",      path: "/dashboard/admin/questions" },
    ],
  },
  {
    label: "Analítica",
    items: [
      { id: "tecnologias",  label: "Tecnologías",    icon: "ti-cpu",              path: "/dashboard/admin/technologies" },
      { id: "evaluaciones", label: "Evaluaciones",   icon: "ti-chart-bar",        path: "/dashboard/admin/analytics" },
    ],
  },
  {
    label: "Gestión",
    items: [
      { id: "reclutamiento",  label: "Reclutamiento",  icon: "ti-mail",  path: "/dashboard/admin/recruitment" },
      { id: "notificaciones", label: "Notificaciones", icon: "ti-bell",  path: "/dashboard/admin/notifications", badge: true },
    ],
  },
] as const;

const PROFILE_MENU: readonly ProfileMenuItem[] = [
  { id: "perfil",  label: "Mi perfil",              icon: "ti-user",   path: "/dashboard/admin/profile" },
  { id: "ranking", label: "Tabla de clasificación", icon: "ti-trophy", path: "/dashboard/admin/ranking" },
  { id: "logout",  label: "Cerrar sesión",          icon: "ti-logout", path: "/dashboard/admin/logout", danger: true },
] as const;

// ─── Tokens de tema ───────────────────────────────────────────────────────────

type PillStatus = "completada" | "en_progreso" | "abandonada" | "enviado" | "respondido";

type PillStyles = {
  [K in PillStatus]?: { bg: string; c: string };
};

type NotificationType = "warning" | "info" | "success" | "error";

type NotificationStyles = {
  [K in NotificationType]: { bg: string; c: string; icon: string };
};

type ThemeTokens = ReturnType<typeof getThemeTokens>;

const getThemeTokens = (isDark: boolean) => ({
  bg:           isDark ? "#0d0f12"              : "#f0f2f5",
  surface:      isDark ? "#13151a"              : "#ffffff",
  surface2:     isDark ? "#1a1d24"              : "#f8f9fb",
  surface3:     isDark ? "#22252e"              : "#f0f2f5",
  surfaceHover: isDark ? "#1e212a"              : "#f4f5f8",
  border:       isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
  border2:      isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)",
  text:         isDark ? "#e8eaed"              : "#111214",
  textMuted:    isDark ? "#8b8fa8"              : "#5f6478",
  textFaint:    isDark ? "#4a4e63"              : "#adb0be",
  accent:       isDark ? "#00d97e"              : "#00a855",
  accentBg:     isDark ? "rgba(0,217,126,0.1)" : "rgba(0,168,85,0.08)",
  blue:         isDark ? "#4f8fff"              : "#2563eb",
  blueBg:       isDark ? "rgba(79,143,255,0.1)" : "rgba(37,99,235,0.08)",
  purple:       isDark ? "#a78bfa"              : "#7c3aed",
  purpleBg:     isDark ? "rgba(167,139,250,0.1)" : "rgba(124,58,237,0.08)",
  amber:        isDark ? "#f59e0b"              : "#d97706",
  amberBg:      isDark ? "rgba(245,158,11,0.1)" : "rgba(217,119,6,0.08)",
  danger:       isDark ? "#f87171"              : "#dc2626",
  dangerBg:     isDark ? "rgba(248,113,113,0.1)" : "rgba(220,38,38,0.08)",
  topbar:       isDark ? "#13151a"              : "#ffffff",
  sidebar:      isDark ? "#13151a"              : "#ffffff",
  searchBg:     isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  pill: {
    completada:  { bg: isDark ? "rgba(0,217,126,0.12)"  : "rgba(0,168,85,0.08)",   c: isDark ? "#00d97e" : "#00a855" },
    en_progreso: { bg: isDark ? "rgba(79,143,255,0.12)" : "rgba(37,99,235,0.08)",  c: isDark ? "#4f8fff" : "#2563eb" },
    abandonada:  { bg: isDark ? "rgba(248,113,113,0.12)": "rgba(220,38,38,0.08)",  c: "#f87171" },
    enviado:     { bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(217,119,6,0.08)",  c: "#f59e0b" },
    respondido:  { bg: isDark ? "rgba(0,217,126,0.12)"  : "rgba(0,168,85,0.08)",   c: isDark ? "#00d97e" : "#00a855" },
  } as PillStyles,
  notif: {
    warning: { bg: isDark ? "rgba(245,158,11,0.1)"  : "rgba(217,119,6,0.08)",  c: "#f59e0b", icon: "ti-alert-triangle" },
    info:    { bg: isDark ? "rgba(79,143,255,0.1)"  : "rgba(37,99,235,0.08)",  c: isDark ? "#4f8fff" : "#2563eb", icon: "ti-info-circle" },
    success: { bg: isDark ? "rgba(0,217,126,0.1)"   : "rgba(0,168,85,0.08)",   c: isDark ? "#00d97e" : "#00a855", icon: "ti-circle-check" },
    error:   { bg: isDark ? "rgba(248,113,113,0.1)" : "rgba(220,38,38,0.08)",  c: "#f87171", icon: "ti-circle-x" },
  } as NotificationStyles,
});

// ─── Avatar colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#00d97e", "#4f8fff", "#a78bfa",
  "#f59e0b", "#ec4899", "#14b8a6",
];

const STATUS_LABELS: Record<string, string> = {
  completada:  "Completada",
  en_progreso: "En progreso",
  abandonada:  "Abandonada",
  enviado:     "Enviado",
  respondido:  "Respondido",
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Pill({ status, t }: { status: string; t: ThemeTokens }) {
  const statusKey = status as keyof NonNullable<ThemeTokens['pill']>;
  const s = (t.pill?.[statusKey] as { bg: string; c: string } | undefined)
    ?? { bg: t.searchBg, c: t.textMuted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.c,
      fontSize: 10.5, fontWeight: 600, padding: "3px 10px",
      borderRadius: 99, letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Avatar({ initials, size = 30, color = "#00d97e" }: {
  initials: string; size?: number; color?: string;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "1f", border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OverviewSkeleton({ t }: { t: ThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1rem", height: 108 }}>
            <div style={{ height: "100%", background: t.surface2, borderRadius: 8, animation: "sk-pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, height: 340 }}>
          <div style={{ margin: 18, height: "calc(100% - 36px)", background: t.surface2, borderRadius: 8, animation: "sk-pulse 1.5s ease-in-out infinite" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[170, 140].map((h, i) => (
            <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, height: h }}>
              <div style={{ margin: 14, height: `calc(100% - 28px)`, background: t.surface2, borderRadius: 8, animation: "sk-pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function OverviewError({ message, onRetry, t }: {
  message: string; onRetry: () => void; t: ThemeTokens;
}) {
  return (
    <div style={{
      background: t.dangerBg, border: `1px solid ${t.danger}44`, borderRadius: 12,
      padding: "1rem 1.25rem", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12, marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 18, color: t.danger }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.danger }}>
            Error al cargar el dashboard
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: t.textMuted }}>{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          background: t.dangerBg, border: `1px solid ${t.danger}66`,
          color: t.danger, borderRadius: 8, padding: "6px 16px",
          cursor: "pointer", fontSize: 12, fontWeight: 700,
          fontFamily: "inherit", whiteSpace: "nowrap",
        }}
      >
        <i className="ti ti-refresh" style={{ marginRight: 6 }} />
        Reintentar
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle, t }: {
  icon: string; title: string; subtitle?: string; t: ThemeTokens;
}) {
  return (
    <div style={{
      background: t.surface2, border: `1px dashed ${t.border2}`,
      borderRadius: 12, padding: "2.5rem 2rem", textAlign: "center",
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 34, color: t.textFaint, display: "block", marginBottom: 10 }} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.textMuted }}>{title}</p>
      {subtitle && <p style={{ margin: "5px 0 0", fontSize: 12, color: t.textFaint }}>{subtitle}</p>}
    </div>
  );
}

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number | null | undefined, t: ThemeTokens): string {
  if (score == null) return t.textFaint;
  if (score >= 8) return t.accent;
  if (score >= 6) return t.amber;
  return t.danger;
}

// ─── Overview tab props ──────────────────────────────────────────────────────

interface OverviewTabProps {
  t: ThemeTokens;
  onNavigate: (path: string) => void;
  stats: DashboardStats | null;
  sessions: RecentSession[];
  topTechs: (TopTech & { color: string })[];
  contacts: RecentContact[];
  notifs: RecentNotif[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  t, onNavigate, stats, sessions, topTechs, contacts, notifs,
  loading, error, onRetry,
}: OverviewTabProps) {
  const maxSessions = Math.max(...topTechs.map(tech => tech.sessions), 1);

  if (loading) return <OverviewSkeleton t={t} />;

  const STAT_CARDS = stats
    ? estadisticasService.buildStatCards(stats)
    : [];

  const ACCENT_MAP: Array<{ accent: string; accentBg: string }> = [
    { accent: t.accent,  accentBg: t.accentBg  },
    { accent: t.blue,    accentBg: t.blueBg    },
    { accent: t.purple,  accentBg: t.purpleBg  },
    { accent: t.amber,   accentBg: t.amberBg   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <OverviewError message={error} onRetry={onRetry} t={t} />}

      {/* ── Stat cards ── */}
      {STAT_CARDS.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 14,
        }}>
          {STAT_CARDS.map((stat, i) => {
            const am = ACCENT_MAP[i % ACCENT_MAP.length];
            return (
              <div
                key={stat.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 14,
                  padding: "1rem 1.2rem",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "default",
                  transition: "border-color 0.2s, transform 0.18s",
                  animation: `fadeUp 0.4s ease ${i * 0.07}s both`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = am.accent + "55";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = t.border;
                  el.style.transform = "none";
                }}
              >
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  width: 60, height: 60,
                  background: am.accent + "0d",
                  borderRadius: "0 14px 0 60px",
                }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {stat.label}
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: am.accentBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className={`ti ${stat.icon}`} style={{ fontSize: 16, color: am.accent }} aria-hidden />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: t.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{stat.sub}</div>
              </div>
            );
          })}
        </div>
      ) : (
        !error && (
          <EmptyState icon="ti-chart-bar" title="Sin estadísticas disponibles" t={t} />
        )
      )}

      {/* ── Content grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

        {/* Sesiones recientes */}
        <div style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 14, padding: "1.2rem",
          animation: "fadeUp 0.4s ease 0.15s both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-list-details" style={{ fontSize: 16, color: t.accent }} aria-hidden />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>Sesiones recientes</h3>
            </div>
            <button
              onClick={() => onNavigate("/dashboard/admin/interviews")}
              style={{ fontSize: 11, color: t.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
            >
              Ver todas →
            </button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState icon="ti-video-off" title="Sin sesiones recientes" subtitle="Las sesiones completadas aparecerán aquí." t={t} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Usuario", "Tecnología", "Nivel", "Score", "Estado"].map(head => (
                    <th key={head} style={{
                      textAlign: "left", padding: "5px 8px 9px",
                      fontSize: 10, fontWeight: 600, color: t.textFaint,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: `1px solid ${t.border}`,
                    }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr
                    key={session.id ?? i}
                    style={{ transition: "background 0.12s", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar initials={session.initials} size={28} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{session.user_name}</div>
                          <div style={{ fontSize: 10, color: t.textFaint }}>{session.time}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "9px 8px", fontSize: 12, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{session.tech}</td>
                    <td style={{ padding: "9px 8px", fontSize: 11, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{session.level}</td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(session.score, t) }}>
                        {session.score ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}>
                      <Pill status={session.status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Side column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Top tecnologías */}
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 14, padding: "1.2rem",
            animation: "fadeUp 0.4s ease 0.2s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ti ti-cpu" style={{ fontSize: 16, color: t.blue }} aria-hidden />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>Top tecnologías</h3>
            </div>
            {topTechs.length === 0 ? (
              <EmptyState icon="ti-cpu" title="Sin datos" t={t} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {topTechs.map(tech => (
                  <div key={tech.nombre}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: tech.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{tech.nombre}</span>
                      </div>
                      <span style={{ fontSize: 10, color: t.textMuted }}>
                        {tech.sessions} · avg <strong style={{ color: t.text }}>{tech.avg}</strong>
                      </span>
                    </div>
                    <div style={{ height: 4, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${estadisticasService.calcBarWidth(tech.sessions, maxSessions)}%`,
                        background: tech.color, borderRadius: 99,
                        transition: "width 1s cubic-bezier(.4,0,.2,1)",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 14, padding: "1.2rem", flex: 1,
            animation: "fadeUp 0.4s ease 0.25s both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
              <i className="ti ti-bell" style={{ fontSize: 16, color: t.amber }} aria-hidden />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>Notificaciones</h3>
            </div>
            {notifs.length === 0 ? (
              <EmptyState icon="ti-bell-off" title="Sin notificaciones" t={t} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {notifs.map((notif, i) => {
                  const ns = t.notif[notif.type as NotificationType] ?? t.notif.info;
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "8px 10px", background: ns.bg, borderRadius: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: ns.c + "22",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <i className={`ti ${ns.icon}`} style={{ color: ns.c, fontSize: 14 }} aria-hidden />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11.5, color: t.text, lineHeight: 1.4 }}>{notif.msg}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 10, color: t.textFaint }}>{notif.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reclutamiento */}
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: "1.2rem",
        animation: "fadeUp 0.4s ease 0.3s both",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-mail" style={{ fontSize: 16, color: t.purple }} aria-hidden />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>Reclutamiento reciente</h3>
          </div>
          <button
            onClick={() => onNavigate("/dashboard/admin/recruitment")}
            style={{ fontSize: 11, color: t.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
          >
            Ver todos →
          </button>
        </div>
        {contacts.length === 0 ? (
          <EmptyState icon="ti-mail-off" title="Sin contactos recientes" subtitle="Los contactos de reclutamiento aparecerán aquí." t={t} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Developer", "Asunto", "Estado", "Enviado"].map(head => (
                  <th key={head} style={{
                    textAlign: "left", padding: "5px 8px 9px",
                    fontSize: 10, fontWeight: 600, color: t.textFaint,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    borderBottom: `1px solid ${t.border}`,
                  }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, i) => (
                <tr
                  key={contact.id ?? i}
                  style={{ transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <td style={{ padding: "9px 8px", fontSize: 12, fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}` }}>{contact.dev}</td>
                  <td style={{ padding: "9px 8px", fontSize: 12, color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{contact.subject}</td>
                  <td style={{ padding: "9px 8px", borderBottom: `1px solid ${t.border}` }}><Pill status={contact.status} t={t} /></td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: t.textFaint, borderBottom: `1px solid ${t.border}` }}>{contact.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── User data interface ──────────────────────────────────────────────────────

interface UserData {
  displayName: string;
  displayEmail: string;
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useThemeContext();

  const t = getThemeTokens(isDark);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError]     = useState<string | null>(null);
  const [stats, setStats]                     = useState<DashboardStats | null>(null);
  const [sessions, setSessions]               = useState<RecentSession[]>([]);
  const [topTechs, setTopTechs]               = useState<(TopTech & { color: string })[]>([]);
  const [contacts, setContacts]               = useState<RecentContact[]>([]);
  const [notifBadge, setNotifBadge]           = useState(0);
  const [recentNotifs, setRecentNotifs]       = useState<RecentNotif[]>([]);

  const loadDashboard = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    
    try {
      const [statsData, sessionsData, techsData, contactsData, notifsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentSessions(),
        dashboardService.getTopTechs(),
        dashboardService.getRecentContacts(),
        dashboardService.getRecentNotifs(),
      ]);
    
      setStats(statsData);
      setSessions(sessionsData);
      setTopTechs(estadisticasService.enrichTopTechs(techsData));
      setContacts(contactsData);
      setRecentNotifs(notifsData);
      
      setNotifBadge(
        notifsData.filter(n => n.type === "warning" || n.type === "error").length
      );
    } catch (err: unknown) {
      const message = err instanceof Error 
        ? err.message 
        : "Error inesperado al cargar el dashboard.";
      
      setOverviewError(message);
      console.error("[AdminDashboardLayout] loadDashboard:", err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const isActive = (path: string) =>
    path === "/dashboard/admin" ? pathname === "/dashboard/admin" : pathname.startsWith(path);

  // Obtener todos los items de navegación aplanados
  const allNavItems = NAV_SECTIONS.flatMap(section => section.items);
  
  const activeNav = allNavItems.find(item => isActive(item.path)) 
    ?? allNavItems[0] 
    ?? { id: "overview", label: "Overview", icon: "ti-layout-dashboard", path: "/dashboard/admin" };

  const navigate  = (path: string) => router.push(path);

  // Sidebar dimensions
  const SIDEBAR_EXPANDED  = 220;
  const SIDEBAR_COLLAPSED = 56;
  const SIDEBAR_W = sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  // User data — replace with your auth context
  const userData: UserData = { 
    displayName: "Admin", 
    displayEmail: "admin@techmock.ai" 
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}

        .nav-tooltip-box{
          position:absolute;
          left:calc(100% + 12px);
          top:50%;
          transform:translateY(-50%);
          background:${t.surface};
          border:1px solid ${t.border2};
          color:${t.text};
          font-size:12px;
          font-weight:600;
          padding:5px 12px;
          border-radius:9px;
          white-space:nowrap;
          pointer-events:none;
          opacity:0;
          transition:opacity 0.15s;
          z-index:999;
          box-shadow:0 4px 20px rgba(0,0,0,0.35);
          font-family:Inter,system-ui,sans-serif;
        }
        .nav-item-collapsed:hover .nav-tooltip-box{opacity:1}
        .nav-item-collapsed{position:relative}
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", minHeight: "100vh",
        background: t.bg, fontFamily: "'Inter', system-ui, sans-serif",
        color: t.text, fontSize: 13,
      }}>

        {/* ── TOPBAR ── */}
        <header style={{
          height: 56, background: t.topbar, borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", padding: "0 1rem", gap: 10,
          position: "sticky", top: 0, zIndex: 50, flexShrink: 0,
        }}>

          {/* Brand toggle — click to show/hide sidebar */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Colapsar sidebar" : "Expandir sidebar"}
            aria-label={sidebarOpen ? "Colapsar sidebar" : "Expandir sidebar"}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              background: "none", border: "none", cursor: "pointer",
              padding: "5px 10px", borderRadius: 10,
              transition: "background 0.18s", userSelect: "none", flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surface3}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
          >
            {/* Gradient logo icon */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #00d97e 0%, #00a5ff 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 3px rgba(0,217,126,0.15)",
            }}>
              <i className="ti ti-cpu" style={{ color: "#fff", fontSize: 16 }} aria-hidden />
            </div>

            {/* Name — always visible, acts as affordance for the toggle */}
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: "nowrap" }}>
              Tech<span style={{ color: t.accent }}>Mock</span> AI
            </span>

            {/* Chevron hint */}
            <i
              className={`ti ${sidebarOpen ? "ti-chevron-left" : "ti-chevron-right"}`}
              style={{ fontSize: 14, color: t.textMuted, transition: "transform 0.2s" }}
              aria-hidden
            />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: t.border2 }} />

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
            <i className={`ti ${activeNav.icon}`} style={{ fontSize: 15, color: t.accent }} aria-hidden />
            <span style={{ fontWeight: 600, color: t.text }}>{activeNav.label}</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: t.searchBg, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "6px 12px",
            fontSize: 12, color: t.textMuted, cursor: "text",
            width: 200, transition: "border-color 0.18s",
          }}>
            <i className="ti ti-search" style={{ fontSize: 14, flexShrink: 0 }} aria-hidden />
            <span style={{ flex: 1 }}>Buscar...</span>
            <span style={{
              fontSize: 10, background: t.surface3, color: t.textFaint,
              padding: "2px 6px", borderRadius: 5, border: `1px solid ${t.border2}`,
            }}>⌘K</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Modo claro" : "Modo oscuro"}
              style={{
                width: 34, height: 34, borderRadius: 10, background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: t.textMuted, fontSize: 17, transition: "all 0.18s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = t.surface3; el.style.color = t.text;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "none"; el.style.color = t.textMuted;
              }}
            >
              <i className={`ti ${isDark ? "ti-sun" : "ti-moon"}`} aria-hidden />
            </button>

            {/* Notifications */}
            <button
              onClick={() => router.push("/dashboard/admin/notifications")}
              title="Notificaciones"
              style={{
                width: 34, height: 34, borderRadius: 10, background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: t.textMuted, fontSize: 17, position: "relative", transition: "all 0.18s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = t.surface3; el.style.color = t.text;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "none"; el.style.color = t.textMuted;
              }}
            >
              <i className="ti ti-bell" aria-hidden />
              {notifBadge > 0 && (
                <span style={{
                  position: "absolute", top: 7, right: 7, width: 7, height: 7,
                  background: t.danger, borderRadius: "50%",
                  border: `2px solid ${t.topbar}`,
                }} />
              )}
            </button>

            {/* Settings */}
            <button
              title="Configuración"
              onClick={() => router.push("/dashboard/admin/profile")}
              style={{
                width: 34, height: 34, borderRadius: 10, background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: t.textMuted, fontSize: 17, transition: "all 0.18s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = t.surface3; el.style.color = t.text;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "none"; el.style.color = t.textMuted;
              }}
            >
              <i className="ti ti-settings" aria-hidden />
            </button>

            {/* Avatar */}
            <button
              onClick={() => setProfileOpen(o => !o)}
              aria-label="Perfil"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "none", cursor: "pointer",
                padding: "3px 6px", borderRadius: 10, transition: "background 0.18s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surface3}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg,#00d97e,#00a5ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff",
              }}>
                {userData.displayName.slice(0, 2).toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ display: "flex", flex: 1 }}>

          {/* ── SIDEBAR ── */}
          <aside style={{
            width: SIDEBAR_W,
            background: t.sidebar,
            borderRight: `1px solid ${t.border}`,
            flexShrink: 0,
            transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 56,
            height: "calc(100vh - 56px)",
          }}>
            <nav style={{
              flex: 1, padding: "10px 8px",
              display: "flex", flexDirection: "column", gap: 2,
              overflowY: "auto", overflowX: "hidden",
            }}>
              {NAV_SECTIONS.map(section => (
                <div key={section.label}>
                  {/* Section label — hidden when collapsed */}
                  {sidebarOpen && (
                    <div style={{
                      fontSize: 9, fontWeight: 600, color: t.textFaint,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      padding: "10px 10px 4px",
                    }}>
                      {section.label}
                    </div>
                  )}
                  {!sidebarOpen && <div style={{ height: 10 }} />}

                  {section.items.map(item => {
                    const active = isActive(item.path);
                    const badge  = item.id === "notificaciones" ? notifBadge : 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => router.push(item.path)}
                        title={!sidebarOpen ? item.label : undefined}
                        className={!sidebarOpen ? "nav-item-collapsed" : ""}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: sidebarOpen ? 10 : 0,
                          justifyContent: sidebarOpen ? "flex-start" : "center",
                          padding: sidebarOpen ? "8px 10px" : "9px",
                          borderRadius: 10,
                          border: "none",
                          borderLeft: `2.5px solid ${active ? t.accent : "transparent"}`,
                          cursor: "pointer",
                          background: active ? t.accentBg : "transparent",
                          color: active ? t.accent : t.textMuted,
                          fontWeight: active ? 700 : 500,
                          fontSize: 12.5,
                          textAlign: "left",
                          width: "100%",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s cubic-bezier(.4,0,.2,1)",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          position: "relative",
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = t.surfaceHover;
                            el.style.color = t.text;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = "transparent";
                            el.style.color = t.textMuted;
                          }
                        }}
                      >
                        <i className={`ti ${item.icon}`} style={{ fontSize: 18, flexShrink: 0 }} aria-hidden />

                        {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}

                        {sidebarOpen && badge > 0 && (
                          <span style={{
                            background: t.danger, color: "#fff",
                            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                          }}>{badge}</span>
                        )}

                        {/* Collapsed: dot badge */}
                        {!sidebarOpen && badge > 0 && (
                          <span style={{
                            position: "absolute", top: 7, right: 7,
                            width: 6, height: 6, background: t.danger, borderRadius: "50%",
                            border: `1.5px solid ${t.sidebar}`,
                          }} />
                        )}

                        {/* Collapsed tooltip */}
                        {!sidebarOpen && (
                          <span className="nav-tooltip-box">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Bottom profile items */}
            <div style={{ padding: "8px", borderTop: `1px solid ${t.border}` }}>
              {PROFILE_MENU.map(item => (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  className={!sidebarOpen ? "nav-item-collapsed" : ""}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: sidebarOpen ? 10 : 0,
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    padding: sidebarOpen ? "8px 10px" : "9px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: "transparent",
                    color: item.danger ? t.danger : t.textMuted,
                    fontWeight: 500,
                    fontSize: 12.5,
                    textAlign: "left",
                    width: "100%",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = item.danger ? t.dangerBg : t.surfaceHover;
                    el.style.color = item.danger ? t.danger : t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "transparent";
                    el.style.color = item.danger ? t.danger : t.textMuted;
                  }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 17, flexShrink: 0 }} aria-hidden />
                  {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!sidebarOpen && (
                    <span className="nav-tooltip-box">{item.label}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main style={{
            flex: 1, minWidth: 0,
            padding: "1.5rem",
            overflowX: "hidden",
            overflowY: "auto",
          }}>
            {pathname === "/dashboard/admin" ? (
              <OverviewTab
                t={t}
                onNavigate={navigate}
                stats={stats}
                sessions={sessions}
                topTechs={topTechs}
                contacts={contacts}
                notifs={recentNotifs}
                loading={overviewLoading}
                error={overviewError}
                onRetry={loadDashboard}
              />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </>
  );
}