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

const PILL: Record<string, { bg: string; c: string }> = {
  enviado:    { bg: "rgba(245,158,11,0.12)", c: "#fbbf24" },
  respondido: { bg: "rgba(0,201,107,0.12)",  c: "#00c96b" },
  rechazado:  { bg: "rgba(239,68,68,0.12)",  c: "#f87171" },
  en_proceso: { bg: "rgba(59,130,246,0.12)",  c: "#60a5fa" },
};

const MOCK_CONTACTS = [
  { id: 1, developer: "Carlos López",   initials: "CL", email: "carlos@dev.io",  asunto: "Oportunidad Backend Node.js", estado: "enviado",    fecha_envio: "2024-05-10T10:00:00Z", sesion_score: 64, tecnologia: "Node.js",    nivel: "Mid",    mensaje: "Hola Carlos, vi tu perfil y me gustaría hablar contigo sobre una oportunidad.", respuesta: null },
  { id: 2, developer: "Ana Martínez",   initials: "AM", email: "ana@dev.io",     asunto: "Posición Frontend Senior",   estado: "respondido", fecha_envio: "2024-05-09T08:30:00Z", sesion_score: 88, tecnologia: "React",      nivel: "Senior", mensaje: "Ana, tu performance en React fue excelente.", respuesta: "¡Gracias! Estaré disponible la próxima semana." },
  { id: 3, developer: "Diego Ruiz",     initials: "DR", email: "diego@dev.io",   asunto: "Rol DBA PostgreSQL",         estado: "enviado",    fecha_envio: "2024-05-08T15:45:00Z", sesion_score: 91, tecnologia: "PostgreSQL", nivel: "Senior", mensaje: "Diego, tu conocimiento de PostgreSQL es outstanding.", respuesta: null },
  { id: 4, developer: "Sofía Vega",     initials: "SV", email: "sofia@dev.io",   asunto: "Posición TypeScript Mid",    estado: "rechazado",  fecha_envio: "2024-05-07T11:00:00Z", sesion_score: null, tecnologia: "TypeScript", nivel: "Mid", mensaje: "Sofía, te contactamos para una posición TypeScript.", respuesta: "Gracias, pero no estoy buscando cambio en este momento." },
  { id: 5, developer: "Tomás Bravo",    initials: "TB", email: "tomas@dev.io",   asunto: "Backend Go Senior",          estado: "en_proceso", fecha_envio: "2024-05-06T09:00:00Z", sesion_score: 79, tecnologia: "Go",         nivel: "Senior", mensaje: "Tomás, tu entrevista de Go fue muy sólida.", respuesta: "Me interesa, agendemos una call." },
];

