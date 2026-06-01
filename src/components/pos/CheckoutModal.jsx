import { useState } from 'react'
import { X, Banknote, QrCode, Smartphone, Building2 } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000, 200000]

function getQuickCash(total) {
  const rounds = QUICK_AMOUNTS.filter(a => a >= total)
  if (rounds.length >= 4) return rounds.slice(0, 4)
  const extras = [50000, 100000, 200000, 500000].filter(a => a >= total && !rounds.includes(a))
  return [...rounds, ...extras].slice(0, 4)
}

const PAYMENT_METHODS = [
  { id: 'CASH',     label: 'Tunai',    icon: Banknote,   color: 'green' },
  { id: 'QRIS',     label: 'QRIS',     icon: QrCode,     color: 'blue' },
  { id: 'GOPAY',    label: 'GoPay',    icon: Smartphone, color: 'green' },
  { id: 'OVO',      label: 'OVO',      icon: Smartphone, color: 'purple' },
  { id: 'DANA',     label: 'Dana',     icon: Smartphone, color: 'blue' },
  { id: 'TRANSFER', label: 'Transfer', icon: Building2,  color: 'slate' },
]

const NON_CASH_LABEL = {
  QRIS: 'Arahkan kamera ke QRIS kasir',
  GOPAY: 'Minta pelanggan transfer via GoPay',
  OVO: 'Minta pelanggan transfer via OVO',
  DANA: 'Minta pelanggan transfer via Dana',
  TRANSFER: 'Transfer ke rekening toko',
}

export default function CheckoutModal({ total, cart, onConfirm, onClose, loading }) {
  const [method, setMethod] = useState('CASH')
  const [rawCash, setRawCash] = useState('')

  const cashPaid = parseInt(rawCash.replace(/\D/g, ''), 10) || 0
  const change = cashPaid - total
  const isCash = method === 'CASH'
  const isValidCash = !isCash || cashPaid >= total

  const handleCashInput = (e) => setRawCash(e.target.value.replace(/\D/g, ''))
  const quickCash = getQuickCash(total)

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-lg">Pembayaran</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          {/* Total */}
          <div className="bg-brand-light rounded-2xl p-4 mb-4 text-center">
            <p className="text-slate-500 text-sm">Total Tagihan</p>
            <p className="text-3xl font-black text-brand-green mt-1">{formatRupiah(total)}</p>
          </div>

          {/* Metode pembayaran — scrollable grid */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Metode Bayar</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setMethod(id); setRawCash('') }}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition-all active:scale-95
                  ${method === id
                    ? 'border-brand-green bg-brand-light text-brand-green'
                    : 'border-slate-100 text-slate-500 hover:border-slate-200 bg-white'
                  }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>

          {/* Input Tunai */}
          {isCash && (
            <div className="mb-4">
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
                  <span className="text-green-700 font-bold text-base">{formatRupiah(change)}</span>
                </div>
              )}
              {cashPaid > 0 && cashPaid < total && (
                <p className="text-brand-danger text-sm mt-2 font-medium">
                  Kurang {formatRupiah(total - cashPaid)}
                </p>
              )}
            </div>
          )}

          {/* Non-tunai info */}
          {!isCash && (
            <div className="mb-4 bg-slate-50 rounded-xl p-4 text-center">
              {method === 'QRIS' && <QrCode size={56} className="mx-auto text-slate-300 mb-2" />}
              {method !== 'QRIS' && <Smartphone size={40} className="mx-auto text-slate-300 mb-2" />}
              <p className="text-slate-500 text-sm">{NON_CASH_LABEL[method]}</p>
              <p className="text-brand-green font-black text-xl mt-1">{formatRupiah(total)}</p>
            </div>
          )}

          <button
            onClick={() => onConfirm({
              method,
              cashPaid: isCash ? cashPaid : total,
              change: isCash ? change : 0,
            })}
            disabled={!isValidCash || loading}
            className="w-full bg-brand-green text-white font-bold rounded-xl py-3.5 active:scale-95 transition-all disabled:opacity-40 text-base"
          >
            {loading ? 'Memproses...' : `Konfirmasi ${PAYMENT_METHODS.find(m => m.id === method)?.label}`}
          </button>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
