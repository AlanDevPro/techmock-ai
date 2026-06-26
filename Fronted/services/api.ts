// services/api.ts

// ─────────────────────────────────────────────
// URL BASE
// ─────────────────────────────────────────────

//export const BACKEND_API_URL =
//  process.env.NEXT_PUBLIC_BACKEND_URL ??
//  "http://localhost:4000/api/v1";
//
//// ─────────────────────────────────────────────
//// AUTH TOKEN
//// ─────────────────────────────────────────────
//
//function getAuthToken(): string | null {
//  if (typeof window === "undefined") return null;
//
//  return localStorage.getItem("accessToken");
//}
//
//// ─────────────────────────────────────────────
//// FETCH GENERAL
//// ─────────────────────────────────────────────
//
//export async function apiFetch(
//  endpoint: string,
//  options: RequestInit = {}
//): Promise<Response> {
//
//  const token = getAuthToken();
//
//  const headers: HeadersInit = {
//    "Content-Type": "application/json",
//    ...(token && {
//      Authorization: `Bearer ${token}`,
//    }),
//    ...options.headers,
//  };
//
//  const response = await fetch(
//    `${BACKEND_API_URL}${endpoint}`,
//    {
//      ...options,
//      headers,
//    }
//  );
//
//  if (response.status === 401) {
//    console.error("Sesión expirada");
//  }
//
//  return response;
//}
//
//// ─────────────────────────────────────────────
//// RUN CODE
//// ─────────────────────────────────────────────
//
//export async function runCode(
//  code: string,
//  language: string
//) {
//
//  const response = await apiFetch("/execute", {
//    method: "POST",
//    body: JSON.stringify({
//      code,
//      language,
//    }),
//  });
//
//  if (!response.ok) {
//    throw new Error("Error ejecutando código");
//  }
//
//  return response.json();
//}