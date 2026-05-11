// components/dashboard/user/DevelopmentTracks.tsx
'use client'

const tracks = [
  {
    title: 'React Fundamentals',
    level: 'Intermediate',
    duration: '12 hours',
    progress: 65,
    color: 'bg-blue-600',
  },
  {
    title: 'Next.js Optimization',
    level: 'Advanced',
    duration: '8 hours',
    progress: 92,
    color: 'bg-green-600',
  },
  {
    title: 'Backend Architecture',
    level: 'Professional',
    duration: '24 hours',
    progress: 0,
    color: 'bg-purple-600',
    isNew: true,
  },
];

export default function DevelopmentTracks() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">Development Tracks</h2>
      <div className="grid gap-6">
        {tracks.map((track, index) => (
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
  );
}