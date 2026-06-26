// app/dashboard/developer/rankings/page.tsx
'use client';

import { useState, useEffect, useMemo } from "react";
import { useThemeContext } from "../../../../components/providers/ThemeProvider";
import { RankingService, type CandidatoRanking, type TecnologiaRanking } from "../../../../services/ranking.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_COLORS: Record<string, string> = {
  javascript: "#378ADD",
  arquitectura: "#1D9E75",
  buenas_practicas: "#639922",
  comunicacion: "#534AB7",
  resolucion: "#D85A30",
};

const SORT_OPTIONS = [
  { value: "score_global", label: "Score global" },
  { value: "score_javascript", label: "JavaScript" },
  { value: "score_arquitectura", label: "Arquitectura" },
  { value: "score_buenas_practicas", label: "Buenas prácticas" },
  { value: "consistencia", label: "Consistencia" },
  { value: "total_sesiones", label: "Sesiones" },
];

const NIVEL_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  destacado: { bg: "#E1F5EE", text: "#085041", label: "Destacado" },
  recomendado: { bg: "#E6F1FB", text: "#0C447C", label: "Recomendado" },
  promisorio: { bg: "#FAEEDA", text: "#633806", label: "Promisorio" },
  revisar: { bg: "#F1EFE8", text: "#444441", label: "Revisar" },
  descartado: { bg: "#FCEBEB", text: "#791F1F", label: "Descartado" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#fbbf24";
  if (score >= 50) return "#f97316";
  return "#f87171";
}

// ─── Radar Chart Component ────────────────────────────────────────────────────

