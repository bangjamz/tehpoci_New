import { X, Plus, Minus } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

export default function VariantModal({ product, cart, onAdd, onUpdateQty, onClose }) {
  if (!product) return null

  const variants = product.variants?.filter(v => v.is_active !== false) || []

  const getCartItem = (variantId) => {
    const itemId = `${product.id}_${variantId}`
    return cart.find(i => i.itemId === itemId)
  }

  const totalQty = variants.reduce((sum, v) => {
    return sum + (getCartItem(v.id)?.qty || 0)
  }, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl shadow-2xl">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {totalQty > 0 ? `${totalQty} item dipilih` : 'Pilih ukuran / varian'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          {/* Variant rows */}
          <div className="space-y-2.5">
            {variants.map(variant => {
              const item = getCartItem(variant.id)
              const qty = item?.qty || 0
              const hasItem = qty > 0

              return (
                <div
                  key={variant.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                    hasItem
                      ? 'border-brand-green bg-green-50'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <div>
                    <p className={`font-semibold text-base ${hasItem ? 'text-brand-green' : 'text-slate-800'}`}>
                      {variant.name}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">{formatRupiah(variant.price)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasItem ? (
                      <>
                        <button
                          onClick={() => onUpdateQty(item.itemId, qty - 1)}
                          className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center active:bg-red-50 active:border-brand-danger transition-colors"
                        >
                          <Minus size={16} className="text-slate-600" />
                        </button>
                        <span className="w-8 text-center font-black text-lg text-slate-900">{qty}</span>
                        <button
                          onClick={() => onAdd(product, variant)}
                          className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center active:opacity-80 shadow-sm"
                        >
                          <Plus size={16} className="text-white" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onAdd(product, variant)}
                        className="flex items-center gap-1.5 bg-brand-green text-white font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm text-sm"
                      >
                        <Plus size={15} />
                        Tambah
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Done button — only shows when something is in cart */}
          <div className="mt-4">
            {totalQty > 0 ? (
              <button
                onClick={onClose}
                className="w-full bg-brand-green text-white font-black py-3.5 rounded-2xl active:scale-95 transition-all text-base shadow"
              >
                Selesai · {totalQty} item →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full border-2 border-slate-200 text-slate-500 font-semibold py-3 rounded-2xl active:scale-95 transition-all text-sm"
              >
                Batal
              </button>
            )}
          </div>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
