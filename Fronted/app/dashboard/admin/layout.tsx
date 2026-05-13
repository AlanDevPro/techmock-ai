'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  dashboardService,
  DashboardError,
  type DashboardStats,
  type RecentSession,
  type TopTech,
  type RecentContact,
  type RecentNotif,
} from "@/services/dashboard.service";
import { estadisticasService } from "@/services/estadisticas.service";

// ─── Rutas del sidebar ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview",       label: "Overview",       icon: "ti-layout-dashboard", path: "/dashboard/admin" },
  { id: "usuarios",       label: "Usuarios",       icon: "ti-users",            path: "/dashboard/admin/developers" },
  { id: "sesiones",       label: "Sesiones",       icon: "ti-video",            path: "/dashboard/admin/interviews" },
  { id: "preguntas",      label: "Preguntas",      icon: "ti-help-circle",      path: "/dashboard/admin/questions" },
  { id: "tecnologias",    label: "Tecnologías",    icon: "ti-cpu",              path: "/dashboard/admin/technologies" },
  { id: "evaluaciones",   label: "Evaluaciones",   icon: "ti-chart-bar",        path: "/dashboard/admin/analytics" },
  { id: "reclutamiento",  label: "Reclutamiento",  icon: "ti-mail",             path: "/dashboard/admin/recruitment" },
  { id: "notificaciones", label: "Notificaciones", icon: "ti-bell",             path: "/dashboard/admin/notifications", badge: 0 },
] as const;

const PROFILE_MENU = [
  { id: "perfil",  label: "Mi perfil",              icon: "ti-user",     path: "/dashboard/profile" },
  { id: "ranking", label: "Tabla de clasificación", icon: "ti-trophy",   path: "/dashboard/ranking" },
  { id: "ajustes", label: "Ajustes",                icon: "ti-settings", path: "/dashboard/admin/settings" },
  { id: "envios",  label: "Mis envíos",             icon: "ti-send",     path: "/dashboard/submissions" },
  { id: "logout",  label: "Cerrar sesión",          icon: "ti-logout",   path: "/logout", danger: true },
] as const;

// ─── Tema ─────────────────────────────────────────────────────────────────────

const T = {
  dark: {
    bg: "#111214",
    surface: "#1a1c20",
    surface2: "#20232a",
    surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)",
    text: "#e8eaed",
    textMuted: "#8b8fa8",
    textFaint: "#555868",
    accent: "#00c96b",
    accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444",
    dangerBg: "rgba(239,68,68,0.1)",
    warning: "#f59e0b",
    warningBg: "rgba(245,158,11,0.1)",
    topbar: "#16181d",
    sidebar: "#13151a",
    searchBg: "rgba(255,255,255,0.06)",
    searchBorder: "rgba(255,255,255,0.12)",
    pill: {
      completada:  { bg: "rgba(0,201,107,0.12)",  c: "#00c96b" },
      en_progreso: { bg: "rgba(59,130,246,0.12)", c: "#60a5fa" },
      abandonada:  { bg: "rgba(239,68,68,0.12)",  c: "#f87171" },
      enviado:     { bg: "rgba(245,158,11,0.12)", c: "#fbbf24" },
      respondido:  { bg: "rgba(0,201,107,0.12)",  c: "#00c96b" },
    },
    notif: {
      warning: { bg: "rgba(245,158,11,0.1)",  c: "#fbbf24", icon: "ti-alert-triangle" },
      info:    { bg: "rgba(59,130,246,0.1)",  c: "#60a5fa", icon: "ti-info-circle" },
      success: { bg: "rgba(0,201,107,0.1)",   c: "#00c96b", icon: "ti-circle-check" },
      error:   { bg: "rgba(239,68,68,0.1)",   c: "#f87171", icon: "ti-circle-x" },
    },
  },
} as const;

type Theme = keyof typeof T;
type ThemeTokens = (typeof T)[Theme];

// ─── Tipo auxiliar para el mapa de notif ─────────────────────────────────────

type NotifConfig = { bg: string; c: string; icon: string };
type NotifMap = Record<string, NotifConfig>;

