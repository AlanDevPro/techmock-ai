'use client';

import { useState, useEffect, useMemo } from "react";
import {
  recruitmentService,
  RecruitmentError,
  type Contact,
  type ContactEstado,
} from "@/services/recruitment.service";

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

// ─── Pills de estado ──────────────────────────────────────────────────────────

const PILL: Record<ContactEstado, { bg: string; c: string }> = {
  enviado:    { bg: "rgba(245,158,11,0.12)",  c: "#fbbf24" },
  respondido: { bg: "rgba(0,201,107,0.12)",   c: "#00c96b" },
  rechazado:  { bg: "rgba(239,68,68,0.12)",   c: "#f87171" },
  en_proceso: { bg: "rgba(59,130,246,0.12)",  c: "#60a5fa" },
};

const AVATAR_COLORS = [
  "#00c96b",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace un momento";
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
              width: 180,
              background: t.surface2,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 16,
              width: 280,
              background: t.surface2,
              borderRadius: 6,
            }}
          />
        </div>
        <div
          style={{
            height: 38,
            width: 140,
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
              height: 90,
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
            Error al cargar reclutamientos
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

/** Estado vacío diferenciado */
function EmptyState({
  filtered,
  t,
}: {
  filtered: boolean;
  t: Theme;
}) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "4rem 2rem",
        textAlign: "center",
      }}
    >
      <i
        className={filtered ? "ti ti-mail-search" : "ti ti-mail-off"}
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
        {filtered
          ? "No se encontraron contactos con los filtros aplicados"
          : "Aún no hay contactos de reclutamiento registrados"}
      </p>
      {filtered && (
        <p
          style={{ margin: "6px 0 0", fontSize: 12, color: t.textFaint }}
        >
          Intenta ajustar la búsqueda o el filtro de estado
        </p>
      )}
    </div>
  );
}

/** Panel lateral de detalle */
function DetailPanel({
  contact,
  onClose,
  t,
}: {
  contact: Contact;
  onClose: () => void;
  t: Theme;
}) {
  const pill = PILL[contact.estado];
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "20px",
        height: "fit-content",
        position: "sticky",
        top: 20,
      }}
    >
      {/* Header del panel */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: t.text,
          }}
        >
          Detalle del contacto
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: t.textMuted,
            fontSize: 18,
          }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Developer info */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: t.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            Developer
          </div>
          <div
            style={{ fontSize: 15, fontWeight: 700, color: t.text }}
          >
            {contact.developer}
          </div>
          <div style={{ fontSize: 12, color: t.textMuted }}>
            {contact.email}
          </div>
        </div>

        <div style={{ height: 1, background: t.border }} />

        {/* Estado + score */}
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: t.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 4,
              }}
            >
              Estado
            </div>
            <span
              style={{
                background: pill.bg,
                color: pill.c,
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 99,
              }}
            >
              {contact.estado.replace("_", " ")}
            </span>
          </div>
          {contact.sesion_score !== null && (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  color: t.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 4,
                }}
              >
                Score sesión
              </div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#00c96b",
                }}
              >
                {contact.sesion_score}
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: t.border }} />

        {/* Asunto */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: t.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            Asunto
          </div>
          <div
            style={{ fontSize: 13, color: t.text, fontWeight: 600 }}
          >
            {contact.asunto}
          </div>
        </div>

        {/* Tecnología / Nivel */}
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              background: t.searchBg,
              color: t.textMuted,
              padding: "3px 10px",
              borderRadius: 6,
            }}
          >
            {contact.tecnologia}
          </span>
          <span
            style={{
              fontSize: 11,
              background: t.searchBg,
              color: t.textMuted,
              padding: "3px 10px",
              borderRadius: 6,
            }}
          >
            {contact.nivel}
          </span>
        </div>

        <div style={{ height: 1, background: t.border }} />

        {/* Mensaje enviado */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: t.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 6,
            }}
          >
            Mensaje enviado
          </div>
          <div
            style={{
              background: t.searchBg,
              borderRadius: 10,
              padding: "12px",
              fontSize: 13,
              color: t.textMuted,
              lineHeight: 1.6,
            }}
          >
            {contact.mensaje}
          </div>
        </div>

        {/* Respuesta del developer */}
        {contact.respuesta ? (
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#00c96b",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Respuesta del developer
            </div>
            <div
              style={{
                background: "rgba(0,201,107,0.08)",
                border: "1px solid rgba(0,201,107,0.2)",
                borderRadius: 10,
                padding: "12px",
                fontSize: 13,
                color: t.text,
                lineHeight: 1.6,
              }}
            >
              {contact.respuesta}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: t.warningBg,
              border: `1px solid ${t.warning}33`,
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i
              className="ti ti-clock"
              style={{ fontSize: 15, color: t.warning }}
            />
            <span style={{ fontSize: 12, color: t.warning }}>
              Sin respuesta aún
            </span>
          </div>
        )}

        {/* Fecha */}
        <div
          style={{ fontSize: 11, color: t.textFaint, textAlign: "right" }}
        >
          Enviado {timeAgo(contact.fecha_envio)}
        </div>

        {/* Acción */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "10px",
            borderRadius: 10,
            border: "none",
            background: t.accentBg,
            color: t.accent,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            width: "100%",
          }}
        >
          <i className="ti ti-mail" style={{ fontSize: 16 }} />
          Enviar seguimiento
        </button>
      </div>
    </div>
  );
}

