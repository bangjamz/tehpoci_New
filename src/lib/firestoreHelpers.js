import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, serverTimestamp, orderBy, limit,
  increment, getDoc, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const STORE_ID = 'branch_01'

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getActiveShift(cashierUid) {
  const q = query(
    collection(db, 'stores', STORE_ID, 'shifts'),
    where('status', '==', 'OPEN'),
    where('cashier_uid', '==', cashierUid),
    orderBy('start_time', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
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
  const q = query(
    collection(db, 'products'),
    where('is_active', '==', true),
    orderBy('category'),
    orderBy('name')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Seed Data (untuk setup awal) ──────────────────────────────────────────────

export async function seedSampleProducts() {
  const samples = [
    { name: 'Teh Poci Original', category: 'Teh Poci', price: 5000, cost_price: 2000, has_variants: false },
    { name: 'Teh Poci Manis', category: 'Teh Poci', price: 5000, cost_price: 2000, has_variants: false },
    {
      name: 'Teh Poci Susu', category: 'Teh Poci', price: 7000, cost_price: 3000,
      has_variants: true,
      variants: [
        { id: '1', name: 'Hangat', price: 7000, cost_price: 3000, is_active: true },
        { id: '2', name: 'Dingin', price: 8000, cost_price: 3500, is_active: true },
      ],
    },
    { name: 'Es Teh Manis', category: 'Es Teh', price: 4000, cost_price: 1500, has_variants: false },
    { name: 'Es Teh Tawar', category: 'Es Teh', price: 3000, cost_price: 1000, has_variants: false },
    { name: 'Es Jeruk', category: 'Minuman Lain', price: 6000, cost_price: 2500, has_variants: false },
  ]

  const batch = writeBatch(db)
  for (const p of samples) {
    const ref = doc(collection(db, 'products'))
    batch.set(ref, {
      ...p,
      variants: p.variants || [],
      image_url: '',
      is_active: true,
      stock_item: false,
      stock_count: null,
      created_at: serverTimestamp(),
    })
  }
  await batch.commit()
}
