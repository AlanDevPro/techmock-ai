import axios from "axios";

const apiClient = axios.create({
  // 🔥 Utiliza la URL unificada con el prefijo /rag expuesta por el ALB
  baseURL: process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000",
});

// 🔥 Interceptor global de autenticación para los candidatos
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { apiClient };