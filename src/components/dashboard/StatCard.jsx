export default function StatCard({ label, value, sub, icon: Icon, color = 'green' }) {
  const colors = {
    green: 'bg-brand-light text-brand-green',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-brand-danger',
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}