/** Modal de nuevo contacto */
function ComposeModal({
  onClose,
  t,
}: {
  onClose: () => void;
  t: Theme;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 18,
          padding: "2rem",
          width: 500,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 700,
            color: t.text,
          }}
        >
          Nuevo contacto de reclutamiento
        </h2>
        <p
          style={{
            color: t.textMuted,
            fontSize: 13,
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Conecta con tu API:{" "}
          <code
            style={{
              color: t.accent,
              background: t.searchBg,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            POST /api/v1/admin/reclutamiento
          </code>
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: t.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const t = T.dark;

  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [selected,     setSelected]     = useState<Contact | null>(null);
  const [showCompose,  setShowCompose]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recruitmentService.getContacts();
      setContacts(data);
    } catch (err) {
      const message =
        err instanceof RecruitmentError
          ? err.message
          : "Ocurrió un error inesperado.";
      setError(message);
      console.error("[RecruitmentPage] fetchContacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const stats = recruitmentService.calcStats(contacts);

  const filtered = useMemo(
    () =>
      recruitmentService.filterContacts(contacts, {
        search,
        estado: statusFilter,
      }),
    [contacts, search, statusFilter]
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
                letterSpacing: "-0.02em",
              }}
            >
              Reclutamiento
            </h1>
            <p
              style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}
            >
              Gestiona el contacto con developers destacados
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchContacts}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                background: t.surface,
                color: t.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
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
              onClick={() => setShowCompose(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 10,
                border: "none",
                background: t.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-mail-plus" style={{ fontSize: 16 }} />
              Nuevo contacto
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ marginBottom: 20 }}>
            <ErrorBanner message={error} onRetry={fetchContacts} t={t} />
          </div>
        )}

        {/* Stats — siempre visibles aunque haya error (muestran 0) */}
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
              label: "Total contactos",
              value: stats.total,
              icon: "ti-mail",
              color: "#3b82f6",
            },
            {
              label: "Pendientes",
              value: stats.enviado,
              icon: "ti-clock",
              color: "#f59e0b",
            },
            {
              label: "Respondidos",
              value: stats.respondido,
              icon: "ti-message-check",
              color: "#00c96b",
            },
            {
              label: "En proceso",
              value: stats.en_proceso,
              icon: "ti-loader",
              color: "#a855f7",
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

        {/* Layout principal */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selected ? "1fr 380px" : "1fr",
            gap: 20,
          }}
        >
          {/* Columna izquierda: lista */}
          <div>
            {/* Toolbar de filtros */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ position: "relative", flex: 1, minWidth: 200 }}
              >
                <i
                  className="ti ti-search"
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: t.textFaint,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar developer o asunto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: t.searchBg,
                    border: `1px solid ${t.searchBorder}`,
                    borderRadius: 8,
                    padding: "8px 12px 8px 32px",
                    fontSize: 13,
                    color: t.text,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box" as const,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = t.accent + "88")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = t.searchBorder)
                  }
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: t.searchBg,
                  border: `1px solid ${t.searchBorder}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: t.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              >
                {[
                  "todos",
                  "enviado",
                  "respondido",
                  "rechazado",
                  "en_proceso",
                ].map((o) => (
                  <option key={o} value={o}>
                    {o === "todos"
                      ? "Todos los estados"
                      : o.replace("_", " ")}
                  </option>
                ))}
              </select>
              <span
                style={{
                  alignSelf: "center",
                  fontSize: 12,
                  color: t.textFaint,
                  marginLeft: "auto",
                }}
              >
                {filtered.length} resultado
                {filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Lista de contactos */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {contacts.length === 0 && !error ? (
                <EmptyState filtered={false} t={t} />
              ) : filtered.length === 0 ? (
                <EmptyState filtered={true} t={t} />
              ) : (
                filtered.map((c, i) => {
                  const pill = PILL[c.estado] ?? PILL.enviado;
                  const isSelected = selected?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() =>
                        setSelected(isSelected ? null : c)
                      }
                      style={{
                        background: t.surface,
                        border: `1.5px solid ${
                          isSelected ? t.accent + "60" : t.border
                        }`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor =
                            t.accent + "33";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor = t.border;
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: avatarColor(i) + "22",
                          border: `1.5px solid ${avatarColor(i)}44`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          color: avatarColor(i),
                          flexShrink: 0,
                        }}
                      >
                        {c.initials}
                      </div>

                      {/* Contenido */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: t.text,
                              }}
                            >
                              {c.developer}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: t.textMuted,
                                marginTop: 2,
                              }}
                            >
                              {c.asunto}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 5,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                background: pill.bg,
                                color: pill.c,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "3px 9px",
                                borderRadius: 99,
                              }}
                            >
                              {c.estado.replace("_", " ")}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: t.textFaint,
                              }}
                            >
                              {timeAgo(c.fecha_envio)}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              background: t.searchBg,
                              color: t.textMuted,
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {c.tecnologia}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              background: t.searchBg,
                              color: t.textMuted,
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {c.nivel}
                          </span>
                          {c.sesion_score !== null && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "rgba(0,201,107,0.1)",
                                color: "#00c96b",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontWeight: 600,
                              }}
                            >
                              Score: {c.sesion_score}
                            </span>
                          )}
                          {c.respuesta && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "rgba(0,201,107,0.08)",
                                color: "#00c96b",
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              <i
                                className="ti ti-check"
                                style={{ marginRight: 3 }}
                              />
                              Respondido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna derecha: panel de detalle */}
          {selected && (
            <DetailPanel
              contact={selected}
              onClose={() => setSelected(null)}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Modal nuevo contacto */}
      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} t={t} />
      )}
    </>
  );
}