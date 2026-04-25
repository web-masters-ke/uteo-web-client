interface Props { icon: React.ReactNode; label: string; value: string | number; trend?: { value: number; isPositive: boolean }; className?: string; }
export default function StatsCard({ icon, label, value, trend, className = '' }: Props) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between"><div className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">{icon}</div>{trend && <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>{trend.isPositive ? '+' : ''}{trend.value}%</span>}</div>
      <div className="mt-4"><p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p></div>
    </div>
  );
}
