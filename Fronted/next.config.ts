import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ──────────────────────────────────────────────────────────
  // CRÍTICO para Docker: genera .next/standalone
  // Permite correr con "node server.js" sin node_modules completo
  // ──────────────────────────────────────────────────────────
  output: "standalone",

  // ──────────────────────────────────────────────────────────
  // Variables de entorno públicas disponibles en el cliente
  // Se leen desde el entorno de Docker en tiempo de BUILD
  // ──────────────────────────────────────────────────────────
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000/api/v1",
  },

  // ──────────────────────────────────────────────────────────
  // Headers especiales para el IDE (WebAssembly, SharedArrayBuffer)
  // ──────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/ide",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },

  // ──────────────────────────────────────────────────────────
  // Rewrites: el frontend llama a /api/* y Nginx/Next
  // lo redirige al backend — evita problemas de CORS en prod
  // ──────────────────────────────────────────────────────────
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://api:4000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;