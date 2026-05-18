export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",

  FRONTEND_BASE_URL:
    process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000",
} as const;