'use client';

/**
 * /app/(protected)/dashboard/admin/questions/page.tsx
 * Preguntas — datos reales desde el backend en puerto 4000
 * Mapea tabla: preguntas (JOIN tecnologias, niveles_dificultad)
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  const json = await res.json();
  // DELETE devuelve { success, message } sin .data
  return (json.data ?? json) as T;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Shape que devuelve GET /api/v1/admin/preguntas (con JOINs del model) */
interface PreguntaAPI {
  id: number;
  titulo: string;
  enunciado: string;
  tecnologia_id: number;
  nivel_id: number;
  tipo: string;
  activa: boolean;
  generada_por_ia: boolean;
  tiempo_estimado_min: number;
  fecha_creacion: string;
  prompt_contexto: string | null;
  creada_por: string | null;
  // Campos JOIN del model.getAll()
  tecnologia: string;   // t.nombre AS tecnologia
  nivel: string;        // n.nombre AS nivel
}

// Payload para crear pregunta
interface NuevaPreguntaPayload {
  tecnologia_id: number;
  nivel_id: number;
  titulo: string;
  enunciado: string;
  tipo: string;
  tiempo_estimado_min: number;
  prompt_contexto?: string;
}

// ─── Tokens de color ──────────────────────────────────────────────────────────

const T = {
  bg: "#111214", surface: "#1a1c20", surfaceHover: "#22252b",
  border: "rgba(255,255,255,0.08)", text: "#e8eaed", textMuted: "#8b8fa8", textFaint: "#555868",
  accent: "#00c96b", accentBg: "rgba(0,201,107,0.1)",
  danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)",
  searchBg: "rgba(255,255,255,0.06)", searchBorder: "rgba(255,255,255,0.12)",
  inputBg: "rgba(255,255,255,0.05)",
};

const NIVEL_COLORS: Record<string, string> = {
  Junior: "#00c96b", Mid: "#3b82f6", Senior: "#a855f7",
};
const TIPO_COLORS: Record<string, string> = {
  teorica: "#f59e0b", practica: "#3b82f6", arquitectura: "#a855f7",
};

// ─── Componentes pequeños ─────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + "18", color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: T.searchBg, border: `1px solid ${T.searchBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: T.text, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Spinner({ size = 28, color = T.accent }: { size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, border: `3px solid rgba(255,255,255,0.08)`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  );
}

// ─── Modal: Nueva pregunta ────────────────────────────────────────────────────

const TIPOS_PREGUNTA = ["practica", "teorica", "arquitectura"];

interface ModalProps {
  onClose: () => void;
  onCreated: (p: PreguntaAPI) => void;
  tecnologias: { id: number; nombre: string }[];
  niveles: { id: number; nombre: string }[];
}