// ─── Constantes visuales ──────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#00c96b", "#3b82f6", "#a855f7",
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
  const s =
    (t.pill as Record<string, { bg: string; c: string }>)[status] ??
    { bg: "rgba(0,0,0,0.05)", c: t.textMuted };
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 99,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Avatar({
  initials,
  size = 30,
  color = "#00c96b",
}: {
  initials: string;
  size?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color + "22",
        border: `1.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function IconBtn({
  icon,
  label,
  onClick,
  children,
  t,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
  t: ThemeTokens;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: t.textMuted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 8,
        transition: "all 0.12s",
        position: "relative",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = t.searchBg;
        (e.currentTarget as HTMLElement).style.color = t.text;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "none";
        (e.currentTarget as HTMLElement).style.color = t.textMuted;
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 19 }} aria-hidden />
      {children}
    </button>
  );
}

// ─── Skeleton de overview ─────────────────────────────────────────────────────

function OverviewSkeleton({ t }: { t: ThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))",
          gap: 16,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "1.1rem 1.25rem",
              height: 110,
            }}
          >
            <div
              style={{
                height: "100%",
                background: t.surface2,
                borderRadius: 8,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 20,
        }}
      >
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            height: 340,
          }}
        >
          <div
            style={{
              margin: 20,
              height: "calc(100% - 40px)",
              background: t.surface2,
              borderRadius: 8,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[180, 140].map((h, i) => (
            <div
              key={i}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                height: h,
              }}
            >
              <div
                style={{
                  margin: 16,
                  height: "calc(100% - 32px)",
                  background: t.surface2,
                  borderRadius: 8,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Error banner del overview ────────────────────────────────────────────────

function OverviewError({
  message,
  onRetry,
  t,
}: {
  message: string;
  onRetry: () => void;
  t: ThemeTokens;
}) {
  return (
    <div
      style={{
        background: t.dangerBg,
        border: `1px solid ${t.danger}44`,
        borderRadius: 12,
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i
          className="ti ti-alert-circle"
          style={{ fontSize: 18, color: t.danger }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: t.danger,
            }}
          >
            Error al cargar el dashboard
          </p>
          <p
            style={{ margin: "2px 0 0", fontSize: 12, color: t.textMuted }}
          >
            {message}
          </p>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          background: t.dangerBg,
          border: `1px solid ${t.danger}66`,
          color: t.danger,
          borderRadius: 8,
          padding: "7px 16px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ─── Empty state genérico ─────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
  t,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  t: ThemeTokens;
}) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "3rem 2rem",
        textAlign: "center",
      }}
    >
      <i
        className={`ti ${icon}`}
        style={{
          fontSize: 36,
          color: t.textFaint,
          display: "block",
          marginBottom: 10,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: t.textMuted,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p style={{ margin: "5px 0 0", fontSize: 12, color: t.textFaint }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  t,
  onNavigate,
  stats,
  sessions,
  topTechs,
  contacts,
  notifs,
  loading,
  error,
  onRetry,
}: {
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
}) {
  const maxSessions = Math.max(...topTechs.map((tech) => tech.sessions), 1);

  // ── FIX: cast correcto sin salto de línea entre "Record" y "<" ──────────
  const notifMap = t.notif as NotifMap;

  if (loading) return <OverviewSkeleton t={t} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <OverviewError message={error} onRetry={onRetry} t={t} />}

      {/* ── Stats ── */}
      {stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))",
            gap: 16,
          }}
        >
          {estadisticasService.buildStatCards(stats).map((s, i) => (
            <div
              key={i}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "1.1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.2s, transform 0.15s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  s.accent + "55";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 70,
                  height: 70,
                  background: s.accent + "0d",
                  borderRadius: "0 14px 0 70px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {s.label}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: s.accent + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={`ti ${s.icon}`}
                    style={{ fontSize: 17, color: s.accent }}
                    aria-hidden
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: t.text,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>{s.sub}</div>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            icon="ti-chart-bar"
            title="Sin estadísticas disponibles"
            subtitle="Los datos del sistema aparecerán aquí cuando estén disponibles."
            t={t}
          />
        )
      )}

      {/* ── Sesiones + side widgets ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 20,
        }}
      >
        {/* Sesiones recientes */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}
            >
              Sesiones recientes
            </h3>
            <button
              onClick={() => onNavigate("/dashboard/admin/interviews")}
              style={{
                fontSize: 12,
                color: t.accent,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Ver todas →
            </button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              icon="ti-video-off"
              title="Sin sesiones recientes"
              subtitle="Las sesiones completadas aparecerán aquí."
              t={t}
            />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Usuario", "Tecnología", "Nivel", "Puntaje", "Estado"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: t.textFaint,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr
                    key={i}
                    style={{ transition: "background 0.12s", cursor: "default" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        t.surfaceHover)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "9px 8px",
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 9 }}
                      >
                        <Avatar
                          initials={s.initials}
                          size={28}
                          color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: t.text,
                            }}
                          >
                            {s.user_name}
                          </div>
                          <div style={{ fontSize: 11, color: t.textFaint }}>
                            {s.time}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        fontSize: 13,
                        color: t.textMuted,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {s.tech}
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        fontSize: 12,
                        color: t.textMuted,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {s.level}
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        fontSize: 14,
                        fontWeight: 700,
                        color: estadisticasService.scoreColor(s.score, {
                          accent: t.accent,
                          warning: t.warning,
                          danger: t.danger,
                          textFaint: t.textFaint,
                        }),
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {s.score ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 8px",
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      <Pill status={s.status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Side: Top techs + Notificaciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top tecnologías */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "1.25rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 14,
                fontWeight: 700,
                color: t.text,
              }}
            >
              Top tecnologías
            </h3>
            {topTechs.length === 0 ? (
              <EmptyState
                icon="ti-cpu"
                title="Sin datos de tecnologías"
                t={t}
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {topTechs.map((tech) => (
                  <div key={tech.nombre}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 7 }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: tech.color,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: t.text,
                          }}
                        >
                          {tech.nombre}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: t.textMuted }}>
                        {tech.sessions} · avg{" "}
                        <strong style={{ color: t.text }}>{tech.avg}</strong>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: t.border,
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${estadisticasService.calcBarWidth(
                            tech.sessions,
                            maxSessions
                          )}%`,
                          background: tech.color,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notificaciones recientes */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "1.25rem",
              flex: 1,
            }}
          >
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: 14,
                fontWeight: 700,
                color: t.text,
              }}
            >
              Notificaciones recientes
            </h3>
            {notifs.length === 0 ? (
              <EmptyState
                icon="ti-bell-off"
                title="Sin notificaciones"
                t={t}
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 9 }}
              >
                {notifs.map((n, i) => {
                  // ── FIX: variable extraída antes del JSX, sin cast multilínea ──
                  const ns: NotifConfig =
                    notifMap[n.type] ?? notifMap["info"];
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "9px 11px",
                        background: ns.bg,
                        borderRadius: 10,
                      }}
                    >
                      <i
                        className={`ti ${ns.icon}`}
                        aria-hidden
                        style={{
                          color: ns.c,
                          fontSize: 15,
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: t.text,
                            lineHeight: 1.4,
                          }}
                        >
                          {n.msg}
                        </p>
                        <p
                          style={{
                            margin: "3px 0 0",
                            fontSize: 11,
                            color: t.textFaint,
                          }}
                        >
                          {n.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reclutamiento reciente ── */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}
          >
            Reclutamiento reciente
          </h3>
          <button
            onClick={() => onNavigate("/dashboard/admin/recruitment")}
            style={{
              fontSize: 12,
              color: t.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ver todos →
          </button>
        </div>

        {contacts.length === 0 ? (
          <EmptyState
            icon="ti-mail-off"
            title="Sin contactos recientes"
            subtitle="Los contactos de reclutamiento aparecerán aquí."
            t={t}
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Developer", "Asunto", "Estado", "Enviado"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "6px 8px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.textFaint,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr
                  key={i}
                  style={{ transition: "background 0.12s" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      t.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      padding: "10px 8px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: t.text,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    {c.dev}
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      fontSize: 13,
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    {c.subject}
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <Pill status={c.status} t={t} />
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      fontSize: 12,
                      color: t.textFaint,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    {c.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Acciones rápidas ── */}
      <div>
        <h3
          style={{
            margin: "0 0 14px",
            fontSize: 14,
            fontWeight: 700,
            color: t.text,
          }}
        >
          Acciones rápidas
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Nuevo desarrollador", icon: "ti-user-plus", color: "#3b82f6", path: "/dashboard/admin/developers" },
            { label: "Nueva pregunta",      icon: "ti-plus",      color: "#00c96b", path: "/dashboard/admin/questions" },
            { label: "Ver evaluaciones",    icon: "ti-chart-bar", color: "#a855f7", path: "/dashboard/admin/analytics" },
            { label: "Enviar contacto",     icon: "ti-mail",      color: "#f59e0b", path: "/dashboard/admin/recruitment" },
            { label: "Nueva tecnología",    icon: "ti-cpu",       color: "#14b8a6", path: "/dashboard/admin/technologies" },
            { label: "Notificaciones",      icon: "ti-bell",      color: "#ec4899", path: "/dashboard/admin/notifications" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                background: a.color + "12",
                border: `1px solid ${a.color}30`,
                borderRadius: 12,
                padding: "1.1rem 0.75rem",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  a.color + "22";
                (e.currentTarget as HTMLElement).style.borderColor =
                  a.color + "60";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  a.color + "12";
                (e.currentTarget as HTMLElement).style.borderColor =
                  a.color + "30";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: a.color + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className={`ti ${a.icon}`}
                  aria-hidden
                  style={{ fontSize: 20, color: a.color }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.text,
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const [theme]       = useState<Theme>("dark");
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [searchVal,    setSearchVal]    = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const t = T[theme];

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError,   setOverviewError]   = useState<string | null>(null);
  const [stats,           setStats]           = useState<DashboardStats | null>(null);
  const [sessions,        setSessions]        = useState<RecentSession[]>([]);
  const [topTechs,        setTopTechs]        = useState<(TopTech & { color: string })[]>([]);
  const [contacts,        setContacts]        = useState<RecentContact[]>([]);
  const [notifBadge,      setNotifBadge]      = useState(0);
  const [recentNotifs,    setRecentNotifs]    = useState<RecentNotif[]>([]);

  const loadDashboard = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const [
        statsData,
        sessionsData,
        techsData,
        contactsData,
        notifsData,
      ] = await Promise.all([
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
        notifsData.filter((n) => n.type === "warning" || n.type === "error")
          .length
      );
    } catch (err) {
      const message =
        err instanceof DashboardError
          ? err.message
          : "Error inesperado al cargar el dashboard.";
      setOverviewError(message);
      console.error("[AdminDashboardLayout] loadDashboard:", err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      )
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path: string) => {
    if (path === "/dashboard/admin") return pathname === "/dashboard/admin";
    return pathname.startsWith(path);
  };

  const activeNav = NAV_ITEMS.find((n) => isActive(n.path)) ?? NAV_ITEMS[0];
  const navigate  = (path: string) => router.push(path);
  const SIDEBAR_W = sidebarOpen ? 220 : 60;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: t.bg,
          fontFamily: "'DM Sans', sans-serif",
          color: t.text,
          fontSize: 14,
        }}
      >
        {/* ── TOP BAR ── */}
        <header
          style={{
            height: 54,
            background: t.topbar,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: SIDEBAR_W,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 1rem",
              borderRight: `1px solid ${t.border}`,
              height: "100%",
              transition: "width 0.22s ease",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: t.accent,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className="ti ti-code"
                aria-hidden
                style={{ fontSize: 16, color: "#fff" }}
              />
            </div>
            {sidebarOpen && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.text,
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                }}
              >
                DevInterview
              </span>
            )}
          </div>

          {/* Título de página */}
          <div
            style={{
              padding: "0 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i
              className={`ti ${activeNav?.icon}`}
              aria-hidden
              style={{ fontSize: 15, color: t.accent }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
              {activeNav?.label}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative", marginRight: 4 }}>
            <i
              className="ti ti-search"
              aria-hidden
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: t.textFaint,
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{
                background: t.searchBg,
                border: `1px solid ${t.searchBorder}`,
                borderRadius: 20,
                padding: "7px 14px 7px 32px",
                fontSize: 13,
                color: t.text,
                outline: "none",
                width: 200,
                fontFamily: "inherit",
                transition: "border-color 0.15s, width 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = t.accent + "66";
                e.target.style.width = "240px";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = t.searchBorder;
                e.target.style.width = "200px";
              }}
            />
          </div>

          {/* Notificaciones */}
          <div style={{ position: "relative" }}>
            <IconBtn
              icon="ti-bell"
              label="Notificaciones"
              onClick={() => router.push("/dashboard/admin/notifications")}
              t={t}
            >
              {notifBadge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    background: t.danger,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 99,
                    minWidth: 15,
                    height: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${t.topbar}`,
                    lineHeight: 1,
                  }}
                >
                  {notifBadge}
                </span>
              )}
            </IconBtn>
          </div>

          <div
            style={{
              width: 1,
              height: 20,
              background: t.border,
              margin: "0 6px",
            }}
          />

          {/* Perfil */}
          <div
            style={{ position: "relative", marginRight: 8 }}
            ref={profileRef}
          >
            <button
              onClick={() => setProfileOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 8,
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = t.searchBg)
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "none")
              }
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: t.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  border: `2px solid ${t.accent}50`,
                  flexShrink: 0,
                }}
              >
                A
              </div>
              <i
                className={`ti ti-chevron-${profileOpen ? "up" : "down"}`}
                aria-hidden
                style={{ fontSize: 12, color: t.textMuted }}
              />
            </button>

            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 14,
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  width: 215,
                  zIndex: 200,
                  overflow: "hidden",
                  padding: 6,
                }}
              >
                <div
                  style={{
                    padding: "10px 12px 12px",
                    borderBottom: `1px solid ${t.border}`,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: t.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      A
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: t.text }}
                      >
                        Admin
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>
                        admin@devinterview.io
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: t.accentBg,
                      borderRadius: 8,
                      padding: "5px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.accent,
                      }}
                    />
                    <span
                      style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}
                    >
                      Administrador
                    </span>
                  </div>
                </div>

                {PROFILE_MENU.map((item, i) => (
                  <div key={item.id}>
                    {i === PROFILE_MENU.length - 1 && (
                      <div
                        style={{
                          height: 1,
                          background: t.border,
                          margin: "4px 0",
                        }}
                      />
                    )}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        router.push(item.path);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "9px 12px",
                        borderRadius: 8,
                        color:
                          "danger" in item && item.danger
                            ? t.danger
                            : t.text,
                        fontSize: 13,
                        fontWeight: 500,
                        transition: "background 0.1s",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "danger" in item && item.danger
                            ? t.danger + "14"
                            : t.surfaceHover)
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "none")
                      }
                    >
                      <i
                        className={`ti ${item.icon}`}
                        aria-hidden
                        style={{ fontSize: 16, flexShrink: 0 }}
                      />
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
          <aside
            style={{
              width: SIDEBAR_W,
              background: t.sidebar,
              borderRight: `1px solid ${t.border}`,
              flexShrink: 0,
              transition: "width 0.22s ease",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "sticky",
              top: 54,
              height: "calc(100vh - 54px)",
            }}
          >
            <nav
              style={{
                flex: 1,
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflowY: "auto",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                const badge  = item.id === "notificaciones" ? notifBadge : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.path)}
                    title={!sidebarOpen ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: active ? t.accentBg : "transparent",
                      color: active ? t.accent : t.textMuted,
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      textAlign: "left",
                      width: "100%",
                      whiteSpace: "nowrap",
                      transition: "all 0.12s",
                      borderLeft: `3px solid ${
                        active ? t.accent : "transparent"
                      }`,
                      position: "relative",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background =
                          t.surfaceHover;
                        (e.currentTarget as HTMLElement).style.color = t.text;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.color =
                          t.textMuted;
                      }
                    }}
                  >
                    <i
                      className={`ti ${item.icon}`}
                      aria-hidden
                      style={{ fontSize: 18, flexShrink: 0 }}
                    />
                    {sidebarOpen && (
                      <span style={{ flex: 1 }}>{item.label}</span>
                    )}
                    {sidebarOpen && badge > 0 && (
                      <span
                        style={{
                          background: t.danger,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 99,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                    {!sidebarOpen && badge > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 7,
                          right: 7,
                          width: 7,
                          height: 7,
                          background: t.danger,
                          borderRadius: "50%",
                          border: `1.5px solid ${t.sidebar}`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Toggle sidebar */}
            <div
              style={{ padding: "8px", borderTop: `1px solid ${t.border}` }}
            >
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 10px",
                  borderRadius: 10,
                  color: t.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    t.surfaceHover;
                  (e.currentTarget as HTMLElement).style.color = t.text;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                  (e.currentTarget as HTMLElement).style.color = t.textMuted;
                }}
              >
                <i
                  className={`ti ${
                    sidebarOpen ? "ti-arrow-bar-left" : "ti-arrow-bar-right"
                  }`}
                  aria-hidden
                  style={{ fontSize: 18, flexShrink: 0 }}
                />
                {sidebarOpen && <span>Colapsar</span>}
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              padding: "1.5rem",
              overflowX: "hidden",
            }}
          >
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