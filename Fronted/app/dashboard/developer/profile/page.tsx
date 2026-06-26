// 📁 app/dashboard/developer/profile/page.tsx
'use client';

import { useAuth } from '../../../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeContext } from "../../../../components/providers/ThemeProvider";
import { ProfileService, ProfileData, SesionReciente, Notificacion } from '../../../../services/profile.service';

// ─── Tipos para SVG ────────────────────────────────────────────────────────────

type TextAnchorType = "start" | "middle" | "end" | "inherit";

// ─── Funciones para construir URLs sociales ─────────────────────────────────

/**
 * Construye la URL completa de GitHub a partir del nombre de usuario
 */
const getGithubUrl = (username: string): string | null => {
  if (!username) return null;
  const clean = username.replace(/^@/, '').replace(/^\/+/, '');
  return `https://github.com/${clean}`;
};

/**
 * Construye la URL completa de LinkedIn a partir del nombre de usuario
 */
const getLinkedinUrl = (username: string): string | null => {
  if (!username) return null;
  const clean = username.replace(/^@/, '').replace(/^\/+/, '');
  return `https://linkedin.com/in/${clean}`;
};



// ─── Iconos ────────────────────────────────────────────────────────────────────

const Icons = {
  Dashboard: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Stats: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Sessions: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Notifications: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Accounts: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Save: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Cancel: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  GitHub: () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  Google: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  ),
  LinkedIn: () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z" />
    </svg>
  ),
  Twitter: () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.358-11.385c0-.213 0-.425-.015-.637A9.935 9.935 0 0024 4.59z" />
    </svg>
  ),
  Website: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />
    </svg>
  ),
};

// ─── Radar Chart Component ────────────────────────────────────────────────────

