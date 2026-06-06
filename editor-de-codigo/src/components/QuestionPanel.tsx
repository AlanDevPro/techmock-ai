// components/QuestionPanel.tsx
"use client";

import { useQuestion } from "@/hooks/useQuestion";

type Framework = "vuejs" | "nextjs" | "react" | "typescript" | "javascript" | null;

const FRAMEWORK_LABELS: Record<NonNullable<Framework>, string> = {
  vuejs:      "Vue.js",
  nextjs:     "Next.js",
  react:      "React",
  typescript: "TypeScript",
  javascript: "JavaScript",
};

const NIVEL_COLOR: Record<string, string> = {
  Junior:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Intermedio: "bg-amber-500/10  text-amber-400  border-amber-500/20",
  Senior:     "bg-rose-500/10   text-rose-400   border-rose-500/20",
};

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

  const frameworkLabel = selectedFramework
    ? FRAMEWORK_LABELS[selectedFramework]
    : "Sin seleccionar";

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
    >
      <details
        open={isQuestionOpen}
        onToggle={(e) => onToggleOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="h-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <summary
          className="flex items-center justify-between px-4 py-3 cursor-pointer list-none border-b select-none"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px]">📋</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              Enunciado
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  NIVEL_COLOR[data.nivel_dificultad] ?? NIVEL_COLOR["Junior"]
                }`}
              >
                {data.nivel_dificultad}
              </span>
            )}
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {frameworkLabel}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
              {isQuestionOpen ? "▲" : "▼"}
            </span>
          </div>
        </summary>

        {/* Body */}
        <div className="flex-1 overflow-auto">

          {/* Estado: cargando */}
          {isLoading && (
            <div className="flex items-center gap-3 px-4 py-6">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{
                      background: "var(--accent)",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                Generando pregunta con RAG…
              </p>
            </div>
          )}

          {/* Estado: error */}
          {!isLoading && error && (
            <div className="px-4 py-4">
              <div
                className="flex items-start justify-between gap-3 p-3 rounded-md"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <div>
                  <p className="text-[11px] font-semibold text-red-400 mb-0.5">Error al cargar</p>
                  <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{error}</p>
                </div>
                {selectedFramework && (
                  <button
                    onClick={retry}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-70"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      color: "var(--text-primary)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    ⟳ Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Estado: sin framework */}
          {!isLoading && !error && !data && (
            <div className="px-4 py-6 space-y-1.5">
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                ⚡ Selecciona un framework para cargar la pregunta técnica.
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                Ejemplo: ?framework=vuejs · ?framework=nextjs · ?framework=react
              </p>
            </div>
          )}

          {/* Estado: pregunta cargada */}
          {!isLoading && !error && data && (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>

              {/* Enunciado principal */}
              <section className="px-4 py-4 space-y-2">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent)" }}
                >
                  🎯 Problema
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  {data.pregunta_practica}
                </p>
              </section>

              {/* Contexto adicional (código base, restricciones) */}
              {data.contexto_adicional && (
                <section className="px-4 py-4 space-y-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--accent)" }}
                  >
                    📎 Contexto y restricciones
                  </p>
                  <pre
                    className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-md p-3 overflow-x-auto"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {data.contexto_adicional}
                  </pre>
                </section>
              )}

              {/* Criterios de evaluación */}
              {data.criterios_evaluacion.length > 0 && (
                <section className="px-4 py-4 space-y-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--accent)" }}
                  >
                    ✅ Criterios de evaluación
                  </p>
                  <ul className="space-y-1.5">
                    {data.criterios_evaluacion.map((criterio, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className="mt-0.5 shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: "var(--accent)",
                            color: "var(--bg-secondary)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-[12px] leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {criterio}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Conceptos clave */}
              {data.conceptos_clave.length > 0 && (
                <section className="px-4 py-4 space-y-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--accent)" }}
                  >
                    🧩 Conceptos clave
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.conceptos_clave.map((concepto, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md"
                        style={{
                          background: "var(--bg-primary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {concepto}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Footer: metadata */}
              <div
                className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                style={{ background: "var(--bg-primary)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    ⏱ {data.tiempo_estimado_minutos} min
                  </span>
                  {data.fue_adaptativa && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(139,92,246,0.1)",
                        color: "#a78bfa",
                        border: "1px solid rgba(139,92,246,0.25)",
                      }}
                    >
                      ✦ Adaptativa
                    </span>
                  )}
                </div>
                
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}