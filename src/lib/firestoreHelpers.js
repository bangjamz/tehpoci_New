import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, serverTimestamp, orderBy, limit,
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
  const ref = await addDoc(collection(db, 'stores', STORE_ID, 'transactions'), {
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

  // Update expected_cash di shift aktif
  const shiftRef = doc(db, 'stores', STORE_ID, 'shifts', shiftId)
  const shiftSnap = await getDocs(query(
    collection(db, 'stores', STORE_ID, 'shifts'),
    where('__name__', '==', shiftId)
  ))

  return ref.id
}

export async function updateShiftExpectedCash(shiftId, addAmount) {
  // Ambil shift dulu untuk update expected_cash
  const { getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'stores', STORE_ID, 'shifts', shiftId))
  if (!snap.exists()) return
  const current = snap.data().expected_cash || 0
  await updateDoc(doc(db, 'stores', STORE_ID, 'shifts', shiftId), {
    expected_cash: current + addAmount,
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
