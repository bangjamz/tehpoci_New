import { X } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

export default function VariantModal({ product, onSelect, onClose }) {
  if (!product) return null

  const variants = product.variants?.filter(v => v.is_active !== false) || []

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">{product.name}</h3>
              <p className="text-slate-500 text-sm">Pilih varian</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => onSelect(product, variant)}
                className="w-full flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-brand-green active:scale-95 transition-all group"
              >
                <span className="font-medium text-slate-800 group-hover:text-brand-green">
                  {variant.name}
                </span>
                <span className="font-bold text-brand-green">
                  {formatRupiah(variant.price)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
