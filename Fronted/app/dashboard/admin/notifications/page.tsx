'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import {
  notificationsService,
  TIPO_CONFIG,
  type Notif,
  type NotifTipo,
} from "@/services/notifications.service";

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
  searchBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  searchBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
});

type ThemeTokens = ReturnType<typeof getThemeTokens>;

// ─── CLASE DE ERROR PERSONALIZADA ─────────────────────────────────────────────

/**
 * Error personalizado para el módulo de notificaciones
 * Permite un manejo más granular de errores en la capa de servicios
 */
export class NotificationsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'NotificationsError';
    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotificationsError);
    }
  }

  /**
   * Crea un NotificationsError desde un error desconocido
   */
  static fromUnknown(err: unknown): NotificationsError {
    if (err instanceof NotificationsError) {
      return err;
    }
    
    if (err instanceof Error) {
      return new NotificationsError(err.message, 'UNKNOWN_ERROR', undefined, err);
    }
    
    return new NotificationsError(
      'Ocurrió un error inesperado al procesar la solicitud',
      'UNKNOWN_ERROR',
      undefined,
      err
    );
  }

  /**
   * Determina si el error es de tipo "no autorizado"
   */
  isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Determina si el error es de tipo "no encontrado"
   */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Determina si el error es de tipo "timeout"
   */
  isTimeout(): boolean {
    return this.code === 'TIMEOUT' || this.code === 'ECONNABORTED';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${days} día${days > 1 ? "s" : ""}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Pill de filtro reutilizable */
function FilterPill({
  active,
  label,
  count,
  onClick,
  color,
  tokens,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  color: string;
  tokens: ThemeTokens;
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
        border: `1.5px solid ${active ? color : tokens.border}`,
        color: active ? color : tokens.textMuted,
        transition: "all 0.15s",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          style={{
            background: active ? color : tokens.surface2,
            color: active ? "#fff" : tokens.textMuted,
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 99,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Skeleton de carga */
function LoadingSkeleton({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              height: 28,
              width: 200,
              background: tokens.surface2,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 16,
              width: 240,
              background: tokens.surface2,
              borderRadius: 6,
            }}
          />
        </div>
        <div
          style={{
            height: 38,
            width: 200,
            background: tokens.surface2,
            borderRadius: 10,
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 12,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              height: 72,
            }}
          >
            <div
              style={{
                height: "100%",
                background: tokens.surface2,
                borderRadius: 8,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[80, 110, 80, 100, 90, 110].map((w, i) => (
          <div
            key={i}
            style={{
              height: 32,
              width: w,
              background: tokens.surface2,
              borderRadius: 99,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              height: 88,
            }}
          >
            <div
              style={{
                height: "100%",
                background: tokens.surface2,
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
  tokens,
}: {
  message: string;
  onRetry: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <div
      style={{
        background: tokens.dangerBg,
        border: `1px solid ${tokens.danger}44`,
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
          style={{ fontSize: 18, color: tokens.danger }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: tokens.danger,
            }}
          >
            Error al cargar notificaciones
          </p>
          <p
            style={{ margin: "2px 0 0", fontSize: 12, color: tokens.textMuted }}
          >
            {message}
          </p>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          background: tokens.dangerBg,
          border: `1px solid ${tokens.danger}66`,
          color: tokens.danger,
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

/** Toast de error inline para acciones */
function ActionToast({
  message,
  type = "error",
  tokens,
}: {
  message: string;
  type?: "error" | "success";
  tokens: ThemeTokens;
}) {
  const isError = type === "error";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: isError ? tokens.dangerBg : tokens.accentBg,
        border: `1px solid ${isError ? tokens.danger : tokens.accent}55`,
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 999,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <i
        className={`ti ${isError ? "ti-alert-circle" : "ti-circle-check"}`}
        style={{ fontSize: 16, color: isError ? tokens.danger : tokens.accent }}
      />
      <span
        style={{
          fontSize: 13,
          color: isError ? tokens.danger : tokens.accent,
          fontWeight: 600,
        }}
      >
        {message}
      </span>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/** Estado vacío diferenciado */
function EmptyState({
  readFilter,
  tipoFilter,
  hasData,
  tokens,
}: {
  readFilter: string;
  tipoFilter: string;
  hasData: boolean;
  tokens: ThemeTokens;
}) {
  const isFiltered = readFilter !== "todas" || tipoFilter !== "todos";

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
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 14,
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <i
        className={`ti ${icon}`}
        style={{
          fontSize: 40,
          color: tokens.textFaint,
          display: "block",
          marginBottom: 12,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: tokens.textMuted,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{ margin: "6px 0 0", fontSize: 12, color: tokens.textFaint }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [readFilter, setReadFilter] = useState<
    "todas" | "no_leidas" | "leidas"
  >("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");

  // ── Helpers de acción ────────────────────────────────────────────────

  const showActionMessage = (text: string, type: "error" | "success" = "error") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getNotificaciones();
      setNotifs(data);
    } catch (err) {
      // Manejo de errores usando la clase NotificationsError
      const notificationsError = NotificationsError.fromUnknown(err);
      
      // Mensajes personalizados según el tipo de error
      let userMessage: string;
      
      if (notificationsError.isUnauthorized()) {
        userMessage = 'No tienes permisos para ver las notificaciones. Por favor, inicia sesión nuevamente.';
      } else if (notificationsError.isNotFound()) {
        userMessage = 'No se encontraron notificaciones en el sistema.';
      } else if (notificationsError.isTimeout()) {
        userMessage = 'La solicitud ha tardado demasiado. Por favor, verifica tu conexión e intenta nuevamente.';
      } else {
        // Usar el mensaje del error o uno genérico
        userMessage = notificationsError.message || 'Ocurrió un error inesperado al cargar las notificaciones.';
      }
      
      setError(userMessage);
      console.error("[NotificationsPage] fetchNotificaciones:", {
        originalError: err,
        notificationsError,
        userMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // ── Acciones sincronizadas con backend ────────────────────────────────────

  const markRead = async (id: number) => {
    const original = notifs.find((n) => n.id === id);
    if (!original || original.leida) return;

    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );

    try {
      await notificationsService.markAsRead(id);
      showActionMessage("Notificación marcada como leída", "success");
    } catch (err) {
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: false } : n))
      );
      const notificationsError = NotificationsError.fromUnknown(err);
      showActionMessage(
        notificationsError.message || "No se pudo marcar como leída."
      );
    }
  };

  const markAllRead = async () => {
    const prev = notifs;
    setNotifs((ns) => ns.map((n) => ({ ...n, leida: true })));

    try {
      await notificationsService.markAllAsRead();
      showActionMessage("Todas las notificaciones marcadas como leídas", "success");
    } catch (err) {
      setNotifs(prev);
      const notificationsError = NotificationsError.fromUnknown(err);
      showActionMessage(
        notificationsError.message || "No se pudieron marcar todas como leídas."
      );
    }
  };

  const deleteNotif = async (id: number) => {
    const removed = notifs.find((n) => n.id === id);
    if (!removed) return;

    setNotifs((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationsService.deleteNotif(id);
      showActionMessage("Notificación eliminada", "success");
    } catch (err) {
      setNotifs((prev) => {
        const copy = [...prev];
        const originalIndex = notifs.findIndex((n) => n.id === id);
        copy.splice(originalIndex, 0, removed);
        return copy;
      });
      const notificationsError = NotificationsError.fromUnknown(err);
      showActionMessage(
        notificationsError.message || "No se pudo eliminar la notificación."
      );
    }
  };

  const deleteAllRead = async () => {
    const prev = notifs;
    setNotifs((prev) => prev.filter((n) => !n.leida));

    try {
      await notificationsService.deleteAllRead();
      showActionMessage("Notificaciones leídas eliminadas", "success");
    } catch (err) {
      setNotifs(prev);
      const notificationsError = NotificationsError.fromUnknown(err);
      showActionMessage(
        notificationsError.message || "No se pudieron eliminar las notificaciones."
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
        <LoadingSkeleton tokens={tokens} />
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
          color: tokens.text,
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
                color: tokens.text,
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
                    background: tokens.danger,
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
              style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}
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
                border: `1.5px solid ${tokens.border}`,
                background: "transparent",
                color: tokens.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = tokens.accent + "66")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = tokens.border)
              }
            >
              <i className="ti ti-refresh" style={{ fontSize: 15 }} />
              Actualizar
            </button>
            {stats.leidas > 0 && (
              <button
                onClick={deleteAllRead}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${tokens.border}`,
                  background: "transparent",
                  color: tokens.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = tokens.danger + "66")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = tokens.border)
                }
              >
                <i className="ti ti-trash" style={{ fontSize: 15 }} />
                Limpiar leídas
              </button>
            )}
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
                  stats.sinLeer > 0 ? tokens.accent + "66" : tokens.border
                }`,
                background: "transparent",
                color: stats.sinLeer > 0 ? tokens.accent : tokens.textFaint,
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
          <ErrorBanner message={error} onRetry={fetchNotificaciones} tokens={tokens} />
        )}

        {/* Stats cards mejoradas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total",
              value: stats.total,
              icon: "ti-bell",
              color: tokens.info,
            },
            {
              label: "Sin leer",
              value: stats.sinLeer,
              icon: "ti-bell-ringing",
              color: tokens.danger,
            },
            {
              label: "Leídas",
              value: stats.leidas,
              icon: "ti-bell-check",
              color: tokens.accent,
            },
            {
              label: "Advertencias",
              value: stats.advertencias,
              icon: "ti-alert-triangle",
              color: tokens.warning,
            },
            {
              label: "Errores",
              value: stats.errores,
              icon: "ti-circle-x",
              color: tokens.danger,
            },
            {
              label: "Éxitos",
              value: stats.exitos,
              icon: "ti-circle-check",
              color: tokens.accent,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
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
                  style={{ fontSize: 16, color: s.color }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: tokens.text,
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: tokens.textMuted,
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
            count={stats.total}
            onClick={() => setReadFilter("todas")}
            color={tokens.accent}
            tokens={tokens}
          />
          <FilterPill
            active={readFilter === "no_leidas"}
            label="Sin leer"
            count={stats.sinLeer}
            onClick={() => setReadFilter("no_leidas")}
            color={tokens.danger}
            tokens={tokens}
          />
          <FilterPill
            active={readFilter === "leidas"}
            label="Leídas"
            count={stats.leidas}
            onClick={() => setReadFilter("leidas")}
            color={tokens.accent}
            tokens={tokens}
          />

          <div
            style={{
              width: 1,
              height: 20,
              background: tokens.border,
              margin: "0 4px",
            }}
          />

          <FilterPill
            active={tipoFilter === "todos"}
            label="Todos los tipos"
            onClick={() => setTipoFilter("todos")}
            color={tokens.accent}
            tokens={tokens}
          />
          {(["success", "info", "warning", "error"] as NotifTipo[]).map(
            (tipo) => {
              const cfg = TIPO_CONFIG[tipo];
              const count =
                tipo === "success"
                  ? stats.exitos
                  : tipo === "info"
                  ? stats.informacion
                  : tipo === "warning"
                  ? stats.advertencias
                  : stats.errores;
              return (
                <FilterPill
                  key={tipo}
                  active={tipoFilter === tipo}
                  label={cfg.label}
                  count={count}
                  onClick={() => setTipoFilter(tipo)}
                  color={cfg.c}
                  tokens={tokens}
                />
              );
            }
          )}
        </div>

        {/* Lista de notificaciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifs.length === 0 && !error ? (
            <EmptyState
              readFilter={readFilter}
              tipoFilter={tipoFilter}
              hasData={false}
              tokens={tokens}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              readFilter={readFilter}
              tipoFilter={tipoFilter}
              hasData={true}
              tokens={tokens}
            />
          ) : (
            filtered.map((n) => {
              const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.info;
              return (
                <div
                  key={n.id}
                  style={{
                    background: tokens.surface,
                    border: `1.5px solid ${
                      n.leida ? tokens.border : cfg.c + "50"
                    }`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    transition: "all 0.2s",
                    opacity: n.leida ? 0.75 : 1,
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!n.leida) {
                      e.currentTarget.style.borderColor = cfg.c;
                      e.currentTarget.style.transform = "translateX(2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = n.leida
                      ? tokens.border
                      : cfg.c + "50";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {/* Indicador visual de no leída */}
                  {!n.leida && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: cfg.c,
                      }}
                    />
                  )}

                  {/* Ícono de tipo */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
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
                      style={{ fontSize: 20, color: cfg.c }}
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
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: n.leida ? 600 : 700,
                          color: tokens.text,
                        }}
                      >
                        {n.titulo}
                      </span>
                      {!n.leida && (
                        <span
                          style={{
                            background: cfg.c + "20",
                            color: cfg.c,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 99,
                          }}
                        >
                          Nueva
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: tokens.textFaint,
                          marginLeft: "auto",
                        }}
                        title={formatDate(n.fecha_creacion)}
                      >
                        {timeAgo(n.fecha_creacion)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 13,
                        color: tokens.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.mensaje}
                    </p>
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
                          background: tokens.accentBg,
                          border: "none",
                          cursor: "pointer",
                          color: tokens.accent,
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = "0.8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        <i className="ti ti-check" style={{ marginRight: 4 }} />
                        Leída
                      </button>
                    )}
                    {n.url_accion && (
                      <button
                        title="Ver detalle"
                        style={{
                          background: tokens.surface2,
                          border: `1px solid ${tokens.border}`,
                          cursor: "pointer",
                          color: tokens.textMuted,
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = tokens.accent)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = tokens.border)
                        }
                      >
                        <i className="ti ti-eye" style={{ marginRight: 4 }} />
                        Ver
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      title="Eliminar"
                      style={{
                        background: "none",
                        border: `1px solid ${tokens.border}`,
                        cursor: "pointer",
                        color: tokens.textFaint,
                        padding: "6px 10px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: "inherit",
                        lineHeight: 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = tokens.danger;
                        e.currentTarget.style.color = tokens.danger;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = tokens.border;
                        e.currentTarget.style.color = tokens.textFaint;
                      }}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie de página informativo */}
        {notifs.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: "10px 16px",
              background: tokens.surface2,
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 6, verticalAlign: "middle" }} />
              Las notificaciones importantes del sistema aparecerán aquí. Puedes marcarlas como leídas o eliminarlas.
            </p>
          </div>
        )}
      </div>

      {/* Toast de mensajes */}
      {actionMessage && (
        <ActionToast message={actionMessage.text} type={actionMessage.type} tokens={tokens} />
      )}
    </>
  );
}