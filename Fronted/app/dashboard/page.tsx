'use client'

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { 
    user, 
    logout, 
    linkGithubToCurrentUser, 
    linkGoogleToCurrentUser,
  } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [linkingError, setLinkingError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  const providers = user?.providers ?? [];
  const hasGoogle = providers.includes("google.com");
  const hasGithub = providers.includes("github.com");
  const hasPassword = providers.includes("password");

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleNavigateToIDE = () => {
    router.push('/tasks');
  };

  const handleNavigateToProfile = () => {
    router.push('/profile');
  };

  const handleLinkGithub = async () => {
    setLinkingError('');
    setLinkingSuccess('');
    try {
      await linkGithubToCurrentUser();
      setLinkingSuccess('✅ GitHub vinculado correctamente');
      setTimeout(() => setLinkingSuccess(''), 3000);
    } catch (error: any) {
      setLinkingError(error.message);
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
    } catch (error: any) {
      setLinkingError(error.message);
      setTimeout(() => setLinkingError(''), 3000);
    }
  };

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'Usuario';
  const displayEmail = user.email || '';

  const developmentTracks = [
    {
      title: "React Fundamentals",
      level: "Intermediate",
      duration: "12 hours",
      progress: 65,
      color: "bg-blue-600"
    },
    {
      title: "Next.js Optimization",
      level: "Advanced",
      duration: "8 hours",
      progress: 92,
      color: "bg-green-600"
    },
    {
      title: "Backend Architecture",
      level: "Professional",
      duration: "24 hours",
      progress: 0,
      color: "bg-purple-600",
      isNew: true
    }
  ];

  const recentInsights = [
    "React 19 Performance Optimization",
    "TypeScript Best Practices 2024",
    "Modern CSS Grid Layouts",
    "API Design Patterns"
  ];

  const navItems = ['Dashboard', 'Tasks', 'Insights', 'Docs'];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-[#00ff00]">DEV_STREAM</h1>
            <div className="flex space-x-6">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveTab(item)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === item
                      ? 'text-[#00ff00] border-b-2 border-[#00ff00]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/ide')}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-4 py-1.5 rounded text-sm font-bold transition-colors"
            >
              Iniciar prueba
            </button>

            {/* ✅ NUEVO: Botón de perfil con inicial + nombre */}
            <button
              onClick={handleNavigateToProfile}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[#00ff00] px-3 py-1.5 rounded-lg transition-all duration-200 group"
            >
              {/* Avatar con inicial */}
              <div className="w-7 h-7 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Nombre del usuario */}
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors max-w-[120px] truncate">
                {displayName}
              </span>
              {/* Chevron icon */}
              <svg className="w-3 h-3 text-gray-500 group-hover:text-[#00ff00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Mission Control</h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Accelerate your development journey with curated tracks designed by industry experts.
              Master modern technologies and architectural patterns through hands-on projects.
            </p>
          </div>

          {linkingSuccess && (
            <div className="mb-6 bg-green-900/50 border border-green-600 rounded-lg p-3 text-green-300 text-sm">
              {linkingSuccess}
            </div>
          )}
          {linkingError && (
            <div className="mb-6 bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
              {linkingError}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Development Tracks</h2>
            <div className="grid gap-6">
              {developmentTracks.map((track, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-[#00ff00] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{track.title}</h3>
                        {track.isNew && (
                          <span className="bg-[#00ff00] text-black px-2 py-1 rounded text-xs font-bold">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                        <span className={`px-2 py-1 rounded ${track.color} text-white`}>
                          {track.level}
                        </span>
                        <span>{track.duration}</span>
                      </div>
                      {track.progress > 0 ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-[#00ff00] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${track.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{track.progress}%</span>
                        </div>
                      ) : (
                        <button className="bg-[#00ff00] hover:bg-[#00cc00] text-black px-6 py-2 rounded-lg font-semibold transition-colors">
                          Initialize Track
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-900/50 p-6 border-l border-gray-800">

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{displayName}</h3>
                {displayEmail && (
                  <p className="text-gray-400 text-xs truncate max-w-[160px]">{displayEmail}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tracks Completed</span>
                <span className="text-[#00ff00] font-semibold">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hours Learned</span>
                <span className="text-[#00ff00] font-semibold">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Streak</span>
                <span className="text-[#00ff00] font-semibold">12 days</span>
              </div>
            </div>
             <button
              onClick={() => router.push('/ide')}
              className="bg-[#00ff00] hover:bg-[#00dd00] text-black px-4 py-1.5 rounded text-sm font-bold transition-colors"
            >
              Iniciar prueba
            </button>
            {/* ✅ Botón rápido para ir al perfil */}
            <button
              onClick={handleNavigateToProfile}
              className="mt-4 w-full text-center text-xs text-[#00ff00] hover:text-green-400 transition-colors underline underline-offset-2"
            >
              Ver y editar perfil →
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-4">Link Accounts</h3>
            <div className="space-y-3">
              {hasPassword && !hasGoogle && (
                <button
                  onClick={handleLinkGoogle}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Vincular con Google
                </button>
              )}
              {hasPassword && !hasGithub && (
                <button
                  onClick={handleLinkGithub}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Vincular con GitHub
                </button>
              )}
              {hasGoogle && !hasGithub && (
                <button
                  onClick={handleLinkGithub}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Vincular GitHub
                </button>
              )}
              {hasGithub && !hasGoogle && (
                <button
                  onClick={handleLinkGoogle}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Vincular Google
                </button>
              )}
              {hasGoogle && hasGithub && (
                <p className="text-gray-500 text-sm text-center py-2">
                  ✅ Todas las cuentas vinculadas
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-4">Recent Insights</h3>
            <div className="space-y-3">
              {recentInsights.map((insight, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#00ff00] rounded-full"></div>
                  <span className="text-gray-300 text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Global Ranking</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500 font-bold">#1</span>
                  <span className="text-gray-300 text-sm">Sarah Chen</span>
                </div>
                <span className="text-[#00ff00] text-sm font-semibold">2,847 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 font-bold">#2</span>
                  <span className="text-gray-300 text-sm">Mike Johnson</span>
                </div>
                <span className="text-[#00ff00] text-sm font-semibold">2,691 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500 font-bold">#3</span>
                  <span className="text-gray-300 text-sm">David Kim</span>
                </div>
                <span className="text-[#00ff00] text-sm font-semibold">2,534 pts</span>
              </div>
              <div className="border-t border-gray-700 pt-2 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#00ff00] font-bold">#12</span>
                    <span className="text-white text-sm font-semibold">You</span>
                  </div>
                  <span className="text-[#00ff00] text-sm font-semibold">1,956 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}