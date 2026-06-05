import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { usePosStore } from '../store/posStore'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import {
  getActiveShift, openShift, closeShift,
  createTransaction, updateShiftExpectedCash,
} from '../lib/firestoreHelpers'

import ShiftOpenModal from '../components/pos/ShiftOpenModal'
import ShiftCloseModal from '../components/pos/ShiftCloseModal'
import ProductCard from '../components/pos/ProductCard'
import VariantModal from '../components/pos/VariantModal'
import CartDrawer from '../components/pos/CartDrawer'
import CheckoutModal from '../components/pos/CheckoutModal'
import ReceiptModal from '../components/pos/ReceiptModal'

import { Wifi, WifiOff, LogOut, RefreshCw, Search, Coffee } from 'lucide-react'

export default function PosPage() {
  const { user, userProfile, lockPin } = useAuthStore()
  const { cart, addToCart, updateQty, clearCart, getCartTotal, getCartTotalCost, getCartCount } = usePosStore()

  // Map productId → total qty in cart (sums all variants)
  const cartQtyMap = cart.reduce((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + item.qty
    return acc
  }, {})
  const { activeShift, setActiveShift, clearShift } = usePosStore()
  const isOnline = useNetworkStatus()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [shiftLoading, setShiftLoading] = useState(true)
  const [shiftActionLoading, setShiftActionLoading] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)

  const [variantProduct, setVariantProduct] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)

  // Load active shift
  useEffect(() => {
    if (!user) return
    getActiveShift(user.uid)
      .then(shift => {
        if (shift) setActiveShift(shift)
        setShiftLoading(false)
      })
      .catch(() => setShiftLoading(false))
  }, [user])

  // Real-time products listener
  useEffect(() => {
    // Hanya orderBy 1 field untuk menghindari kebutuhan composite index Firestore
    const q = query(
      collection(db, 'products'),
      where('is_active', '==', true),
      orderBy('name')
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side: kategori dulu, lalu nama
      data.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name))
      setProducts(data)
      const cats = ['Semua', ...new Set(data.map(p => p.category).filter(Boolean))]
      setCategories(cats)
      setLoadingProducts(false)
    }, (err) => {
      console.error('[POS] Products error:', err.code, err.message)
      setLoadingProducts(false)
    })
    return unsub
  }, [])

  // Filtered products
  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Semua' || p.category === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Open shift
  const handleOpenShift = async (initialCash) => {
    setShiftActionLoading(true)
    try {
      const shiftId = await openShift({
        cashierUid: user.uid,
        cashierName: userProfile.display_name,
        initialCash,
      })
      setActiveShift({
        id: shiftId,
        cashier_uid: user.uid,
        cashier_name: userProfile.display_name,
        initial_cash: initialCash,
        expected_cash: initialCash,
        status: 'OPEN',
      })
    } finally {
      setShiftActionLoading(false)
    }
  }

  // Close shift
  const handleCloseShift = async (actualCash, expectedCash) => {
    setShiftActionLoading(true)
    try {
      await closeShift({ shiftId: activeShift.id, expectedCash, actualCash })
      clearShift()
      setShowCloseShift(false)
      clearCart()
    } finally {
      setShiftActionLoading(false)
    }
  }

  // Product click
  const handleProductClick = (product) => {
    if (product.has_variants && product.variants?.length > 0) {
      setVariantProduct(product)
    } else {
      addToCart(product)
    }
  }

  // Checkout
  const handleConfirmPayment = async ({ method, cashPaid, change }) => {
    setCheckoutLoading(true)
    try {
      const totalAmount = getCartTotal()
      const totalCost = getCartTotalCost()
      const txId = await createTransaction({
        shiftId: activeShift.id,
        items: cart,
        totalAmount,
        totalCost,
        paymentMethod: method,
        cashierUid: user.uid,
        cashierName: userProfile.display_name,
      })

      // Update expected_cash di shift (hanya untuk pembayaran tunai)
      if (method === 'CASH') {
        await updateShiftExpectedCash(activeShift.id, totalAmount)
        setActiveShift(prev => ({
          ...prev,
          expected_cash: (prev?.expected_cash || 0) + totalAmount,
        }))
      }

      setLastTransaction({
        id: txId,
        items: cart,
        totalAmount,
        paymentMethod: method,
        cashPaid,
        change,
        cashierName: userProfile.display_name,
        timestamp: Date.now(),
      })
      clearCart()
      setShowCheckout(false)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleLogout = async () => {
    lockPin()
    await signOut(auth)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <RefreshCw className="text-brand-green animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-light flex flex-col">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Coffee size={18} className="text-brand-yellow shrink-0" />
            <span className="font-bold text-sm truncate">Teh Poci POS</span>
          </div>
          <p className="text-green-200 text-xs truncate">
            {userProfile?.display_name}
            {activeShift && <span className="ml-1">· Shift aktif</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOnline
            ? <Wifi size={16} className="text-brand-yellow" />
            : <WifiOff size={16} className="text-red-300 animate-pulse" />
          }
          {!isOnline && <span className="text-red-300 text-xs font-medium">Offline</span>}

          {activeShift && (
            <button
              onClick={() => setShowCloseShift(true)}
              className="ml-1 bg-brand-danger text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              Tutup Shift
            </button>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-white hover:bg-opacity-10 active:scale-90 transition-all"
          >
            <LogOut size={18} className="text-green-200" />
          </button>
        </div>
      </header>

      {/* Offline warning */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <WifiOff size={14} className="text-amber-600 shrink-0" />
          <p className="text-amber-700 text-xs font-medium">
            Tidak ada koneksi. Transaksi tidak bisa diproses sampai online kembali.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-slate-50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto bg-white border-b border-slate-100 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95
                ${activeCategory === cat
                  ? 'bg-brand-green text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product Grid */}
      <main className="flex-1 p-4 pb-32">
        {loadingProducts ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="text-brand-green animate-spin" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Coffee size={40} className="mb-2 opacity-40" />
            <p className="text-sm">{search ? 'Produk tidak ditemukan' : 'Belum ada produk aktif'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
                cartQty={cartQtyMap[product.id] || 0}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        onCheckout={() => setShowCheckout(true)}
        isOnline={isOnline}
      />

      {/* Modals */}
      {!activeShift && !shiftLoading && (
        <ShiftOpenModal onOpen={handleOpenShift} onLogout={handleLogout} loading={shiftActionLoading} />
      )}

      {showCloseShift && activeShift && (
        <ShiftCloseModal
          shift={activeShift}
          onClose={handleCloseShift}
          onCancel={() => setShowCloseShift(false)}
          loading={shiftActionLoading}
        />
      )}

      {variantProduct && (
        <VariantModal
          product={variantProduct}
          cart={cart}
          onAdd={addToCart}
          onUpdateQty={updateQty}
          onClose={() => setVariantProduct(null)}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          total={getCartTotal()}
          cart={cart}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowCheckout(false)}
          loading={checkoutLoading}
        />
      )}

      {lastTransaction && (
        <ReceiptModal
          transaction={lastTransaction}
          onClose={() => setLastTransaction(null)}
          onNewOrder={() => setLastTransaction(null)}
        />
      )}
    </div>
  )
}
