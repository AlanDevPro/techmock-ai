// components/dashboard/user/GlobalRanking.tsx
const topRanking = [
  { position: '#1', name: 'Sarah Chen', points: '2,847', color: 'text-yellow-500' },
  { position: '#2', name: 'Mike Johnson', points: '2,691', color: 'text-gray-400' },
  { position: '#3', name: 'David Kim', points: '2,534', color: 'text-orange-500' },
];

// En el futuro esto vendrá de tu tabla estadisticas_usuario
const myRanking = { position: '#12', points: '1,956' };

export default function GlobalRanking() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-4">Global Ranking</h3>
      <div className="space-y-3">
        {topRanking.map((entry) => (
          <div key={entry.position} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`${entry.color} font-bold`}>{entry.position}</span>
              <span className="text-gray-300 text-sm">{entry.name}</span>
            </div>
            <span className="text-[#00ff00] text-sm font-semibold">{entry.points} pts</span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-2 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff00] font-bold">{myRanking.position}</span>
              <span className="text-white text-sm font-semibold">Tú</span>
            </div>
            <span className="text-[#00ff00] text-sm font-semibold">{myRanking.points} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}