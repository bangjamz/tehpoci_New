import { useState } from 'react'
import { ShoppingCart, ChevronUp, ChevronDown, Trash2, Plus, Minus } from 'lucide-react'
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
      {/* Expanded Cart */}
      {expanded && (
        <div className="bg-white border-t border-slate-100 shadow-2xl max-h-[60vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-700">Pesanan ({count} item)</span>
            <button
              onClick={() => clearCart()}
              className="flex items-center gap-1 text-brand-danger text-sm font-medium"
            >
              <Trash2 size={14} />
              Hapus Semua
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {cart.map(item => (
              <div key={item.itemId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-sm text-brand-green font-semibold">{formatRupiah(item.price)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQty(item.itemId, item.qty - 1)}
                    className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-brand-danger hover:text-brand-danger active:scale-90 transition-all"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.itemId, item.qty + 1)}
                    className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-brand-green hover:text-brand-green active:scale-90 transition-all"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-bold text-slate-900">
                    {formatRupiah(item.price * item.qty)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="bg-brand-green px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-white"
        >
          <div className="relative">
            <ShoppingCart size={22} className="text-brand-yellow" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-yellow text-brand-green text-[9px] font-black rounded-full flex items-center justify-center">
              {count}
            </span>
          </div>
          {expanded ? <ChevronDown size={16} className="text-green-200" /> : <ChevronUp size={16} className="text-green-200" />}
        </button>

        <div className="flex-1">
          <p className="text-green-200 text-xs">{count} item</p>
          <p className="text-white font-bold text-lg leading-none">{formatRupiah(total)}</p>
        </div>

        <button
          onClick={onCheckout}
          disabled={!isOnline}
          className="bg-brand-yellow text-brand-green font-bold px-5 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isOnline ? 'Bayar →' : 'Offline'}
        </button>
      </div>
    </div>
  )
}
