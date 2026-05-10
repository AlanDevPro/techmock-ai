'use client'

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Tipos basados en tu schema de BD ───────────────────────────────────────
interface EstadisticasUsuario {
  total_entrevistas: number;
  entrevistas_finalizadas: number;
  entrevistas_abandonadas: number;
  puntaje_promedio: number | null;
  mejor_puntaje: number | null;
  peor_puntaje: number | null;
  tiempo_promedio_segundos: number | null;
  tecnologia_favorita: string | null;
  racha_actual: number;
  racha_maxima: number;
  ultima_entrevista_fecha: string | null;
}

interface SesionReciente {
  id: string;
  tecnologia: string;
  nivel: string;
  pregunta: string;
  estado: string;
  fecha_inicio: string;
  duracion_segundos: number | null;
  puntaje?: number | null;
}

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url_accion?: string;
  fecha_creacion: string;
}

// ─── Datos estáticos de ejemplo (reemplaza con fetch a tu API) ───────────────
const MOCK_STATS: EstadisticasUsuario = {
  total_entrevistas: 24,
  entrevistas_finalizadas: 19,
  entrevistas_abandonadas: 5,
  puntaje_promedio: 78.4,
  mejor_puntaje: 95.0,
  peor_puntaje: 42.0,
  tiempo_promedio_segundos: 2340,
  tecnologia_favorita: 'React',
  racha_actual: 12,
  racha_maxima: 21,
  ultima_entrevista_fecha: '2025-05-01T14:23:00Z',
};

const MOCK_SESIONES: SesionReciente[] = [
  {
    id: 'ses-001',
    tecnologia: 'React',
    nivel: 'Intermedio',
    pregunta: 'Implementa un custom hook para fetching con cache',
    estado: 'finalizada',
    fecha_inicio: '2025-05-01T14:00:00Z',
    duracion_segundos: 2780,
    puntaje: 88,
  },
  {
    id: 'ses-002',
    tecnologia: 'Node.js',
    nivel: 'Avanzado',
    pregunta: 'Diseña una API REST con autenticación JWT y refresh tokens',
    estado: 'finalizada',
    fecha_inicio: '2025-04-28T10:30:00Z',
    duracion_segundos: 3600,
    puntaje: 74,
  },
  {
    id: 'ses-003',
    tecnologia: 'TypeScript',
    nivel: 'Básico',
    pregunta: 'Explica la diferencia entre type e interface en TypeScript',
    estado: 'abandonada',
    fecha_inicio: '2025-04-25T16:00:00Z',
    duracion_segundos: null,
    puntaje: null,
  },
  {
    id: 'ses-004',
    tecnologia: 'PostgreSQL',
    nivel: 'Intermedio',
    pregunta: 'Optimiza una consulta con JOINs múltiples y explica el plan de ejecución',
    estado: 'finalizada',
    fecha_inicio: '2025-04-20T09:00:00Z',
    duracion_segundos: 1980,
    puntaje: 95,
  },
];

