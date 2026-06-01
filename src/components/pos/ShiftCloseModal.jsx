import { useState } from 'react'
import { LogOut, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

export default function ShiftCloseModal({ shift, onClose, onCancel, loading }) {
  const [raw, setRaw] = useState('')
  const [step, setStep] = useState('input') // 'input' | 'confirm'

  const actualCash = parseInt(raw.replace(/\D/g, ''), 10) || 0
  const expectedCash = shift?.expected_cash || 0
  const variance = actualCash - expectedCash

  const handleInput = (e) => {
    setRaw(e.target.value.replace(/\D/g, ''))
  }

  const handleNext = (e) => {
    e.preventDefault()
    if (actualCash <= 0) return
    setStep('confirm')
  }

  const VarianceIcon = variance > 0 ? TrendingUp : variance < 0 ? TrendingDown : Minus
  const varianceColor = variance > 0 ? 'text-green-600' : variance < 0 ? 'text-brand-danger' : 'text-slate-500'
  const varianceBg = variance > 0 ? 'bg-green-50' : variance < 0 ? 'bg-red-50' : 'bg-slate-50'

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6">
          {step === 'input' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <LogOut className="text-brand-danger" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Tutup Shift</h2>
                    <p className="text-slate-500 text-sm">Hitung uang di laci kasir</p>
                  </div>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Uang Sistem (Expected)</span>
                  <span className="font-bold text-slate-900">{formatRupiah(expectedCash)}</span>
                </div>
              </div>

              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Uang Fisik di Laci (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''}
                    onChange={handleInput}
                    placeholder="0"
                    autoFocus
                    className="w-full border-2 border-slate-200 focus:border-brand-danger rounded-xl px-4 py-3 text-xl font-bold focus:outline-none transition-colors"
                  />
                  {actualCash > 0 && (
                    <p className="text-slate-500 text-sm mt-1">{formatRupiah(actualCash)}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={actualCash <= 0}
                  className="w-full touch-target bg-brand-danger text-white font-bold rounded-xl py-3 active:scale-95 transition-all disabled:opacity-40"
                >
                  Lihat Ringkasan →
                </button>
              </form>
            </>
          )}

          {step === 'confirm' && (
            <>
              <h2 className="font-bold text-slate-900 mb-4">Ringkasan Shift</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Modal Awal</span>
                  <span className="font-medium">{formatRupiah(shift.initial_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Uang Sistem</span>
                  <span className="font-medium">{formatRupiah(expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Uang Fisik</span>
                  <span className="font-medium">{formatRupiah(actualCash)}</span>
                </div>
                <hr />
                <div className={`flex justify-between items-center rounded-xl p-3 ${varianceBg}`}>
                  <span className="text-sm font-semibold text-slate-700">Selisih</span>
                  <div className={`flex items-center gap-1 font-bold ${varianceColor}`}>
                    <VarianceIcon size={16} />
                    {variance >= 0 ? '+' : ''}{formatRupiah(variance)}
                  </div>
                </div>
              </div>

              {variance < 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                  <p className="text-brand-danger text-sm font-medium">
                    ⚠️ Uang kurang {formatRupiah(Math.abs(variance))}. Pastikan sudah dihitung dengan benar.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 touch-target border-2 border-slate-200 text-slate-700 font-semibold rounded-xl py-3 active:scale-95 transition-all"
                >
                  ← Koreksi
                </button>
                <button
                  onClick={() => onClose(actualCash, expectedCash)}
                  disabled={loading}
                  className="flex-1 touch-target bg-brand-danger text-white font-bold rounded-xl py-3 active:scale-95 transition-all disabled:opacity-40"
                >
                  {loading ? 'Menutup...' : 'Tutup Shift'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
