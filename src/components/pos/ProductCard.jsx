import { Plus, AlertTriangle } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

export default function ProductCard({ product, onClick, cartQty = 0 }) {
  const isLowStock = product.stock_item && product.stock_count != null && product.stock_count <= 5
  const isOutOfStock = product.stock_item && product.stock_count != null && product.stock_count <= 0

  const displayPrice = product.has_variants
    ? `${formatRupiah(Math.min(...product.variants.map(v => v.price)))}+`
    : formatRupiah(product.price)

  return (
    <button
      onClick={() => !isOutOfStock && onClick(product)}
      disabled={isOutOfStock}
      className={`
        relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border-2 text-left w-full
        active:scale-95 transition-all duration-150
        ${isOutOfStock
          ? 'border-slate-100 opacity-50 cursor-not-allowed'
          : cartQty > 0
            ? 'border-brand-green shadow-md'
            : 'border-transparent hover:border-brand-green hover:shadow-md'
        }
      `}
    >
      {/* Product Image */}
      <div className="aspect-square bg-slate-100 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍵
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="absolute top-1.5 left-1.5 bg-brand-yellow text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle size={9} />
            Stok Tipis
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
            <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-full">
              Habis
            </span>
          </div>
        )}

        {/* Cart qty badge */}
        {cartQty > 0 && (
          <div className="absolute top-1.5 right-1.5 min-w-[24px] h-6 bg-brand-green text-white text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-lg">
            {cartQty}
          </div>
        )}

        {!isOutOfStock && cartQty === 0 && (
          <div className="absolute bottom-1.5 right-1.5 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center shadow">
            <Plus size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 mb-1">
          {product.name}
        </p>
        <p className="text-base font-bold text-brand-green">{displayPrice}</p>
        {product.has_variants && (
          <p className="text-[10px] text-slate-400 mt-0.5">{product.variants?.length} varian</p>
        )}
      </div>
    </button>
  )
}
