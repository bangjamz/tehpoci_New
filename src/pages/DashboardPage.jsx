import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, orderBy,
  deleteDoc, doc, getDocs, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { formatRupiah } from '../utils/currency'

import StatCard from '../components/dashboard/StatCard'
import ProductForm from '../components/dashboard/ProductForm'
import UserForm from '../components/dashboard/UserForm'
import RevenueChart from '../components/dashboard/RevenueChart'
import { seedSampleProducts } from '../lib/firestoreHelpers'

import {
  Coffee, Users, Package, TrendingUp, LogOut, Star,
  Plus, Edit2, Trash2, RefreshCw, X, Mail,
  BarChart2, ShoppingBag, ShieldCheck, Download, AlertTriangle, CheckCircle,
} from 'lucide-react'

const TABS = ['Ringkasan', 'Produk', 'Administrator']
const STORE_ID = 'branch_01'
const SUPER_OWNER = 'indrajamz@gmail.com'

function toDateInputValue(d) {
  return d.toISOString().slice(0, 10)
}

function exportCSV(transactions, label) {
  const rows = [['Tanggal', 'Waktu', 'Kasir', 'Metode Bayar', 'Total (Rp)', 'HPP (Rp)', 'Laba (Rp)']]
  transactions.forEach(t => {
    const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date()
    rows.push([
      ts.toLocaleDateString('id-ID'),
      ts.toLocaleTimeString('id-ID'),
      t.cashier_name || '',
      t.payment_method || '',
      t.total_amount || 0,
      t.total_cost || 0,
      (t.total_amount || 0) - (t.total_cost || 0),
    ])
  })
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-tehpoci-${label}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { userProfile } = useAuthStore()
  const [tab, setTab] = useState('Ringkasan')
  const isSuperOwner = userProfile?.email === SUPER_OWNER

  // ── Produk ─────────────────────────────────────────────────────────
  const [products, setProducts] = useState([])
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [productCategories, setProductCategories] = useState([])
  const [seeding, setSeeding] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // ── Ringkasan (stats + chart) ───────────────────────────────────────
  const [weekTxs, setWeekTxs] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Administrator: Kasir ───────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [userLoading, setUserLoading] = useState(true)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editUser, setEditUser] = useState(null)

  // ── Administrator: Owner emails ────────────────────────────────────
  const [authorizedEmails, setAuthorizedEmails] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)

  // ── Administrator: Laporan & Export ───────────────────────────────
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return toDateInputValue(d)
  })
  const [exportTo, setExportTo] = useState(() => toDateInputValue(new Date()))
  const [reportTxs, setReportTxs] = useState([])
  const [reportLoaded, setReportLoaded] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  // ── Administrator: Reset (super owner only) ────────────────────────
  const [resetStep, setResetStep] = useState(0)
  const [resetWord, setResetWord] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // ── Load products ─────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'))
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // sort client-side by category then name
      data.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name))
      setProducts(data)
      setProductCategories([...new Set(data.map(p => p.category).filter(Boolean))])
      setProductLoading(false)
      setProductError('')
    }, (err) => {
      console.error('[Products] Firestore error:', err.code, err.message)
      setProductError(err.message)
      setProductLoading(false)
    })
  }, [])

  // ── Load 7 days transactions for Ringkasan ────────────────────────
  useEffect(() => {
    if (tab !== 'Ringkasan') return
    setStatsLoading(true)
    const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0, 0, 0, 0)
    const q = query(
      collection(db, 'stores', STORE_ID, 'transactions'),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc')
    )
    return onSnapshot(q, snap => {
      setWeekTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setStatsLoading(false)
    }, () => setStatsLoading(false))
  }, [tab])

  // ── Load users + owner emails when Administrator tab active ────────
  useEffect(() => {
    if (tab !== 'Administrator') return

    setUserLoading(true)
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'CASHIER')),
      snap => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setUserLoading(false) },
      () => setUserLoading(false)
    )

    setAdminLoading(true)
    getDoc(doc(db, 'config', 'authorized_owners')).then(snap => {
      setAuthorizedEmails(snap.exists() ? (snap.data().emails || []) : [])
      setAdminLoading(false)
    }).catch(() => setAdminLoading(false))

    return unsub
  }, [tab])

  // ── Computed stats ─────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayTxs = weekTxs.filter(t => {
    const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(0)
    return ts >= todayStart
  })
  const todayStats = {
    revenue: todayTxs.reduce((s, t) => s + (t.total_amount || 0), 0),
    cost: todayTxs.reduce((s, t) => s + (t.total_cost || 0), 0),
    txCount: todayTxs.length,
    get profit() { return this.revenue - this.cost },
  }

  const bestSellers = (() => {
    const map = {}
    todayTxs.forEach(t => t.items?.forEach(item => {
      map[item.name] = (map[item.name] || 0) + item.qty
    }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  })()

  // ── Handlers: Produk ───────────────────────────────────────────────
  const handleDeleteProduct = async (p) => {
    if (!confirm(`Hapus produk "${p.name}"? Tidak bisa dibatalkan.`)) return
    await deleteDoc(doc(db, 'products', p.id))
    setSelectedProducts(prev => { const n = new Set(prev); n.delete(p.id); return n })
  }

  const handleBulkDelete = async () => {
    const count = selectedProducts.size
    if (!confirm(`Hapus ${count} produk yang dipilih?\n\nTindakan ini tidak bisa dibatalkan.`)) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedProducts].map(id => deleteDoc(doc(db, 'products', id))))
      setSelectedProducts(new Set())
    } finally { setBulkDeleting(false) }
  }

  const toggleSelectProduct = (id) => setSelectedProducts(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const toggleSelectAll = () => {
    setSelectedProducts(selectedProducts.size === products.length ? new Set() : new Set(products.map(p => p.id)))
  }

  const handleSeedProducts = async () => {
    if (!confirm('Tambahkan 6 produk contoh Teh Poci?')) return
    setSeeding(true)
    try { await seedSampleProducts() } finally { setSeeding(false) }
  }

  // ── Handlers: Kasir ────────────────────────────────────────────────
  const handleDeleteCashier = async (u) => {
    if (!confirm(`Hapus kasir "${u.display_name}"?\n\nAkun ini tidak akan bisa login lagi. Tidak bisa dibatalkan.`)) return
    await deleteDoc(doc(db, 'users', u.id))
  }

  // ── Handlers: Owner emails ─────────────────────────────────────────
  const handleAddAdmin = async (e) => {
    e.preventDefault()
    const email = newAdminEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (authorizedEmails.includes(email)) { setNewAdminEmail(''); return }
    setAdminSaving(true)
    try {
      await setDoc(doc(db, 'config', 'authorized_owners'), { emails: arrayUnion(email) }, { merge: true })
      setAuthorizedEmails(prev => [...prev, email])
      setNewAdminEmail('')
    } finally { setAdminSaving(false) }
  }

  const handleRemoveAdmin = async (email) => {
    if (!confirm(`Cabut akses administrator untuk ${email}?`)) return
    await updateDoc(doc(db, 'config', 'authorized_owners'), { emails: arrayRemove(email) })
    setAuthorizedEmails(prev => prev.filter(e => e !== email))
  }

  // ── Handlers: Laporan ─────────────────────────────────────────────
  const handleLoadReport = async () => {
    setReportLoading(true)
    const from = new Date(exportFrom + 'T00:00:00')
    const to = new Date(exportTo + 'T23:59:59')
    try {
      const snap = await getDocs(query(
        collection(db, 'stores', STORE_ID, 'transactions'),
        where('timestamp', '>=', from),
        where('timestamp', '<=', to),
        orderBy('timestamp', 'desc')
      ))
      setReportTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setReportLoaded(true)
    } finally { setReportLoading(false) }
  }

  const handleExport = () => {
    exportCSV(reportTxs, `${exportFrom}_sd_${exportTo}`)
  }

  // ── Handlers: Reset ────────────────────────────────────────────────
  const handleResetData = async () => {
    if (resetWord.trim().toUpperCase() !== 'HAPUS') return
    setResetting(true)
    try {
      const [txSnap, shiftSnap] = await Promise.all([
        getDocs(collection(db, 'stores', STORE_ID, 'transactions')),
        getDocs(collection(db, 'stores', STORE_ID, 'shifts')),
      ])
      await Promise.all([
        ...txSnap.docs.map(d => deleteDoc(d.ref)),
        ...shiftSnap.docs.map(d => deleteDoc(d.ref)),
      ])
      setResetStep(0); setResetWord(''); setResetDone(true)
      setTimeout(() => setResetDone(false), 5000)
    } finally { setResetting(false) }
  }

  const handleLogout = () => signOut(auth)

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-brand-green text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center">
            <Coffee size={20} className="text-brand-green" />
          </div>
          <div>
            <h1 className="font-bold text-base">Teh Poci — Dashboard</h1>
            <p className="text-green-200 text-xs">{userProfile?.display_name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-green-200 hover:text-white text-sm font-medium active:scale-95 transition-all">
          <LogOut size={16} /> Keluar
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-6">
        <div className="flex gap-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">

        {/* ══ RINGKASAN ══════════════════════════════════════════════ */}
        {tab === 'Ringkasan' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-slate-900">Ringkasan Hari Ini</h2>
              <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="animate-spin text-brand-green" size={24} />
              </div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Penjualan Hari Ini" value={formatRupiah(todayStats.revenue)} sub={`${todayStats.txCount} transaksi`} icon={TrendingUp} color="green" />
                  <StatCard label="Laba Kotor" value={formatRupiah(todayStats.profit)} sub={`HPP: ${formatRupiah(todayStats.cost)}`} icon={BarChart2} color="blue" />
                  <StatCard label="Transaksi" value={todayStats.txCount} sub="hari ini" icon={ShoppingBag} color="yellow" />
                  <StatCard label="Produk Aktif" value={products.filter(p => p.is_active).length} sub={`dari ${products.length} produk`} icon={Package} color="green" />
                </div>

                {/* 7-day chart */}
                <RevenueChart transactions={weekTxs} />

                {/* Best sellers today */}
                {bestSellers.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-1.5">
                      <Star size={14} className="text-brand-yellow fill-brand-yellow" /> Terlaris Hari Ini
                    </h3>
                    <div className="space-y-2">
                      {bestSellers.map(([name, qty], i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium text-slate-800 truncate">{name}</span>
                              <span className="text-xs font-bold text-brand-green shrink-0 ml-2">{qty} pcs</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-green rounded-full"
                                style={{ width: `${(qty / bestSellers[0][1]) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent transactions today */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-700 text-sm">Transaksi Hari Ini</h3>
                  </div>
                  {todayTxs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada transaksi hari ini</p>
                      {products.length === 0 && (
                        <button onClick={handleSeedProducts} disabled={seeding}
                          className="mt-3 text-sm bg-brand-light text-brand-green font-semibold px-4 py-2 rounded-xl border border-brand-green border-opacity-30 active:scale-95 transition-all disabled:opacity-50">
                          {seeding ? 'Menambahkan...' : '✨ Tambah 6 Produk Contoh'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {todayTxs.slice(0, 15).map(t => {
                        const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date()
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-slate-400">{t.cashier_name} · {t.payment_method}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-slate-900">{formatRupiah(t.total_amount)}</p>
                              <p className="text-xs text-green-600">+{formatRupiah((t.total_amount || 0) - (t.total_cost || 0))}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ PRODUK ═════════════════════════════════════════════════ */}
        {tab === 'Produk' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Manajemen Produk</h2>
              <button onClick={() => { setEditProduct(null); setShowProductForm(true) }}
                className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all">
                <Plus size={16} /> Tambah Produk
              </button>
            </div>

            {/* Saved success toast */}
            {savedMsg && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <CheckCircle size={16} className="text-green-600 shrink-0" />
                <p className="text-green-800 text-sm font-medium">{savedMsg}</p>
              </div>
            )}

            {productError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-brand-danger">
                ⚠️ Gagal memuat produk: <span className="font-mono text-xs">{productError}</span>
              </div>
            )}

            {/* Bulk action bar */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm font-semibold text-brand-danger">
                  {selectedProducts.size} produk dipilih
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedProducts(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 bg-white rounded-lg transition-colors">
                    Batalkan
                  </button>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-danger px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50">
                    <Trash2 size={13} />
                    {bulkDeleting ? 'Menghapus...' : `Hapus ${selectedProducts.size} Produk`}
                  </button>
                </div>
              </div>
            )}

            {productLoading ? (
              <div className="flex items-center justify-center h-32"><RefreshCw className="animate-spin text-brand-green" size={24} /></div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                        <th className="px-3 py-3 w-8">
                          <input type="checkbox"
                            checked={products.length > 0 && selectedProducts.size === products.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded accent-brand-green cursor-pointer" />
                        </th>
                        <th className="text-left px-4 py-3">Produk</th>
                        <th className="text-left px-4 py-3">Kategori</th>
                        <th className="text-right px-4 py-3">Harga Jual</th>
                        <th className="text-right px-4 py-3">HPP</th>
                        <th className="text-center px-4 py-3">Status</th>
                        <th className="text-center px-4 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {products.map(p => (
                        <tr key={p.id}
                          className={`hover:bg-slate-50 transition-colors ${selectedProducts.has(p.id) ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            <input type="checkbox"
                              checked={selectedProducts.has(p.id)}
                              onChange={() => toggleSelectProduct(p.id)}
                              className="w-4 h-4 rounded accent-brand-green cursor-pointer" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🍵</div>}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{p.name}</p>
                                {p.has_variants && <p className="text-xs text-slate-400">{p.variants?.length} varian</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.category}</td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-green">
                            {p.has_variants ? `${formatRupiah(Math.min(...p.variants.map(v => v.price)))}+` : formatRupiah(p.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{p.has_variants ? '—' : formatRupiah(p.cost_price)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {p.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditProduct(p); setShowProductForm(true) }} className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-light rounded-lg transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteProduct(p)} className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-10">
                            <p className="text-slate-400 text-sm mb-3">Belum ada produk.</p>
                            <button onClick={handleSeedProducts} disabled={seeding}
                              className="text-sm bg-brand-light text-brand-green font-semibold px-4 py-2 rounded-xl border border-brand-green border-opacity-30 active:scale-95 transition-all disabled:opacity-50">
                              {seeding ? 'Menambahkan...' : '✨ Tambah 6 Produk Contoh Teh Poci'}
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {products.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-50 text-xs text-slate-400">
                    {products.length} produk total
                    {selectedProducts.size > 0 && ` · ${selectedProducts.size} dipilih`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ADMINISTRATOR ══════════════════════════════════════════ */}
        {tab === 'Administrator' && (
          <div className="space-y-8 max-w-2xl">

            {/* §1 Manajemen Kasir */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-slate-900">Manajemen Kasir</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Tambah, edit, atau hapus akun kasir.</p>
                </div>
                <button onClick={() => { setEditUser(null); setShowUserForm(true) }}
                  className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all">
                  <Plus size={16} /> Tambah Kasir
                </button>
              </div>

              {userLoading ? (
                <div className="flex items-center justify-center h-24"><RefreshCw className="animate-spin text-brand-green" size={22} /></div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${u.is_active ? 'bg-brand-green' : 'bg-slate-300'}`}>
                        {u.display_name?.[0]?.toUpperCase() || 'K'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">{u.display_name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-brand-danger'}`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button onClick={() => { setEditUser(u); setShowUserForm(true) }} className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-light rounded-lg transition-colors shrink-0"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteCashier(u)} className="p-2 text-slate-400 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-white rounded-2xl">
                      <Users size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada kasir terdaftar.</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* §2 Akun Owner */}
            <section>
              <div className="mb-3">
                <h2 className="font-bold text-slate-900">Akun Owner (Login Google)</h2>
                <p className="text-slate-400 text-xs mt-0.5">Email Google yang diizinkan masuk sebagai Owner. Otomatis terdaftar saat login pertama kali.</p>
              </div>

              <form onSubmit={handleAddAdmin} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tambah Email Owner</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="email@gmail.com"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  </div>
                  <button type="submit" disabled={adminSaving || !newAdminEmail.includes('@')}
                    className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 shrink-0">
                    <Plus size={16} /> Tambah
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">⚠️ Pastikan email yang ditambahkan adalah akun Google yang terpercaya.</p>
              </form>

              {adminLoading ? (
                <div className="flex items-center justify-center h-16"><RefreshCw className="animate-spin text-brand-green" size={20} /></div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-green border-opacity-30 flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-green rounded-full flex items-center justify-center shrink-0"><ShieldCheck size={18} className="text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{SUPER_OWNER}</p>
                      <p className="text-xs text-slate-400">Super Owner · tidak bisa dihapus</p>
                    </div>
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">Aktif</span>
                  </div>
                  {authorizedEmails.filter(e => e !== SUPER_OWNER).map(email => (
                    <div key={email} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shrink-0"><ShieldCheck size={18} className="text-slate-400" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{email}</p>
                        <p className="text-xs text-slate-400">Owner Tambahan</p>
                      </div>
                      <button onClick={() => handleRemoveAdmin(email)} className="p-2 text-slate-300 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors shrink-0"><X size={16} /></button>
                    </div>
                  ))}
                  {authorizedEmails.filter(e => e !== SUPER_OWNER).length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-3">Belum ada owner tambahan.</p>
                  )}
                </div>
              )}
            </section>

            {/* §3 Laporan & Export CSV */}
            <section>
              <div className="mb-3">
                <h2 className="font-bold text-slate-900">Laporan & Export CSV</h2>
                <p className="text-slate-400 text-xs mt-0.5">Pilih rentang tanggal lalu muat laporan. File CSV bisa dibuka di Excel atau Google Sheets.</p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Dari Tanggal</label>
                    <input type="date" value={exportFrom} max={exportTo} onChange={e => { setExportFrom(e.target.value); setReportLoaded(false) }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Sampai Tanggal</label>
                    <input type="date" value={exportTo} min={exportFrom} max={toDateInputValue(new Date())} onChange={e => { setExportTo(e.target.value); setReportLoaded(false) }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  </div>
                </div>

                <button onClick={handleLoadReport} disabled={reportLoading}
                  className="w-full bg-brand-green text-white font-semibold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {reportLoading ? <><RefreshCw size={15} className="animate-spin" /> Memuat...</> : 'Muat Laporan'}
                </button>

                {reportLoaded && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Transaksi', val: reportTxs.length, unit: 'txn' },
                        { label: 'Total Penjualan', val: formatRupiah(reportTxs.reduce((s, t) => s + (t.total_amount || 0), 0)), unit: '' },
                        { label: 'Laba Kotor', val: formatRupiah(reportTxs.reduce((s, t) => s + (t.total_amount || 0) - (t.total_cost || 0), 0)), unit: '' },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="font-bold text-slate-900 mt-0.5 text-sm">{val}</p>
                        </div>
                      ))}
                    </div>

                    {reportTxs.length > 0 ? (
                      <>
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-xl">
                          {reportTxs.map(t => {
                            const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date()
                            return (
                              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-800">
                                    {ts.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-xs text-slate-400">{t.cashier_name} · {t.payment_method}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-900 shrink-0">{formatRupiah(t.total_amount)}</span>
                              </div>
                            )
                          })}
                        </div>
                        <button onClick={handleExport}
                          className="w-full flex items-center justify-center gap-2 border-2 border-brand-green text-brand-green font-bold py-2.5 rounded-xl active:scale-95 transition-all text-sm">
                          <Download size={16} /> Export CSV ({reportTxs.length} transaksi)
                        </button>
                      </>
                    ) : (
                      <p className="text-center text-slate-400 text-sm py-4">Tidak ada transaksi di rentang tanggal ini.</p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* §4 Zona Berbahaya — hanya Super Owner */}
            {isSuperOwner && (
              <section>
                <div className="mb-3">
                  <h2 className="font-bold text-slate-900">Zona Berbahaya</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Hanya tersedia untuk Super Owner. Tindakan ini tidak bisa dibatalkan.</p>
                </div>

                {resetDone && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
                    <CheckCircle size={16} className="text-green-600 shrink-0" />
                    <p className="text-green-800 text-sm font-medium">Semua data transaksi dan shift berhasil dihapus.</p>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-brand-danger shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">Hapus Semua Data Transaksi & Shift</p>
                      <p className="text-xs text-slate-400 mt-1">Menghapus seluruh riwayat transaksi dan shift secara permanen. Gunakan untuk membersihkan data uji coba sebelum operasi nyata.</p>

                      {resetStep === 0 && (
                        <button onClick={() => { setResetStep(1); setResetWord('') }}
                          className="mt-3 text-xs font-semibold text-brand-danger border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 active:scale-95 transition-all">
                          Hapus Data Transaksi...
                        </button>
                      )}

                      {resetStep >= 1 && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                          <p className="text-brand-danger text-xs font-bold">
                            Ketik <span className="bg-red-100 px-1.5 py-0.5 rounded font-mono">HAPUS</span> untuk konfirmasi:
                          </p>
                          <input type="text" value={resetWord} onChange={e => setResetWord(e.target.value)}
                            placeholder="Ketik HAPUS" autoFocus
                            className="w-full border-2 border-red-200 focus:border-brand-danger rounded-lg px-3 py-2 text-sm font-mono focus:outline-none transition-colors" />
                          <div className="flex gap-2">
                            <button onClick={() => { setResetStep(0); setResetWord('') }}
                              className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 active:scale-95">
                              Batal
                            </button>
                            <button onClick={handleResetData}
                              disabled={resetting || resetWord.trim().toUpperCase() !== 'HAPUS'}
                              className="flex-1 text-xs font-black py-2 bg-brand-danger text-white rounded-lg active:scale-95 transition-all disabled:opacity-40">
                              {resetting ? 'Menghapus...' : 'Konfirmasi Hapus Semua Data'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>
        )}

      </main>

      {/* Modals */}
      {showProductForm && (
        <ProductForm
          product={editProduct}
          categories={productCategories}
          existingNames={products
            .filter(p => p.id !== editProduct?.id)
            .map(p => p.name.toLowerCase())}
          onClose={() => { setShowProductForm(false); setEditProduct(null) }}
          onSaved={() => {
            setSavedMsg(editProduct ? `Produk berhasil diperbarui!` : 'Produk berhasil ditambahkan!')
            setTimeout(() => setSavedMsg(''), 4000)
          }}
        />
      )}
      {showUserForm && (
        <UserForm user={editUser}
          onClose={() => { setShowUserForm(false); setEditUser(null) }}
          onSaved={() => {}} />
      )}
    </div>
  )
}
