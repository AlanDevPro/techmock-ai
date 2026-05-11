'use client';

import { useState } from "react";

const T = {
  dark: {
    bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
    border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
    accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
    danger: "#ef4444", searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#f0f2f5", surface: "#ffffff", surfaceHover: "#f8f9fb",
    border: "rgba(0,0,0,0.08)", text: "#111214", textMuted: "#5f6478", textFaint: "#adb0be",
    accent: "#00a855", accentBg: "rgba(0,168,85,0.08)",
    danger: "#dc2626", searchBg: "rgba(0,0,0,0.04)", searchBorder: "rgba(0,0,0,0.1)",
  },
};

const MOCK_QUESTIONS = [
  { id: 1, titulo: "¿Cómo funciona el Virtual DOM en React?", tecnologia: "React", nivel: "Junior", tipo: "teorica", activa: true, generada_por_ia: false, tiempo_estimado_min: 15, fecha_creacion: "2024-05-01" },
  { id: 2, titulo: "Implementa un debounce personalizado en TypeScript", tecnologia: "TypeScript", nivel: "Mid", tipo: "practica", activa: true, generada_por_ia: true, tiempo_estimado_min: 30, fecha_creacion: "2024-05-03" },
  { id: 3, titulo: "Explica las diferencias entre useCallback y useMemo", tecnologia: "React", nivel: "Senior", tipo: "teorica", activa: true, generada_por_ia: true, tiempo_estimado_min: 20, fecha_creacion: "2024-05-05" },
  { id: 4, titulo: "Diseña un sistema de caché con Redis para Node.js", tecnologia: "Node.js", nivel: "Senior", tipo: "arquitectura", activa: true, generada_por_ia: false, tiempo_estimado_min: 45, fecha_creacion: "2024-05-07" },
  { id: 5, titulo: "Escribe una función de búsqueda binaria en Python", tecnologia: "Python", nivel: "Mid", tipo: "practica", activa: false, generada_por_ia: false, tiempo_estimado_min: 25, fecha_creacion: "2024-05-08" },
  { id: 6, titulo: "Crea un índice compuesto en PostgreSQL y explica su uso", tecnologia: "PostgreSQL", nivel: "Senior", tipo: "practica", activa: true, generada_por_ia: false, tiempo_estimado_min: 30, fecha_creacion: "2024-05-10" },
  { id: 7, titulo: "Explica el event loop en Node.js con un ejemplo", tecnologia: "Node.js", nivel: "Mid", tipo: "teorica", activa: true, generada_por_ia: true, tiempo_estimado_min: 20, fecha_creacion: "2024-05-12" },
  { id: 8, titulo: "Implementa un sistema de rate limiting básico en Go", tecnologia: "Go", nivel: "Senior", tipo: "practica", activa: true, generada_por_ia: false, tiempo_estimado_min: 40, fecha_creacion: "2024-05-14" },
];

const NIVEL_COLORS: Record<string, string> = {
  Junior: "#00c96b", Mid: "#3b82f6", Senior: "#a855f7",
};
const TIPO_COLORS: Record<string, string> = {
  teorica: "#f59e0b", practica: "#3b82f6", arquitectura: "#a855f7",
};

interface Question {
  id: number; titulo: string; tecnologia: string; nivel: string;
  tipo: string; activa: boolean; generada_por_ia: boolean;
  tiempo_estimado_min: number; fecha_creacion: string;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export default function QuestionsPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [showModal, setShowModal] = useState(false);
  const t = T[theme];

