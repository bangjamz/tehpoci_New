import { create } from 'zustand'

export const usePosStore = create((set, get) => ({
  // Shift aktif
  activeShift: null,
  setActiveShift: (shiftOrUpdater) => set(state => ({
    activeShift: typeof shiftOrUpdater === 'function'
      ? shiftOrUpdater(state.activeShift)
      : shiftOrUpdater,
  })),
  clearShift: () => set({ activeShift: null }),

  // Cart
  cart: [],

  addToCart: (product, variant = null) => {
    const { cart } = get()
    const itemId = variant ? `${product.id}_${variant.id}` : product.id
    const price = variant ? variant.price : product.price
    const costPrice = variant ? variant.cost_price : product.cost_price
    const name = variant ? `${product.name} - ${variant.name}` : product.name

    const existing = cart.find((i) => i.itemId === itemId)
    if (existing) {
      set({
        cart: cart.map((i) =>
          i.itemId === itemId ? { ...i, qty: i.qty + 1 } : i
        ),
      })
    } else {
      set({
        cart: [
          ...cart,
          {
            itemId,
            productId: product.id,
            variantId: variant?.id || null,
            name,
            price,
            costPrice,
            qty: 1,
            imageUrl: product.image_url || null,
            stockItem: product.stock_item || false,
          },
        ],
      })
    }
  },

  updateQty: (itemId, qty) => {
    const { cart } = get()
    if (qty <= 0) {
      set({ cart: cart.filter((i) => i.itemId !== itemId) })
    } else {
      set({ cart: cart.map((i) => (i.itemId === itemId ? { ...i, qty } : i)) })
    }
  },

  removeFromCart: (itemId) =>
    set({ cart: get().cart.filter((i) => i.itemId !== itemId) }),

  clearCart: () => set({ cart: [] }),

  // Computed totals
  getCartTotal: () =>
    get().cart.reduce((sum, i) => sum + i.price * i.qty, 0),

  getCartTotalCost: () =>
    get().cart.reduce((sum, i) => sum + i.costPrice * i.qty, 0),

  getCartCount: () =>
    get().cart.reduce((sum, i) => sum + i.qty, 0),
}))