function ModalNuevaPregunta({ onClose, onCreated, tecnologias, niveles }: ModalProps) {
  const [form, setForm] = useState<NuevaPreguntaPayload>({
    tecnologia_id: tecnologias[0]?.id ?? 0,
    nivel_id: niveles[0]?.id ?? 0,
    titulo: "",
    enunciado: "",
    tipo: "practica",
    tiempo_estimado_min: 30,
    prompt_contexto: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof NuevaPreguntaPayload, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.enunciado.trim()) {
      setError("Título y enunciado son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nueva = await apiFetch<PreguntaAPI>("/admin/preguntas", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          prompt_contexto: form.prompt_contexto || undefined,
        }),
      });
      onCreated(nueva);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear pregunta");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: T.inputBg, border: `1px solid ${T.searchBorder}`,
    borderRadius: 9, padding: "9px 12px", fontSize: 13, color: T.text,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: T.textFaint,
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "block",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "1.75rem", width: 520, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text }}>Nueva pregunta</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Título */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input value={form.titulo} onChange={e => set("titulo", e.target.value)}
              placeholder="Ej: Implementa un hook de paginación..." style={inputStyle} />
          </div>

          {/* Enunciado */}
          <div>
            <label style={labelStyle}>Enunciado *</label>
            <textarea value={form.enunciado} onChange={e => set("enunciado", e.target.value)}
              placeholder="Descripción detallada del problema..." rows={4}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Tecnología + Nivel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Tecnología *</label>
              <select value={form.tecnologia_id} onChange={e => set("tecnologia_id", Number(e.target.value))} style={{ ...inputStyle }}>
                {tecnologias.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nivel *</label>
              <select value={form.nivel_id} onChange={e => set("nivel_id", Number(e.target.value))} style={{ ...inputStyle }}>
                {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo + Tiempo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo *</label>
              <select value={form.tipo} onChange={e => set("tipo", e.target.value)} style={{ ...inputStyle }}>
                {TIPOS_PREGUNTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tiempo estimado (min)</label>
              <input type="number" min={5} max={180} value={form.tiempo_estimado_min}
                onChange={e => set("tiempo_estimado_min", Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          {/* Prompt contexto (opcional) */}
          <div>
            <label style={labelStyle}>Contexto para IA <span style={{ color: T.textFaint, fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
            <input value={form.prompt_contexto ?? ""} onChange={e => set("prompt_contexto", e.target.value)}
              placeholder="Instrucciones adicionales para la IA al evaluar..." style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}33`, borderRadius: 9, padding: "10px 14px", fontSize: 13, color: T.danger }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} disabled={saving}
              style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? <><Spinner size={14} color="#fff" /> Guardando…</> : "Crear pregunta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function QuestionsPage() {
  const [preguntas, setPreguntas]     = useState<PreguntaAPI[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [nivelFilter, setNivelFilter] = useState("todos");
  const [tipoFilter, setTipoFilter]   = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showModal, setShowModal]     = useState(false);
  // Para el modal necesitamos tecnologías y niveles del backend
  const [tecnologias, setTecnologias] = useState<{ id: number; nombre: string }[]>([]);
  const [niveles, setNiveles]         = useState<{ id: number; nombre: string }[]>([]);
  // Estados de operaciones en fila (toggle/delete)
  const [toggling, setToggling]       = useState<number | null>(null);
  const [deleting, setDeleting]       = useState<number | null>(null);

  // ── Fetch preguntas + catálogos ───────────────────────────────────────────

  const fetchPreguntas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Las 3 llamadas en paralelo
      const [preg, techs, niv] = await Promise.all([
        apiFetch<PreguntaAPI[]>("/admin/preguntas"),
        apiFetch<{ id: number; nombre: string }[]>("/tecnologias"),
        apiFetch<{ id: number; nombre: string }[]>("/niveles"),
      ]);
      setPreguntas(preg);
      setTecnologias(techs);
      setNiveles(niv);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPreguntas(); }, [fetchPreguntas]);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const toggleActive = async (id: number, activa: boolean) => {
    setToggling(id);
    try {
      // PATCH /api/v1/admin/preguntas/:id  con { activa: !activa }
      await apiFetch(`/admin/preguntas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !activa }),
      });
      setPreguntas(prev => prev.map(q => q.id === id ? { ...q, activa: !activa } : q));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setToggling(null);
    }
  };

  const deleteQ = async (id: number) => {
    if (!confirm("¿Desactivar esta pregunta? (Soft delete — no se elimina físicamente)")) return;
    setDeleting(id);
    try {
      // DELETE /api/v1/admin/preguntas/:id  → softDelete en el model
      await apiFetch(`/admin/preguntas/${id}`, { method: "DELETE" });
      // El softDelete solo pone activa = false, así que actualizamos el estado local
      setPreguntas(prev => prev.map(q => q.id === id ? { ...q, activa: false } : q));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const onCreated = (nueva: PreguntaAPI) => {
    setPreguntas(prev => [nueva, ...prev]);
  };

  // ── Derivados ─────────────────────────────────────────────────────────────

  const nivelesUnicos  = useMemo(() => [...new Set(preguntas.map(q => q.nivel))].sort(), [preguntas]);
  const tiposUnicos    = useMemo(() => [...new Set(preguntas.map(q => q.tipo))].sort(), [preguntas]);

  const filtered = useMemo(() => {
    return preguntas.filter(q => {
      const s = search.toLowerCase();
      if (search && !q.titulo.toLowerCase().includes(s) && !q.tecnologia.toLowerCase().includes(s)) return false;
      if (nivelFilter !== "todos" && q.nivel !== nivelFilter) return false;
      if (tipoFilter  !== "todos" && q.tipo !== tipoFilter)   return false;
      if (statusFilter === "activa"   && !q.activa)  return false;
      if (statusFilter === "inactiva" && q.activa)   return false;
      return true;
    });
  }, [preguntas, search, nivelFilter, tipoFilter, statusFilter]);

  const stats = useMemo(() => ({
    total:      preguntas.length,
    activas:    preguntas.filter(q => q.activa).length,
    porIa:      preguntas.filter(q => q.generada_por_ia).length,
    tiempoProm: preguntas.length > 0
      ? Math.round(preguntas.reduce((a, q) => a + q.tiempo_estimado_min, 0) / preguntas.length)
      : 0,
  }), [preguntas]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: T.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}>Preguntas</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
              {loading ? "Cargando…" : `${preguntas.length} preguntas · ${stats.porIa} generadas por IA`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={loading}
              onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}
            >
              <i className="ti ti-plus" style={{ fontSize: 16 }} /> Nueva pregunta
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total",       value: stats.total,              icon: "ti-help-circle", color: "#a855f7" },
            { label: "Activas",     value: stats.activas,            icon: "ti-circle-check", color: "#00c96b" },
            { label: "Generadas IA",value: stats.porIa,              icon: "ti-sparkles",    color: "#3b82f6" },
            { label: "Tiempo prom.",value: stats.tiempoProm + " min",icon: "ti-clock",       color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                  {loading ? <div style={{ width: 40, height: 20, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} /> : s.value}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.textFaint, pointerEvents: "none" }} />
            <input
              type="text" placeholder="Buscar por título o tecnología…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", background: T.searchBg, border: `1px solid ${T.searchBorder}`, borderRadius: 8, padding: "7px 12px 7px 32px", fontSize: 13, color: T.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
            />
          </div>
          <Select value={nivelFilter} onChange={setNivelFilter}
            options={[{ value: "todos", label: "Todos los niveles" }, ...nivelesUnicos.map(n => ({ value: n, label: n }))]} />
          <Select value={tipoFilter} onChange={setTipoFilter}
            options={[{ value: "todos", label: "Todos los tipos" }, ...tiposUnicos.map(t => ({ value: t, label: t }))]} />
          <Select value={statusFilter} onChange={setStatusFilter}
            options={[{ value: "todos", label: "Todos" }, { value: "activa", label: "Activas" }, { value: "inactiva", label: "Inactivas" }]} />
          <span style={{ fontSize: 12, color: T.textFaint, marginLeft: "auto" }}>{filtered.length} resultados</span>
        </div>

        {/* Tabla */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Pregunta", "Tecnología", "Nivel", "Tipo", "Tiempo", "Estado", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Loading */}
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <Spinner size={32} />
                      <span style={{ fontSize: 13, color: T.textFaint }}>Cargando preguntas…</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Error */}
              {!loading && error && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <i className="ti ti-wifi-off" style={{ fontSize: 32, color: T.danger }} />
                      <p style={{ margin: 0, fontSize: 14, color: T.textMuted }}>Error al cargar preguntas</p>
                      <p style={{ margin: 0, fontSize: 12, color: T.textFaint, fontFamily: "monospace" }}>{error}</p>
                      <button onClick={fetchPreguntas}
                        style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${T.accent}44`, background: T.accentBg, color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Sin resultados */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "4rem", textAlign: "center", color: T.textMuted }}>
                    {preguntas.length === 0 ? "No hay preguntas creadas todavía" : "No se encontraron preguntas con esos filtros"}
                  </td>
                </tr>
              )}

              {/* Filas */}
              {!loading && !error && filtered.map(q => (
                <tr
                  key={q.id}
                  style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.surfaceHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "13px 16px", maxWidth: 300 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>{q.titulo}</div>
                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>
                      {new Date(q.fecha_creacion).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
                      {q.generada_por_ia && (
                        <span style={{ marginLeft: 8, color: "#a855f7", fontWeight: 600 }}>✦ IA</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 13, color: T.textMuted }}>{q.tecnologia}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <Badge label={q.nivel} color={NIVEL_COLORS[q.nivel] ?? "#888"} />
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <Badge label={q.tipo} color={TIPO_COLORS[q.tipo] ?? "#888"} />
                  </td>
                  <td style={{ padding: "13px 16px", color: T.textMuted, fontSize: 13 }}>
                    {q.tiempo_estimado_min} min
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {/* Toggle activa/inactiva → PATCH /api/v1/admin/preguntas/:id */}
                    <button
                      onClick={() => toggleActive(q.id, q.activa)}
                      disabled={toggling === q.id}
                      style={{ display: "flex", alignItems: "center", gap: 5, background: q.activa ? "rgba(0,201,107,0.1)" : "rgba(239,68,68,0.1)", border: "none", borderRadius: 99, padding: "4px 10px", cursor: toggling === q.id ? "not-allowed" : "pointer", color: q.activa ? "#00c96b" : "#f87171", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: toggling === q.id ? 0.6 : 1 }}
                    >
                      {toggling === q.id
                        ? <Spinner size={11} color={q.activa ? "#00c96b" : "#f87171"} />
                        : <i className={`ti ${q.activa ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: 13 }} />
                      }
                      {q.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Botón editar — placeholder (puedes expandirlo) */}
                      <button title="Editar"
                        style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: T.textMuted, fontSize: 14 }}>
                        <i className="ti ti-pencil" />
                      </button>
                      {/* Soft delete → DELETE /api/v1/admin/preguntas/:id */}
                      <button
                        onClick={() => deleteQ(q.id)}
                        disabled={deleting === q.id}
                        title="Desactivar"
                        style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px", cursor: deleting === q.id ? "not-allowed" : "pointer", color: T.danger, fontSize: 14, opacity: deleting === q.id ? 0.5 : 1 }}
                      >
                        {deleting === q.id ? <Spinner size={13} color={T.danger} /> : <i className="ti ti-trash" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva pregunta */}
      {showModal && (
        <ModalNuevaPregunta
          onClose={() => setShowModal(false)}
          onCreated={onCreated}
          tecnologias={tecnologias}
          niveles={niveles}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}