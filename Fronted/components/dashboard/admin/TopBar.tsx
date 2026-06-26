// components/dashboard/admin/TopBar.tsx
'use client';

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// ─── Tema ─────────────────────────────────────────────────────────────────────

const T = {
  dark: {
    bg: "#16181d",
    surface: "#1a1c20",
    surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)",
    text: "#e8eaed",
    textMuted: "#8b8fa8",
    textFaint: "#555868",
    accent: "#00c96b",
    accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444",
    searchBg: "rgba(255,255,255,0.06)",
    searchBorder: "rgba(255,255,255,0.12)",
    topbar: "#16181d",
  },
  light: {
    bg: "#ffffff",
    surface: "#f8f9fb",
    surfaceHover: "#f0f2f5",
    border: "rgba(0,0,0,0.08)",
    text: "#111214",
    textMuted: "#5f6478",
    textFaint: "#adb0be",
    accent: "#00a855",
    accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626",
    searchBg: "rgba(0,0,0,0.04)",
    searchBorder: "rgba(0,0,0,0.1)",
    topbar: "#ffffff",
  },
};

export interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  displayName: string;
  displayEmail: string;
  sidebarWidth: number;
  notifBadge: number;
  activeLabel: string;
  activeIcon: string;
  onNavigate?: (path: string) => void;
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
  isProfileOpen?: boolean;
  onProfileToggle?: () => void;
  profileMenuItems?: Array<{
    id: string;
    label: string;
    icon: string;
    path: string;
    danger?: boolean;
  }>;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
  t: typeof T.dark;
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminTopBar({
  isDark,
  onToggleTheme,
  displayName,
  displayEmail,
  sidebarWidth,
  notifBadge,
  activeLabel,
  activeIcon,
  onNavigate,
  onProfileClick,
  onNotificationsClick,
  isProfileOpen: externalProfileOpen,
  onProfileToggle,
  profileMenuItems = [],
}: TopBarProps) {
  const router = useRouter();
  const t = T[isDark ? "dark" : "light"];
  const profileRef = useRef<HTMLDivElement>(null);
  const [internalProfileOpen, setInternalProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const isProfileOpen = externalProfileOpen !== undefined ? externalProfileOpen : internalProfileOpen;
  
  const handleProfileToggle = () => {
    if (onProfileToggle) {
      onProfileToggle();
    } else {
      setInternalProfileOpen(!internalProfileOpen);
    }
  };

  const handleProfileClose = () => {
    if (onProfileToggle) {
      onProfileToggle();
    } else {
      setInternalProfileOpen(false);
    }
  };

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      handleNavigate("/dashboard/admin/notifications");
    }
  };

  // Cerrar perfil al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        handleProfileClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Default profile menu
  const defaultProfileMenu = [
    { id: "perfil", label: "Mi perfil", icon: "ti-user", path: "/dashboard/profile" },
    { id: "ranking", label: "Tabla de clasificación", icon: "ti-trophy", path: "/dashboard/ranking" },
    { id: "ajustes", label: "Ajustes", icon: "ti-settings", path: "/dashboard/admin/settings" },
    { id: "envios", label: "Mis envíos", icon: "ti-send", path: "/dashboard/submissions" },
    { id: "logout", label: "Cerrar sesión", icon: "ti-logout", path: "/logout", danger: true },
  ];

  const menuItems = profileMenuItems.length > 0 ? profileMenuItems : defaultProfileMenu;

  return (
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
          width: sidebarWidth,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 1rem",
          borderRight: `1px solid ${t.border}`,
          height: "100%",
          transition: "width 0.22s ease",
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={() => handleNavigate("/dashboard/admin")}
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
        {sidebarWidth > 60 && (
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: t.text,
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            TechMock AI
          </span>
        )}
      </div>

      {/* Título de página activa */}
      <div
        style={{
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <i
          className={`ti ${activeIcon}`}
          aria-hidden
          style={{ fontSize: 15, color: t.accent }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
          {activeLabel}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search bar */}
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

      {/* Toggle theme button */}
      <IconBtn
        icon={isDark ? "ti-sun" : "ti-moon"}
        label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        onClick={onToggleTheme}
        t={t}
      />

      {/* Notificaciones */}
      <div style={{ position: "relative" }}>
        <IconBtn
          icon="ti-bell"
          label="Notificaciones"
          onClick={handleNotificationsClick}
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
              {notifBadge > 9 ? "9+" : notifBadge}
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
          onClick={handleProfileToggle}
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
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
              {displayName}
            </span>
            <span style={{ fontSize: 10, color: t.textMuted }}>
              {displayEmail.split("@")[0]}
            </span>
          </div>
          <i
            className={`ti ti-chevron-${isProfileOpen ? "up" : "down"}`}
            aria-hidden
            style={{ fontSize: 12, color: t.textMuted }}
          />
        </button>

        {/* Dropdown de perfil */}
        {isProfileOpen && (
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
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: t.text }}
                  >
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>
                    {displayEmail}
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

            {menuItems.map((item, i) => (
              <div key={item.id}>
                {i === menuItems.length - 1 && (
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
                    handleProfileClose();
                    if (onProfileClick) {
                      onProfileClick();
                    }
                    handleNavigate(item.path);
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
                    color: item.danger ? t.danger : t.text,
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "background 0.1s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      item.danger ? t.danger + "14" : t.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "none")
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
  );
}