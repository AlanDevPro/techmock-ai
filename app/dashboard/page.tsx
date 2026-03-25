'use client'

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (!user) return null;

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
            <div className="text-sm text-gray-400">
              {user.displayName || user.email}
            </div>
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
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Mission Control</h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Accelerate your development journey with curated tracks designed by industry experts.
              Master modern technologies and architectural patterns through hands-on projects.
            </p>
          </div>

          {/* Development Tracks */}
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

                      {/* Progress Bar */}
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
          {/* Profile Card */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {user.displayName || 'Alex Rivers'}
                </h3>
                <p className="text-gray-400 text-sm">Full Stack Developer</p>
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
          </div>

          {/* Recent Insights */}
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

          {/* Global Ranking */}
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