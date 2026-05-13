// services/api.ts

// ─────────────────────────────────────────────
// URLS BASE
// ─────────────────────────────────────────────

const IS_LOCAL =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost";

// IDE separado


// Backend principal
export const BACKEND_API_URL = IS_LOCAL
  ? "http://localhost:4000/api/v1"
  : "https://tu-backend-production.com/api/v1";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getAuthToken() {
  return localStorage.getItem("accessToken");
}

// ─────────────────────────────────────────────
// IDE / EJECUCIÓN DE CÓDIGO
// ─────────────────────────────────────────────



// ─────────────────────────────────────────────
// FETCH GENERAL BACKEND
// ─────────────────────────────────────────────

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {

  const token = getAuthToken();

  const headers: HeadersInit = {

    "Content-Type": "application/json",

    ...(token && {
      Authorization: `Bearer ${token}`,
    }),

    ...options.headers,
  };

  const response = await fetch(
    `${BACKEND_API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  // ───────────────────────────────────────────
  // AUTH ERRORS GLOBALES
  // ───────────────────────────────────────────

  if (response.status === 401) {

    console.error(
      "Sesión expirada o token inválido"
    );

    // futuro:
    // logout()
    // redirect login
    // refresh token

  }

  return response;
}