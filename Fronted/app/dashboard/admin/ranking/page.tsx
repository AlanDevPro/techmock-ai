// app/dashboard/admin/ranking/page.tsx

'use client';

import { useState, useEffect, useMemo } from "react";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import { candidatosService, type CandidatoRanking, type CandidatoDetail, type TecnologiaRanking } from "@/services/candidatos.service";

// ─── Constants ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "score_global", label: "Score global" },
  { value: "score_javascript", label: "JavaScript" },
  { value: "score_arquitectura", label: "Arquitectura" },
  { value: "score_buenas_practicas", label: "Buenas prácticas" },
  { value: "score_comunicacion", label: "Comunicación" },
  { value: "score_resolucion", label: "Resolución" },
  { value: "consistencia", label: "Consistencia" },
  { value: "total_sesiones", label: "Sesiones" },
];

const NIVEL_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
  destacado:   { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", label: "Destacado",    dot: "#10B981" },
  recomendado: { bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD", label: "Recomendado",  dot: "#3B82F6" },
  promisorio:  { bg: "#FFFBEB", text: "#92400E", border: "#FCD34D", label: "Promisorio",   dot: "#F59E0B" },
  revisar:     { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74", label: "Revisar",      dot: "#F97316" },
  descartado:  { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", label: "Descartado",   dot: "#EF4444" },
};

// ─── Tipos para SVG ────────────────────────────────────────────────────────────

type TextAnchorType = "start" | "middle" | "end" | "inherit";

// ─── Interfaces para datos anidados ──────────────────────────────────────────

interface Fortaleza {
  categoria: string;
  descripcion: string;
  veces_demostrada: number;
  confianza: number;
}

interface Debilidad {
  categoria: string;
  descripcion: string;
  veces_fallada: number;
  impacto: number;
  requiere_practica: boolean;
}

interface ErrorItem {
  categoria: string;
  descripcion: string;
  severidad: "critico" | "alto" | "medio" | "bajo";
  es_conceptual: boolean;
}

interface Recomendacion {
  tipo: string;
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  recurso_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#fbbf24";
  if (score >= 50) return "#f97316";
  return "#f87171";
}

function getTrendColor(t: string): string {
  if (t?.includes("↑")) return "#059669";
  if (t?.includes("↓")) return "#DC2626";
  return "#6B7280";
}

function getTrendIcon(t: string): string {
  if (t?.includes("↑")) return "↑";
  if (t?.includes("↓")) return "↓";
  return "→";
}

function formatRelativeTime(date: string | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days} d`;
  return `hace ${Math.floor(days / 7)} sem`;
}

// ─── Radar Chart ─────────────────────────────────────────────────────────────

function RadarChart({
  pilares,
  size = 140,
  isDark,
}: {
  pilares: { label: string; score: number }[];
  size?: number;
  isDark: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const n = pilares.length;
  const rings = [20, 40, 60, 80];

  const strokeColor = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? "#9CA3AF" : "#6B7280";

  function polar(pct: number, i: number, r: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + r * (pct / 100) * Math.cos(angle),
      y: cy + r * (pct / 100) * Math.sin(angle),
    };
  }

  const dataPoints = pilares.map((p, i) => polar(p.score, i, maxR));
  const dataPath = dataPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";

  const labelOffset = 1.28;
  const labels = pilares.map((p, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cosA = Math.cos(angle);
    let anchor: TextAnchorType = "middle";
    if (cosA > 0.1) anchor = "start";
    else if (cosA < -0.1) anchor = "end";
    else anchor = "middle";
    
    return {
      label: p.label,
      score: p.score,
      x: cx + maxR * labelOffset * Math.cos(angle),
      y: cy + maxR * labelOffset * Math.sin(angle),
      anchor,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {rings.map((r) => {
        const pts = Array.from({ length: n }, (_, i) => polar(r, i, maxR));
        const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";
        return <path key={r} d={path} fill="none" stroke={strokeColor} strokeWidth={0.8} />;
      })}

      {pilares.map((_, i) => {
        const outer = polar(100, i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke={strokeColor} strokeWidth={0.8} />;
      })}

      <path d={dataPath} fill="#3B82F6" fillOpacity={0.15} stroke="#3B82F6" strokeWidth={1.5} strokeLinejoin="round" />

      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#3B82F6" stroke={isDark ? "#1a1a1a" : "#FFFFFF"} strokeWidth={1.5} />
      ))}

      {labels.map((l) => (
        <g key={l.label}>
          <text
            x={l.x}
            y={l.y - 6}
            textAnchor={l.anchor}
            fontSize={9}
            fill={textColor}
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {l.label}
          </text>
          <text
            x={l.x}
            y={l.y + 6}
            textAnchor={l.anchor}
            fontSize={11}
            fontWeight="700"
            fill={getScoreColor(l.score)}
            fontFamily="system-ui, sans-serif"
          >
            {l.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Tech Icon ───────────────────────────────────────────────────────────────

function TechIcon({ icono, nombre, size = 20 }: { icono: string | null; nombre: string; size?: number }) {
  if (!icono) {
    return (
      <span style={{ fontSize: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
        💻
      </span>
    );
  }
  return (
    <img
      src={icono}
      alt={nombre}
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

// ─── Candidato Card ─────────────────────────────────────────────────────────

function CandidatoCard({ 
  candidato, 
  position, 
  isDark, 
  onSelect 
}: { 
  candidato: CandidatoRanking; 
  position: number; 
  isDark: boolean;
  onSelect: () => void;
}) {
  const nivelCfg = NIVEL_CONFIG[candidato.nivel_actual] || NIVEL_CONFIG.revisar;
  
  const radarData = [
    { label: "JS", score: candidato.score_javascript || 0 },
    { label: "Arq", score: candidato.score_arquitectura || 0 },
    { label: "BP", score: candidato.score_buenas_practicas || 0 },
    { label: "Com", score: candidato.score_comunicacion || 0 },
    { label: "Res", score: candidato.score_resolucion || 0 },
  ];

  const bgColor = isDark ? "#1a1a1a" : "#FFFFFF";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const surfaceColor = isDark ? "#374151" : "#F3F4F6";

  return (
    <div
      onClick={onSelect}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 20,
        padding: "20px 24px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        gap: 24,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ flex: 2, minWidth: 240 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: textColor, marginBottom: 4 }}>
            {candidato.nombre} {candidato.apellido || ''}
          </div>
          <div style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>{candidato.email}</div>
          
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 99,
                background: nivelCfg.bg,
                color: nivelCfg.text,
                fontWeight: 600,
              }}
            >
              {nivelCfg.label}
            </span>
            {candidato.mejor_tecnologia && candidato.mejor_tecnologia !== 'N/A' && (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: surfaceColor,
                  color: textMuted,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TechIcon icono={null} nombre={candidato.mejor_tecnologia} size={14} />
                {candidato.mejor_tecnologia}
              </span>
            )}
            {candidato.apto_para_contratacion && (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: "#ECFDF5",
                  color: "#065F46",
                  fontWeight: 600,
                  border: "1px solid #6EE7B7",
                }}
              >
                ✓ Apto
              </span>
            )}
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 99,
                background: surfaceColor,
                color: textMuted,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📊</span>
              {candidato.sesiones_completadas || 0}/{candidato.total_sesiones || 0} sesiones
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 16 }}>
          {candidato.github_url && (
            <a
              href={candidato.github_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: surfaceColor,
                color: textMuted,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = isDark ? "#4B5563" : "#E5E7EB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = surfaceColor;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {candidato.linkedin_url && (
            <a
              href={candidato.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: surfaceColor,
                color: textMuted,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = isDark ? "#4B5563" : "#E5E7EB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = surfaceColor;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z" />
              </svg>
              LinkedIn
            </a>
          )}
        </div>
      </div>

      <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <RadarChart pilares={radarData} size={150} isDark={isDark} />
      </div>

      <div style={{ flex: 1, minWidth: 100, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ position: "relative", width: 80, height: 80, marginLeft: "auto" }}>
            <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={40} cy={40} r={34} fill="none" stroke={isDark ? "#374151" : "#E5E7EB"} strokeWidth={6} />
              <circle
                cx={40} cy={40} r={34} fill="none"
                stroke={getScoreColor(candidato.score_global || 0)}
                strokeWidth={6}
                strokeDasharray={`${((candidato.score_global || 0) / 100) * (2 * Math.PI * 34)} ${2 * Math.PI * 34}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: textColor, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(candidato.score_global || 0)}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>score global</div>
        </div>

        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: getTrendColor(candidato.tendencia || ''),
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{getTrendIcon(candidato.tendencia || '')}</span>
              <span>{(candidato.tendencia || '').replace("↑ ", "").replace("→ ", "").replace("↓ ", "") || 'Estable'}</span>
            </div>
            <div style={{ fontSize: 11, color: textMuted }}>tendencia</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: textColor }}>
              {Math.round(candidato.consistencia || 0)}%
            </div>
            <div style={{ fontSize: 11, color: textMuted }}>consistencia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recruit Modal ────────────────────────────────────────────────────────────

