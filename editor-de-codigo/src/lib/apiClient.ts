import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000",
});

// 🔥 interceptor global de auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { apiClient };