import { useState, useRef } from 'react'
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { X, Plus, Trash2, ImagePlus, Loader } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

function VariantRow({ variant, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center bg-slate-50 rounded-xl p-2">
      <input
        type="text"
        value={variant.name}
        onChange={e => onChange({ ...variant, name: e.target.value })}
        placeholder="Nama varian (cth: Ukuran L)"
        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
      />
      <input
        type="number"
        value={variant.price}
        onChange={e => onChange({ ...variant, price: Number(e.target.value) })}
        placeholder="Harga"
        className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
      />
      <input
        type="number"
        value={variant.cost_price}
        onChange={e => onChange({ ...variant, cost_price: Number(e.target.value) })}
        placeholder="HPP"
        className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
      />
      <button onClick={onRemove} className="text-slate-400 hover:text-brand-danger p-1">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function ProductForm({ product, categories, onClose, onSaved }) {
  const isEdit = !!product?.id
  const fileRef = useRef()

  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    newCategory: '',
    has_variants: product?.has_variants || false,
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    variants: product?.variants || [],
    is_active: product?.is_active ?? true,
    stock_item: product?.stock_item || false,
    stock_count: product?.stock_count || '',
    image_url: product?.image_url || '',
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveCategory = form.category === '__new__' ? form.newCategory : form.category

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Gambar maksimal 2MB'); return }

    setUploading(true)
    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => { setError('Upload gagal'); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setForm(f => ({ ...f, image_url: url }))
        setUploading(false)
      }
    )
  }

  const addVariant = () => {
    setForm(f => ({
      ...f,
      variants: [...f.variants, { id: Date.now().toString(), name: '', price: '', cost_price: '', is_active: true }]
    }))
  }

  const updateVariant = (idx, val) => {
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === idx ? val : v) }))
  }

  const removeVariant = (idx) => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nama produk wajib diisi'); return }
    if (!effectiveCategory) { setError('Kategori wajib diisi'); return }
    if (!form.has_variants && (!form.price || !form.cost_price)) {
      setError('Harga jual dan HPP wajib diisi'); return
    }
    if (form.has_variants && form.variants.some(v => !v.name || !v.price || !v.cost_price)) {
      setError('Semua varian harus diisi lengkap'); return
    }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        category: effectiveCategory.trim(),
        has_variants: form.has_variants,
        price: form.has_variants ? 0 : Number(form.price),
        cost_price: form.has_variants ? 0 : Number(form.cost_price),
        variants: form.has_variants ? form.variants.map(v => ({
          ...v, price: Number(v.price), cost_price: Number(v.cost_price)
        })) : [],
        is_active: form.is_active,
        stock_item: form.stock_item,
        stock_count: form.stock_item ? Number(form.stock_count) : null,
        image_url: form.image_url || '',
      }

      if (isEdit) {
        await updateDoc(doc(db, 'products', product.id), { ...data, updated_at: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'products'), { ...data, created_at: serverTimestamp() })
      }
      onSaved?.()
      onClose()
    } catch (e) {
      setError('Gagal menyimpan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Foto Produk</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative border-2 border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-brand-green transition-colors overflow-hidden"
            >
              {form.image_url ? (
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus size={24} className="text-slate-400 mb-1" />
                  <p className="text-slate-400 text-sm">Klik untuk upload (max 2MB)</p>
                </>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center">
                  <Loader className="animate-spin text-brand-green mb-1" size={20} />
                  <p className="text-sm text-brand-green">{uploadProgress}%</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Produk *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="cth: Teh Poci Original"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategori *</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
            >
              <option value="">Pilih kategori</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ Kategori baru</option>
            </select>
            {form.category === '__new__' && (
              <input
                type="text"
                value={form.newCategory}
                onChange={e => setForm(f => ({ ...f, newCategory: e.target.value }))}
                placeholder="Nama kategori baru"
                className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            )}
          </div>

          {/* Has Variants toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Punya Varian?</p>
              <p className="text-xs text-slate-400">cth: ukuran, rasa, suhu</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, has_variants: !f.has_variants }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.has_variants ? 'bg-brand-green' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.has_variants ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Price (no variants) */}
          {!form.has_variants && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Harga Jual (Rp) *</label>
                <input type="number" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">HPP / Modal (Rp) *</label>
                <input type="number" value={form.cost_price}
                  onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="0" />
              </div>
            </div>
          )}

          {/* Variants */}
          {form.has_variants && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Daftar Varian</label>
                <p className="text-xs text-slate-400">Harga Jual / HPP</p>
              </div>
              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <VariantRow key={v.id || i} variant={v}
                    onChange={val => updateVariant(i, val)}
                    onRemove={() => removeVariant(i)} />
                ))}
              </div>
              <button onClick={addVariant}
                className="mt-2 w-full border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium rounded-xl py-2.5 hover:border-brand-green hover:text-brand-green transition-colors flex items-center justify-center gap-1">
                <Plus size={15} /> Tambah Varian
              </button>
            </div>
          )}

          {/* Stock tracking */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Batasi Stok Harian?</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Untuk produk yang jumlahnya terbatas per hari.<br/>
                  Contoh: menu spesial yang hanya tersedia 20 porsi.
                </p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, stock_item: !f.stock_item }))}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${form.stock_item ? 'bg-brand-green' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.stock_item ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            {!form.stock_item && (
              <p className="text-xs text-slate-400 mt-2 italic">
                💡 Untuk Teh Poci biasa: biarkan nonaktif — stok minuman tidak dibatasi per produk.
              </p>
            )}
          </div>
          {form.stock_item && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stok Tersedia Sekarang</label>
              <input type="number" value={form.stock_count}
                onChange={e => setForm(f => ({ ...f, stock_count: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="0" />
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
            <p className="text-sm font-medium text-slate-700">Produk Aktif</p>
            <button
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-brand-green' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {error && <p className="text-brand-danger text-sm bg-red-50 rounded-xl p-3">{error}</p>}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 active:scale-95 transition-all">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || uploading}
            className="flex-1 bg-brand-green text-white font-bold rounded-xl py-2.5 active:scale-95 transition-all disabled:opacity-50">
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </div>
  )
}
