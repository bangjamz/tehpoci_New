import { useState } from 'react'
import { X, Banknote, QrCode } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000, 200000]

function getQuickCash(total) {
  const rounds = QUICK_AMOUNTS.filter(a => a >= total)
  if (rounds.length >= 4) return rounds.slice(0, 4)
  // pad with multiples of 50k above total
  const extras = [50000, 100000, 200000, 500000].filter(a => a >= total && !rounds.includes(a))
  return [...rounds, ...extras].slice(0, 4)
}

export default function CheckoutModal({ total, cart, onConfirm, onClose, loading }) {
  const [method, setMethod] = useState('CASH')
  const [rawCash, setRawCash] = useState('')
  const quickCash = getQuickCash(total)

  const cashPaid = parseInt(rawCash.replace(/\D/g, ''), 10) || 0
  const change = cashPaid - total
  const isValidCash = method === 'QRIS' || cashPaid >= total

  const handleCashInput = (e) => setRawCash(e.target.value.replace(/\D/g, ''))

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 text-lg">Pembayaran</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          {/* Total */}
          <div className="bg-brand-light rounded-2xl p-4 mb-5 text-center">
            <p className="text-slate-500 text-sm">Total Tagihan</p>
            <p className="text-3xl font-black text-brand-green mt-1">{formatRupiah(total)}</p>
          </div>

          {/* Metode Bayar */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setMethod('CASH')}
              className={`touch-target flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${method === 'CASH' ? 'border-brand-green bg-brand-light text-brand-green' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Banknote size={22} />
              Tunai
            </button>
            <button
              onClick={() => setMethod('QRIS')}
              className={`touch-target flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${method === 'QRIS' ? 'border-brand-green bg-brand-light text-brand-green' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <QrCode size={22} />
              QRIS
            </button>
          </div>

          {/* Input Tunai */}
          {method === 'CASH' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">Uang Diterima (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={rawCash ? parseInt(rawCash, 10).toLocaleString('id-ID') : ''}
                onChange={handleCashInput}
                placeholder="0"
                autoFocus
                className="w-full border-2 border-slate-200 focus:border-brand-green rounded-xl px-4 py-3 text-xl font-bold focus:outline-none transition-colors"
              />
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {quickCash.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setRawCash(String(a))}
                    className={`text-[11px] font-semibold border-2 rounded-xl py-2 active:scale-95 transition-all
                      ${rawCash === String(a)
                        ? 'border-brand-green bg-brand-light text-brand-green'
                        : 'border-slate-200 hover:border-brand-green hover:text-brand-green'
                      }`}
                  >
                    {formatRupiah(a)}
                  </button>
                ))}
              </div>

              {cashPaid >= total && (
                <div className="mt-3 bg-green-50 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-600 text-sm font-medium">Kembalian</span>
                  <span className="text-green-700 font-bold">{formatRupiah(change)}</span>
                </div>
              )}
              {cashPaid > 0 && cashPaid < total && (
                <p className="text-brand-danger text-sm mt-2">
                  Kurang {formatRupiah(total - cashPaid)}
                </p>
              )}
            </div>
          )}

          {method === 'QRIS' && (
            <div className="mb-5 bg-slate-50 rounded-xl p-4 text-center">
              <QrCode size={64} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500 text-sm">Arahkan kamera ke QRIS kasir</p>
              <p className="text-brand-green font-bold mt-1">{formatRupiah(total)}</p>
            </div>
          )}

          <button
            onClick={() => onConfirm({ method, cashPaid: method === 'CASH' ? cashPaid : total, change: method === 'CASH' ? change : 0 })}
            disabled={!isValidCash || loading}
            className="w-full touch-target bg-brand-green text-white font-bold rounded-xl py-3.5 active:scale-95 transition-all disabled:opacity-40 text-base"
          >
            {loading ? 'Memproses...' : `Konfirmasi ${method === 'QRIS' ? 'QRIS' : 'Pembayaran'}`}
          </button>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
