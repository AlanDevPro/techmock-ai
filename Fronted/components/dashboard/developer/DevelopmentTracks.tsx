// app/dashboard/developer/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useThemeContext } from '../../../components/providers/ThemeProvider';
import { getTecnologias, type Tecnologia } from '../../../services/technologies.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  title: string;
  description: string;
  duration: string;
  tags: string[];
  locked?: boolean;
  framework: string;
  tecnologia_id: number;
}

interface PracticeProgress {
  id: string;
  label: string;
  icon: string;
  percent: number;
  framework: string;
  tecnologia_id: number;
  sesiones_completadas: number;
  total_sesiones: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="inline-block">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ─── IDE redirect helper ──────────────────────────────────────────────────────

async function openIDE(framework: string, userId: string | undefined, accessToken: string | null) {
  const ideWindow = window.open('', '_blank');

  if (!ideWindow) {
    alert('Tu navegador bloqueó la ventana emergente.\n\nHabilita los popups para este sitio y vuelve a intentarlo.');
    return;
  }

  ideWindow.document.write(`
    <!DOCTYPE html><html>
    <head><title>Cargando IDE...</title></head>
    <body style="margin:0;padding:0;background:#0f172a;color:#94a3b8;font-family:'JetBrains Mono',monospace,sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:20px">
      <div style="width:40px;height:40px;border:3px solid #1e293b;border-top-color:#22c55e;
        border-radius:50%;animation:spin .7s linear infinite"></div>
      <p style="font-size:13px;letter-spacing:.08em">Iniciando entorno de ${framework}…</p>
      <style>
        @keyframes spin{to{transform:rotate(360deg)}}
      </style>
    </body>
    </html>
  `);

  const mappedFramework = (framework === 'react' || framework === 'cpp') ? 'nextjs' : framework;

  try {
    if (!accessToken) throw new Error('No hay accessToken');
    if (!userId)      throw new Error('No existe user.id');

    const apiBase = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';

    const sesionResponse = await fetch(
      `${apiBase}/preguntas/iniciar-sesion/${mappedFramework}`,
      { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!sesionResponse.ok) throw new Error(`Error sesión: ${sesionResponse.status}`);

    const data = await sesionResponse.json();
    const sesionId = data.sesion_id;
    if (sesionId) sessionStorage.setItem('sesion_id', sesionId);

    const ideBase = process.env.NEXT_PUBLIC_IDE_URL || 'http://localhost:3001';
    const params = new URLSearchParams({
      framework: mappedFramework,
      usuario_id: userId,
      token: accessToken,
      sesion_id: sesionId,
      mode: 'interview',
    });

    ideWindow.location.href = `${ideBase}?${params.toString()}`;
  } catch {
    const ideBase = process.env.NEXT_PUBLIC_IDE_URL || 'http://localhost:3001';
    const params = new URLSearchParams({
      framework: mappedFramework,
      usuario_id: userId || '',
      token: accessToken || '',
      mode: 'free',
    });
    ideWindow.location.href = `${ideBase}?${params.toString()}`;
  }
}

// ─── TrackCard ────────────────────────────────────────────────────────────────

function TrackCard({
  track, onStart, loading,
}: {
  track: Track; onStart: (fw: string) => void; loading: boolean;
}) {
  const { isDark } = useThemeContext();
  
  const cardBg = isDark 
    ? 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-[#2a2a4a] hover:border-[#00ff88]/50 hover:shadow-[0_8px_32px_rgba(0,255,136,0.15)]' 
    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-[#00cc88] hover:shadow-[0_8px_32px_rgba(0,204,136,0.1)]';
    
  const titleCol = isDark ? 'text-white' : 'text-gray-900';
  const descCol = isDark ? 'text-gray-400' : 'text-gray-600';
  const timeCol = isDark ? 'text-gray-500' : 'text-gray-500';
  const tagBg = isDark 
    ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20' 
    : 'bg-[#00cc88]/10 text-[#00cc88] border border-[#00cc88]/20';
  const lockStyle = isDark 
    ? 'border-gray-700 text-gray-500 bg-gray-800/60' 
    : 'border-gray-300 text-gray-400 bg-gray-100';

  return (
    <div className={`relative overflow-hidden border rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-1 flex flex-col ${cardBg}`}>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#00ff88]/5 to-transparent rounded-full blur-2xl" />
      
      <h3 className={`text-xl font-bold mb-3 ${titleCol}`}>{track.title}</h3>
      <p className={`text-sm leading-relaxed mb-4 flex-1 ${descCol}`}>{track.description}</p>

      <div className={`flex items-center gap-1.5 text-sm mb-4 ${timeCol}`}>
        <ClockIcon />
        <span className="ml-0.5">{track.duration}</span>
      </div>

      {track.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {track.tags.map((tag) => (
            <span key={tag} className={`text-xs px-3 py-1 rounded-full font-medium ${tagBg}`}>{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2">
        {track.locked ? (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${lockStyle}`}>
            <LockIcon />
          </div>
        ) : (
          <button
            onClick={() => onStart(track.framework)}
            disabled={loading}
            className="group relative bg-gradient-to-r from-[#00ff88] to-[#00cc88] hover:from-[#00ee77] hover:to-[#00bb77] text-black px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-[0_0_25px_rgba(0,255,136,0.5)] disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando...
                </>
              ) : (
                <>
                  <StarIcon />
                  Practicar Entrevista
                </>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PracticeBar ──────────────────────────────────────────────────────────────

function PracticeBar({
  item, onStart,
}: {
  item: PracticeProgress; onStart: (fw: string) => void;
}) {
  const { isDark } = useThemeContext();
  
  const cardBg = isDark 
    ? 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-[#2a2a4a] hover:border-[#00ff88]/30' 
    : 'bg-white border-gray-200 hover:border-[#00cc88]/50';
  const labelCol = isDark ? 'text-white' : 'text-gray-900';
  const iconBg = isDark 
    ? 'bg-gradient-to-br from-[#00ff88]/20 to-[#00cc88]/20 text-[#00ff88]' 
    : 'bg-gradient-to-br from-[#00cc88]/10 to-[#00aa66]/10 text-[#00cc88]';
  const trackBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const pctCol = isDark ? 'text-[#00ff88]' : 'text-[#00cc88]';

  return (
    <button
      onClick={() => onStart(item.framework)}
      className={`w-full text-left border rounded-xl p-4 transition-all duration-200 transform hover:scale-[1.02] ${cardBg}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${iconBg}`}>
          {item.icon}
        </div>
        <span className={`font-semibold text-sm ${labelCol}`}>{item.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex-1 h-2 rounded-full overflow-hidden ${trackBg}`}>
          <div
            className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc88] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,255,136,0.5)]"
            style={{ width: `${item.percent}%` }}
          />
        </div>
        <span className={`text-xs font-bold min-w-[32px] text-right ${pctCol}`}>
          {item.percent}%
        </span>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{item.sesiones_completadas} completadas</span>
        <span>{item.total_sesiones} totales</span>
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DevelopmentTracks() {
  const { user } = useAuth();
  const { isDark, themeClasses } = useThemeContext();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [progresoData, setProgresoData] = useState<Record<string, { sesiones_completadas: number; total_sesiones: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Cargar tecnologías y progreso desde el backend ──────────────────────

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Cargar todas las tecnologías
        const data = await getTecnologias();
        setTecnologias(data);
        
        // 2. Cargar progreso del usuario desde el endpoint /progreso
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && user?.id) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api/v1'}/progreso`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.tecnologias) {
              // Crear un mapa de progreso por slug de tecnología
              const progressMap: Record<string, { sesiones_completadas: number; total_sesiones: number }> = {};
              result.data.tecnologias.forEach((tech: any) => {
                progressMap[tech.slug] = {
                  sesiones_completadas: tech.sesiones_completadas || 0,
                  total_sesiones: tech.total_sesiones || 0
                };
              });
              setProgresoData(progressMap);
            }
          }
        }
        
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [user?.id]);

  // ─── Construir tracks desde las tecnologías ────────────────────────────────

  const tracks: Track[] = tecnologias.map((tech) => ({
    id: `track-${tech.id}`,
    title: tech.nombre,
    description: `Practica entrevistas técnicas para ${tech.nombre}. Mejora tus habilidades y preparación.`,
    duration: '30 mins',
    tags: [tech.tipo || 'General'],
    locked: false,
    framework: tech.slug.toLowerCase(),
    tecnologia_id: tech.id,
  }));

  // ─── Construir práctica progresiva (SOLO tecnologías con progreso > 0) ─────

  const icons: Record<string, string> = {
    'vue': '◈',
    'vuejs': '◈',
    'next': '▲',
    'nextjs': '▲',
    'react': '⚛',
    'reactjs': '⚛',
    'node': '⬢',
    'nodejs': '⬢',
    'angular': '🅰',
    'typescript': 'TS',
    'javascript': 'JS',
    'python': '🐍',
    'postgresql': '🐘',
    'default': '◆',
  };

  // ✅ FILTRO: Solo tecnologías con progreso > 0
  const practiceProgress: PracticeProgress[] = tecnologias
    .filter((tech) => {
      const slugLower = tech.slug.toLowerCase();
      const progress = progresoData[slugLower];
      // Solo incluir si tiene sesiones completadas > 0
      return progress && progress.sesiones_completadas > 0;
    })
    .map((tech) => {
      const slugLower = tech.slug.toLowerCase();
      const icon = icons[slugLower] || icons['default'];
      const progress = progresoData[slugLower] || { sesiones_completadas: 0, total_sesiones: 0 };
      
      // Calcular porcentaje real
      const percent = progress.total_sesiones > 0 
        ? Math.round((progress.sesiones_completadas / progress.total_sesiones) * 100)
        : 0;
      
      return {
        id: `practice-${tech.id}`,
        label: tech.nombre,
        icon: icon,
        percent: percent,
        framework: slugLower,
        tecnologia_id: tech.id,
        sesiones_completadas: progress.sesiones_completadas,
        total_sesiones: progress.total_sesiones,
      };
    });

  // ─── Manejar inicio de práctica ────────────────────────────────────────────

  const handleStart = async (framework: string, key: string) => {
    setLoadingId(key);
    try {
      const accessToken = localStorage.getItem('accessToken');
      await openIDE(framework, user?.id, accessToken);
    } finally {
      setLoadingId(null);
    }
  };

  // ─── Estados de carga y error ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#00ff88] rounded-full animate-spin mx-auto mb-4" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Cargando tecnologías...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">😅</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Error al cargar las tecnologías
          </h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00ee77] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (tecnologias.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No hay tecnologías disponibles
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Contacta al administrador para agregar tecnologías.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-12">
      {/* Interview type cards grid - TODAS las tecnologías */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onStart={(fw) => handleStart(fw, track.id)}
            loading={loadingId === track.id}
          />
        ))}
      </div>

      {/* Continue Practicing section - SOLO tecnologías con progreso */}
      {practiceProgress.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-bold mb-2 ${themeClasses.textPrimary}`}>
                Continúa Practicando
              </h3>
              <p className={`text-sm ${themeClasses.textMuted}`}>
                Retoma tu práctica donde la dejaste
              </p>
            </div>
            <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              {practiceProgress.length} activos
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {practiceProgress.map((item) => (
              <PracticeBar
                key={item.id}
                item={item}
                onStart={(fw) => handleStart(fw, item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mensaje cuando no hay progreso */}
      {practiceProgress.length === 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-xl font-bold mb-2 ${themeClasses.textPrimary}`}>
                Continúa Practicando
              </h3>
              <p className={`text-sm ${themeClasses.textMuted}`}>
                Retoma tu práctica donde la dejaste
              </p>
            </div>
          </div>
          <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-sm font-medium">Aún no has comenzado ninguna práctica</p>
            <p className="text-xs mt-1">Selecciona una tecnología arriba para comenzar tu primera entrevista</p>
          </div>
        </section>
      )}
    </div>
  );
}