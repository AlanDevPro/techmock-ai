// services/questionService.ts

export interface QuestionData {
  sesion_id: string | null;
  framework: string;
  nivel_dificultad: string;
  pregunta_practica: string;
  contexto_adicional: string | null;
  criterios_evaluacion: string[];
  conceptos_clave: string[];
  tiempo_estimado_minutos: number;
  fue_adaptativa: boolean;
  categorias_error_objetivo: string[];
}

// Mapeo de slug de URL → slug de API
const FRAMEWORK_API_MAP: Record<string, string> = {
  vuejs: "vue",
  vue: "vue",
  nextjs: "next",
  next: "next",
  react: "react",
  typescript: "typescript",
  javascript: "javascript",
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class QuestionService {
  /**
   * 🔥 FIX IMPORTANTE:
   * Cachea PROMISES, no datos ya resueltos.
   * Esto evita requests duplicados simultáneos.
   */
  private cache = new Map<string, Promise<QuestionData>>();

  async getByFramework(framework: string): Promise<QuestionData> {
    const apiSlug = FRAMEWORK_API_MAP[framework] ?? framework;
    const url = `${API_BASE}/preguntas/generar/${apiSlug}`;

    // ✅ FIX 1: Si ya existe una petición en curso, reutilizarla
    if (this.cache.has(framework)) {
      return this.cache.get(framework)!;
    }

    // ✅ FIX 2: Crear PROMISE única compartida
    const promise: Promise<QuestionData> = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response
            .text()
            .catch(() => response.statusText);
          throw new Error(
            `Error ${response.status}: ${detail}`
          );
        }
        return response.json();
      })
      .then((raw) => {
        // 🔧 Mapeo defensivo backend → frontend
        const data: QuestionData = {
          sesion_id: raw.sesion_id ?? null,
          framework: raw.framework ?? framework,
          nivel_dificultad:
            raw.nivel_dificultad ?? raw.nivel ?? "Junior",
          pregunta_practica: raw.pregunta_practica ?? "",
          contexto_adicional:
            raw.contexto_adicional ?? null,
          criterios_evaluacion: Array.isArray(
            raw.criterios_evaluacion
          )
            ? raw.criterios_evaluacion
            : [],
          conceptos_clave: Array.isArray(
            raw.conceptos_clave
          )
            ? raw.conceptos_clave
            : [],
          tiempo_estimado_minutos:
            raw.tiempo_estimado_minutos ??
            raw.tiempo_estimado_min ??
            30,
          fue_adaptativa: raw.fue_adaptativa ?? false,
          categorias_error_objetivo: Array.isArray(
            raw.categorias_error_objetivo
          )
            ? raw.categorias_error_objetivo
            : [],
        };

        return data;
      })
      .catch((err) => {
        // ❌ IMPORTANTE: si falla, limpiar cache para reintentar
        this.cache.delete(framework);
        throw err;
      });

    // ✅ FIX 3: Guardar PROMISE en cache (no resultado)
    this.cache.set(framework, promise);

    return promise;
  }

  clearCache(framework: string): void {
    this.cache.delete(framework);
  }

  clearAll(): void {
    this.cache.clear();
  }
}

const questionService = new QuestionService();
export default questionService;