"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeContext } from "@/components/providers/ThemeProvider";

// ─── Componente de cierre de sesión ────────────────────────────────────────────

export default function AdminLogoutPage() {
  const router = useRouter();
  const { isDark, themeClasses } = useThemeContext();
  const [countdown, setCountdown] = useState(3);
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    // Función para cerrar sesión
    const performLogout = async () => {
      try {
        // Limpiar localStorage/sessionStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.clear();
        
        // Si usas cookies, limpiarlas también
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/");
        });

        // Esperar 3 segundos antes de redirigir
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              // Redirigir al login
              router.push("/auth");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error("Error during logout:", error);
        // Aún así redirigir después de error
        setTimeout(() => router.push("/auth"), 1500);
      }
    };

    performLogout();
  }, [router]);

  // Si el usuario hace clic en "Cancelar" o "Volver"
  const handleCancel = () => {
    router.back();
  };

  // Si el usuario quiere cerrar sesión inmediatamente
  const handleForceLogout = () => {
    setIsLoggingOut(true);
    setCountdown(0);
    router.push("/auth");
  };

  return (
    <div
      className={`min-h-[calc(100vh-54px)] flex items-center justify-center p-6 ${themeClasses.bg}`}
      style={{
        margin: "-1.5rem",
        marginTop: 0,
        padding: "1.5rem",
      }}
    >
      <div
        className={`max-w-md w-full rounded-2xl p-8 text-center border ${themeClasses.border} ${themeClasses.cardBg}`}
        style={{
          animation: "fadeInUp 0.4s ease-out",
        }}
      >
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        {/* Icono de logout */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: isDark ? "rgba(239,68,68,0.1)" : "rgba(220,38,38,0.08)",
          }}
        >
          {isLoggingOut ? (
            <svg
              className="animate-spin"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ animation: "spin 1s linear infinite" }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="31.4 31.4"
                style={{
                  color: isDark ? "#ef4444" : "#dc2626",
                  strokeDashoffset: 20,
                }}
              />
            </svg>
          ) : (
            <i
              className="ti ti-logout"
              style={{
                fontSize: 36,
                color: isDark ? "#ef4444" : "#dc2626",
              }}
            />
          )}
        </div>

        {/* Título */}
        <h1
          className={`text-2xl font-bold mb-3 ${themeClasses.textPrimary}`}
          style={{ letterSpacing: "-0.02em" }}
        >
          Cerrando sesión
        </h1>

        {/* Mensaje */}
        <p className={`text-sm mb-6 ${themeClasses.textMuted}`}>
          {countdown > 0
            ? `Serás redirigido a la página de inicio de sesión en ${countdown} segundo${
                countdown !== 1 ? "s" : ""
              }...`
            : "Redirigiendo..."}
        </p>

        {/* Barra de progreso */}
        <div
          className="h-1 rounded-full mb-8 overflow-hidden"
          style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(countdown / 3) * 100}%`,
              background: isDark ? "#ef4444" : "#dc2626",
            }}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${themeClasses.border} ${themeClasses.textPrimary}`}
            style={{
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleForceLogout}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
            style={{
              background: isDark ? "#ef4444" : "#dc2626",
              color: "#fff",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "#f87171"
                : "#b91c1c";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "#ef4444"
                : "#dc2626";
            }}
          >
            Cerrar sesión ahora
          </button>
        </div>

        {/* Mensaje de ayuda - CORREGIDO: usando solo textMuted */}
        <p
          className={`text-xs mt-6 ${themeClasses.textMuted}`}
          style={{ opacity: 0.7 }}
        >
          ¿No puedes cerrar sesión?{" "}
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              router.push("/auth");
            }}
            className="underline hover:no-underline transition-colors"
            style={{ color: isDark ? "#ef4444" : "#dc2626" }}
          >
            Limpiar datos manualmente
          </button>
        </p>
      </div>
    </div>
  );
}