function RadarChart({ 
  pilares, 
  size = 140,
  isDark 
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
    return {
      label: p.label,
      score: p.score,
      x: cx + maxR * labelOffset * Math.cos(angle),
      y: cy + maxR * labelOffset * Math.sin(angle),
      anchor: Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle",
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

      <path d={dataPath} fill={BAR_COLORS.javascript} fillOpacity={0.15} stroke={BAR_COLORS.javascript} strokeWidth={1.5} strokeLinejoin="round" />

      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={BAR_COLORS.javascript} stroke={isDark ? "#1a1a1a" : "#FFFFFF"} strokeWidth={1.5} />
      ))}

      {labels.map((l) => (
        <g key={l.label}>
          <text
            x={l.x}
            y={l.y - 6}
            
            textAnchor={l.anchor as React.SVGAttributes<SVGTextElement>['textAnchor']}
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
            
            textAnchor={l.anchor as React.SVGAttributes<SVGTextElement>['textAnchor']}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function MedalBadge({ position, isDark }: { position: number; isDark: boolean }) {
  const medalStyles: Record<number, { emoji: string; border: string; gradient: string; label: string }> = {
    1: { 
      emoji: "🥇", 
      border: "#F59E0B", 
      gradient: "linear-gradient(135deg, #FFF8E7 0%, #FEF3C7 100%)",
      label: "Oro"
    },
    2: { 
      emoji: "🥈", 
      border: "#94A3B8", 
      gradient: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
      label: "Plata"
    },
    3: { 
      emoji: "🥉", 
      border: "#FB923C", 
      gradient: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
      label: "Bronce"
    },
  };

  const config = medalStyles[position];
  if (!config) return null;
  
  return (
    <div
      style={{
        width: 70,
        height: 70,
        borderRadius: "50%",
        background: config.gradient,
        border: `3px solid ${config.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 8px 20px -6px ${config.border}80`,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>{config.emoji}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#92400E", marginTop: 2 }}>
        {config.label}
      </span>
      <div
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: config.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          color: "#FFFFFF",
        }}
      >
        {position}
      </div>
    </div>
  );
}

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

// ─── Top 3 Card Component ─────────────────────────────────────────────────────

function Top3CandidatoCard({ candidato, position, isDark }: { candidato: CandidatoRanking; position: number; isDark: boolean }) {
  const medalStyles: Record<number, { border: string; gradient: string; shadow: string }> = {
    1: { border: "#F59E0B", gradient: "linear-gradient(135deg, #FFF8E7 0%, #FEF3C7 100%)", shadow: "0 8px 20px -6px rgba(245, 158, 11, 0.3)" },
    2: { border: "#94A3B8", gradient: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)", shadow: "0 8px 20px -6px rgba(100, 116, 139, 0.3)" },
    3: { border: "#FB923C", gradient: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", shadow: "0 8px 20px -6px rgba(251, 146, 60, 0.3)" },
  };
  
  const medal = medalStyles[position as keyof typeof medalStyles];
  const nivelCfg = NIVEL_CONFIG[candidato.nivel_actual] || NIVEL_CONFIG.revisar;
  
  const radarData = [
    { label: "JavaScript", score: candidato.score_javascript || 0 },
    { label: "Arquitectura", score: candidato.score_arquitectura || 0 },
    { label: "Buenas prácticas", score: candidato.score_buenas_practicas || 0 },
    { label: "Comunicación", score: candidato.score_comunicacion || 0 },
    { label: "Resolución", score: candidato.score_resolucion || 0 },
  ];

  const bgColor = isDark ? "#1a1a1a" : "#FFFFFF";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const surfaceColor = isDark ? "#374151" : "#F3F4F6";

  const cardBackground = medal ? medal.gradient : bgColor;
  const finalTextColor = (medal && isDark) ? "#111827" : textColor;
  const finalTextMuted = (medal && isDark) ? "#6B7280" : textMuted;
  const finalSurfaceColor = (medal && isDark) ? "#F3F4F6" : surfaceColor;

  return (
    <div
      style={{
        background: cardBackground,
        border: medal ? `2px solid ${medal.border}` : `1px solid ${borderColor}`,
        borderRadius: 20,
        padding: "24px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        boxShadow: medal ? medal.shadow : "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {position === 1 && (
        <>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: 40, opacity: 0.3, rotate: "15deg" }}>✨</div>
          <div style={{ position: "absolute", bottom: -15, left: -15, fontSize: 50, opacity: 0.2 }}>🌟</div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: finalTextColor, marginBottom: 6 }}>
            {candidato.nombre} {candidato.apellido || ''}
          </div>
          <div style={{ fontSize: 13, color: finalTextMuted, marginBottom: 12 }}>{candidato.email}</div>
          
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
            {candidato.tecnologia_nombre && (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: finalSurfaceColor,
                  color: finalTextMuted,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TechIcon icono={candidato.tecnologia_icono} nombre={candidato.tecnologia_nombre} size={14} />
                {candidato.tecnologia_nombre}
              </span>
            )}
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 99,
                background: finalSurfaceColor,
                color: finalTextMuted,
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

        <div style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto" }}>
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
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: finalTextColor, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(candidato.score_global || 0)}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: finalTextMuted, marginTop: 4 }}>score global</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
        <RadarChart pilares={radarData} size={200} isDark={isDark} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {candidato.github_url && (
            <a
              href={candidato.github_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: finalSurfaceColor,
                color: finalTextMuted,
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
                (e.currentTarget as HTMLAnchorElement).style.background = finalSurfaceColor;
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
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: finalSurfaceColor,
                color: finalTextMuted,
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
                (e.currentTarget as HTMLAnchorElement).style.background = finalSurfaceColor;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z" />
              </svg>
              LinkedIn
            </a>
          )}
        </div>

        <div style={{ display: "flex", gap: 24 }}>
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
            <div style={{ fontSize: 11, color: finalTextMuted }}>tendencia</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: finalTextColor }}>
              {Math.round(candidato.consistencia || 0)}%
            </div>
            <div style={{ fontSize: 11, color: finalTextMuted }}>consistencia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Candidato Card ──────────────────────────────────────────────────────────

function CandidatoCard({ candidato, position, isDark }: { candidato: CandidatoRanking; position: number; isDark: boolean }) {
  const isTop3 = position <= 3;
  
  const medalStyles: Record<number, { border: string; gradient: string; shadow: string }> = {
    1: { border: "#F59E0B", gradient: "linear-gradient(135deg, #FFF8E7 0%, #FEF3C7 100%)", shadow: "0 8px 20px -6px rgba(245, 158, 11, 0.3)" },
    2: { border: "#94A3B8", gradient: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)", shadow: "0 8px 20px -6px rgba(100, 116, 139, 0.3)" },
    3: { border: "#FB923C", gradient: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", shadow: "0 8px 20px -6px rgba(251, 146, 60, 0.3)" },
  };
  
  const medal = medalStyles[position as keyof typeof medalStyles];
  const nivelCfg = NIVEL_CONFIG[candidato.nivel_actual] || NIVEL_CONFIG.revisar;
  
  const radarData = [
    { label: "JavaScript", score: candidato.score_javascript || 0 },
    { label: "Arquitectura", score: candidato.score_arquitectura || 0 },
    { label: "Buenas prácticas", score: candidato.score_buenas_practicas || 0 },
    { label: "Comunicación", score: candidato.score_comunicacion || 0 },
    { label: "Resolución", score: candidato.score_resolucion || 0 },
  ];

  const bgColor = isDark ? "#1a1a1a" : "#FFFFFF";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";
  const surfaceColor = isDark ? "#374151" : "#F3F4F6";

  return (
    <div
      style={{
        background: isTop3 && medal ? medal.gradient : bgColor,
        border: isTop3 && medal ? `2px solid ${medal.border}` : `1px solid ${borderColor}`,
        borderRadius: 20,
        padding: "20px 24px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        boxShadow: isTop3 && medal ? medal.shadow : "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        gap: 24,
      }}
      onMouseEnter={(e) => {
        if (!isTop3) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isTop3) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }
      }}
    >
      {position === 1 && (
        <>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: 40, opacity: 0.3, rotate: "15deg" }}>✨</div>
          <div style={{ position: "absolute", bottom: -15, left: -15, fontSize: 50, opacity: 0.2 }}>🌟</div>
        </>
      )}

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
            {candidato.tecnologia_nombre && (
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
                <TechIcon icono={candidato.tecnologia_icono} nombre={candidato.tecnologia_nombre} size={14} />
                {candidato.tecnologia_nombre}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function RankingsPage() {
  const { isDark } = useThemeContext();
  const [activeTech, setActiveTech] = useState<number | "all">("all");
  const [activeNivel, setActiveNivel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score_global");
  const [candidatos, setCandidatos] = useState<CandidatoRanking[]>([]);
  const [tecnologias, setTecnologias] = useState<TecnologiaRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Cargar datos del backend ──────────────────────────────────────────────

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar ranking
        const rankingResponse = await RankingService.obtenerRanking({
          tecnologia_id: activeTech !== "all" ? activeTech : undefined,
          nivel: activeNivel !== "all" ? activeNivel : undefined,
        });
        
        if (rankingResponse.success) {
          setCandidatos(rankingResponse.data.candidatos);
        }
        
        // Cargar tecnologías para los filtros
        const techResponse = await RankingService.obtenerTecnologias();
        if (techResponse.success) {
          setTecnologias(techResponse.data);
        }
        
      } catch (err) {
        console.error('Error cargando ranking:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [activeTech, activeNivel]);

  // ─── Filtrado y ordenamiento ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    return candidatos.filter((c) => {
      const techOk = activeTech === "all" || c.tecnologia_id === activeTech;
      const nivelOk = activeNivel === "all" || c.nivel_actual === activeNivel;
      return techOk && nivelOk;
    }).sort((a, b) => {
      const aVal = a[sortBy as keyof CandidatoRanking] as number;
      const bVal = b[sortBy as keyof CandidatoRanking] as number;
      return (bVal || 0) - (aVal || 0);
    });
  }, [candidatos, activeTech, activeNivel, sortBy]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const activeTechData = activeTech !== "all" ? tecnologias.find((t) => t.id === activeTech) : null;

  // ─── Estados de carga y error ──────────────────────────────────────────────

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
            Cargando rankings...
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
            onClick={() => window.location.reload()}
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

  // ─── Theme-based styles ─────────────────────────────────────────────────────

  const bgGradient = isDark 
    ? "linear-gradient(135deg, #0a0a0a 0%, #111111 100%)"
    : "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)";
  
  const headerGradient = isDark
    ? "linear-gradient(135deg, #FFFFFF 0%, #9CA3AF 100%)"
    : "linear-gradient(135deg, #1F2937 0%, #374151 100%)";
  
  const tabBg = isDark ? "#1a1a1a" : "#FFFFFF";
  const tabBorderColor = isDark ? "#374151" : "#E5E7EB";
  const tabTextActive = isDark ? "#FFFFFF" : "#111827";
  const tabTextInactive = isDark ? "#9CA3AF" : "#6B7280";
  const tabActiveBorder = "#3B82F6";
  
  const filterBg = isDark ? "#1a1a1a" : "#FFFFFF";
  const filterBorder = isDark ? "#374151" : "#E5E7EB";
  const filterText = isDark ? "#9CA3AF" : "#6B7280";
  
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const textMuted = isDark ? "#9CA3AF" : "#6B7280";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgGradient,
        padding: "40px 24px 80px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <h1 style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              background: headerGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em" 
            }}>
              {activeTechData ? `Rankings · ${activeTechData.nombre}` : "Rankings Globales"}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: textMuted }}>
            {filtered.length} desarrollador{filtered.length !== 1 ? "es" : ""} evaluados
          </p>
        </div>

        {/* Technology tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            borderBottom: `2px solid ${tabBorderColor}`,
            marginBottom: 24,
            paddingBottom: 0,
          }}
        >
          {[{ id: "all" as const, nombre: "Todas", icono: "🌐" }, ...tecnologias].map((t) => {
            const isActive = activeTech === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTech(t.id)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px 12px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  color: isActive ? tabTextActive : tabTextInactive,
                  background: isActive ? tabBg : "transparent",
                  transition: "all 0.15s",
                  position: "relative",
                  bottom: -2,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: isActive ? "0 -2px 8px rgba(0,0,0,0.05)" : "none",
                }}
              >
                {t.id === "all" ? (
                  <span style={{ fontSize: 16 }}>{t.icono}</span>
                ) : (
                  <TechIcon icono={t.icono_url} nombre={t.nombre} size={16} />
                )}
                {t.nombre}
                {isActive && (
                  <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 2, background: tabActiveBorder, borderRadius: 2 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { v: "all", l: "Todos", color: textMuted },
              { v: "destacado", l: "Destacado", color: "#085041" },
              { v: "recomendado", l: "Recomendado", color: "#0C447C" },
              { v: "promisorio", l: "Promisorio", color: "#633806" },
              { v: "revisar", l: "Revisar", color: "#444441" },
              { v: "descartado", l: "Descartado", color: "#791F1F" },
            ].map((item) => {
              const isActive = activeNivel === item.v;
              const cfg = item.v !== "all" ? NIVEL_CONFIG[item.v] : null;
              return (
                <button
                  key={item.v}
                  onClick={() => setActiveNivel(item.v)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: isActive ? `2px solid ${cfg?.text ?? item.color}` : `1px solid ${filterBorder}`,
                    background: isActive ? (cfg?.bg ?? filterBg) : filterBg,
                    color: isActive ? (cfg?.text ?? item.color) : filterText,
                    transition: "all 0.2s",
                  }}
                >
                  {item.l}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: textMuted }}>Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 10,
                border: `1px solid ${filterBorder}`,
                background: filterBg,
                color: filterText,
                cursor: "pointer",
                outline: "none",
                fontWeight: 500,
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {top3[1] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <MedalBadge position={2} isDark={isDark} />
                  <Top3CandidatoCard candidato={top3[1]} position={2} isDark={isDark} />
                </div>
              )}

              {top3[0] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: "scale(1.02)", marginTop: -8 }}>
                  <MedalBadge position={1} isDark={isDark} />
                  <Top3CandidatoCard candidato={top3[0]} position={1} isDark={isDark} />
                </div>
              )}

              {top3[2] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <MedalBadge position={3} isDark={isDark} />
                  <Top3CandidatoCard candidato={top3[2]} position={3} isDark={isDark} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rest of candidates */}
        {rest.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: textMuted }}>Otros candidatos</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rest.map((c, i) => (
                <CandidatoCard key={c.usuario_id} candidato={c} position={i + 4} isDark={isDark} />
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: textMuted,
              fontSize: 14,
              background: filterBg,
              borderRadius: 20,
              border: `1px dashed ${filterBorder}`,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p>Sin desarrolladores para esta selección</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Intenta con otros filtros</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ EXPORTACIÓN POR DEFECTO - ¡Esto es lo que faltaba!
export default RankingsPage;