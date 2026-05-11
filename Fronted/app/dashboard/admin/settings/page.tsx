'use client';

import { useState } from "react";

const T = {
  dark: {
    bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
    accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444", searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#f0f2f5", surface: "#ffffff", surfaceHover: "#f8f9fb",
    border: "rgba(0,0,0,0.08)", text: "#111214", textMuted: "#5f6478", textFaint: "#adb0be",
    accent: "#00a855", accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626", searchBg: "rgba(0,0,0,0.04)", searchBorder: "rgba(0,0,0,0.1)",
  },
};

const SECTIONS = [
  { id: "general",      label: "General",        icon: "ti-settings" },
  { id: "empresa",      label: "Empresa",         icon: "ti-building" },
  { id: "seguridad",    label: "Seguridad",       icon: "ti-shield-lock" },
  { id: "ia",           label: "Configuración IA", icon: "ti-sparkles" },
  { id: "notificaciones", label: "Notificaciones", icon: "ti-bell" },
  { id: "integraciones", label: "Integraciones",  icon: "ti-plug" },
  { id: "peligroso",    label: "Zona peligrosa",  icon: "ti-alert-triangle", danger: true },
];

function Toggle({ value, onChange, t }: { value: boolean; onChange: (v: boolean) => void; t: typeof T.dark }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 99, background: value ? t.accent : t.border, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function SettingRow({ label, description, children, t }: { label: string; description?: string; children: React.ReactNode; t: typeof T.dark }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px solid ${t.border}`, gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3, lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, t, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; t: typeof T.dark; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: 240 }}
      onFocus={e => (e.target.style.borderColor = T.dark.accent + "80")}
      onBlur={e => (e.target.style.borderColor = t.searchBorder)} />
  );
}

export default function SettingsPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [activeSection, setActiveSection] = useState("general");
  const t = T[theme];

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: "DevInterview",
    siteUrl: "https://devinterview.io",
    defaultLanguage: "es",
    maintenanceMode: false,
    // Empresa
    empresaNombre: "DevInterview Inc.",
    empresaEmail: "admin@devinterview.io",
    empresaWeb: "https://devinterview.io",
    // Seguridad
    sessionTimeout: "3600",
    maxLoginAttempts: "5",
    requireEmailVerification: true,
    twoFactorEnabled: false,
    // IA
    modeloIA: "claude-3-5-sonnet-20241022",
    maxTokensEval: "4000",
    generarPreguntasAuto: true,
    evaluarConIA: true,
    // Notificaciones
    notifEmail: true,
    notifInactivos: true,
    notifNuevasEval: true,
    notifErrores: true,
    // Integraciones
    githubEnabled: false,
    googleOAuthEnabled: true,
    kubernetesNamespace: "devinterview-prod",
  });

  const set = (key: keyof typeof settings) => (val: string | boolean) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, cursor: "pointer", fontFamily: "inherit", width: 240, outline: "none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <SettingRow label="Nombre del sitio" description="Nombre que aparece en el navegador y emails." t={t}>
              <Input value={settings.siteName} onChange={set("siteName")} t={t} />
            </SettingRow>
            <SettingRow label="URL del sitio" t={t}>
              <Input value={settings.siteUrl} onChange={set("siteUrl")} t={t} />
            </SettingRow>
            <SettingRow label="Idioma predeterminado" t={t}>
              <Select value={settings.defaultLanguage} onChange={set("defaultLanguage")} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} />
            </SettingRow>
            <SettingRow label="Modo mantenimiento" description="Desactiva el acceso a usuarios no administradores." t={t}>
              <Toggle value={settings.maintenanceMode} onChange={set("maintenanceMode")} t={t} />
            </SettingRow>
          </>
        );
      case "empresa":
        return (
          <>
            <SettingRow label="Nombre de la empresa" t={t}>
              <Input value={settings.empresaNombre} onChange={set("empresaNombre")} t={t} />
            </SettingRow>
            <SettingRow label="Email de contacto" t={t}>
              <Input value={settings.empresaEmail} onChange={set("empresaEmail")} type="email" t={t} />
            </SettingRow>
            <SettingRow label="Sitio web" t={t}>
              <Input value={settings.empresaWeb} onChange={set("empresaWeb")} t={t} />
            </SettingRow>
          </>
        );
      case "seguridad":
        return (
          <>
            <SettingRow label="Timeout de sesión (seg)" description="Tiempo en segundos hasta que la sesión expira por inactividad." t={t}>
              <Input value={settings.sessionTimeout} onChange={set("sessionTimeout")} type="number" t={t} />
            </SettingRow>
            <SettingRow label="Máx. intentos de login" description="Bloquea la cuenta tras N intentos fallidos." t={t}>
              <Input value={settings.maxLoginAttempts} onChange={set("maxLoginAttempts")} type="number" t={t} />
            </SettingRow>
            <SettingRow label="Verificación de email requerida" description="Los usuarios deben verificar su email antes de usar la plataforma." t={t}>
              <Toggle value={settings.requireEmailVerification} onChange={set("requireEmailVerification")} t={t} />
            </SettingRow>
            <SettingRow label="Autenticación de dos factores" description="Habilita 2FA para administradores." t={t}>
              <Toggle value={settings.twoFactorEnabled} onChange={set("twoFactorEnabled")} t={t} />
            </SettingRow>
          </>
        );
      case "ia":
        return (
          <>
            <SettingRow label="Modelo de IA" description="Modelo usado para evaluaciones y generación de preguntas." t={t}>
              <Select value={settings.modeloIA} onChange={set("modeloIA")} options={[
                { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
                { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
                { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
              ]} />
            </SettingRow>
            <SettingRow label="Max tokens evaluación" description="Límite de tokens para respuestas de evaluación." t={t}>
              <Input value={settings.maxTokensEval} onChange={set("maxTokensEval")} type="number" t={t} />
            </SettingRow>
            <SettingRow label="Generación automática de preguntas" description="La IA genera preguntas semanalmente para tecnologías activas." t={t}>
              <Toggle value={settings.generarPreguntasAuto} onChange={set("generarPreguntasAuto")} t={t} />
            </SettingRow>
            <SettingRow label="Evaluación automática con IA" description="Evalúa las sesiones con IA al finalizarlas." t={t}>
              <Toggle value={settings.evaluarConIA} onChange={set("evaluarConIA")} t={t} />
            </SettingRow>
          </>
        );
      case "notificaciones":
        return (
          <>
            <SettingRow label="Notificaciones por email" description="Recibe alertas importantes en el email del administrador." t={t}>
              <Toggle value={settings.notifEmail} onChange={set("notifEmail")} t={t} />
            </SettingRow>
            <SettingRow label="Alertar usuarios inactivos" description="Notifica cuando un usuario no ingresa por 30+ días." t={t}>
              <Toggle value={settings.notifInactivos} onChange={set("notifInactivos")} t={t} />
            </SettingRow>
            <SettingRow label="Nuevas evaluaciones" description="Notifica cuando se completa una evaluación." t={t}>
              <Toggle value={settings.notifNuevasEval} onChange={set("notifNuevasEval")} t={t} />
            </SettingRow>
            <SettingRow label="Errores del sistema" description="Notifica sobre errores de ejecución o Kubernetes." t={t}>
              <Toggle value={settings.notifErrores} onChange={set("notifErrores")} t={t} />
            </SettingRow>
          </>
        );
      case "integraciones":
        return (
          <>
            <SettingRow label="Google OAuth" description="Permite login con cuenta Google." t={t}>
              <Toggle value={settings.googleOAuthEnabled} onChange={set("googleOAuthEnabled")} t={t} />
            </SettingRow>
            <SettingRow label="GitHub OAuth" description="Permite login con cuenta GitHub." t={t}>
              <Toggle value={settings.githubEnabled} onChange={set("githubEnabled")} t={t} />
            </SettingRow>
            <SettingRow label="Namespace de Kubernetes" description="Namespace donde se ejecutan los jobs de código." t={t}>
              <Input value={settings.kubernetesNamespace} onChange={set("kubernetesNamespace")} t={t} />
            </SettingRow>
          </>
        );
      case "peligroso":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Exportar todos los datos", desc: "Descarga un JSON con usuarios, sesiones y evaluaciones.", icon: "ti-download", color: "#3b82f6" },
              { label: "Limpiar sesiones expiradas", desc: "Elimina sesiones con estado 'abandonada' de más de 90 días.", icon: "ti-trash", color: "#f59e0b" },
              { label: "Resetear estadísticas globales", desc: "Pone a cero todos los contadores. Esta acción no se puede deshacer.", icon: "ti-refresh", color: "#ef4444" },
              { label: "Eliminar todos los usuarios", desc: "⚠️ Elimina permanentemente todos los registros de la base de datos.", icon: "ti-alert-triangle", color: "#ef4444" },
            ].map(action => (
              <div key={action.label} style={{ background: action.color === "#ef4444" ? "rgba(239,68,68,0.05)" : t.surface, border: `1px solid ${action.color === "#ef4444" ? "rgba(239,68,68,0.25)" : t.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>{action.desc}</div>
                </div>
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${action.color}40`, background: action.color + "12", color: action.color, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>
                  <i className={`ti ${action.icon}`} style={{ fontSize: 14 }} /> Ejecutar
                </button>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const activeS = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text }}>Ajustes</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>Configura tu plataforma DevInterview</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          {/* Sidebar nav */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 8, height: "fit-content", position: "sticky", top: 20 }}>
            {SECTIONS.map((s, i) => {
              const active = activeSection === s.id;
              return (
                <div key={s.id}>
                  {i > 0 && s.danger && <div style={{ height: 1, background: t.border, margin: "6px 0" }} />}
                  <button onClick={() => setActiveSection(s.id)}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: active ? (s.danger ? "rgba(239,68,68,0.1)" : t.accentBg) : "transparent", color: active ? (s.danger ? t.danger : t.accent) : s.danger ? t.danger : t.textMuted, fontWeight: active ? 700 : 500, fontSize: 13, textAlign: "left", fontFamily: "inherit", transition: "all 0.12s" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.surfaceHover; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    <i className={`ti ${s.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                    {s.label}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: activeS.danger ? "rgba(239,68,68,0.1)" : t.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${activeS.icon}`} style={{ fontSize: 18, color: activeS.danger ? t.danger : t.accent }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{activeS.label}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                  {activeSection === "peligroso" ? "Acciones irreversibles — úsalas con cuidado" : "Configura las opciones de este módulo"}
                </div>
              </div>
            </div>

            {renderSection()}

            {activeSection !== "peligroso" && (
              <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> Guardar cambios
                </button>
                <button style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}