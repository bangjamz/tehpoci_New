import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, getDocs, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { formatRupiah } from '../utils/currency'

import StatCard from '../components/dashboard/StatCard'
import ProductForm from '../components/dashboard/ProductForm'
import UserForm from '../components/dashboard/UserForm'
import { seedSampleProducts } from '../lib/firestoreHelpers'

import {
  Coffee, Users, Package, TrendingUp, LogOut,
  Plus, Edit2, Trash2, RefreshCw, X, Mail,
  BarChart2, ShoppingBag, ShieldCheck, Download, AlertTriangle, CheckCircle,
} from 'lucide-react'

const TABS = ['Ringkasan', 'Produk', 'Kasir', 'Administrator']
const STORE_ID = 'branch_01'

const PERIODS = [
  { label: 'Hari Ini', days: 0 },
  { label: '7 Hari',   days: 7 },
  { label: '30 Hari',  days: 30 },
]

function getPeriodStart(days) {
  const d = new Date()
  if (days === 0) { d.setHours(0, 0, 0, 0); return d }
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function exportCSV(transactions, label) {
  const rows = [['Tanggal', 'Waktu', 'Kasir', 'Metode', 'Total', 'HPP', 'Laba']]
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
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-tehpoci-${label.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { userProfile } = useAuthStore()
  const [tab, setTab] = useState('Ringkasan')

  // Produk
  const [products, setProducts] = useState([])
  const [productLoading, setProductLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [productCategories, setProductCategories] = useState([])

  // Users
  const [users, setUsers] = useState([])
  const [userLoading, setUserLoading] = useState(true)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editUser, setEditUser] = useState(null)

  // Analytics
  const [period, setPeriod] = useState(0) // index of PERIODS
  const [transactions, setTransactions] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [resetStep, setResetStep] = useState(0) // 0=idle, 1=confirm, 2=type-word
  const [resetWord, setResetWord] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Administrator (authorized owner emails)
  const [authorizedEmails, setAuthorizedEmails] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Load products real-time
  useEffect(() => {
    if (tab !== 'Produk' && tab !== 'Ringkasan') return
    const q = query(collection(db, 'products'), orderBy('category'), orderBy('name'))
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProducts(data)
      setProductCategories([...new Set(data.map(p => p.category).filter(Boolean))])
      setProductLoading(false)
    }, () => setProductLoading(false))
  }, [tab])

  // Load users real-time
  useEffect(() => {
    if (tab !== 'Kasir') return
    const q = query(collection(db, 'users'), where('role', '==', 'CASHIER'))
    return onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setUserLoading(false)
    }, () => setUserLoading(false))
  }, [tab])

  // Load authorized owner emails
  useEffect(() => {
    if (tab !== 'Administrator') return
    setAdminLoading(true)
    getDoc(doc(db, 'config', 'authorized_owners')).then(snap => {
      setAuthorizedEmails(snap.exists() ? (snap.data().emails || []) : [])
      setAdminLoading(false)
    }).catch(() => setAdminLoading(false))
  }, [tab])

  // Load stats untuk periode yang dipilih
  useEffect(() => {
    if (tab !== 'Ringkasan') return
    setStatsLoading(true)
    const since = getPeriodStart(PERIODS[period].days)
    const q = query(
      collection(db, 'stores', STORE_ID, 'transactions'),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTransactions(txs)
      setStatsLoading(false)
    }, () => setStatsLoading(false))
    return unsub
  }, [tab, period])

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    await deleteDoc(doc(db, 'products', product.id))
  }

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
    } finally {
      setAdminSaving(false)
    }
  }

  const handleRemoveAdmin = async (email) => {
    if (!confirm(`Hapus akses administrator untuk ${email}?`)) return
    await updateDoc(doc(db, 'config', 'authorized_owners'), { emails: arrayRemove(email) })
    setAuthorizedEmails(prev => prev.filter(e => e !== email))
  }

  const stats = {
    revenue: transactions.reduce((s, t) => s + (t.total_amount || 0), 0),
    cost: transactions.reduce((s, t) => s + (t.total_cost || 0), 0),
    txCount: transactions.length,
    get profit() { return this.revenue - this.cost },
  }

  const handleExport = () => {
    setExporting(true)
    try { exportCSV(transactions, PERIODS[period].label) }
    finally { setExporting(false) }
  }

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
      setResetStep(0)
      setResetWord('')
      setResetDone(true)
      setTimeout(() => setResetDone(false), 4000)
    } finally {
      setResetting(false)
    }
  }

  const handleSeedProducts = async () => {
    if (!confirm('Tambahkan 6 produk contoh Teh Poci ke database? Kamu bisa edit atau hapus nanti.')) return
    setSeeding(true)
    try { await seedSampleProducts() } finally { setSeeding(false) }
  }

  const handleLogout = () => signOut(auth)

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
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-green-200 hover:text-white text-sm font-medium active:scale-95 transition-all"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-6">
        <div className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">

        {/* ── Tab: Ringkasan ────────────────────────────────────────── */}
        {tab === 'Ringkasan' && (
          <div className="space-y-6">
            {/* Header + period filter */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Laporan Penjualan</h2>
                <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
                {PERIODS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPeriod(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === i ? 'bg-white text-brand-green shadow-sm' : 'text-slate-500'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="animate-spin text-brand-green" size={24} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Penjualan" value={formatRupiah(stats.revenue)} sub={`${stats.txCount} transaksi`} icon={TrendingUp} color="green" />
                  <StatCard label="Laba Kotor" value={formatRupiah(stats.profit)} sub={`HPP: ${formatRupiah(stats.cost)}`} icon={BarChart2} color="blue" />
                  <StatCard label="Jml Transaksi" value={stats.txCount} sub={PERIODS[period].label.toLowerCase()} icon={ShoppingBag} color="yellow" />
                  <StatCard label="Produk Aktif" value={products.filter(p => p.is_active).length} sub={`dari ${products.length} produk`} icon={Package} color="green" />
                </div>

                {/* Export + Transaksi */}
                {transactions.length > 0 && (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 w-full justify-center bg-white border-2 border-brand-green text-brand-green font-semibold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 text-sm"
                  >
                    <Download size={16} />
                    Export CSV — {PERIODS[period].label} ({transactions.length} transaksi)
                  </button>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-700">Riwayat Transaksi · {PERIODS[period].label}</h3>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada transaksi</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {transactions.slice(0, 50).map(t => {
                        const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date()
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {ts.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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

        {/* ── Tab: Produk ───────────────────────────────────────────── */}
        {tab === 'Produk' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Manajemen Produk</h2>
              <button
                onClick={() => { setEditProduct(null); setShowProductForm(true) }}
                className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                <Plus size={16} /> Tambah Produk
              </button>
            </div>

            {productLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="animate-spin text-brand-green" size={24} />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
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
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                {p.image_url
                                  ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center">🍵</div>}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{p.name}</p>
                                {p.has_variants && <p className="text-xs text-slate-400">{p.variants?.length} varian</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.category}</td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-green">
                            {p.has_variants
                              ? `${formatRupiah(Math.min(...p.variants.map(v => v.price)))}+`
                              : formatRupiah(p.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {p.has_variants ? '—' : formatRupiah(p.cost_price)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {p.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setEditProduct(p); setShowProductForm(true) }}
                                className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-light rounded-lg transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 text-slate-400 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10">
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
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Kasir ────────────────────────────────────────────── */}
        {tab === 'Kasir' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Manajemen Kasir</h2>
              <button
                onClick={() => { setEditUser(null); setShowUserForm(true) }}
                className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                <Plus size={16} /> Tambah Kasir
              </button>
            </div>

            {userLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="animate-spin text-brand-green" size={24} />
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${u.is_active ? 'bg-brand-green' : 'bg-slate-300'}`}>
                      {u.display_name?.[0]?.toUpperCase() || 'K'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{u.display_name}</p>
                      <p className="text-sm text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-brand-danger'}`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      onClick={() => { setEditUser(u); setShowUserForm(true) }}
                      className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-light rounded-lg transition-colors shrink-0"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-10 text-slate-400 bg-white rounded-2xl">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Belum ada kasir terdaftar.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Administrator ────────────────────────────────────── */}
        {tab === 'Administrator' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h2 className="font-bold text-slate-900">Akun Administrator</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Email Google yang diizinkan login sebagai Owner/Admin. Mereka akan otomatis terdaftar saat login pertama kali.
              </p>
            </div>

            {/* Form tambah admin */}
            <form onSubmit={handleAddAdmin} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tambah Email Administrator
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    placeholder="email@gmail.com"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adminSaving || !newAdminEmail.includes('@')}
                  className="flex items-center gap-1.5 bg-brand-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 shrink-0"
                >
                  <Plus size={16} /> Tambah
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                ⚠️ Pastikan email yang ditambahkan adalah akun Google yang terpercaya — mereka akan punya akses penuh ke semua data.
              </p>
            </form>

            {/* Daftar admin */}
            {adminLoading ? (
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="animate-spin text-brand-green" size={22} />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Owner pertama (hardcoded, tidak bisa dihapus) */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-green border-opacity-30 flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-green rounded-full flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">indrajamz@gmail.com</p>
                    <p className="text-xs text-slate-400">Owner Utama · tidak bisa dihapus</p>
                  </div>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">
                    Aktif
                  </span>
                </div>

                {authorizedEmails.map(email => (
                  <div key={email} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{email}</p>
                      <p className="text-xs text-slate-400">Administrator</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(email)}
                      className="p-2 text-slate-300 hover:text-brand-danger hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {authorizedEmails.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">
                    Belum ada administrator tambahan.
                  </p>
                )}
              </div>
            )}

            {/* ── Reset Data ─────────────────────────────────────── */}
            <div className="mt-6">
              <h3 className="font-bold text-slate-900 mb-1">Zona Berbahaya</h3>
              <p className="text-slate-400 text-xs mb-3">Tindakan di bawah ini tidak bisa dibatalkan.</p>

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
                    <p className="text-xs text-slate-400 mt-1">
                      Menghapus seluruh riwayat transaksi dan shift dari database secara permanen.
                      Gunakan ini untuk membersihkan data percobaan sebelum operasi nyata.
                    </p>

                    {resetStep === 0 && (
                      <button
                        onClick={() => { setResetStep(1); setResetWord('') }}
                        className="mt-3 text-xs font-semibold text-brand-danger border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 active:scale-95 transition-all"
                      >
                        Hapus Data Transaksi...
                      </button>
                    )}

                    {resetStep >= 1 && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <p className="text-brand-danger text-xs font-bold">
                          Ketik <span className="bg-red-100 px-1 rounded font-mono">HAPUS</span> untuk mengkonfirmasi penghapusan permanen:
                        </p>
                        <input
                          type="text"
                          value={resetWord}
                          onChange={e => setResetWord(e.target.value)}
                          placeholder="Ketik HAPUS"
                          autoFocus
                          className="w-full border-2 border-red-200 focus:border-brand-danger rounded-lg px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setResetStep(0); setResetWord('') }}
                            className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 active:scale-95"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleResetData}
                            disabled={resetting || resetWord.trim().toUpperCase() !== 'HAPUS'}
                            className="flex-1 text-xs font-black py-2 bg-brand-danger text-white rounded-lg active:scale-95 transition-all disabled:opacity-40"
                          >
                            {resetting ? 'Menghapus...' : 'Konfirmasi Hapus Semua Data'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showProductForm && (
        <ProductForm
          product={editProduct}
          categories={productCategories}
          onClose={() => { setShowProductForm(false); setEditProduct(null) }}
        />
      )}
      {showUserForm && (
        <UserForm
          user={editUser}
          onClose={() => { setShowUserForm(false); setEditUser(null) }}
        />
      )}
    </div>
  )
}
