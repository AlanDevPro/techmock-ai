'use client';

/**
 * /app/(protected)/dashboard/admin/profile/page.tsx
 * Perfil del administrador
 * Mapea tabla: usuarios
 */

import { useState, useEffect, useCallback } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import { useRouter } from "next/navigation";
import { ProfileService, ProfileData } from "@/services/profile.service";

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
  inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  inputBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdminProfile {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  telefono: string | null;
  fecha_creacion: string;
  ultimo_login: string | null;
  rol: string;
  bio: string | null;
  website: string | null;
  location: string | null;
  activo: boolean;
  email_verificado: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(nombre: string, apellido: string | null): string {
  const first = nombre?.charAt(0) || "";
  const last = apellido?.charAt(0) || "";
  return `${first}${last}`.toUpperCase();
}

function getAvatarColor(id: string): string {
  const colors = ["#00c96b", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function ProfileSkeleton({ tokens }: { tokens: ReturnType<typeof getThemeTokens> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ height: 28, width: 180, background: tokens.surface2, borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 16, width: 240, background: tokens.surface2, borderRadius: 6 }} />
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: tokens.surface2, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ height: 24, width: "60%", background: tokens.surface2, borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 16, width: "40%", background: tokens.surface2, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: "50%", background: tokens.surface2, borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ height: 18, width: "40%", background: tokens.surface2, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 20, width: "70%", background: tokens.surface2, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

interface EditProfileModalProps {
  profile: AdminProfile;
  onClose: () => void;
  onSave: (data: Partial<AdminProfile>) => Promise<void>;
  tokens: ReturnType<typeof getThemeTokens>;
}

function EditProfileModal({ profile, onClose, onSave, tokens }: EditProfileModalProps) {
  const [form, setForm] = useState({
    nombre: profile.nombre,
    apellido: profile.apellido || "",
    telefono: profile.telefono || "",
    github_url: profile.github_url || "",
    linkedin_url: profile.linkedin_url || "",
    bio: profile.bio || "",
    website: profile.website || "",
    location: profile.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedData: Partial<AdminProfile> = {
        nombre: form.nombre,
        apellido: form.apellido || null,
        telefono: form.telefono || null,
        github_url: form.github_url || null,
        linkedin_url: form.linkedin_url || null,
        bio: form.bio || null,
        website: form.website || null,
        location: form.location || null,
      };
      
      await onSave(updatedData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: tokens.inputBg,
    border: `1px solid ${tokens.inputBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    color: tokens.text,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    marginBottom: 6,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 20,
          padding: "1.75rem",
          width: 520,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tokens.text }}>Editar perfil</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Tu nombre"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Apellido</label>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Tu apellido"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+591 7XXXXXXXX"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>GitHub URL</label>
            <input
              type="url"
              value={form.github_url}
              onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              placeholder="https://github.com/tuusuario"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/tuusuario"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Sitio web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://tusitio.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Ubicación</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ciudad, País"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Biografía</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Cuéntanos sobre ti..."
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = tokens.accent + "88")}
              onBlur={(e) => (e.target.style.borderColor = tokens.inputBorder)}
            />
          </div>

          {error && (
            <div style={{ background: tokens.dangerBg, borderRadius: 10, padding: "12px", fontSize: 13, color: tokens.danger }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                border: `1px solid ${tokens.border}`,
                background: "transparent",
                color: tokens.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 20px",
                borderRadius: 10,
                border: "none",
                background: tokens.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <i className="ti ti-loader-2" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminProfilePage() {
  const { isDark } = useThemeContext();
  const tokens = getThemeTokens(isDark);
  const router = useRouter();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // ── Cargar perfil ───────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener datos completos del perfil desde el servicio
      const data = await ProfileService.obtenerPerfilCompleto();
      setProfileData(data);
      
      // Extraer datos del usuario para el perfil
      setProfile({
        id: data.usuario.id,
        nombre: data.usuario.nombre,
        apellido: data.usuario.apellido,
        email: data.usuario.email,
        avatar_url: data.usuario.avatar_url,
        github_url: data.usuario.github_url,
        linkedin_url: data.usuario.linkedin_url,
        telefono: data.usuario.telefono,
        fecha_creacion: data.usuario.fecha_creacion,
        ultimo_login: data.usuario.ultimo_login,
        rol: data.usuario.rol,
        bio: data.usuario.bio,
        website: data.usuario.website,
        location: data.usuario.location,
        activo: data.usuario.activo,
        email_verificado: data.usuario.email_verificado,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar perfil");
      console.error("[AdminProfilePage] fetchProfile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Actualizar perfil ───────────────────────────────────────────────────────

  const handleSaveProfile = async (updatedData: Partial<AdminProfile>) => {
    if (!profile) return;
    
    try {
      // Aquí deberías tener un endpoint para actualizar el perfil
      // Por ahora solo actualizamos el estado local
      // En el futuro: await ProfileService.actualizarPerfil(updatedData);
      
      // Simular actualización
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Actualizar estado local
      setProfile({ ...profile, ...updatedData });
      setSavedMessage("Perfil actualizado correctamente");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <ProfileSkeleton tokens={tokens} />
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        <div style={{ fontFamily: "'DM Sans', sans-serif", color: tokens.text }}>
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
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 18, color: tokens.danger }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tokens.danger }}>Error al cargar perfil</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: tokens.textMuted }}>{error || "No se pudo cargar el perfil"}</p>
              </div>
            </div>
            <button
              onClick={fetchProfile}
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
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </>
    );
  }

  const avatarColor = getAvatarColor(profile.id);
  const initials = getInitials(profile.nombre, profile.apellido);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: tokens.text, fontSize: 14 }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: tokens.text, letterSpacing: "-0.02em" }}>
              Mi Perfil
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.textMuted }}>
              Administra tu información personal
            </p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: tokens.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <i className="ti ti-pencil" style={{ fontSize: 16 }} />
            Editar perfil
          </button>
        </div>

        {/* Toast de éxito */}
        {savedMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: tokens.accentBg,
              border: `1px solid ${tokens.accent}55`,
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
            <i className="ti ti-circle-check" style={{ fontSize: 16, color: tokens.accent }} />
            <span style={{ fontSize: 13, color: tokens.accent, fontWeight: 600 }}>{savedMessage}</span>
          </div>
        )}

        {/* Perfil Principal */}
        <div
          style={{
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: 20,
            padding: "1.75rem",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
            {/* Avatar grande */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: avatarColor + "22",
                border: `3px solid ${avatarColor}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 42, fontWeight: 700, color: avatarColor }}>
                  {initials}
                </span>
              )}
            </div>

            {/* Info básica */}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: tokens.text }}>
                {profile.nombre} {profile.apellido || ""}
              </h2>
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.textMuted, fontSize: 13 }}>
                  <i className="ti ti-mail" style={{ fontSize: 15 }} />
                  {profile.email}
                  {profile.email_verificado && (
                    <span style={{ color: tokens.accent, fontSize: 12 }}>
                      <i className="ti ti-check" />
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.textMuted, fontSize: 13 }}>
                  <i className="ti ti-user" style={{ fontSize: 15 }} />
                  {profile.rol === "admin" ? "Administrador" : profile.rol}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.textMuted, fontSize: 13 }}>
                  <i className="ti ti-calendar" style={{ fontSize: 15 }} />
                  Miembro desde {formatDate(profile.fecha_creacion)}
                </span>
                {profile.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.textMuted, fontSize: 13 }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 15 }} />
                    {profile.location}
                  </span>
                )}
              </div>
              {profile.bio && (
                <p style={{ margin: "12px 0 0", fontSize: 13, color: tokens.textMuted }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Grid de información detallada */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          
          {/* Contacto */}
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 16,
              padding: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tokens.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-phone" style={{ fontSize: 16, color: tokens.accent }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tokens.text }}>Contacto</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Teléfono</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: tokens.text }}>
                  {profile.telefono || <span style={{ color: tokens.textFaint }}>—</span>}
                </p>
              </div>
              {profile.website && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Sitio web</p>
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ margin: "4px 0 0", fontSize: 14, color: tokens.accent, textDecoration: "none" }}
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Último acceso</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: tokens.text }}>
                  {formatDate(profile.ultimo_login)}
                </p>
              </div>
            </div>
          </div>

          {/* Redes Sociales */}
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 16,
              padding: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tokens.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-link" style={{ fontSize: 16, color: tokens.accent }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tokens.text }}>Redes Sociales</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profile.github_url ? (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: tokens.text,
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "6px 0",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = tokens.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = tokens.text)}
                >
                  <i className="ti ti-brand-github" style={{ fontSize: 18 }} />
                  GitHub
                  <i className="ti ti-external-link" style={{ fontSize: 12, marginLeft: "auto" }} />
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: tokens.textFaint }}>No vinculado</p>
              )}
              
              {profile.linkedin_url ? (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: tokens.text,
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "6px 0",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = tokens.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = tokens.text)}
                >
                  <i className="ti ti-brand-linkedin" style={{ fontSize: 18 }} />
                  LinkedIn
                  <i className="ti ti-external-link" style={{ fontSize: 12, marginLeft: "auto" }} />
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: tokens.textFaint }}>No vinculado</p>
              )}
            </div>
          </div>

          {/* Estadísticas de cuenta */}
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 16,
              padding: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tokens.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-chart-bar" style={{ fontSize: 16, color: tokens.accent }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tokens.text }}>Estado de Cuenta</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Tipo de cuenta</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.text }}>
                  <span style={{ background: tokens.accentBg, color: tokens.accent, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                    Administrador
                  </span>
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: tokens.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Estado</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: tokens.text }}>
                  {profile.activo ? (
                    <span style={{ color: tokens.accent }}>
                      <i className="ti ti-circle-check" style={{ fontSize: 14 }} /> Activo
                    </span>
                  ) : (
                    <span style={{ color: tokens.danger }}>
                      <i className="ti ti-circle-x" style={{ fontSize: 14 }} /> Inactivo
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
          tokens={tokens}
        />
      )}

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}