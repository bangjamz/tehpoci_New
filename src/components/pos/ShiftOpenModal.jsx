import { useState } from 'react'
import { DollarSign, LogOut } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

const QUICK_AMOUNTS = [100000, 200000, 300000, 500000]

export default function ShiftOpenModal({ onOpen, onLogout, loading }) {
  const [raw, setRaw] = useState('')

  const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0

  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    setRaw(digits)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (amount <= 0) return
    onOpen(amount)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center">
              <DollarSign className="text-brand-green" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Buka Shift</h2>
              <p className="text-slate-500 text-sm">Masukkan uang awal di laci kasir</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Modal Awal (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''}
                onChange={handleInput}
                placeholder="0"
                autoFocus
                className="w-full border-2 border-slate-200 focus:border-brand-green rounded-xl px-4 py-3 text-xl font-bold text-slate-900 focus:outline-none transition-colors"
              />
              {amount > 0 && (
                <p className="text-brand-green text-sm mt-1 font-medium">
                  {formatRupiah(amount)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setRaw(String(a))}
                  className="text-xs font-medium border border-slate-200 rounded-lg py-2 hover:border-brand-green hover:text-brand-green active:scale-95 transition-all"
                >
                  {formatRupiah(a).replace('Rp ', 'Rp')}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={amount <= 0 || loading}
              className="w-full touch-target bg-brand-green text-white font-bold rounded-xl py-3 active:scale-95 transition-all disabled:opacity-40"
            >
              {loading ? 'Membuka Shift...' : 'Buka Shift →'}
            </button>
          </form>

          <button
            onClick={onLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 text-slate-400 text-sm py-2 hover:text-brand-danger transition-colors active:scale-95"
          >
            <LogOut size={15} />
            Selesai Kerja / Keluar
          </button>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
