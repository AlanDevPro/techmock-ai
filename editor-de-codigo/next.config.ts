import type { NextConfig } from "next";

const techmockApiUrl =
  process.env.TECHMOCK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // IMPORTANTES PARA WEBCONTAINER
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },

  async rewrites() {
    // En build time dentro del Dockerfile es posible que la URL
    // no esté definida; en ese caso omitimos el rewrite y Next.js
    // lo configurará en runtime con la env var del contenedor.
    if (!techmockApiUrl) {
      return [];
    }

    return [
      {
        source: "/api/rag/:path*",
        destination: `${techmockApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;