"use client";

import { useState, useEffect } from "react";

type Framework = "vuejs" | "nextjs" | null;

interface QuestionData {
  pregunta_practica: string;
  comprension_a_evaluar: string;
  explicacion_codigo_esperado: string;
  error_por_falta_de_contexto?: string | null;
}

interface QuestionPanelProps {
  selectedFramework: Framework;
  isQuestionOpen: boolean;
  onToggleOpen: (open: boolean) => void;
}

export default function QuestionPanel({
  selectedFramework,
  isQuestionOpen,
  onToggleOpen,
}: QuestionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const hasLoadedRef = useState(false)[0]; // solo para tracking, usaremos useEffect con selectedFramework

  useEffect(() => {
    if (selectedFramework) {
      loadQuestions(selectedFramework);
    }
  }, [selectedFramework]);

  const loadQuestions = async (framework: "vuejs" | "nextjs") => {
    const endpoint = framework === "vuejs" ? "vue" : "next";
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/generar-preguntas/${endpoint}`);
      if (!response.ok) throw new Error("No se pudo obtener las preguntas");
      const data = await response.json();
      setQuestionData(data);
    } catch (err) {
      setQuestionData(null);
      setError("No se pudieron cargar las preguntas. Verifica la API RAG.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (selectedFramework) {
      loadQuestions(selectedFramework);
    }
  };

  return (
    <div
      className="border-b shrink-0"
      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
    >
      <details
        open={isQuestionOpen}
        onToggle={(e) => onToggleOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="w-full flex items-center justify-between px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-widest cursor-pointer list-none">
          <span>📋 Pregunta de la prueba</span>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {selectedFramework ? (selectedFramework === "vuejs" ? "Vue.js" : "Next.js") : "Sin seleccionar"}
          </span>
        </summary>
        <div className="px-4 pb-3 text-[12px] max-h-56 overflow-auto" style={{ color: "var(--text-secondary)" }}>
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
              <p>Cargando pregunta...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-red-400">{error}</p>
              {selectedFramework && (
                <button
                  onClick={handleRetry}
                  className="text-[11px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ⟳ Reintentar
                </button>
              )}
            </div>
          )}
          {!isLoading && !error && !questionData && (
            <div className="flex flex-col gap-2">
              <p>⚡ Selecciona Vue.js o Next.js desde la URL para cargar la pregunta técnica.</p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                Ejemplo: ?framework=vuejs o ?framework=nextjs
              </p>
            </div>
          )}
          {!isLoading && !error && questionData && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-heading)" }}>
                    {questionData.pregunta_practica}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base">📚</span>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    Comprensión a evaluar
                  </p>
                  <p>{questionData.comprension_a_evaluar}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    Explicación esperada
                  </p>
                  <p className="whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                    {questionData.explicacion_codigo_esperado}
                  </p>
                </div>
              </div>
              {questionData.error_por_falta_de_contexto && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded" style={{ background: "rgba(255, 255, 0, 0.1)", borderLeft: "3px solid #e6b422" }}>
                  <span className="text-base">⚠️</span>
                  <p className="text-yellow-400 text-[11px]">{questionData.error_por_falta_de_contexto}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}