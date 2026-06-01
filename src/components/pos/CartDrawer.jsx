import { useState } from 'react'
import { ShoppingCart, ChevronUp, ChevronDown, Trash2, Plus, Minus, X } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { formatRupiah } from '../../utils/currency'

export default function CartDrawer({ onCheckout, isOnline }) {
  const [expanded, setExpanded] = useState(false)
  const { cart, updateQty, removeFromCart, clearCart, getCartTotal, getCartCount } = usePosStore()

  const total = getCartTotal()
  const count = getCartCount()

  if (count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      {/* Expanded Cart Panel */}
      {expanded && (
        <div className="bg-white border-t border-slate-200 shadow-2xl flex flex-col" style={{ maxHeight: '65vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <span className="font-bold text-slate-800 text-base">Pesanan ({count} item)</span>
            <button
              onClick={() => { clearCart(); setExpanded(false) }}
              className="flex items-center gap-1.5 text-brand-danger text-sm font-semibold py-1 px-2 rounded-lg active:bg-red-50"
            >
              <Trash2 size={14} />
              Hapus Semua
            </button>
          </div>

          {/* Item List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {cart.map(item => (
              <div key={item.itemId} className="flex items-center gap-3 px-4 py-3">
                {/* Name + price */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatRupiah(item.price)} / pcs</p>
                </div>

                {/* Qty controls — big touch targets */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(item.itemId, item.qty - 1)}
                    className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center active:bg-red-50 active:border-brand-danger active:text-brand-danger transition-colors"
                  >
                    {item.qty === 1 ? <X size={14} className="text-slate-400" /> : <Minus size={15} className="text-slate-600" />}
                  </button>
                  <span className="w-8 text-center font-bold text-base text-slate-900">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.itemId, item.qty + 1)}
                    className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center active:opacity-80 transition-opacity shadow-sm"
                  >
                    <Plus size={15} className="text-white" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-bold text-slate-900">{formatRupiah(item.price * item.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm font-medium">Total</span>
              <span className="text-xl font-black text-slate-900">{formatRupiah(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="bg-brand-green px-4 py-3 flex items-center gap-3">
        {/* Toggle + item count */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-white py-1 pr-2"
        >
          <div className="relative">
            <ShoppingCart size={24} className="text-brand-yellow" />
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-brand-yellow text-brand-green text-[10px] font-black rounded-full flex items-center justify-center px-1">
              {count}
            </span>
          </div>
          {expanded
            ? <ChevronDown size={18} className="text-green-300" />
            : <ChevronUp size={18} className="text-green-300" />
          }
        </button>

        {/* Total */}
        <div className="flex-1">
          <p className="text-green-300 text-[11px]">{count} item · Tap untuk lihat</p>
          <p className="text-white font-black text-xl leading-tight">{formatRupiah(total)}</p>
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={!isOnline}
          className="bg-brand-yellow text-brand-green font-black px-6 py-3 rounded-2xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg"
        >
          {isOnline ? 'Bayar →' : 'Offline'}
        </button>
      </div>
    </div>
  )
}