const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 1,
    tipo: 'evaluacion',
    titulo: '¡Nueva evaluación disponible!',
    mensaje: 'Tu sesión de React del 1 de mayo ya tiene feedback completo.',
    leida: false,
    url_accion: '/evaluaciones/ses-001',
    fecha_creacion: '2025-05-02T08:00:00Z',
  },
  {
    id: 2,
    tipo: 'reclutamiento',
    titulo: 'Un reclutador está interesado en tu perfil',
    mensaje: 'TechCorp vio tu puntuación de 95 en PostgreSQL y quiere contactarte.',
    leida: false,
    url_accion: '/contactos',
    fecha_creacion: '2025-04-30T15:30:00Z',
  },
  {
    id: 3,
    tipo: 'racha',
    titulo: '🔥 ¡Racha de 12 días!',
    mensaje: 'Llevas 12 días consecutivos practicando. ¡Sigue así!',
    leida: true,
    fecha_creacion: '2025-04-29T20:00:00Z',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuracion(seg: number | null): string {
  if (!seg) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${s}s`;
}

function formatFecha(iso: string | null): string {
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

function estadoBadge(estado: string) {
  const map: Record<string, { color: string; label: string }> = {
    finalizada: { color: 'bg-green-900/50 text-green-400 border-green-800', label: '✓ Finalizada' },
    abandonada: { color: 'bg-yellow-900/40 text-yellow-400 border-yellow-800', label: '⚠ Abandonada' },
    en_progreso: { color: 'bg-blue-900/40 text-blue-400 border-blue-800', label: '⏳ En progreso' },
  };
  const cfg = map[estado] ?? { color: 'bg-gray-700 text-gray-400 border-gray-600', label: estado };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'perfil' | 'estadisticas' | 'sesiones' | 'notificaciones' | 'cuentas';

// ═════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const {
    user,
    logout,
    linkGithubToCurrentUser,
    linkGoogleToCurrentUser,
    updateUserProfile,
  } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState('');
  const [linkingError, setLinkingError] = useState('');

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
    twitter: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    setFormData({
      nombre: user.nombre || user.name || '',
      apellido: user.apellido || '',
      email: user.email || '',
      telefono: user.telefono || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      github_url: user.github_url || user.github || '',
      linkedin_url: user.linkedin_url || '',
      twitter: user.twitter || '',
      avatar_url: user.avatar_url || '',
    });
  }, [user, router]);

  if (!user) return null;

  const providers = user?.providers ?? [];
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');
  const hasPassword = providers.includes('password');

  const displayName = `${user.nombre || user.name || ''} ${user.apellido || ''}`.trim() || user.email?.split('@')[0] || 'Usuario';
  const displayEmail = user.email || '';
  const memberSince = user.fecha_creacion || user.createdAt
    ? new Date(user.fecha_creacion || user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    : 'Desconocido';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const unreadCount = MOCK_NOTIFICACIONES.filter(n => !n.leida).length;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true); setSaveError(''); setSaveSuccess('');
    try {
      if (updateUserProfile) await updateUserProfile(formData);
      setSaveSuccess('✅ Perfil actualizado correctamente');
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (error: any) {
      setSaveError(error.message || 'Error al guardar');
      setTimeout(() => setSaveError(''), 4000);
    } finally { setIsSaving(false); }
  };

  const handleCancel = () => {
    setFormData({
      nombre: user.nombre || user.name || '',
      apellido: user.apellido || '',
      email: user.email || '',
      telefono: user.telefono || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      github_url: user.github_url || user.github || '',
      linkedin_url: user.linkedin_url || '',
      twitter: user.twitter || '',
      avatar_url: user.avatar_url || '',
    });
    setIsEditing(false); setSaveError('');
  };

  const handleLinkGithub = async () => {
    setLinkingError(''); setLinkingSuccess('');
    try {
      await linkGithubToCurrentUser();
      setLinkingSuccess('✅ GitHub vinculado correctamente');
      setTimeout(() => setLinkingSuccess(''), 3000);
    } catch (error: any) { setLinkingError(error.message); setTimeout(() => setLinkingError(''), 3000); }
  };

  const handleLinkGoogle = async () => {
    setLinkingError(''); setLinkingSuccess('');
    try {
      await linkGoogleToCurrentUser();
      setLinkingSuccess('✅ Google vinculado correctamente');
      setTimeout(() => setLinkingSuccess(''), 3000);
    } catch (error: any) { setLinkingError(error.message); setTimeout(() => setLinkingError(''), 3000); }
  };

  const handleLogout = async () => {
    try { await logout(); router.push('/'); } catch (e) { console.error(e); }
  };

  // ── Tab definitions ──
  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'perfil', label: 'Perfil',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      id: 'estadisticas', label: 'Estadísticas',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    },
    {
      id: 'sesiones', label: 'Sesiones',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
    {
      id: 'notificaciones', label: 'Notificaciones',
      badge: unreadCount,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    },
    {
      id: 'cuentas', label: 'Cuentas',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    },
  ];

  // ── Render field helper ──
  const Field = ({
    label, name, value, type = 'text', placeholder, prefix, readOnly, textarea,
  }: {
    label: string; name: string; value: string; type?: string;
    placeholder?: string; prefix?: string; readOnly?: boolean; textarea?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
        {label}{readOnly && <span className="text-gray-700 normal-case ml-1">(no editable)</span>}
      </label>
      {isEditing && !readOnly ? (
        textarea ? (
          <textarea
            name={name} value={value} onChange={handleInputChange}
            placeholder={placeholder} rows={3}
            className="w-full bg-gray-800 border border-gray-700 focus:border-[#00ff00] rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder-gray-600 resize-none"
          />
        ) : prefix ? (
          <div className="flex items-center bg-gray-800 border border-gray-700 focus-within:border-[#00ff00] rounded-lg overflow-hidden transition-colors">
            <span className="text-gray-500 text-sm px-3 border-r border-gray-700 py-2.5">{prefix}</span>
            <input type={type} name={name} value={value} onChange={handleInputChange} placeholder={placeholder}
              className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none placeholder-gray-600" />
          </div>
        ) : (
          <input type={type} name={name} value={value} onChange={handleInputChange} placeholder={placeholder}
            className="w-full bg-gray-800 border border-gray-700 focus:border-[#00ff00] rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder-gray-600" />
        )
      ) : (
        <p className={`text-sm py-2.5 px-4 rounded-lg border border-gray-800 ${readOnly ? 'text-gray-500 bg-gray-800/30' : 'text-white bg-gray-800/50'}`}>
          {value || <span className="text-gray-600 italic">—</span>}
        </p>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60 px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Dashboard</span>
            </button>
            <span className="text-gray-700">/</span>
            <span className="text-[#00ff00] font-bold text-lg tracking-tight">DEV_STREAM</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-7 h-7 bg-gradient-to-br from-[#00ff00] to-emerald-600 rounded-full flex items-center justify-center text-black font-bold text-xs">
                {initials}
              </div>
              <span className="hidden sm:block">{displayName}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              (user.rol === 'admin') ? 'bg-purple-900/40 text-purple-400 border-purple-800' : 'bg-[#00ff00]/10 text-[#00ff00] border-[#00ff00]/30'
            }`}>
              {user.rol || 'developer'}
            </span>
            <button onClick={handleLogout} className="bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded text-xs font-medium transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero card ── */}
        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 overflow-hidden">
          {/* Decorative bg */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ff00] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#00ff00]/30" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[#00ff00] to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/30">
                  <span className="text-black font-bold text-3xl">{initials}</span>
                </div>
              )}
              {user.activo !== false && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00ff00] rounded-full border-2 border-gray-900" title="Activo" />
              )}
            </div>

            {/* Info básica */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
                {user.email_verificado && (
                  <span className="text-xs bg-blue-900/40 border border-blue-700 text-blue-400 px-2 py-0.5 rounded-full">✓ Verificado</span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-2">{displayEmail}</p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {user.telefono && <span className="flex items-center gap-1">📞 {user.telefono}</span>}
                {user.location && <span className="flex items-center gap-1">📍 {user.location}</span>}
                <span>🗓 Miembro desde {memberSince}</span>
                {MOCK_STATS.ultima_entrevista_fecha && (
                  <span>🕐 Última entrevista: {formatFecha(MOCK_STATS.ultima_entrevista_fecha)}</span>
                )}
              </div>
            </div>

            {/* Kpi strip */}
            <div className="flex gap-4 flex-shrink-0">
              {[
                { label: 'Entrevistas', value: MOCK_STATS.total_entrevistas },
                { label: 'Promedio', value: MOCK_STATS.puntaje_promedio ? `${MOCK_STATS.puntaje_promedio}` : '—' },
                { label: 'Racha', value: `${MOCK_STATS.racha_actual}d 🔥` },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className="text-[#00ff00] font-bold text-xl leading-none">{k.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feedback messages ── */}
        {saveSuccess && <div className="mb-4 bg-green-900/40 border border-green-700 rounded-lg p-3 text-green-300 text-sm">{saveSuccess}</div>}
        {saveError && <div className="mb-4 bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{saveError}</div>}

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00ff00] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-red-600 text-white'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: PERFIL
        ══════════════════════════════════════════ */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            {/* Edit/Save actions */}
            <div className="flex justify-end gap-3">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-[#00ff00] hover:bg-[#00cc00] text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Editar Perfil
                </button>
              ) : (
                <>
                  <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">Cancelar</button>
                  <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#00ff00] hover:bg-[#00cc00] disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                    {isSaving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando...</> : <>✓ Guardar Cambios</>}
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información personal */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Información Personal</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nombre" name="nombre" value={formData.nombre} placeholder="Tu nombre" />
                    <Field label="Apellido" name="apellido" value={formData.apellido} placeholder="Tu apellido" />
                  </div>
                  <Field label="Email" name="email" value={formData.email} readOnly />
                  <Field label="Teléfono" name="telefono" value={formData.telefono} type="tel" placeholder="+591 7XXXXXXX" />
                  <Field label="Ubicación" name="location" value={formData.location} placeholder="Ciudad, País" />
                  <Field label="Biografía" name="bio" value={formData.bio} placeholder="Cuéntanos sobre ti..." textarea />
                </div>
              </div>

              {/* Links & Redes */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Links & Redes Sociales</h3>
                <div className="space-y-4">
                  <Field label="Sitio web" name="website" value={formData.website} type="url" placeholder="https://tu-portfolio.com" />
                  <Field label="GitHub URL" name="github_url" value={formData.github_url} prefix="github.com/" placeholder="tu-usuario" />
                  <Field label="LinkedIn URL" name="linkedin_url" value={formData.linkedin_url} prefix="linkedin.com/in/" placeholder="tu-perfil" />
                  <Field label="Twitter / X" name="twitter" value={formData.twitter} prefix="@" placeholder="usuario" />
                  <Field label="Avatar URL" name="avatar_url" value={formData.avatar_url} type="url" placeholder="https://..." />
                </div>

                {/* Vista previa links */}
                {!isEditing && (
                  <div className="mt-5 pt-4 border-t border-gray-800 flex flex-wrap gap-2">
                    {formData.website && (
                      <a href={formData.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00ff00] border border-gray-700 hover:border-[#00ff00]/40 rounded-lg px-3 py-1.5 transition-colors">
                        🌐 Website
                      </a>
                    )}
                    {formData.github_url && (
                      <a href={`https://github.com/${formData.github_url}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                        GitHub
                      </a>
                    )}
                    {formData.linkedin_url && (
                      <a href={`https://linkedin.com/in/${formData.linkedin_url}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-900/50 hover:border-blue-700 rounded-lg px-3 py-1.5 transition-colors">
                        in LinkedIn
                      </a>
                    )}
                    {formData.twitter && (
                      <a href={`https://twitter.com/${formData.twitter}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 border border-sky-900/50 hover:border-sky-700 rounded-lg px-3 py-1.5 transition-colors">
                        𝕏 Twitter
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-gray-900 border border-red-900/40 rounded-xl p-5">
              <h3 className="text-red-400 font-semibold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Zona de Peligro
              </h3>
              <p className="text-gray-500 text-sm mb-4">Estas acciones son permanentes e irreversibles.</p>
              <button onClick={handleLogout} className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/60 border border-red-800 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: ESTADÍSTICAS
        ══════════════════════════════════════════ */}
        {activeTab === 'estadisticas' && (
          <div className="space-y-6">

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total entrevistas', value: MOCK_STATS.total_entrevistas, icon: '📋', color: 'text-white' },
                { label: 'Finalizadas', value: MOCK_STATS.entrevistas_finalizadas, icon: '✅', color: 'text-green-400' },
                { label: 'Abandonadas', value: MOCK_STATS.entrevistas_abandonadas, icon: '⚠️', color: 'text-yellow-400' },
                { label: 'Racha actual', value: `${MOCK_STATS.racha_actual} días`, icon: '🔥', color: 'text-orange-400' },
              ].map(k => (
                <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-2xl mb-1">{k.icon}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Puntajes */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Puntajes</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Puntaje promedio', value: MOCK_STATS.puntaje_promedio, suffix: '/100', bar: MOCK_STATS.puntaje_promedio },
                    { label: 'Mejor puntaje', value: MOCK_STATS.mejor_puntaje, suffix: '/100', bar: MOCK_STATS.mejor_puntaje, barColor: 'bg-green-500' },
                    { label: 'Peor puntaje', value: MOCK_STATS.peor_puntaje, suffix: '/100', bar: MOCK_STATS.peor_puntaje, barColor: 'bg-red-500' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400 text-sm">{s.label}</span>
                        <span className="text-white font-semibold text-sm">{s.value ?? '—'}{s.value ? s.suffix : ''}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${s.barColor ?? 'bg-[#00ff00]'}`}
                          style={{ width: `${s.bar ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiempo & actividad */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Actividad</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Tiempo promedio por sesión', value: formatDuracion(MOCK_STATS.tiempo_promedio_segundos), icon: '⏱' },
                    { label: 'Tecnología favorita', value: MOCK_STATS.tecnologia_favorita ?? '—', icon: '💻' },
                    { label: 'Racha máxima', value: `${MOCK_STATS.racha_maxima} días`, icon: '🏆' },
                    { label: 'Racha actual', value: `${MOCK_STATS.racha_actual} días`, icon: '🔥' },
                    { label: 'Última entrevista', value: formatFecha(MOCK_STATS.ultima_entrevista_fecha), icon: '🗓' },
                    {
                      label: 'Tasa de finalización',
                      value: `${Math.round((MOCK_STATS.entrevistas_finalizadas / Math.max(MOCK_STATS.total_entrevistas, 1)) * 100)}%`,
                      icon: '📈',
                    },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400 text-sm flex items-center gap-2">
                        <span>{item.icon}</span>{item.label}
                      </span>
                      <span className="text-[#00ff00] font-semibold text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: SESIONES
        ══════════════════════════════════════════ */}
        {activeTab === 'sesiones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">{MOCK_SESIONES.length} sesiones en tu historial</p>
            </div>
            {MOCK_SESIONES.map(ses => (
              <div key={ses.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-semibold bg-[#00ff00]/10 text-[#00ff00] border border-[#00ff00]/20 px-2 py-0.5 rounded">
                        {ses.tecnologia}
                      </span>
                      <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded">
                        {ses.nivel}
                      </span>
                      {estadoBadge(ses.estado)}
                    </div>
                    <p className="text-white text-sm font-medium mb-1 line-clamp-2">{ses.pregunta}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>🗓 {formatFecha(ses.fecha_inicio)}</span>
                      {ses.duracion_segundos && <span>⏱ {formatDuracion(ses.duracion_segundos)}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {ses.puntaje !== null && ses.puntaje !== undefined ? (
                      <div>
                        <p className={`text-2xl font-bold ${ses.puntaje >= 80 ? 'text-green-400' : ses.puntaje >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {ses.puntaje}
                        </p>
                        <p className="text-gray-600 text-xs">/ 100</p>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm">Sin evaluar</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: NOTIFICACIONES
        ══════════════════════════════════════════ */}
        {activeTab === 'notificaciones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">{unreadCount} no leída{unreadCount !== 1 ? 's' : ''}</p>
              {unreadCount > 0 && (
                <button className="text-xs text-[#00ff00] hover:underline">Marcar todas como leídas</button>
              )}
            </div>
            {MOCK_NOTIFICACIONES.map(n => (
              <div key={n.id}
                className={`border rounded-xl p-4 transition-colors ${
                  !n.leida ? 'bg-gray-900 border-gray-700' : 'bg-gray-900/40 border-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.leida ? 'bg-[#00ff00]' : 'bg-gray-700'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`text-sm font-medium ${!n.leida ? 'text-white' : 'text-gray-400'}`}>{n.titulo}</p>
                      <span className="text-gray-600 text-xs flex-shrink-0">{formatFechaCorta(n.fecha_creacion)}</span>
                    </div>
                    {n.mensaje && <p className="text-gray-500 text-xs leading-relaxed">{n.mensaje}</p>}
                    {n.url_accion && (
                      <button
                        onClick={() => router.push(n.url_accion!)}
                        className="mt-2 text-xs text-[#00ff00] hover:underline"
                      >
                        Ver más →
                      </button>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${
                    n.tipo === 'evaluacion' ? 'border-purple-800 text-purple-400 bg-purple-900/20' :
                    n.tipo === 'reclutamiento' ? 'border-blue-800 text-blue-400 bg-blue-900/20' :
                    'border-orange-800 text-orange-400 bg-orange-900/20'
                  }`}>
                    {n.tipo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: CUENTAS VINCULADAS
        ══════════════════════════════════════════ */}
        {activeTab === 'cuentas' && (
          <div className="space-y-6">
            {linkingSuccess && <div className="bg-green-900/40 border border-green-700 rounded-lg p-3 text-green-300 text-sm">{linkingSuccess}</div>}
            {linkingError && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{linkingError}</div>}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Métodos de autenticación</h3>
              <div className="space-y-3">

                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Email y contraseña</p>
                      <p className="text-gray-500 text-xs">{displayEmail}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${hasPassword ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                    {hasPassword ? '✓ Activo' : 'No vinculado'}
                  </span>
                </div>

                {/* Google */}
                <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Google</p>
                      <p className="text-gray-500 text-xs">Inicio de sesión con Google</p>
                    </div>
                  </div>
                  {hasGoogle ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-900/40 text-green-400 border border-green-800">✓ Vinculado</span>
                  ) : (
                    <button onClick={handleLinkGoogle} className="text-xs px-3 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-gray-100 transition-colors">Vincular</button>
                  )}
                </div>

                {/* GitHub */}
                <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">GitHub</p>
                      <p className="text-gray-500 text-xs">Inicio de sesión con GitHub</p>
                    </div>
                  </div>
                  {hasGithub ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-900/40 text-green-400 border border-green-800">✓ Vinculado</span>
                  ) : (
                    <button onClick={handleLinkGithub} className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-white font-semibold hover:bg-gray-600 border border-gray-600 transition-colors">Vincular</button>
                  )}
                </div>
              </div>
            </div>

            {/* Seguridad */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-[#00ff00] font-semibold text-xs uppercase tracking-widest mb-5">Seguridad de la cuenta</h3>
              <div className="space-y-3">
                {[
                  { label: 'Email verificado', value: user.email_verificado ? 'Sí ✓' : 'Pendiente', ok: !!user.email_verificado },
                  { label: 'Cuenta activa', value: user.activo !== false ? 'Sí ✓' : 'Suspendida', ok: user.activo !== false },
                  { label: 'Rol', value: user.rol || 'developer', ok: true },
                  { label: 'Último acceso', value: formatFecha(user.ultimo_acceso || user.ultimo_login || null), ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <span className="text-gray-400 text-sm">{item.label}</span>
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