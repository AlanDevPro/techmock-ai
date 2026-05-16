import { env } from "@/config/env";

class ApiError extends Error {
  constructor(public status: number, path: string) {
    super(`[${status}] ${path}`);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

export const apiClient = {
  get:  <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};