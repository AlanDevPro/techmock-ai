// hooks/useQuestion.ts
import { useState, useEffect, useCallback, useRef } from "react";
import questionService, { type QuestionData } from "@/services/questionService";

type Framework = "vuejs" | "nextjs" | "react" | "typescript" | "javascript" | null;

interface UseQuestionReturn {
  data: QuestionData | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useQuestion(framework: Framework): UseQuestionReturn {
  const [data, setData]         = useState<QuestionData | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef                = useRef<AbortController | null>(null);

  const load = useCallback(async (fw: NonNullable<Framework>) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await questionService.getByFramework(fw);
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la pregunta. Verifica la conexión con la API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (framework) load(framework);
    return () => abortRef.current?.abort();
  }, [framework, load]);

  const retry = useCallback(() => {
    if (!framework) return;
    questionService.clearCache(framework);
    load(framework);
  }, [framework, load]);

  return { data, isLoading, error, retry };
}