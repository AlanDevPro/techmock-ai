// components/dashboard/user/RecentInsights.tsx
const insights = [
  'React 19 Performance Optimization',
  'TypeScript Best Practices 2024',
  'Modern CSS Grid Layouts',
  'API Design Patterns',
];

export default function RecentInsights() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
      <h3 className="text-white font-semibold mb-4">Recent Insights</h3>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-[#00ff00] rounded-full" />
            <span className="text-gray-300 text-sm">{insight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}