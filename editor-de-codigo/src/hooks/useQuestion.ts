import { useState, useEffect, useCallback } from "react";
import questionService, { type QuestionData } from "@/services/questionService";

type Framework = "vuejs" | "nextjs" | null;

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

  const load = useCallback(async (fw: "vuejs" | "nextjs") => {
    setLoading(true);
    setError(null);
    try {
      const result = await questionService.getByFramework(fw);
      setData(result);
    } catch {
      setData(null);
      setError("No se pudieron cargar las preguntas. Verifica la API RAG.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (framework) load(framework);
  }, [framework, load]);

  const retry = useCallback(() => {
    if (!framework) return;
    questionService.clearCache(framework);
    load(framework);
  }, [framework, load]);

  return { data, isLoading, error, retry };
}