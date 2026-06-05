import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, serverTimestamp, orderBy, limit,
  increment, getDoc, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const STORE_ID = 'branch_01'

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getActiveShift(cashierUid) {
  // Hanya 1 where clause untuk menghindari composite index Firestore.
  // Filter status=OPEN & sort start_time dilakukan di client.
  const q = query(
    collection(db, 'stores', STORE_ID, 'shifts'),
    where('cashier_uid', '==', cashierUid),
    limit(30)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null

  const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const openShift = shifts
    .filter(s => s.status === 'OPEN')
    .sort((a, b) => {
      const ta = a.start_time?.toMillis?.() || 0
      const tb = b.start_time?.toMillis?.() || 0
      return tb - ta
    })[0]

  return openShift || null
}

export async function openShift({ cashierUid, cashierName, initialCash }) {
  const ref = await addDoc(collection(db, 'stores', STORE_ID, 'shifts'), {
    cashier_uid: cashierUid,
    cashier_name: cashierName,
    initial_cash: initialCash,
    expected_cash: initialCash,
    actual_cash: null,
    variance: null,
    status: 'OPEN',
    start_time: serverTimestamp(),
    end_time: null,
  })
  return ref.id
}

export async function closeShift({ shiftId, expectedCash, actualCash }) {
  const variance = actualCash - expectedCash
  await updateDoc(doc(db, 'stores', STORE_ID, 'shifts', shiftId), {
    actual_cash: actualCash,
    expected_cash: expectedCash,
    variance,
    status: 'CLOSED',
    end_time: serverTimestamp(),
  })
  return variance
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function createTransaction({ shiftId, items, totalAmount, totalCost, paymentMethod, cashierUid, cashierName }) {
  const batch = writeBatch(db)

  // 1. Buat dokumen transaksi
  const txRef = doc(collection(db, 'stores', STORE_ID, 'transactions'))
  batch.set(txRef, {
    shift_id: shiftId,
    cashier_uid: cashierUid,
    cashier_name: cashierName,
    items: items.map(i => ({
      product_id: i.productId,
      variant_id: i.variantId || null,
      name: i.name,
      price: i.price,
      cost_price: i.costPrice,
      qty: i.qty,
      subtotal: i.price * i.qty,
    })),
    total_amount: totalAmount,
    total_cost: totalCost,
    gross_profit: totalAmount - totalCost,
    payment_method: paymentMethod,
    timestamp: serverTimestamp(),
    store_id: STORE_ID,
  })

  // 2. Kurangi stok produk yang dipantau (stock_item = true)
  const stockItems = items.filter(i => i.stockItem)
  for (const item of stockItems) {
    const productRef = doc(db, 'products', item.productId)
    batch.update(productRef, { stock_count: increment(-item.qty) })
  }

  await batch.commit()
  return txRef.id
}

export async function updateShiftExpectedCash(shiftId, addAmount) {
  await updateDoc(doc(db, 'stores', STORE_ID, 'shifts', shiftId), {
    expected_cash: increment(addAmount),
  })
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts() {
  // Hanya orderBy('name') — auto-index, tidak butuh composite index
  const q = query(collection(db, 'products'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.is_active)
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

// Gambar placeholder teh es (public domain, bisa diganti via edit produk)
const TEA_IMAGE = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&h=400&q=80'

export async function seedEsTehPoci() {
  const ref = doc(collection(db, 'products'))
  await writeBatch(db).set(ref, {
    name: 'Es Teh Poci',
    category: 'Es Teh Poci',
    has_variants: true,
    price: 0,
    cost_price: 0,
    variants: [
      { id: 'besar', name: 'Besar', price: 5000, cost_price: 3000, is_active: true },
      { id: 'sedang', name: 'Sedang', price: 4000, cost_price: 2800, is_active: true },
      { id: 'kecil', name: 'Kecil', price: 3500, cost_price: 2500, is_active: true },
    ],
    image_url: TEA_IMAGE,
    is_active: true,
    stock_item: false,
    stock_count: null,
    created_at: serverTimestamp(),
  }).commit()
}

export async function seedSampleProducts() {
  const samples = [
    {
      name: 'Es Teh Poci',
      category: 'Es Teh Poci',
      has_variants: true,
      price: 0, cost_price: 0,
      image_url: TEA_IMAGE,
      variants: [
        { id: 'besar', name: 'Besar', price: 5000, cost_price: 3000, is_active: true },
        { id: 'sedang', name: 'Sedang', price: 4000, cost_price: 2800, is_active: true },
        { id: 'kecil', name: 'Kecil', price: 3500, cost_price: 2500, is_active: true },
      ],
    },
    { name: 'Teh Poci Original', category: 'Teh Poci', price: 5000, cost_price: 2000, image_url: '' },
    { name: 'Teh Poci Manis', category: 'Teh Poci', price: 5000, cost_price: 2000, image_url: '' },
    { name: 'Es Teh Manis', category: 'Es Teh', price: 4000, cost_price: 1500, image_url: '' },
    { name: 'Es Jeruk', category: 'Minuman Lain', price: 6000, cost_price: 2500, image_url: '' },
  ]

  const batch = writeBatch(db)
  for (const p of samples) {
    const ref = doc(collection(db, 'products'))
    batch.set(ref, {
      name: p.name,
      category: p.category,
      has_variants: p.has_variants || false,
      price: p.price ?? 0,
      cost_price: p.cost_price ?? 0,
      variants: p.variants || [],
      image_url: p.image_url || '',
      is_active: true,
      stock_item: false,
      stock_count: null,
      created_at: serverTimestamp(),
    })
  }
  await batch.commit()
}