  const filtered = questions.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = q.titulo.toLowerCase().includes(s) || q.tecnologia.toLowerCase().includes(s);
    const matchNivel = nivelFilter === "todos" || q.nivel === nivelFilter;
    const matchTipo = tipoFilter === "todos" || q.tipo === tipoFilter;
    const matchStatus = statusFilter === "todos" || (statusFilter === "activa" ? q.activa : !q.activa);
    return matchSearch && matchNivel && matchTipo && matchStatus;
  });

  const toggleActive = (id: number) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, activa: !q.activa } : q));
  const deleteQ = (id: number) => setQuestions(prev => prev.filter(q => q.id !== id));

  const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: t.text, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
      {options.map(o => <option key={o} value={o}>{o === "todos" ? "Todos" : o}</option>)}
    </select>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text }}>Preguntas</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>
              {questions.length} preguntas · {questions.filter(q => q.generada_por_ia).length} generadas por IA
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: "rgba(168,85,247,0.15)", color: "#a855f7", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-sparkles" style={{ fontSize: 16 }} /> Generar con IA
            </button>
            <button onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ fontSize: 16 }} /> Nueva pregunta
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: questions.length, icon: "ti-help-circle", color: "#a855f7" },
            { label: "Activas", value: questions.filter(q => q.activa).length, icon: "ti-circle-check", color: "#00c96b" },
            { label: "Generadas IA", value: questions.filter(q => q.generada_por_ia).length, icon: "ti-sparkles", color: "#3b82f6" },
            { label: "Tiempo prom.", value: Math.round(questions.reduce((a, q) => a + q.tiempo_estimado_min, 0) / questions.length) + " min", icon: "ti-clock", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textFaint, pointerEvents: "none" }} />
            <input type="text" placeholder="Buscar por título o tecnología..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "7px 12px 7px 32px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <Select value={nivelFilter} onChange={setNivelFilter} options={["todos", "Junior", "Mid", "Senior"]} />
          <Select value={tipoFilter} onChange={setTipoFilter} options={["todos", "teorica", "practica", "arquitectura"]} />
          <Select value={statusFilter} onChange={setStatusFilter} options={["todos", "activa", "inactiva"]} />
        </div>

        {/* Table */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {["Pregunta", "Tecnología", "Nivel", "Tipo", "Tiempo", "Estado", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.surfaceHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "13px 16px", maxWidth: 300 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.4 }}>{q.titulo}</div>
                    <div style={{ fontSize: 11, color: t.textFaint, marginTop: 3 }}>{q.fecha_creacion}
                      {q.generada_por_ia && <span style={{ marginLeft: 8, color: "#a855f7", fontWeight: 600 }}>✦ IA</span>}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 13, color: t.textMuted }}>{q.tecnologia}</span></td>
                  <td style={{ padding: "13px 16px" }}><Badge label={q.nivel} color={NIVEL_COLORS[q.nivel] || "#888"} /></td>
                  <td style={{ padding: "13px 16px" }}><Badge label={q.tipo} color={TIPO_COLORS[q.tipo] || "#888"} /></td>
                  <td style={{ padding: "13px 16px", color: t.textMuted, fontSize: 13 }}>{q.tiempo_estimado_min} min</td>
                  <td style={{ padding: "13px 16px" }}>
                    <button onClick={() => toggleActive(q.id)}
                      style={{ display: "flex", alignItems: "center", gap: 5, background: q.activa ? "rgba(0,201,107,0.1)" : "rgba(239,68,68,0.1)", border: "none", borderRadius: 99, padding: "4px 10px", cursor: "pointer", color: q.activa ? "#00c96b" : "#f87171", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                      <i className={`ti ${q.activa ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: 13 }} />
                      {q.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button title="Editar" style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: t.textMuted, fontSize: 14 }}><i className="ti ti-pencil" /></button>
                      <button onClick={() => deleteQ(q.id)} title="Eliminar" style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: t.danger, fontSize: 14 }}><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "4rem", textAlign: "center", color: t.textMuted }}>No se encontraron preguntas</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal placeholder */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowModal(false)}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: "2rem", width: 480, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: t.text }}>Nueva pregunta</h2>
              <p style={{ color: t.textMuted, fontSize: 13 }}>Conecta este formulario con tu API backend (<code style={{ color: t.accent }}>POST /api/preguntas</code>)</p>
              <button onClick={() => setShowModal(false)} style={{ marginTop: 20, padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}