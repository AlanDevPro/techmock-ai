import { apiClient } from "@/lib/apiClient";

type FrameworkApi = "vue" | "next" | "react";

export interface AnalisisPayload {
  codigo: string;
  framework: FrameworkApi;
}

export interface AnalisisResultado {
  [key: string]: unknown;
}

const codeService = {
  async analizarCodigo(payload: AnalisisPayload): Promise<AnalisisResultado> {
    return apiClient.post<AnalisisResultado>("/api/v1/analizar-codigo", payload);
  },

  resolverFrameworkApi(framework: "vuejs" | "nextjs" | null): FrameworkApi {
    if (framework === "vuejs")  return "vue";
    if (framework === "nextjs") return "next";
    return "react";
  },
};

export default codeService;