function RecruitModal({ 
  candidato, 
  onClose, 
  onSuccess 
}: { 
  candidato: CandidatoRanking; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { isDark } = useThemeContext();
  const [asunto, setAsunto] = useState(`Oportunidad laboral en nuestra empresa para ${candidato.nombre}`);
  const [mensaje, setMensaje] = useState(
    `Hola ${candidato.nombre},\n\nHemos revisado tu perfil en TechMock AI y quedamos muy impresionados con tu desempeño. Nos gustaría invitarte a una conversación sobre posibles oportunidades en nuestro equipo.\n\n¿Estarías disponible para una llamada esta semana?\n\nSaludos,\nEquipo de Reclutamiento`
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputBg = isDark ? "#1F2937" : "#F9FAFB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const bgColor = isDark ? "#1a1a1a" : "#FFFFFF";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";

  const handleSend = async () => {
    setLoading(true);
    try {
      await candidatosService.contactarCandidato(candidato.usuario_id, { asunto, mensaje });
      setSent(true);
      onSuccess();
    } catch (error) {
      console.error('[RecruitModal] Error:', error);
      alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px",
      }}>
        <div style={{
          background: bgColor,
          borderRadius: 16,
          padding: "48px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          border: `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: textColor, marginBottom: 8 }}>Mensaje enviado</div>
          <div style={{ fontSize: 14, color: textMuted, marginBottom: 32 }}>
            Tu mensaje de reclutamiento fue enviado a <strong>{candidato.email}</strong>.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "10px 32px",
              borderRadius: 12,
              background: "#6366f1",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "24px",
    }}>
      <div style={{
        background: bgColor,
        borderRadius: 16,
        padding: "32px",
        maxWidth: 500,
        width: "100%",
        border: `1px solid ${borderColor}`,
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: textColor }}>Contactar candidato</div>
            <div style={{ fontSize: 12, color: textMuted }}>{candidato.nombre} {candidato.apellido} · {candidato.email}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: textMuted,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "#6366f1",
              color: "white",
              border: "none",
              cursor: "pointer",
              opacity: 1,
            }}
          >
            📧 Email de reclutamiento
          </button>
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: isDark ? "#1F2937" : "#F3F4F6",
              color: textMuted,
              border: "none",
              cursor: "not-allowed",
              opacity: 0.5,
            }}
            disabled
          >
            💼 LinkedIn {candidato.linkedin_url ? '✓' : '✗'}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: textMuted, display: "block", marginBottom: 6 }}>Asunto</label>
          <input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              background: inputBg,
              color: textColor,
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: textMuted, display: "block", marginBottom: 6 }}>Mensaje</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={7}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              background: inputBg,
              color: textColor,
              fontSize: 12,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              background: loading ? "#6366f188" : "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? '⏳ Enviando...' : '✉️ Enviar mensaje'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              background: isDark ? "#1F2937" : "#F3F4F6",
              color: textColor,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({ 
  candidato, 
  onClose, 
  onRecruit 
}: {
  candidato: CandidatoDetail & {
    fortalezas?: Fortaleza[];
    debilidades?: Debilidad[];
    errores_recientes?: ErrorItem[];
    recomendaciones?: Recomendacion[];
  };
  onClose: () => void;
  onRecruit: () => void;
}) {
  const { isDark } = useThemeContext();
  const [activeTab, setActiveTab] = useState<"informe" | "errores" | "recomendaciones">("informe");

  const bgSurface = isDark ? "#1E293B" : "#F8FAFC";
  const border = isDark ? "#334155" : "#E2E8F0";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const bgColor = isDark ? "#1a1a1a" : "#FFFFFF";

  const nivel = NIVEL_CONFIG[candidato.nivel_actual] || NIVEL_CONFIG.revisar;

  const radarPilares = [
    { label: "JavaScript",    score: candidato.score_javascript || 0 },
    { label: "Arquitectura",  score: candidato.score_arquitectura || 0 },
    { label: "Prácticas",     score: candidato.score_buenas_practicas || 0 },
    { label: "Comunicación",  score: candidato.score_comunicacion || 0 },
    { label: "Resolución",    score: candidato.score_resolucion || 0 },
  ];

  const scoreRows = [
    { label: "JavaScript",      key: "score_javascript" as const },
    { label: "Arquitectura",    key: "score_arquitectura" as const },
    { label: "Buenas prácticas", key: "score_buenas_practicas" as const },
    { label: "Comunicación",    key: "score_comunicacion" as const },
    { label: "Resolución",      key: "score_resolucion" as const },
  ];

  // Función tipada para obtener el valor del score
  const getScoreValue = (key: keyof Pick<CandidatoDetail, "score_javascript" | "score_arquitectura" | "score_buenas_practicas" | "score_comunicacion" | "score_resolucion">): number => {
    return candidato[key] || 0;
  };

  const colorMap: Record<string, string> = {
    score_javascript: "#3B82F6",
    score_arquitectura: "#10B981",
    score_buenas_practicas: "#8B5CF6",
    score_comunicacion: "#F59E0B",
    score_resolucion: "#EF4444",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 900,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%",
        maxWidth: 720,
        height: "100vh",
        background: bgColor,
        overflowY: "auto",
        borderLeft: `1px solid ${border}`,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.25s ease-out",
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Panel Header */}
        <div style={{
          padding: "24px",
          borderBottom: `1px solid ${border}`,
          background: bgSurface,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "white",
                flexShrink: 0,
              }}>
                {candidato.nombre[0]}{candidato.apellido?.[0] || ''}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>{candidato.nombre} {candidato.apellido}</div>
                <div style={{ fontSize: 12, color: textMuted }}>{candidato.email}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 10px",
                    borderRadius: 99,
                    fontWeight: 700,
                    background: nivel.bg,
                    color: nivel.text,
                    border: `1px solid ${nivel.border}`,
                  }}>
                    ● {nivel.label}
                  </span>
                  {candidato.mejor_tecnologia && candidato.mejor_tecnologia !== 'N/A' && (
                    <span style={{
                      fontSize: 11,
                      padding: "2px 10px",
                      borderRadius: 99,
                      fontWeight: 500,
                      border: `1px solid ${border}`,
                      color: textMuted,
                    }}>
                      {candidato.mejor_tecnologia}
                    </span>
                  )}
                  {candidato.apto_para_contratacion && (
                    <span style={{
                      fontSize: 11,
                      padding: "2px 10px",
                      borderRadius: 99,
                      fontWeight: 700,
                      background: "#ECFDF5",
                      color: "#065F46",
                      border: "1px solid #6EE7B7",
                    }}>
                      ✓ Apto para contratar
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isDark ? "#1F2937" : "#F3F4F6",
                border: "none",
                color: textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={onRecruit}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
              }}
            >
              ✉️ Contactar para reclutamiento
            </button>
            {candidato.github_url && (
              <a
                href={candidato.github_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: isDark ? "#1F2937" : "#F3F4F6",
                  color: textMuted,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
            {candidato.linkedin_url && (
              <a
                href={candidato.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: isDark ? "#1F2937" : "#F3F4F6",
                  color: textMuted,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z" />
                </svg>
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Panel Body */}
        <div style={{ padding: "24px", flex: 1 }}>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Sesiones", value: `${candidato.sesiones_completadas}/${candidato.total_sesiones}`, sub: "completadas", icon: "📊" },
              { label: "Racha", value: candidato.racha_actual, sub: "sesiones seguidas", icon: "🔥" },
              { label: "Consistencia", value: `${Math.round(candidato.consistencia)}%`, sub: "estabilidad", icon: "📈" },
              { label: "Tendencia", value: (candidato.tendencia || '').replace("↑ ", "").replace("→ ", "").replace("↓ ", "") || 'Estable', sub: candidato.tendencia?.includes("↑") ? "en mejora" : candidato.tendencia?.includes("↓") ? "en caída" : "sin cambio", icon: candidato.tendencia?.includes("↑") ? "↑" : candidato.tendencia?.includes("↓") ? "↓" : "→" },
            ].map((stat) => (
              <div key={stat.label} style={{
                borderRadius: 12,
                padding: "14px 16px",
                border: `1px solid ${border}`,
                background: bgSurface,
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textColor, lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: textMuted, marginTop: 3 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Radar + Scores side by side */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24, alignItems: "flex-start" }}>
            <div style={{
              borderRadius: 12,
              padding: "20px",
              border: `1px solid ${border}`,
              background: bgSurface,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Perfil técnico
              </div>
              <RadarChart pilares={radarPilares} size={240} isDark={isDark} />
            </div>

            <div style={{
              flex: 1,
              borderRadius: 12,
              padding: "20px",
              border: `1px solid ${border}`,
              background: bgSurface,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Desglose de scores
                </div>
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={32} cy={32} r={28} fill="none" stroke={isDark ? "#374151" : "#E5E7EB"} strokeWidth={5} />
                    <circle
                      cx={32} cy={32} r={28} fill="none"
                      stroke={getScoreColor(candidato.score_global || 0)}
                      strokeWidth={5}
                      strokeDasharray={`${((candidato.score_global || 0) / 100) * (2 * Math.PI * 28)} ${2 * Math.PI * 28}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 0.8s ease" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: textColor, fontVariantNumeric: "tabular-nums" }}>
                      {Math.round(candidato.score_global || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {scoreRows.map((row) => {
                  const val = getScoreValue(row.key);
                  const color = colorMap[row.key] || "#3B82F6";
                  return (
                    <div key={row.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{row.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color }}>{val}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: isDark ? "#374151" : "#E5E7EB" }}>
                        <div style={{
                          height: "100%",
                          borderRadius: 99,
                          transition: "width 0.3s ease-out",
                          width: `${val}%`,
                          background: color,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                <div style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Tecnologías destacadas</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "#ECFDF5", color: "#065F46", fontWeight: 600 }}>
                    ✓ Mejor: {candidato.mejor_tecnologia || 'N/A'}
                  </div>
                  <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", fontWeight: 600 }}>
                    ↓ Mejorar: {candidato.peor_tecnologia || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            borderRadius: 12,
            padding: 4,
            border: `1px solid ${border}`,
            background: bgSurface,
          }}>
            {([
              { key: "informe", label: "📋 Informe IA" },
              { key: "errores", label: `⚠️ Errores (${candidato.errores_recientes?.length || 0})` },
              { key: "recomendaciones", label: `💡 Recomendaciones (${candidato.recomendaciones?.length || 0})` },
            ] as { key: typeof activeTab; label: string }[]).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: isActive ? (isDark ? "#1F2937" : "#EFF6FF") : "transparent",
                    color: isActive ? (isDark ? "#FFFFFF" : "#1E40AF") : textMuted,
                    flex: 1,
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Informe */}
          {activeTab === "informe" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                borderRadius: 12,
                padding: "18px",
                border: `1px solid ${candidato.apto_para_contratacion ? '#6EE7B7' : '#FCA5A5'}`,
                background: candidato.apto_para_contratacion ? (isDark ? "#0C2D1E" : "#ECFDF5") : (isDark ? "#2D0C0C" : "#FEF2F2"),
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                  color: candidato.apto_para_contratacion ? "#065F46" : "#991B1B",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  {candidato.apto_para_contratacion ? "✓" : "✕"} Resumen para reclutador
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  color: candidato.apto_para_contratacion ? (isDark ? "#6EE7B7" : "#065F46") : (isDark ? "#FCA5A5" : "#991B1B"),
                }}>
                  &quot;{candidato.resumen_para_reclutador || 'Sin resumen disponible'}&quot;
                </p>
              </div>

              <div style={{
                borderRadius: 12,
                padding: "18px",
                border: `1px solid ${border}`,
                background: bgSurface,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: textMuted, marginBottom: 8 }}>
                  Evaluación general
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: textColor }}>
                  {candidato.feedback_general || 'Sin evaluación disponible'}
                </p>
              </div>

              {candidato.fortalezas && candidato.fortalezas.length > 0 && (
                <div style={{
                  borderRadius: 12,
                  padding: "18px",
                  border: `1px solid ${border}`,
                  background: bgSurface,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#10B981", marginBottom: 12 }}>
                    ✓ Fortalezas
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {candidato.fortalezas.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{f.categoria}</div>
                          <div style={{ fontSize: 11, color: textMuted }}>{f.descripcion}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: textMuted }}>{f.veces_demostrada}× demostrada</div>
                          <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>{Math.round(f.confianza * 100)}% confianza</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidato.debilidades && candidato.debilidades.length > 0 && (
                <div style={{
                  borderRadius: 12,
                  padding: "18px",
                  border: `1px solid ${border}`,
                  background: bgSurface,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#F59E0B", marginBottom: 12 }}>
                    ⚡ Áreas de mejora
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {candidato.debilidades.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{d.categoria}</div>
                          <div style={{ fontSize: 11, color: textMuted }}>{d.descripcion}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: textMuted }}>{d.veces_fallada}× fallada</div>
                          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700 }}>Impacto {Math.round(d.impacto * 100)}%</div>
                          {d.requiere_practica && <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 600 }}>Requiere práctica</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidato.fue_adaptativa_ultima && (
                <div style={{
                  fontSize: 11,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px solid ${isDark ? '#4C1D95' : '#C4B5FD'}`,
                  background: isDark ? "#1A0A2A" : "#F5F3FF",
                  color: isDark ? "#A78BFA" : "#5B21B6",
                }}>
                  🤖 La última sesión fue <strong>adaptativa</strong>: las preguntas fueron generadas por IA basándose en las debilidades previas del candidato.
                </div>
              )}
            </div>
          )}

          {/* Tab: Errores */}
          {activeTab === "errores" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!candidato.errores_recientes || candidato.errores_recientes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: textMuted, fontSize: 12 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  Sin errores registrados en la última sesión
                </div>
              ) : candidato.errores_recientes.map((err, i) => (
                <div key={i} style={{
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: `1px solid ${border}`,
                  background: bgSurface,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{err.categoria}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: err.severidad === 'critico' ? '#FEF2F2' : err.severidad === 'alto' ? '#FFF7ED' : err.severidad === 'medio' ? '#FFFBEB' : '#ECFDF5',
                        color: err.severidad === 'critico' ? '#991B1B' : err.severidad === 'alto' ? '#C2410C' : err.severidad === 'medio' ? '#92400E' : '#065F46',
                      }}>
                        {err.severidad.charAt(0).toUpperCase() + err.severidad.slice(1)}
                      </span>
                      {err.es_conceptual && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: "#FEF2F2", color: "#991B1B" }}>
                          Conceptual
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: textMuted }}>{err.descripcion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Recomendaciones */}
          {activeTab === "recomendaciones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!candidato.recomendaciones || candidato.recomendaciones.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: textMuted, fontSize: 12 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
                  Sin recomendaciones pendientes
                </div>
              ) : candidato.recomendaciones.map((rec, i) => {
                const tipoIcon: Record<string, string> = { codigo: "💻", concepto: "🧠", recurso: "📚", patron: "🏗️" };
                const prioColors: Record<string, { bg: string; text: string }> = {
                  alta: { bg: "#FEF2F2", text: "#991B1B" },
                  media: { bg: "#FFFBEB", text: "#92400E" },
                  baja: { bg: "#ECFDF5", text: "#065F46" },
                };
                const prio = prioColors[rec.prioridad] || prioColors.media;
                return (
                  <div key={i} style={{
                    borderRadius: 12,
                    padding: "14px 16px",
                    border: `1px solid ${border}`,
                    background: bgSurface,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 16 }}>{tipoIcon[rec.tipo] || "📌"}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{rec.titulo}</span>
                      </div>
                      <span style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: prio.bg,
                        color: prio.text,
                      }}>
                        Prioridad {rec.prioridad}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: textMuted, marginBottom: rec.recurso_url ? 8 : 0 }}>{rec.descripcion}</div>
                    {rec.recurso_url && (
                      <a
                        href={rec.recurso_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: "#6366f1",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        🔗 Ver recurso →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TechFilter = number | "all";

type FilterParams = {
  tecnologia_id?: number;
  nivel?: string;
};

export default function AdminRankingsPage() {
  const { isDark } = useThemeContext();

  // ─── State ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoRanking[]>([]);
  const [tecnologias, setTecnologias] = useState<TecnologiaRanking[]>([]);
  
  const [activeTech, setActiveTech] = useState<TechFilter>("all");
  const [activeNivel, setActiveNivel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score_global");
  const [aptosOnly, setAptosOnly] = useState(false);
  const [selectedCandidatoId, setSelectedCandidatoId] = useState<string | null>(null);
  const [selectedCandidatoDetail, setSelectedCandidatoDetail] = useState<CandidatoDetail | null>(null);
  const [recruitTarget, setRecruitTarget] = useState<CandidatoRanking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Cargar datos ────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const techResponse = await candidatosService.obtenerTecnologias();
      if (techResponse.success) {
        setTecnologias(techResponse.data);
      }
      
      const params: FilterParams = {};
      if (activeTech !== "all") params.tecnologia_id = activeTech as number;
      if (activeNivel !== "all") params.nivel = activeNivel;
      
      const rankingResponse = await candidatosService.obtenerRanking(params);
      if (rankingResponse.success) {
        setCandidatos(rankingResponse.data);
      }
    } catch (err: unknown) {
      console.error('[AdminRankingsPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTech, activeNivel]);

  // ─── Cargar detalle del candidato ───────────────────────────────────────────

  const loadCandidateDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await candidatosService.obtenerDetalleCandidato(id);
      if (response.success) {
        setSelectedCandidatoDetail(response.data);
      }
    } catch (err: unknown) {
      console.error('[AdminRankingsPage] Error loading detail:', err);
      alert('Error al cargar el detalle del candidato');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidatoId(id);
    loadCandidateDetail(id);
  };

  // ─── Filtrado y ordenamiento ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...candidatos];
    
    if (aptosOnly) {
      result = result.filter(c => c.apto_para_contratacion === true);
    }
    
    result.sort((a, b) => {
      const aVal = a[sortBy as keyof CandidatoRanking] as number;
      const bVal = b[sortBy as keyof CandidatoRanking] as number;
      return (bVal || 0) - (aVal || 0);
    });
    
    return result;
  }, [candidatos, aptosOnly, sortBy]);

  const stats = useMemo(() => ({
    total: candidatos.length,
    aptos: candidatos.filter(c => c.apto_para_contratacion === true).length,
    destacados: candidatos.filter(c => c.nivel_actual === "destacado").length,
    avgScore: candidatos.length > 0 
      ? Math.round(candidatos.reduce((s, c) => s + (c.score_global || 0), 0) / candidatos.length)
      : 0,
  }), [candidatos]);

  // ─── Estados de carga y error ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#f9fafb",
        color: isDark ? "#f0f0f0" : "#111827"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: `4px solid ${isDark ? "#333" : "#e5e7eb"}`,
            borderTop: "4px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ fontSize: 16, color: isDark ? "#999" : "#6b7280" }}>
            Cargando candidatos...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#f9fafb",
        color: isDark ? "#f0f0f0" : "#111827"
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Error al cargar los rankings
          </h2>
          <p style={{ color: isDark ? "#999" : "#6b7280", marginBottom: 20 }}>
            {error}
          </p>
          <button
            onClick={loadData}
            style={{
              padding: "10px 24px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const bgColor = isDark ? "#0a0a0a" : "#f9fafb";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const cardBg = isDark ? "#1a1a1a" : "#FFFFFF";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgColor,
        padding: "40px 24px 80px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}>
                🏆
              </div>
              <h1 style={{
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
                color: textColor,
              }}>
                Panel de Reclutamiento
              </h1>
            </div>
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>
              Evalúa y contacta candidatos · Vista de administrador
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}>
          {[
            { label: "Total candidatos", value: stats.total, icon: "👥", color: "#3B82F6", bg: isDark ? "#0C1A3A" : "#EFF6FF", border: isDark ? "#1E3A6E" : "#BFDBFE" },
            { label: "Aptos para contratar", value: stats.aptos, icon: "✅", color: "#10B981", bg: isDark ? "#0A2A1E" : "#ECFDF5", border: isDark ? "#14532D" : "#6EE7B7" },
            { label: "Destacados", value: stats.destacados, icon: "⭐", color: "#F59E0B", bg: isDark ? "#2A1A0A" : "#FFFBEB", border: isDark ? "#78350F" : "#FCD34D" },
            { label: "Score promedio", value: `${stats.avgScore}/100`, icon: "📊", color: "#8B5CF6", bg: isDark ? "#1A0A2A" : "#F5F3FF", border: isDark ? "#4C1D95" : "#C4B5FD" },
          ].map((s) => (
            <div key={s.label} style={{
              borderRadius: 12,
              padding: "16px",
              border: `1px solid ${s.border}`,
              background: s.bg,
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, color: isDark ? "#9CA3AF" : "#6B7280" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tech Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          borderBottom: `2px solid ${borderColor}`,
          marginBottom: 20,
          paddingBottom: 0,
        }}>
          <button
            onClick={() => setActiveTech("all")}
            style={{
              padding: "8px 16px",
              borderRadius: "12px 12px 0 0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              position: "relative",
              bottom: -2,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
              background: activeTech === "all" ? (isDark ? "#1F2937" : "#FFFFFF") : "transparent",
              color: activeTech === "all" ? (isDark ? "#FFFFFF" : "#111827") : "#6B7280",
              boxShadow: activeTech === "all" ? "0 -2px 8px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <span style={{ fontSize: 16 }}>🌐</span>
            Todas
            {activeTech === "all" && (
              <div style={{
                position: "absolute",
                bottom: -2,
                left: 0,
                right: 0,
                height: 2,
                background: "#6366f1",
                borderRadius: "2px 2px 0 0",
              }} />
            )}
          </button>
          {tecnologias.map((t) => {
            const isActive = activeTech === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTech(t.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "12px 12px 0 0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  position: "relative",
                  bottom: -2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                  background: isActive ? (isDark ? "#1F2937" : "#FFFFFF") : "transparent",
                  color: isActive ? (isDark ? "#FFFFFF" : "#111827") : "#6B7280",
                  boxShadow: isActive ? "0 -2px 8px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <TechIcon icono={t.icono_url} nombre={t.nombre} size={15} />
                {t.nombre}
                {isActive && (
                  <div style={{
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#6366f1",
                    borderRadius: "2px 2px 0 0",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", "destacado", "recomendado", "promisorio", "revisar", "descartado"].map((n) => {
              const isActive = activeNivel === n;
              const cfg = n !== "all" ? NIVEL_CONFIG[n] : null;
              return (
                <button
                  key={n}
                  onClick={() => setActiveNivel(n)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1.5px solid ${isActive ? (cfg?.border ?? "#CBD5E1") : borderColor}`,
                    background: isActive ? (cfg?.bg ?? cardBg) : "transparent",
                    color: isActive ? (cfg?.text ?? textColor) : textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  {n === "all" ? "Todos" : cfg?.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div
                onClick={() => setAptosOnly(!aptosOnly)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 99,
                  transition: "background 0.2s",
                  background: aptosOnly ? "#6366f1" : (isDark ? "#374151" : "#D1D5DB"),
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                    left: aptosOnly ? 18 : 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: textMuted }}>Solo aptos</span>
            </label>
            <span style={{ fontSize: 11, color: textMuted }}>Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: 11,
                padding: "6px 12px",
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: cardBg,
                color: textColor,
                cursor: "pointer",
                outline: "none",
                fontWeight: 600,
              }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => (
            <CandidatoCard
              key={c.usuario_id}
              candidato={c}
              position={filtered.indexOf(c) + 1}
              isDark={isDark}
              onSelect={() => handleSelectCandidate(c.usuario_id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              borderRadius: 12,
              border: `2px dashed ${borderColor}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ margin: 0, fontWeight: 600, color: textColor }}>Sin candidatos para esta selección</p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: textMuted }}>Intenta con otros filtros</p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedCandidatoId && selectedCandidatoDetail && (
        <DetailPanel
          candidato={selectedCandidatoDetail}
          onClose={() => {
            setSelectedCandidatoId(null);
            setSelectedCandidatoDetail(null);
          }}
          onRecruit={() => {
            const candidate = candidatos.find(c => c.usuario_id === selectedCandidatoId);
            if (candidate) {
              setRecruitTarget(candidate);
            }
          }}
        />
      )}

      {/* Detail Loading Overlay */}
      {detailLoading && selectedCandidatoId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 950,
        }}>
          <div style={{
            background: cardBg,
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: `4px solid ${borderColor}`,
              borderTop: "4px solid #6366f1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ color: textMuted, fontSize: 14 }}>Cargando detalle del candidato...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Recruit Modal */}
      {recruitTarget && (
        <RecruitModal
          candidato={recruitTarget}
          onClose={() => setRecruitTarget(null)}
          onSuccess={() => {
            console.log('Mensaje enviado exitosamente');
          }}
        />
      )}
    </div>
  );
}