import { formatRupiah } from '../../utils/currency'

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function RevenueChart({ transactions }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const revenue = days.map(d => {
    const next = new Date(d); next.setDate(next.getDate() + 1)
    return transactions
      .filter(t => {
        const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(0)
        return ts >= d && ts < next
      })
      .reduce((sum, t) => sum + (t.total_amount || 0), 0)
  })

  const max = Math.max(...revenue, 1)
  const todayIdx = 6

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-700 mb-4 text-sm">Penjualan 7 Hari Terakhir</h3>
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {days.map((d, i) => {
          const pct = Math.max((revenue[i] / max) * 100, 3)
          const isToday = i === todayIdx
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                <div
                  title={formatRupiah(revenue[i])}
                  className={`w-full rounded-t-md transition-all ${isToday ? 'bg-brand-green' : 'bg-slate-200'}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold leading-none ${isToday ? 'text-brand-green' : 'text-slate-400'}`}>
                {DAY_NAMES[d.getDay()]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-slate-50">
        <span className="text-xs text-slate-400">Total minggu ini</span>
        <span className="text-xs font-bold text-brand-green">
          {formatRupiah(revenue.reduce((a, b) => a + b, 0))}
        </span>
      </div>
    </div>
  )
}
