"use client";

import { useQuestion } from "@/hooks/useQuestion";

type Framework = "vuejs" | "nextjs" | null;

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
  const { data, isLoading, error, retry } = useQuestion(selectedFramework);

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
        borderColor: "var(--border)",
      }}
    >
      <details
        open={isQuestionOpen}
        onToggle={(e) => onToggleOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="h-full flex flex-col"
      >
        <summary
          className="w-full flex items-center justify-between px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-widest cursor-pointer list-none border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span>📋 Pregunta de la prueba</span>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {selectedFramework
              ? selectedFramework === "vuejs" ? "Vue.js" : "Next.js"
              : "Sin seleccionar"}
          </span>
        </summary>

        <div
          className="flex-1 px-4 py-4 text-[12px] overflow-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          {isLoading && (
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ background: "var(--accent)" }}
              />
              <p>Cargando pregunta...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-red-400">{error}</p>
              {selectedFramework && (
                <button
                  onClick={retry}
                  className="text-[11px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ⟳ Reintentar
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && !data && (
            <div className="flex flex-col gap-2">
              <p>⚡ Selecciona Vue.js o Next.js desde la URL para cargar la pregunta técnica.</p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                Ejemplo: ?framework=vuejs o ?framework=nextjs
              </p>
            </div>
          )}

          {!isLoading && !error && data && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <span className="text-base">🎯</span>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-heading)" }}
                >
                  {data.pregunta_practica}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-base">📚</span>
                <div>
                  <p
                    className="text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: "var(--accent)" }}
                  >
                    Comprensión a evaluar
                  </p>
                  <p>{data.comprension_a_evaluar}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <p
                    className="text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: "var(--accent)" }}
                  >
                    Explicación esperada
                  </p>
                  <p
                    className="whitespace-pre-wrap"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {data.explicacion_codigo_esperado}
                  </p>
                </div>
              </div>

              {data.error_por_falta_de_contexto && (
                <div
                  className="flex items-start gap-2 mt-2 p-2 rounded"
                  style={{
                    background: "rgba(255, 255, 0, 0.1)",
                    borderLeft: "3px solid #e6b422",
                  }}
                >
                  <span className="text-base">⚠️</span>
                  <p className="text-yellow-400 text-[11px]">
                    {data.error_por_falta_de_contexto}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}