function RadarChart({ scores, isDark }: { scores: number[]; isDark: boolean }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const n = 5;
  const labels = ['JavaScript', 'Arquitectura', 'Buenas prácticas', 'Comunicación', 'Resolución'];
  const rings = [20, 40, 60, 80];

  const strokeColor = isDark ? '#374151' : '#E5E7EB';
  const textColor = isDark ? '#9CA3AF' : '#6B7280';

  function polar(pct: number, i: number, r: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + r * (pct / 100) * Math.cos(angle),
      y: cy + r * (pct / 100) * Math.sin(angle),
    };
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#34d399';
    if (score >= 65) return '#fbbf24';
    if (score >= 50) return '#f97316';
    return '#f87171';
  }

  const dataPoints = scores.map((score, i) => polar(score, i, maxR));
  const dataPath = dataPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ') + ' Z';

  const labelOffset = 1.28;
  const labelsPosition = labels.map((label, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cosA = Math.cos(angle);
    // ✅ Solución: Definir explícitamente el tipo de anchor con un tipo válido
    let anchor: TextAnchorType = "middle";
    if (cosA > 0.1) anchor = "start";
    else if (cosA < -0.1) anchor = "end";
    else anchor = "middle";
    
    return {
      label,
      score: scores[i],
      x: cx + maxR * labelOffset * Math.cos(angle),
      y: cy + maxR * labelOffset * Math.sin(angle),
      anchor, // ✅ Ahora es de tipo TextAnchorType
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {rings.map((r) => {
        const pts = Array.from({ length: n }, (_, i) => polar(r, i, maxR));
        const path = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={r} d={path} fill="none" stroke={strokeColor} strokeWidth={0.8} />;
      })}

      {labels.map((_, i) => {
        const outer = polar(100, i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke={strokeColor} strokeWidth={0.8} />;
      })}

      <path d={dataPath} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />

      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#6366f1" stroke={isDark ? '#1a1a1a' : '#FFFFFF'} strokeWidth={2} />
      ))}

      {labelsPosition.map((l) => (
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'perfil' | 'estadisticas' | 'sesiones' | 'notificaciones' | 'cuentas';

// ─── Field Component ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: string;
  value: string;
  type?: string;
  placeholder?: string;
  prefix?: string;
  readOnly?: boolean;
  textarea?: boolean;
  isEditing: boolean;
  isDark: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function Field({ label, name, value, type = 'text', placeholder, prefix, readOnly, textarea, isEditing, isDark, onChange }: FieldProps) {
  const bgColor = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-300';
  const focusBorderColor = isDark ? 'focus:border-[#00ff00]' : 'focus:border-blue-500';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-500' : 'text-gray-600';
  const placeholderColor = isDark ? 'placeholder-gray-600' : 'placeholder-gray-400';
  const readOnlyBg = isDark ? 'bg-gray-800/30' : 'bg-gray-50';

  return (
    <div>
      <label className={`block text-xs font-medium ${labelColor} mb-1.5 uppercase tracking-wider`}>
        {label}
        {readOnly && <span className="text-gray-500 normal-case ml-1">(no editable)</span>}
      </label>
      {isEditing && !readOnly ? (
        textarea ? (
          <textarea
            name={name} value={value} onChange={onChange}
            placeholder={placeholder} rows={3}
            className={`w-full ${bgColor} border ${borderColor} ${focusBorderColor} rounded-lg px-4 py-2.5 ${textColor} text-sm outline-none transition-colors ${placeholderColor} resize-none`}
          />
        ) : prefix ? (
          <div className={`flex items-center ${bgColor} border ${borderColor} focus-within:border-[#00ff00] rounded-lg overflow-hidden transition-colors`}>
            <span className={`text-gray-500 text-sm px-3 border-r ${borderColor} py-2.5`}>{prefix}</span>
            <input
              type={type} name={name} value={value} onChange={onChange}
              placeholder={placeholder}
              className={`flex-1 bg-transparent px-3 py-2.5 ${textColor} text-sm outline-none ${placeholderColor}`}
            />
          </div>
        ) : (
          <input
            type={type} name={name} value={value} onChange={onChange}
            placeholder={placeholder}
            className={`w-full ${bgColor} border ${borderColor} ${focusBorderColor} rounded-lg px-4 py-2.5 ${textColor} text-sm outline-none transition-colors ${placeholderColor}`}
          />
        )
      ) : (
        <p className={`text-sm py-2.5 px-4 rounded-lg border ${borderColor} ${readOnly ? 'text-gray-500' : textColor} ${readOnlyBg}`}>
          {value || <span className="text-gray-500 italic">—</span>}
        </p>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuracion(seg: number | null): string {
  if (!seg) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${s}s`;
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short',
  });
}

function estadoBadge(estado: string, isDark: boolean) {
  const map: Record<string, { color: string; label: string }> = {
    completada: { color: isDark ? 'bg-green-900/50 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200', label: '✓ Finalizada' },
    abandonada: { color: isDark ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800' : 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '⚠ Abandonada' },
    en_progreso: { color: isDark ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200', label: '⏳ En progreso' },
    tiempo_agotado: { color: isDark ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200', label: '⏰ Tiempo agotado' },
  };
  const cfg = map[estado] ?? { color: isDark ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200', label: estado };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ═════════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { user, logout, linkGithubToCurrentUser, linkGoogleToCurrentUser, updateUserProfile } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const router = useRouter();

  // ─── Estados UI ───
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Estados para datos reales ───
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [sesionesRecientes, setSesionesRecientes] = useState<SesionReciente[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    bio: '',
    website: '',
    location: '',
    github_url: '',
    linkedin_url: '',
    avatar_url: '',
  });

  // ─── Cargar datos del perfil ───
  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const cargarPerfil = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ProfileService.obtenerPerfilCompleto();
        setProfileData(data);
        setSesionesRecientes(data.sesiones_recientes || []);
        setNotificaciones(data.notificaciones || []);

        // ✅ Extraer solo el nombre de usuario de las URLs si vienen completas
        const extractUsername = (url: string, prefix: string) => {
          if (!url) return '';
          const clean = url.replace(/^https?:\/\//, '');
          if (clean.startsWith(prefix)) {
            return clean.replace(prefix, '').replace(/\/$/, '');
          }
          return url;
        };

        setFormData({
          nombre: data.usuario.nombre || '',
          apellido: data.usuario.apellido || '',
          email: data.usuario.email || '',
          telefono: data.usuario.telefono || '',
          bio: data.usuario.bio || '',
          website: data.usuario.website || '',
          location: data.usuario.location || '',
          github_url: extractUsername(data.usuario.github_url || '', 'github.com/'),
          linkedin_url: extractUsername(data.usuario.linkedin_url || '', 'linkedin.com/in/'),
          avatar_url: data.usuario.avatar_url || '',
        });

      } catch (err) {
        console.error('Error cargando perfil:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [user, router]);

  // ─── Handlers ───
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await updateUserProfile(formData);
      setSaveSuccess('✅ Perfil actualizado correctamente');
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar';
      setSaveError(msg);
      setTimeout(() => setSaveError(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileData) {
      const extractUsername = (url: string, prefix: string) => {
        if (!url) return '';
        const clean = url.replace(/^https?:\/\//, '');
        if (clean.startsWith(prefix)) {
          return clean.replace(prefix, '').replace(/\/$/, '');
        }
        return url;
      };

      setFormData({
        nombre: profileData.usuario.nombre || '',
        apellido: profileData.usuario.apellido || '',
        email: profileData.usuario.email || '',
        telefono: profileData.usuario.telefono || '',
        bio: profileData.usuario.bio || '',
        website: profileData.usuario.website || '',
        location: profileData.usuario.location || '',
        github_url: extractUsername(profileData.usuario.github_url || '', 'github.com/'),
        linkedin_url: extractUsername(profileData.usuario.linkedin_url || '', 'linkedin.com/in/'),
          avatar_url: profileData.usuario.avatar_url || '',
      });
    }
    setIsEditing(false);
    setSaveError('');
  };

  const handleLinkGithub = async () => {
    setLinkingError('');
    setLinkingSuccess('');
    try {
      await linkGithubToCurrentUser();
      setLinkingSuccess('✅ GitHub vinculado correctamente');
      setTimeout(() => setLinkingSuccess(''), 3000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al vincular';
      setLinkingError(msg);
      setTimeout(() => setLinkingError(''), 3000);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkingError('');
    setLinkingSuccess('');
    try {
      await linkGoogleToCurrentUser();
      setLinkingSuccess('✅ Google vinculado correctamente');
      setTimeout(() => setLinkingSuccess(''), 3000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al vincular';
      setLinkingError(msg);
      setTimeout(() => setLinkingError(''), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Estados de carga y error ───
  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#080808]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`w-12 h-12 border-4 ${isDark ? 'border-gray-700 border-t-[#00ff00]' : 'border-gray-200 border-t-blue-600'} rounded-full animate-spin mx-auto mb-4`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#080808]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😅</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Error al cargar el perfil</h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`mt-4 px-6 py-2 rounded-lg ${isDark ? 'bg-[#00ff00] text-black hover:bg-[#00cc00]' : 'bg-blue-600 text-white hover:bg-blue-700'} font-semibold transition-colors`}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#080808]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No hay datos disponibles</h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Completa tu primera entrevista para ver tu progreso.</p>
        </div>
      </div>
    );
  }

  // ─── Variables calculadas ───
  const { usuario, estadisticas, perfil_tecnico } = profileData;
  const displayName = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email?.split('@')[0] || 'Usuario';
  const displayEmail = usuario.email || '';
  const memberSince = usuario.fecha_creacion ? 
    new Date(usuario.fecha_creacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) : 
    'Desconocido';
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const unreadCount = notificaciones.filter(n => !n.leida).length;
  const providers = usuario.providers || [];
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');
  const hasPassword = providers.includes('password');

  const radarScores = [
    perfil_tecnico.score_javascript || 0,
    perfil_tecnico.score_arquitectura || 0,
    perfil_tecnico.score_buenas_practicas || 0,
    perfil_tecnico.score_comunicacion || 0,
    perfil_tecnico.score_resolucion || 0,
  ];

  // ─── Tabs ───
  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'perfil', label: 'Perfil', icon: <Icons.User /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: <Icons.Stats /> },
    { id: 'sesiones', label: 'Sesiones', icon: <Icons.Sessions /> },
    { id: 'notificaciones', label: 'Notificaciones', icon: <Icons.Notifications />, badge: unreadCount },
    { id: 'cuentas', label: 'Cuentas', icon: <Icons.Accounts /> },
  ];

  // ─── Theme styles ───
  const bgPage = isDark ? 'bg-[#080808]' : 'bg-gray-50';
  const navBg = isDark ? 'bg-gray-950/90 border-gray-800/60' : 'bg-white/90 border-gray-200';
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const cardBgLight = isDark ? 'bg-gray-800/40' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMutedLight = isDark ? 'text-gray-500' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const borderColorLight = isDark ? 'border-gray-700' : 'border-gray-300';
  const buttonBg = isDark ? 'bg-[#00ff00] hover:bg-[#00cc00]' : 'bg-blue-600 hover:bg-blue-700';
  const buttonText = isDark ? 'text-black' : 'text-white';

  // ─── Renderizado ───
  return (
    <div className={`min-h-screen ${bgPage} ${textPrimary} font-sans transition-colors duration-200`}>
      {/* ── Navbar ── */}
      <nav className={`sticky top-0 z-50 backdrop-blur-sm border-b ${navBg} px-6 py-3.5 transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/dashboard/developer')} className={`flex items-center space-x-2 ${textMuted} hover:${textPrimary} transition-colors`}>
              <Icons.ArrowLeft />
              <span className="text-sm">Dashboard</span>
            </button>
            <span className={`${textMutedLight}`}>/</span>
            <span className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-bold text-lg tracking-tight`}>TechMock</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
            </button>

            <div className={`flex items-center space-x-2 text-sm ${textMuted}`}>
              <div className={`w-7 h-7 bg-gradient-to-br ${isDark ? 'from-[#00ff00] to-emerald-600' : 'from-blue-500 to-blue-700'} rounded-full flex items-center justify-center ${buttonText} font-bold text-xs`}>
                {initials}
              </div>
              <span className="hidden sm:block">{displayName}</span>
            </div>

            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              usuario.rol === 'admin'
                ? isDark ? 'bg-purple-900/40 text-purple-400 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200'
                : isDark ? 'bg-[#00ff00]/10 text-[#00ff00] border-[#00ff00]/30' : 'bg-blue-100 text-blue-700 border-blue-200'
            }`}>
              {usuario.rol ?? 'developer'}
            </span>

            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 ${isDark ? 'bg-red-600/80 hover:bg-red-600' : 'bg-red-500 hover:bg-red-600'} text-white px-3 py-1.5 rounded text-xs font-medium transition-colors`}
            >
              <Icons.Logout />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Hero card ── */}
        <div className={`relative ${cardBg} rounded-2xl p-6 mb-6 overflow-hidden`}>
          <div className={`absolute inset-0 opacity-5`}>
            <div className={`absolute top-0 right-0 w-96 h-96 ${isDark ? 'bg-[#00ff00]' : 'bg-blue-500'} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              {usuario.avatar_url ? (
                <img src={usuario.avatar_url} alt={displayName} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#00ff00]/30" />
              ) : (
                <div className={`w-20 h-20 bg-gradient-to-br ${isDark ? 'from-[#00ff00] to-emerald-700' : 'from-blue-500 to-blue-700'} rounded-2xl flex items-center justify-center shadow-lg ${isDark ? 'shadow-green-900/30' : 'shadow-blue-500/30'}`}>
                  <span className="text-black font-bold text-3xl">{initials}</span>
                </div>
              )}
              {usuario.activo !== false && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00ff00] rounded-full border-2 border-gray-900" title="Activo" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className={`text-2xl font-bold ${textPrimary} truncate`}>{displayName}</h1>
                {usuario.email_verificado && (
                  <span className={`text-xs ${isDark ? 'bg-blue-900/40 border-blue-700 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-700'} px-2 py-0.5 rounded-full border`}>✓ Verificado</span>
                )}
              </div>
              <p className={`${textMuted} text-sm mb-2`}>{displayEmail}</p>
              <div className={`flex flex-wrap gap-2 text-xs ${textMutedLight}`}>
                {usuario.telefono && <span>📞 {usuario.telefono}</span>}
                {usuario.location && <span>📍 {usuario.location}</span>}
                <span>🗓 Miembro desde {memberSince}</span>
                {estadisticas.ultima_entrevista_fecha && (
                  <span>🕐 Última entrevista: {formatFecha(estadisticas.ultima_entrevista_fecha)}</span>
                )}
              </div>
            </div>

            <div className="flex gap-4 flex-shrink-0">
              {[
                { label: 'Entrevistas', value: estadisticas.total_entrevistas || 0 },
                { label: 'Promedio', value: estadisticas.puntaje_promedio ? `${Math.round(estadisticas.puntaje_promedio)}` : '—' },
                { label: 'Racha', value: `${estadisticas.racha_actual || 0}d 🔥` },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-bold text-xl leading-none`}>{k.value}</p>
                  <p className={`${textMuted} text-xs mt-1`}>{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feedback messages ── */}
        {saveSuccess && (
          <div className={`mb-4 ${isDark ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-green-100 border-green-300 text-green-800'} border rounded-lg p-3 text-sm`}>{saveSuccess}</div>
        )}
        {saveError && (
          <div className={`mb-4 ${isDark ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-100 border-red-300 text-red-800'} border rounded-lg p-3 text-sm`}>{saveError}</div>
        )}

        {/* ── Tabs ── */}
        <div className={`flex gap-1 ${isDark ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-100 border-gray-200'} border rounded-xl p-1 mb-6 overflow-x-auto`}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? isDark ? 'bg-[#00ff00] text-black' : 'bg-blue-600 text-white'
                  : `${textMuted} ${isDark ? 'hover:text-white hover:bg-gray-800' : 'hover:text-gray-900 hover:bg-gray-200'}`
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-black/20 text-black' : isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════ TAB: PERFIL ═══════════════ */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div className="flex justify-end gap-3">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className={`flex items-center gap-2 ${buttonBg} ${buttonText} px-4 py-2 rounded-lg text-sm font-semibold transition-colors`}>
                  <Icons.Edit /> Editar Perfil
                </button>
              ) : (
                <>
                  <button onClick={handleCancel} className={`px-4 py-2 rounded-lg text-sm ${textMuted} border ${borderColorLight} ${isDark ? 'hover:border-gray-500' : 'hover:border-gray-400'} transition-colors`}>
                    <Icons.Cancel /> Cancelar
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 ${buttonBg} ${buttonText} disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors`}>
                    {isSaving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando...</> : <><Icons.Save /> Guardar Cambios</>}
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardBg} rounded-xl p-6`}>
                <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5`}>Información Personal</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nombre" name="nombre" value={formData.nombre} placeholder="Tu nombre" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                    <Field label="Apellido" name="apellido" value={formData.apellido} placeholder="Tu apellido" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  </div>
                  <Field label="Email" name="email" value={formData.email} readOnly isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="Teléfono" name="telefono" value={formData.telefono} type="tel" placeholder="+591 7XXXXXXX" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="Ubicación" name="location" value={formData.location} placeholder="Ciudad, País" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="Biografía" name="bio" value={formData.bio} placeholder="Cuéntanos sobre ti..." textarea isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6`}>
                <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5`}>Links & Redes Sociales</h3>
                <div className="space-y-4">
                  <Field label="Sitio web" name="website" value={formData.website} type="url" placeholder="https://tu-portfolio.com" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="GitHub URL" name="github_url" value={formData.github_url} prefix="github.com/" placeholder="tu-usuario" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="LinkedIn URL" name="linkedin_url" value={formData.linkedin_url} prefix="linkedin.com/in/" placeholder="tu-perfil" isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                  <Field label="Avatar URL" name="avatar_url" value={formData.avatar_url} type="url" placeholder="https://..." isEditing={isEditing} isDark={isDark} onChange={handleInputChange} />
                </div>
                {!isEditing && (
                  <div className="mt-5 pt-4 border-t ${borderColor} flex flex-wrap gap-2">
                    {/* ✅ Website - usando getGithubUrl, getLinkedinUrl, getTwitterUrl */}
                    {formData.website && (
                      <a href={formData.website} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 text-xs ${textMuted} ${isDark ? 'hover:text-[#00ff00] border-gray-700 hover:border-[#00ff00]/40' : 'hover:text-blue-600 border-gray-200 hover:border-blue-300'} border rounded-lg px-3 py-1.5 transition-colors`}>
                        <Icons.Website /> Website
                      </a>
                    )}
                    {formData.github_url && (
                      <a href={getGithubUrl(formData.github_url) || '#'} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 text-xs ${textMuted} ${isDark ? 'hover:text-white border-gray-700 hover:border-gray-500' : 'hover:text-gray-900 border-gray-200 hover:border-gray-400'} border rounded-lg px-3 py-1.5 transition-colors`}>
                        <Icons.GitHub /> GitHub
                      </a>
                    )}
                    {formData.linkedin_url && (
                      <a href={getLinkedinUrl(formData.linkedin_url) || '#'} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 text-xs text-blue-400 ${isDark ? 'hover:text-blue-300 border-blue-900/50 hover:border-blue-700' : 'hover:text-blue-600 border-blue-200 hover:border-blue-400'} border rounded-lg px-3 py-1.5 transition-colors`}>
                        <Icons.LinkedIn /> LinkedIn
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: ESTADÍSTICAS ═══════════════ */}
        {activeTab === 'estadisticas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total entrevistas', value: estadisticas.total_entrevistas || 0, icon: '📋' },
                { label: 'Finalizadas', value: estadisticas.entrevistas_finalizadas || 0, icon: '✅' },
                { label: 'Abandonadas', value: estadisticas.entrevistas_abandonadas || 0, icon: '⚠️' },
                { label: 'Racha actual', value: `${estadisticas.racha_actual || 0} días`, icon: '🔥' },
              ].map(k => (
                <div key={k.label} className={`${cardBg} rounded-xl p-4`}>
                  <p className="text-2xl mb-1">{k.icon}</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
                  <p className={`${textMuted} text-xs mt-1`}>{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardBg} rounded-xl p-6 flex flex-col items-center`}>
                <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5 text-center`}>Desempeño por Pilar Técnico</h3>
                <RadarChart scores={radarScores} isDark={isDark} />
                <div className={`mt-4 text-center text-xs ${textMuted}`}>
                  Basado en tus últimas sesiones
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6`}>
                <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5`}>Actividad</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Tiempo promedio por sesión', value: formatDuracion(estadisticas.tiempo_promedio_segundos), icon: '⏱' },
                    { label: 'Tecnología favorita', value: estadisticas.tecnologia_favorita || '—', icon: '💻' },
                    { label: 'Racha máxima', value: `${estadisticas.racha_maxima || 0} días`, icon: '🏆' },
                    { label: 'Racha actual', value: `${estadisticas.racha_actual || 0} días`, icon: '🔥' },
                    { label: 'Última entrevista', value: formatFecha(estadisticas.ultima_entrevista_fecha), icon: '🗓' },
                    { label: 'Tasa de finalización', value: `${Math.round(((estadisticas.entrevistas_finalizadas || 0) / Math.max(estadisticas.total_entrevistas || 1, 1)) * 100)}%`, icon: '📈' },
                  ].map(item => (
                    <div key={item.label} className={`flex items-center justify-between py-1.5 border-b ${borderColorLight} last:border-0`}>
                      <span className={`${textMuted} text-sm flex items-center gap-2`}>
                        <span>{item.icon}</span>{item.label}
                      </span>
                      <span className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-sm`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: SESIONES ═══════════════ */}
        {activeTab === 'sesiones' && (
          <div className="space-y-4">
            <p className={`${textMuted} text-sm mb-2`}>{sesionesRecientes.length} sesiones en tu historial</p>
            {sesionesRecientes.length === 0 ? (
              <div className={`${cardBg} rounded-xl p-8 text-center`}>
                <p className={`${textMuted}`}>No tienes sesiones completadas aún.</p>
                <p className={`${textMuted} text-sm mt-1`}>Comienza tu primera entrevista técnica para ver tu progreso.</p>
              </div>
            ) : (
              sesionesRecientes.map(ses => (
                <div key={ses.id} className={`${cardBg} hover:border-gray-700 rounded-xl p-5 transition-colors`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold ${isDark ? 'bg-[#00ff00]/10 text-[#00ff00] border-[#00ff00]/20' : 'bg-blue-100 text-blue-700 border-blue-200'} border px-2 py-0.5 rounded`}>
                          {ses.tecnologia}
                        </span>
                        <span className={`text-xs ${textMuted} border ${borderColorLight} px-2 py-0.5 rounded`}>
                          {ses.nivel}
                        </span>
                        {estadoBadge(ses.estado, isDark)}
                      </div>
                      <p className={`${textPrimary} text-sm font-medium mb-1 line-clamp-2`}>{ses.pregunta}</p>
                      <div className={`flex flex-wrap gap-4 text-xs ${textMuted}`}>
                        <span>🗓 {formatFecha(ses.fecha_inicio)}</span>
                        {ses.duracion_segundos && <span>⏱ {formatDuracion(ses.duracion_segundos)}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {ses.puntaje != null ? (
                        <div>
                          <p className={`text-2xl font-bold ${ses.puntaje >= 80 ? 'text-green-400' : ses.puntaje >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Math.round(ses.puntaje)}
                          </p>
                          <p className={`${textMuted} text-xs`}>/ 100</p>
                        </div>
                      ) : (
                        <span className={`${textMuted} text-sm`}>Sin evaluar</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════ TAB: NOTIFICACIONES ═══════════════ */}
        {activeTab === 'notificaciones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className={`${textMuted} text-sm`}>{unreadCount} no leída{unreadCount !== 1 ? 's' : ''}</p>
              {unreadCount > 0 && (
                <button className={`text-xs ${isDark ? 'text-[#00ff00]' : 'text-blue-600'} hover:underline`}>Marcar todas como leídas</button>
              )}
            </div>
            {notificaciones.length === 0 ? (
              <div className={`${cardBg} rounded-xl p-8 text-center`}>
                <p className={`${textMuted}`}>No tienes notificaciones.</p>
              </div>
            ) : (
              notificaciones.map(n => (
                <div key={n.id} className={`border rounded-xl p-4 transition-colors ${!n.leida ? (isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300') : (isDark ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-200')}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.leida ? 'bg-[#00ff00]' : 'bg-gray-700'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm font-medium ${!n.leida ? textPrimary : textMuted}`}>{n.titulo}</p>
                        <span className={`${textMuted} text-xs flex-shrink-0`}>{formatFechaCorta(n.fecha_creacion)}</span>
                      </div>
                      {n.mensaje && <p className={`${textMuted} text-xs leading-relaxed`}>{n.mensaje}</p>}
                      {n.url_accion && (
                        <button onClick={() => router.push(n.url_accion!)} className={`mt-2 text-xs ${isDark ? 'text-[#00ff00]' : 'text-blue-600'} hover:underline`}>
                          Ver más →
                        </button>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${
                      n.tipo === 'evaluacion' ? (isDark ? 'border-purple-800 text-purple-400 bg-purple-900/20' : 'border-purple-200 text-purple-700 bg-purple-50') :
                      n.tipo === 'reclutamiento' ? (isDark ? 'border-blue-800 text-blue-400 bg-blue-900/20' : 'border-blue-200 text-blue-700 bg-blue-50') :
                      (isDark ? 'border-orange-800 text-orange-400 bg-orange-900/20' : 'border-orange-200 text-orange-700 bg-orange-50')
                    }`}>
                      {n.tipo}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════ TAB: CUENTAS ═══════════════ */}
        {activeTab === 'cuentas' && (
          <div className="space-y-6">
            {linkingSuccess && <div className={`${isDark ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-green-100 border-green-300 text-green-800'} border rounded-lg p-3 text-sm`}>{linkingSuccess}</div>}
            {linkingError && <div className={`${isDark ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-100 border-red-300 text-red-800'} border rounded-lg p-3 text-sm`}>{linkingError}</div>}

            <div className={`${cardBg} rounded-xl p-6`}>
              <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5`}>Métodos de autenticación</h3>
              <div className="space-y-3">
                {/* Email */}
                <div className={`flex items-center justify-between p-4 ${cardBgLight} rounded-xl border ${borderColorLight}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`${textPrimary} text-sm font-medium`}>Email y contraseña</p>
                      <p className={`${textMuted} text-xs`}>{displayEmail}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${hasPassword ? (isDark ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200') : (isDark ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200')}`}>
                    {hasPassword ? '✓ Activo' : 'No vinculado'}
                  </span>
                </div>

                {/* Google */}
                <div className={`flex items-center justify-between p-4 ${cardBgLight} rounded-xl border ${borderColorLight}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                      <Icons.Google />
                    </div>
                    <div>
                      <p className={`${textPrimary} text-sm font-medium`}>Google</p>
                      <p className={`${textMuted} text-xs`}>Inicio de sesión con Google</p>
                    </div>
                  </div>
                  {hasGoogle
                    ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isDark ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}>✓ Vinculado</span>
                    : <button onClick={handleLinkGoogle} className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'} font-semibold transition-colors`}>Vincular</button>
                  }
                </div>

                {/* GitHub */}
                <div className={`flex items-center justify-between p-4 ${cardBgLight} rounded-xl border ${borderColorLight}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-gray-200'} rounded-lg flex items-center justify-center`}>
                      <Icons.GitHub />
                    </div>
                    <div>
                      <p className={`${textPrimary} text-sm font-medium`}>GitHub</p>
                      <p className={`${textMuted} text-xs`}>Inicio de sesión con GitHub</p>
                    </div>
                  </div>
                  {hasGithub
                    ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isDark ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}>✓ Vinculado</span>
                    : <button onClick={handleLinkGithub} className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-gray-800 text-white hover:bg-gray-700'} font-semibold transition-colors`}>Vincular</button>
                  }
                </div>
              </div>
            </div>

            {/* Seguridad */}
            <div className={`${cardBg} rounded-xl p-6`}>
              <h3 className={`${isDark ? 'text-[#00ff00]' : 'text-blue-600'} font-semibold text-xs uppercase tracking-widest mb-5`}>Seguridad de la cuenta</h3>
              <div className="space-y-3">
                {[
                  { label: 'Email verificado', value: usuario.email_verificado ? 'Sí ✓' : 'Pendiente', ok: !!usuario.email_verificado },
                  { label: 'Cuenta activa', value: usuario.activo !== false ? 'Sí ✓' : 'Suspendida', ok: usuario.activo !== false },
                  { label: 'Rol', value: usuario.rol ?? 'developer', ok: true },
                  { label: 'Último acceso', value: formatFecha(usuario.ultimo_acceso ?? usuario.ultimo_login), ok: true },
                ].map(item => (
                  <div key={item.label} className={`flex items-center justify-between py-2 border-b ${borderColorLight} last:border-0`}>
                    <span className={`${textMuted} text-sm`}>{item.label}</span>
                    <span className={`text-sm font-medium ${item.ok ? 'text-green-400' : 'text-yellow-400'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}