const AVATAR_COLORS = ["#00c96b", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function RecruitmentPage() {
  const [theme] = useState<"dark" | "light">("dark");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selected, setSelected] = useState<typeof MOCK_CONTACTS[0] | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const t = T[theme];

  const filtered = MOCK_CONTACTS.filter(c => {
    const s = search.toLowerCase();
    const match = c.developer.toLowerCase().includes(s) || c.asunto.toLowerCase().includes(s) || c.tecnologia.toLowerCase().includes(s);
    const stMatch = statusFilter === "todos" || c.estado === statusFilter;
    return match && stMatch;
  });

  const statCounts = {
    total: MOCK_CONTACTS.length,
    enviado: MOCK_CONTACTS.filter(c => c.estado === "enviado").length,
    respondido: MOCK_CONTACTS.filter(c => c.estado === "respondido").length,
    en_proceso: MOCK_CONTACTS.filter(c => c.estado === "en_proceso").length,
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'DM Sans', sans-serif", color: t.text, fontSize: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text }}>Reclutamiento</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>Gestiona el contacto con developers destacados</p>
          </div>
          <button onClick={() => setShowCompose(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-mail-plus" style={{ fontSize: 16 }} /> Nuevo contacto
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total contactos", value: statCounts.total,      icon: "ti-mail",          color: "#3b82f6" },
            { label: "Pendientes",      value: statCounts.enviado,     icon: "ti-clock",         color: "#f59e0b" },
            { label: "Respondidos",     value: statCounts.respondido,  icon: "ti-message-check", color: "#00c96b" },
            { label: "En proceso",      value: statCounts.en_proceso,  icon: "ti-loader",        color: "#a855f7" },
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

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
          {/* Left: list */}
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textFaint, pointerEvents: "none" }} />
                <input type="text" placeholder="Buscar developer o asunto..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, cursor: "pointer", fontFamily: "inherit" }}>
                {["todos", "enviado", "respondido", "rechazado", "en_proceso"].map(o => (
                  <option key={o} value={o}>{o === "todos" ? "Todos los estados" : o.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((c, i) => {
                const pill = PILL[c.estado] || PILL.enviado;
                const isSelected = selected?.id === c.id;
                return (
                  <div key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                    style={{ background: t.surface, border: `1.5px solid ${isSelected ? t.accent + "60" : t.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s", display: "flex", gap: 14, alignItems: "flex-start" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = t.border.replace("0.08", "0.18"); }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = t.border; }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: AVATAR_COLORS[i % AVATAR_COLORS.length] + "22", border: `1.5px solid ${AVATAR_COLORS[i % AVATAR_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: AVATAR_COLORS[i % AVATAR_COLORS.length], flexShrink: 0 }}>
                      {c.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{c.developer}</div>
                          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{c.asunto}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                          <span style={{ background: pill.bg, color: pill.c, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99 }}>
                            {c.estado.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: 11, color: t.textFaint }}>{timeAgo(c.fecha_envio)}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 11, background: t.searchBg, color: t.textMuted, padding: "2px 8px", borderRadius: 6 }}>{c.tecnologia}</span>
                        <span style={{ fontSize: 11, background: t.searchBg, color: t.textMuted, padding: "2px 8px", borderRadius: 6 }}>{c.nivel}</span>
                        {c.sesion_score !== null && (
                          <span style={{ fontSize: 11, background: "rgba(0,201,107,0.1)", color: "#00c96b", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                            Score: {c.sesion_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "4rem", textAlign: "center" }}>
                  <i className="ti ti-mail-off" style={{ fontSize: 40, color: t.textFaint, display: "block", marginBottom: 12 }} />
                  <p style={{ margin: 0, color: t.textMuted }}>No se encontraron contactos</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          {selected && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "20px", height: "fit-content", position: "sticky", top: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>Detalle del contacto</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 18 }}><i className="ti ti-x" /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Developer</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{selected.developer}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{selected.email}</div>
                </div>
                <div style={{ height: 1, background: t.border }} />
                <div>
                  <div style={{ fontSize: 11, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Asunto</div>
                  <div style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{selected.asunto}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Mensaje enviado</div>
                  <div style={{ background: t.searchBg, borderRadius: 10, padding: "12px", fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{selected.mensaje}</div>
                </div>
                {selected.respuesta && (
                  <div>
                    <div style={{ fontSize: 11, color: "#00c96b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Respuesta del developer</div>
                    <div style={{ background: "rgba(0,201,107,0.08)", border: "1px solid rgba(0,201,107,0.2)", borderRadius: 10, padding: "12px", fontSize: 13, color: t.text, lineHeight: 1.5 }}>{selected.respuesta}</div>
                  </div>
                )}
                <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 10, border: "none", background: t.accentBg, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                  <i className="ti ti-mail" style={{ fontSize: 16 }} /> Enviar seguimiento
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compose Modal */}
        {showCompose && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCompose(false)}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: "2rem", width: 500, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: t.text }}>Nuevo contacto de reclutamiento</h2>
              <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 20px" }}>Conecta con tu API: <code style={{ color: t.accent }}>POST /api/contactos_reclutamiento</code></p>
              <button onClick={() => setShowCompose(false)} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}