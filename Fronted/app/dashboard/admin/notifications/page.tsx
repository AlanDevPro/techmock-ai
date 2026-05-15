'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  notificationsService,
  NotificationsError,
  TIPO_CONFIG,
  type Notif,
  type NotifTipo,
} from "@/services/notifications.service";

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
    searchBg: "rgba(255,255,255,0.06)",
    searchBorder: "rgba(255,255,255,0.12)",
  },
};

type Theme = typeof T.dark;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace menos de 1 h";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? "s" : ""}`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Pill de filtro reutilizable */
function FilterPill({
  active,
  label,
  onClick,
  color,
  t,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  color: string;
  t: Theme;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? color + "20" : "transparent",
        border: `1.5px solid ${active ? color : t.border}`,
        color: active ? color : t.textMuted,
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

/** Skeleton de carga */
function LoadingSkeleton({ t }: { t: Theme }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              height: 28,
              width: 200,
              background: t.surface2,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 16,
              width: 240,
              background: t.surface2,
              borderRadius: 6,
            }}
          />
        </div>
        <div
          style={{
            height: 38,
            width: 200,
            background: t.surface2,
            borderRadius: 10,
          }}
        />
      </div>

      {/* Stats skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              height: 72,
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

      {/* Pills skeleton */}
      <div style={{ display: "flex", gap: 8 }}>
        {[80, 110, 80, 100, 90, 110].map((w, i) => (
          <div
            key={i}
            style={{
              height: 32,
              width: w,
              background: t.surface2,
              borderRadius: 99,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      {/* List skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              height: 88,
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
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/** Banner de error con retry */
function ErrorBanner({
  message,
  onRetry,
  t,
}: {
  message: string;
  onRetry: () => void;
  t: Theme;
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
        marginBottom: 20,
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
            Error al cargar notificaciones
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

/** Toast de error inline para acciones (marcar, eliminar) */
function ActionToast({
  message,
  t,
}: {
  message: string;
  t: Theme;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: t.dangerBg,
        border: `1px solid ${t.danger}55`,
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 999,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <i
        className="ti ti-alert-circle"
        style={{ fontSize: 16, color: t.danger }}
      />
      <span style={{ fontSize: 13, color: t.danger, fontWeight: 600 }}>
        {message}
      </span>
    </div>
  );
}

/** Estado vacío diferenciado */
function EmptyState({
  readFilter,
  tipoFilter,
  hasData,
  t,
}: {
  readFilter: string;
  tipoFilter: string;
  hasData: boolean;
  t: Theme;
}) {
  const isFiltered =
    readFilter !== "todas" || tipoFilter !== "todos";

  const icon = !hasData
    ? "ti-bell-off"
    : isFiltered
    ? "ti-bell-search"
    : "ti-bell-off";

  const title = !hasData
    ? "No tienes notificaciones aún"
    : isFiltered
    ? "Sin resultados con los filtros aplicados"
    : "No hay notificaciones";

  const subtitle = !hasData
    ? "Cuando haya actividad en el sistema, aparecerá aquí."
    : isFiltered
    ? "Intenta cambiar el filtro de estado o tipo."
    : undefined;

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <i
        className={`ti ${icon}`}
        style={{
          fontSize: 40,
          color: t.textFaint,
          display: "block",
          marginBottom: 12,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: t.textMuted,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{ margin: "6px 0 0", fontSize: 12, color: t.textFaint }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const t = T.dark;

  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [readFilter,  setReadFilter]  = useState<"todas" | "no_leidas" | "leidas">("todas");
  const [tipoFilter,  setTipoFilter]  = useState("todos");

  // ── Helpers de acción-error ────────────────────────────────────────────────

  const showActionError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 3500);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getNotificaciones();
      setNotifs(data);
    } catch (err) {
      const message =
        err instanceof NotificationsError
          ? err.message
          : "Ocurrió un error inesperado.";
      setError(message);
      console.error("[NotificationsPage] fetchNotificaciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // ── Acciones sincronizadas con backend ────────────────────────────────────

  const markRead = async (id: number) => {
    // Optimistic update
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
    try {
      await notificationsService.markAsRead(id);
    } catch (err) {
      // Rollback
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: false } : n))
      );
      showActionError(
        err instanceof NotificationsError
          ? err.message
          : "No se pudo marcar como leída."
      );
    }
  };

  const markAllRead = async () => {
    const prev = notifs;
    // Optimistic update
    setNotifs((ns) => ns.map((n) => ({ ...n, leida: true })));
    try {
      await notificationsService.markAllAsRead();
    } catch (err) {
      // Rollback
      setNotifs(prev);
      showActionError(
        err instanceof NotificationsError
          ? err.message
          : "No se pudieron marcar todas como leídas."
      );
    }
  };

  const deleteNotif = async (id: number) => {
    const removed = notifs.find((n) => n.id === id);
    // Optimistic update
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsService.deleteNotif(id);
    } catch (err) {
      // Rollback
      if (removed) {
        setNotifs((prev) => {
          const copy = [...prev];
          const originalIndex = notifs.findIndex((n) => n.id === id);
          copy.splice(originalIndex, 0, removed);
          return copy;
        });
      }
      showActionError(
        err instanceof NotificationsError
          ? err.message
          : "No se pudo eliminar la notificación."
      );
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const stats = notificationsService.calcStats(notifs);

  const filtered = useMemo(
    () =>
      notificationsService.filterNotifs(notifs, {
        readFilter,
        tipoFilter,
      }),
    [notifs, readFilter, tipoFilter]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <LoadingSkeleton t={t} />
      </>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: t.text,
          fontSize: 14,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: t.text,
                display: "flex",
                alignItems: "center",
                gap: 10,
                letterSpacing: "-0.02em",
              }}
            >
              Notificaciones
              {stats.sinLeer > 0 && (
                <span
                  style={{
                    background: t.danger,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                  }}
                >
                  {stats.sinLeer} nueva{stats.sinLeer !== 1 ? "s" : ""}
                </span>
              )}
            </h1>
            <p
              style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}
            >
              Centro de notificaciones del sistema
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchNotificaciones}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: `1.5px solid ${t.border}`,
                background: "transparent",
                color: t.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = t.accent + "66")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = t.border)
              }
            >
              <i className="ti ti-refresh" style={{ fontSize: 15 }} />
              Actualizar
            </button>
            <button
              onClick={markAllRead}
              disabled={stats.sinLeer === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 10,
                border: `1.5px solid ${
                  stats.sinLeer > 0 ? t.accent + "66" : t.border
                }`,
                background: "transparent",
                color: stats.sinLeer > 0 ? t.accent : t.textFaint,
                fontSize: 13,
                fontWeight: 600,
                cursor: stats.sinLeer > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <i className="ti ti-checks" style={{ fontSize: 16 }} />
              Marcar todas como leídas
            </button>
          </div>
        </div>

        {/* Error banner de carga */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={fetchNotificaciones}
            t={t}
          />
        )}

        {/* Stats — siempre visibles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total",
              value: stats.total,
              icon: "ti-bell",
              color: "#3b82f6",
            },
            {
              label: "Sin leer",
              value: stats.sinLeer,
              icon: "ti-bell-ringing",
              color: t.danger,
            },
            {
              label: "Advertencias",
              value: stats.advertencias,
              icon: "ti-alert-triangle",
              color: "#f59e0b",
            },
            {
              label: "Errores",
              value: stats.errores,
              icon: "ti-circle-x",
              color: t.danger,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: s.color + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i
                  className={`ti ${s.icon}`}
                  style={{ fontSize: 18, color: s.color }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: t.text,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <FilterPill
            active={readFilter === "todas"}
            label="Todas"
            onClick={() => setReadFilter("todas")}
            color={t.accent}
            t={t}
          />
          <FilterPill
            active={readFilter === "no_leidas"}
            label={`Sin leer${stats.sinLeer > 0 ? ` (${stats.sinLeer})` : ""}`}
            onClick={() => setReadFilter("no_leidas")}
            color={t.danger}
            t={t}
          />
          <FilterPill
            active={readFilter === "leidas"}
            label="Leídas"
            onClick={() => setReadFilter("leidas")}
            color={t.accent}
            t={t}
          />

          <div
            style={{
              width: 1,
              height: 20,
              background: t.border,
              margin: "0 4px",
            }}
          />

          <FilterPill
            active={tipoFilter === "todos"}
            label="Todos los tipos"
            onClick={() => setTipoFilter("todos")}
            color={t.accent}
            t={t}
          />
          {(
            ["success", "info", "warning", "error"] as NotifTipo[]
          ).map((tipo) => {
            const cfg = TIPO_CONFIG[tipo];
            return (
              <FilterPill
                key={tipo}
                active={tipoFilter === tipo}
                label={cfg.label}
                onClick={() => setTipoFilter(tipo)}
                color={cfg.c}
                t={t}
              />
            );
          })}
        </div>

        {/* Lista */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {notifs.length === 0 && !error ? (
            <EmptyState
              readFilter={readFilter}
              tipoFilter={tipoFilter}
              hasData={false}
              t={t}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              readFilter={readFilter}
              tipoFilter={tipoFilter}
              hasData={true}
              t={t}
            />
          ) : (
            filtered.map((n) => {
              const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.info;
              return (
                <div
                  key={n.id}
                  style={{
                    background: t.surface,
                    border: `1.5px solid ${
                      n.leida ? t.border : cfg.c + "40"
                    }`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    transition: "all 0.15s",
                    opacity: n.leida ? 0.78 : 1,
                  }}
                >
                  {/* Ícono de tipo */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: cfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <i
                      className={`ti ${cfg.icon}`}
                      style={{ fontSize: 18, color: cfg.c }}
                    />
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: n.leida ? 500 : 700,
                          color: t.text,
                        }}
                      >
                        {n.titulo}
                      </span>
                      {!n.leida && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: cfg.c,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: 13,
                        color: t.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.mensaje}
                    </p>
                    <span
                      style={{ fontSize: 11, color: t.textFaint }}
                    >
                      {timeAgo(n.fecha_creacion)}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexShrink: 0,
                      alignItems: "center",
                    }}
                  >
                    {!n.leida && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Marcar como leída"
                        style={{
                          background: "none",
                          border: `1px solid ${t.border}`,
                          cursor: "pointer",
                          color: t.accent,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        Leída
                      </button>
                    )}
                    {n.url_accion && (
                      <button
                        title="Ver detalle"
                        style={{
                          background: t.accentBg,
                          border: "none",
                          cursor: "pointer",
                          color: t.accent,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        Ver →
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      title="Eliminar"
                      style={{
                        background: "none",
                        border: `1px solid ${t.border}`,
                        cursor: "pointer",
                        color: t.textFaint,
                        padding: "5px 8px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: "inherit",
                        lineHeight: 1,
                      }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast de error para acciones */}
      {actionError && <ActionToast message={actionError} t={t} />}
    </>
  );
}