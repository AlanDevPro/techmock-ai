import { apiClient } from "@/lib/apiClient";
import cacheService from "./cacheService";

export interface QuestionData {
  pregunta_practica: string;
  comprension_a_evaluar: string;
  explicacion_codigo_esperado: string;
  error_por_falta_de_contexto?: string | null;
}

type Framework = "vuejs" | "nextjs";

const ENDPOINTS: Record<Framework, string> = {
  vuejs:  "/api/v1/generar-preguntas/vue",
  nextjs: "/api/v1/generar-preguntas/next",
};

const questionService = {
  async getByFramework(framework: Framework): Promise<QuestionData> {
    const cacheKey = `question_${framework}`;

    const cached = cacheService.get<QuestionData>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<QuestionData>(ENDPOINTS[framework]);
    cacheService.set(cacheKey, data);
    return data;
  },

  clearCache(framework: Framework): void {
    cacheService.remove(`question_${framework}`);
  },
};

export default questionService;