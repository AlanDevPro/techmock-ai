//editor-de-codigo/src/components/QuestionPanel.tsx

"use client";

import { useState, useEffect } from "react";

type Framework = "vuejs" | "nextjs" | null;

interface QuestionData {
  session_id?: string;
  pregunta_practica: string;
  comprension_a_evaluar: string;
  explicacion_codigo_esperado: string;
  error_por_falta_de_contexto?: string | null;
  medidor_dificultad?: {
    nivel: string;
    puntaje: number;
    tendencia: string;
  };
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

  useEffect(() => {
    if (selectedFramework) {
      loadQuestions(selectedFramework);
    }
  }, [selectedFramework]);

  const getSessionId = (framework: "vuejs" | "nextjs") => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session_id");
    if (fromUrl) {
      sessionStorage.setItem(`rag_session_id_${framework}`, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(`rag_session_id_${framework}`);
  };

  const loadQuestions = async (framework: "vuejs" | "nextjs") => {
    const sessionId = getSessionId(framework);
    const baseCacheKey = `question_${framework}`;
    const cacheKey = sessionId ? `${baseCacheKey}_${sessionId}` : baseCacheKey;
    
    // ✅ 1. Revisar caché primero
    const cached = sessionStorage.getItem(cacheKey) || (sessionId ? sessionStorage.getItem(baseCacheKey) : null);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached) as QuestionData;
        setQuestionData(parsedData);
        if (parsedData.session_id && parsedData.medidor_dificultad) {
          window.dispatchEvent(
            new CustomEvent("question-loaded", {
              detail: {
                framework,
                session_id: parsedData.session_id,
                medidor: parsedData.medidor_dificultad,
              },
            })
          );
        }
        return;
      } catch (err) {
        console.error("Error parsing cached data:", err);
        // Si hay error al parsear, continuar para obtener datos frescos
      }
    }

    const endpoint = framework === "vuejs" ? "vue" : "next";
    setIsLoading(true);
    setError(null);
    
    try {
      const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
      const response = await fetch(`http://127.0.0.1:8000/api/generar-preguntas/${endpoint}${query}`);
      if (!response.ok) throw new Error("No se pudo obtener las preguntas");
      const data = await response.json();

      if (data.session_id) {
        sessionStorage.setItem(`rag_session_id_${framework}`, data.session_id);
      }

      // ✅ 2. Guardar en caché (clave base y, si existe, clave con session_id)
      sessionStorage.setItem(baseCacheKey, JSON.stringify(data));
      if (data.session_id) {
        sessionStorage.setItem(`${baseCacheKey}_${data.session_id}`, JSON.stringify(data));
      }

      if (data.session_id && data.medidor_dificultad) {
        const metaKey = `question_meta_${framework}_${data.session_id}`;
        sessionStorage.setItem(metaKey, JSON.stringify({
          medidor: data.medidor_dificultad,
          timestamp: Date.now(),
        }));
        window.dispatchEvent(
          new CustomEvent("question-loaded", {
            detail: {
              framework,
              session_id: data.session_id,
              medidor: data.medidor_dificultad,
            },
          })
        );
      }
      
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
      const sessionId = getSessionId(selectedFramework);
      const baseCacheKey = `question_${selectedFramework}`;
      const cacheKey = sessionId ? `${baseCacheKey}_${sessionId}` : baseCacheKey;
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(baseCacheKey);
      loadQuestions(selectedFramework);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
    >
      <details
        open={isQuestionOpen}
        onToggle={(e) => onToggleOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="h-full flex flex-col"
      >
        <summary className="w-full flex items-center justify-between px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-widest cursor-pointer list-none border-b" style={{ borderColor: "var(--border)" }}>
          <span>📋 Pregunta de la prueba</span>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {selectedFramework ? (selectedFramework === "vuejs" ? "Vue.js" : "Next.js") : "Sin seleccionar"}
          </span>
        </summary>
        <div className="flex-1 px-4 py-4 text-[12px] overflow-auto" style={{ color: "var(--text-secondary)" }}>
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
            <div className="space-y-4">
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