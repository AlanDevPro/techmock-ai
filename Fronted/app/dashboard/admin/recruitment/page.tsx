'use client';

import { useState, useEffect, useMemo } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import {
  recruitmentService,
  type Contact,
  type ContactEstado,
  type DeveloperOption,
  type CreateContactPayload,
} from "@/services/recruitment.service";

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
 * Error personalizado para el módulo de reclutamiento
 * Permite un manejo más granular de errores en la capa de servicios
 */
export class RecruitmentError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'RecruitmentError';
    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RecruitmentError);
    }
  }

  /**
   * Crea un RecruitmentError desde un error desconocido
   */
  static fromUnknown(err: unknown): RecruitmentError {
    if (err instanceof RecruitmentError) {
      return err;
    }
    
    if (err instanceof Error) {
      return new RecruitmentError(err.message, 'UNKNOWN_ERROR', undefined, err);
    }
    
    return new RecruitmentError(
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

// ─── Pills de estado ──────────────────────────────────────────────────────────

const getPillStyle = (estado: ContactEstado, tokens: ThemeTokens) => {
  const styles: Record<ContactEstado, { bg: string; c: string; label: string }> = {
    enviado:    { bg: tokens.warningBg, c: tokens.warning, label: "Enviado" },
    respondido: { bg: tokens.accentBg, c: tokens.accent, label: "Respondido" },
    rechazado:  { bg: tokens.dangerBg, c: tokens.danger, label: "Rechazado" },
    en_proceso: { bg: tokens.infoBg, c: tokens.info, label: "En proceso" },
  };
  return styles[estado];
};

const AVATAR_COLORS = [
  "#00c96b",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
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

function formatScore(score: number | null): string {
  if (score === null) return "—";
  return typeof score === "number" ? score.toFixed(1) : score;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function LoadingSkeleton({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ height: 28, width: 180, background: tokens.surface2, borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 16, width: 280, background: tokens.surface2, borderRadius: 6 }} />
        </div>
        <div style={{ height: 38, width: 160, background: tokens.surface2, borderRadius: 10 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", height: 72 }}>
            <div style={{ height: "100%", background: tokens.surface2, borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", height: 90 }}>
            <div style={{ height: "100%", background: tokens.surface2, borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function ErrorBanner({ message, onRetry, tokens }: { message: string; onRetry: () => void; tokens: ThemeTokens }) {
  return (
    <div style={{ background: tokens.dangerBg, border: `1px solid ${tokens.danger}44`, borderRadius: 12, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 18, color: tokens.danger }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tokens.danger }}>Error al cargar reclutamientos</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: tokens.textMuted }}>{message}</p>
        </div>
      </div>
      <button onClick={onRetry} style={{ background: tokens.dangerBg, border: `1px solid ${tokens.danger}66`, color: tokens.danger, borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>Reintentar</button>
    </div>
  );
}

function EmptyState({ filtered, tokens }: { filtered: boolean; tokens: ThemeTokens }) {
  return (
    <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "4rem 2rem", textAlign: "center" }}>
      <i className={filtered ? "ti ti-mail-search" : "ti ti-mail-off"} style={{ fontSize: 40, color: tokens.textFaint, display: "block", marginBottom: 12 }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.textMuted }}>
        {filtered ? "No se encontraron contactos con los filtros aplicados" : "Aún no hay contactos de reclutamiento registrados"}
      </p>
      {filtered && <p style={{ margin: "6px 0 0", fontSize: 12, color: tokens.textFaint }}>Intenta ajustar la búsqueda o el filtro de estado</p>}
    </div>
  );
}

// ─── Modal para nuevo contacto ─────────────────────────────────────────────────

function ComposeModal({ onClose, tokens, onSuccess }: { onClose: () => void; tokens: ThemeTokens; onSuccess: () => void }) {
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDev, setSelectedDev] = useState<string>("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevelopers = async () => {
      try {
        const data = await recruitmentService.getDevelopers();
        setDevelopers(data);
        if (data.length > 0) setSelectedDev(data[0].id);
      } catch (err) {
        const recruitmentError = RecruitmentError.fromUnknown(err);
        setError(recruitmentError.message || "Error al cargar developers");
      } finally {
        setLoading(false);
      }
    };
    loadDevelopers();
  }, []);

  const selectedDeveloper = developers.find(d => d.id === selectedDev);

  const handleSubmit = async () => {
    if (!selectedDev) {
      setError("Selecciona un developer");
      return;
    }
    if (!asunto.trim()) {
      setError("El asunto es obligatorio");
      return;
    }
    if (!mensaje.trim()) {
      setError("El mensaje es obligatorio");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateContactPayload = {
        developer_id: selectedDev,
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
      };
      await recruitmentService.createContact(payload);
      onSuccess();
      onClose();
    } catch (err) {
      const recruitmentError = RecruitmentError.fromUnknown(err);
      setError(recruitmentError.message || "Error al enviar el mensaje");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: tokens.searchBg,
    border: `1px solid ${tokens.searchBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    color: tokens.text,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 20, padding: "1.75rem", width: 520, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>Nuevo mensaje de reclutamiento</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: 12, color: tokens.textMuted }}>Cargando developers...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: tokens.textMuted, marginBottom: 6, display: "block" }}>Developer *</label>
              <select
                value={selectedDev}
                onChange={e => setSelectedDev(e.target.value)}
                style={inputStyle}
              >
                {developers.map(dev => (
                  <option key={dev.id} value={dev.id}>
                    {dev.nombre} {dev.apellido} - {dev.mejor_tecnologia || "Sin tecnología"} (Score: {formatScore(dev.puntaje_promedio)})
                  </option>
                ))}
              </select>
            </div>

            {selectedDeveloper && (
              <div style={{ background: tokens.infoBg, borderRadius: 10, padding: "12px" }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: tokens.textMuted }}>📧 {selectedDeveloper.email}</span>
                  {selectedDeveloper.mejor_tecnologia && (
                    <span style={{ fontSize: 12, color: tokens.textMuted }}>💻 {selectedDeveloper.mejor_tecnologia}</span>
                  )}
                  {selectedDeveloper.nivel_actual && (
                    <span style={{ fontSize: 12, color: tokens.textMuted }}>🏆 {selectedDeveloper.nivel_actual.toUpperCase()}</span>
                  )}
                  {selectedDeveloper.puntaje_promedio !== null && (
                    <span style={{ fontSize: 12, color: tokens.accent }}>⭐ Score: {selectedDeveloper.puntaje_promedio.toFixed(1)}</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: tokens.textMuted, marginBottom: 6, display: "block" }}>Asunto *</label>
              <input
                type="text"
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                placeholder="Ej: Oportunidad laboral en TechMock AI"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: tokens.textMuted, marginBottom: 6, display: "block" }}>Mensaje *</label>
              <textarea
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                placeholder="Escribe un mensaje personalizado para el developer..."
                rows={6}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ background: tokens.surface2, borderRadius: 10, padding: "12px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, color: tokens.textFaint }}>💡 Sugerencia de plantilla:</p>
              <p style={{ margin: 0, fontSize: 12, color: tokens.textMuted, fontStyle: "italic" }}>
                &ldquo;Hola {selectedDeveloper?.nombre || "[nombre]"},<br/><br/>
                En TechMock AI estamos impresionados con tu perfil técnico y tus resultados en nuestras evaluaciones. 
                Nos gustaría invitarte a conocer más sobre oportunidades en nuestro equipo.<br/><br/>
                ¿Te interesaría agendar una breve conversación?&rdquo;
              </p>
            </div>

            {error && (
              <div style={{ background: tokens.dangerBg, borderRadius: 10, padding: "12px", fontSize: 13, color: tokens.danger }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${tokens.border}`, background: "transparent", color: tokens.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: tokens.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? <i className="ti ti-loader-2" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} /> : <i className="ti ti-send" style={{ fontSize: 14 }} />}
                {submitting ? "Enviando..." : "Enviar mensaje"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel lateral de detalle ─────────────────────────────────────────────────

function DetailPanel({ contact, onClose, tokens }: { contact: Contact; onClose: () => void; tokens: ThemeTokens }) {
  const pill = getPillStyle(contact.estado, tokens);

  return (
    <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "20px", position: "sticky", top: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tokens.text }}>Detalle del contacto</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted, fontSize: 18 }}><i className="ti ti-x" /></button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Developer</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: tokens.text }}>{contact.developer_name}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted }}>{contact.developer_email}</div>
        </div>

        <div style={{ height: 1, background: tokens.border }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Estado</div>
            <span style={{ background: pill.bg, color: pill.c, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>{pill.label}</span>
          </div>
          {contact.sesion_score !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Score sesión</div>
              <span style={{ fontSize: 20, fontWeight: 700, color: tokens.accent }}>{formatScore(contact.sesion_score)}</span>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: tokens.border }} />

        <div>
          <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Asunto</div>
          <div style={{ fontSize: 13, color: tokens.text, fontWeight: 600 }}>{contact.asunto}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, background: tokens.searchBg, color: tokens.textMuted, padding: "3px 10px", borderRadius: 6 }}>{contact.tecnologia}</span>
          <span style={{ fontSize: 11, background: tokens.searchBg, color: tokens.textMuted, padding: "3px 10px", borderRadius: 6 }}>{contact.nivel}</span>
        </div>

        <div style={{ height: 1, background: tokens.border }} />

        <div>
          <div style={{ fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Mensaje enviado</div>
          <div style={{ background: tokens.searchBg, borderRadius: 10, padding: "12px", fontSize: 13, color: tokens.textMuted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{contact.mensaje}</div>
        </div>

        {contact.respuesta_developer ? (
          <div>
            <div style={{ fontSize: 11, color: tokens.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Respuesta del developer</div>
            <div style={{ background: tokens.accentBg, border: `1px solid ${tokens.accent}33`, borderRadius: 10, padding: "12px", fontSize: 13, color: tokens.text, lineHeight: 1.6 }}>{contact.respuesta_developer}</div>
          </div>
        ) : (
          <div style={{ background: tokens.warningBg, border: `1px solid ${tokens.warning}33`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-clock" style={{ fontSize: 15, color: tokens.warning }} />
            <span style={{ fontSize: 12, color: tokens.warning }}>Sin respuesta aún</span>
          </div>
        )}

        <div style={{ fontSize: 11, color: tokens.textFaint, textAlign: "right" }}>Enviado {timeAgo(contact.fecha_envio)}</div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recruitmentService.getContacts();
      setContacts(data);
    } catch (err) {
      // Manejo de errores usando la clase RecruitmentError
      const recruitmentError = RecruitmentError.fromUnknown(err);
      
      // Mensajes personalizados según el tipo de error
      let userMessage: string;
      
      if (recruitmentError.isUnauthorized()) {
        userMessage = 'No tienes permisos para ver los contactos de reclutamiento. Por favor, inicia sesión nuevamente.';
      } else if (recruitmentError.isNotFound()) {
        userMessage = 'No se encontraron contactos de reclutamiento en el sistema.';
      } else if (recruitmentError.isTimeout()) {
        userMessage = 'La solicitud ha tardado demasiado. Por favor, verifica tu conexión e intenta nuevamente.';
      } else {
        // Usar el mensaje del error o uno genérico
        userMessage = recruitmentError.message || 'Ocurrió un error inesperado al cargar los contactos de reclutamiento.';
      }
      
      setError(userMessage);
      console.error("[RecruitmentPage] fetchContacts:", {
        originalError: err,
        recruitmentError,
        userMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const stats = recruitmentService.calcStats(contacts);

  const filtered = useMemo(
    () => recruitmentService.filterContacts(contacts, { search, estado: statusFilter }),
    [contacts, search, statusFilter]
  );

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <LoadingSkeleton tokens={tokens} />
      </>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: tokens.text, fontSize: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>Reclutamiento</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>Gestiona el contacto con developers destacados</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchContacts}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = tokens.accent + "66")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = tokens.border)}
            >
              <i className="ti ti-refresh" style={{ fontSize: 15 }} />
              Actualizar
            </button>
            <button
              onClick={() => setShowCompose(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: tokens.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <i className="ti ti-pencil-plus" style={{ fontSize: 16 }} />
              Nuevo contacto
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && <ErrorBanner message={error} onRetry={fetchContacts} tokens={tokens} />}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total contactos", value: stats.total, icon: "ti-mail", color: tokens.info },
            { label: "Pendientes", value: stats.enviado, icon: "ti-clock", color: tokens.warning },
            { label: "Respondidos", value: stats.respondido, icon: "ti-message-check", color: tokens.accent },
            { label: "En proceso", value: stats.en_proceso, icon: "ti-loader", color: tokens.purple },
          ].map(s => (
            <div key={s.label} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: tokens.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Layout principal */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
          {/* Columna izquierda: lista */}
          <div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: tokens.textFaint, pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Buscar developer o asunto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: tokens.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = tokens.accent + "88")}
                  onBlur={e => (e.target.style.borderColor = tokens.searchBorder)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ background: tokens.searchBg, border: `1px solid ${tokens.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: tokens.text, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
              >
                {["todos", "enviado", "respondido", "rechazado", "en_proceso"].map(o => (
                  <option key={o} value={o}>{o === "todos" ? "Todos los estados" : getPillStyle(o as ContactEstado, tokens)?.label ?? o}</option>
                ))}
              </select>
              <span style={{ alignSelf: "center", fontSize: 12, color: tokens.textFaint, marginLeft: "auto" }}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Lista de contactos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {contacts.length === 0 && !error ? (
                <EmptyState filtered={false} tokens={tokens} />
              ) : filtered.length === 0 ? (
                <EmptyState filtered={true} tokens={tokens} />
              ) : (
                filtered.map((c, i) => {
                  const pill = getPillStyle(c.estado, tokens);
                  const isSelected = selected?.id === c.id;
                  const devInitials = c.developer_initials || (c.developer_name ? c.developer_name.substring(0, 2).toUpperCase() : "??");
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelected(isSelected ? null : c)}
                      style={{ background: tokens.surface, border: `1.5px solid ${isSelected ? tokens.accent + "60" : tokens.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s", display: "flex", gap: 14, alignItems: "flex-start" }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = tokens.accent + "33"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = tokens.border; }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(i) + "22", border: `1.5px solid ${avatarColor(i)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: avatarColor(i), flexShrink: 0 }}>
                        {devInitials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.text }}>{c.developer_name}</div>
                            <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>{c.asunto}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                            <span style={{ background: pill.bg, color: pill.c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99 }}>{pill.label}</span>
                            <span style={{ fontSize: 11, color: tokens.textFaint }}>{timeAgo(c.fecha_envio)}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, background: tokens.searchBg, color: tokens.textMuted, padding: "2px 8px", borderRadius: 6 }}>{c.tecnologia}</span>
                          <span style={{ fontSize: 11, background: tokens.searchBg, color: tokens.textMuted, padding: "2px 8px", borderRadius: 6 }}>{c.nivel}</span>
                          {c.sesion_score !== null && (
                            <span style={{ fontSize: 11, background: tokens.accentBg, color: tokens.accent, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>Score: {formatScore(c.sesion_score)}</span>
                          )}
                          {c.respuesta_developer && (
                            <span style={{ fontSize: 11, background: tokens.accentBg, color: tokens.accent, padding: "2px 8px", borderRadius: 6 }}>
                              <i className="ti ti-check" style={{ marginRight: 3 }} />
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
          {selected && <DetailPanel contact={selected} onClose={() => setSelected(null)} tokens={tokens} />}
        </div>
      </div>

      {/* Modal nuevo contacto */}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} tokens={tokens} onSuccess={fetchContacts} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}