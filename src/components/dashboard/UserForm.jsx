import { useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfig } from '../../lib/firebase'
import { X, Eye, EyeOff } from 'lucide-react'

function hashPin(pin) { return btoa(pin) }

export default function UserForm({ user: editUser, onClose, onSaved }) {
  const isEdit = !!editUser?.id

  const [form, setForm] = useState({
    display_name: editUser?.display_name || '',
    email: editUser?.email || '',
    password: '',
    pin: editUser ? '' : '',
    is_active: editUser?.is_active ?? true,
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!form.display_name.trim()) { setError('Nama wajib diisi'); return }
    if (!isEdit) {
      if (!form.email.trim()) { setError('Email wajib diisi'); return }
      if (form.password.length < 6) { setError('Password minimal 6 karakter'); return }
      if (!form.pin || form.pin.length < 4) { setError('PIN minimal 4 digit'); return }
    }

    setSaving(true)
    try {
      if (!isEdit) {
        // Gunakan secondary app agar Owner tidak ter-logout saat membuat akun kasir
        const secondaryApp = initializeApp(firebaseConfig, `create-user-${Date.now()}`)
        const secondaryAuth = getAuth(secondaryApp)
        let uid
        try {
          // Coba buat akun baru
          const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password)
          uid = cred.user.uid
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            // Akun Auth sudah ada (kemungkinan Firestore-nya yang gagal sebelumnya)
            // Login dengan secondary app untuk ambil UID-nya
            try {
              const cred = await signInWithEmailAndPassword(secondaryAuth, form.email, form.password)
              uid = cred.user.uid
              // Cek apakah dokumen Firestore sudah ada
              const existing = await getDoc(doc(db, 'users', uid))
              if (existing.exists()) {
                throw new Error('Email sudah terdaftar dan profil kasir sudah ada. Cari di daftar kasir.')
              }
              // Dokumen belum ada → lanjut buat Firestore doc (recovery)
            } catch (signInErr) {
              if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
                throw new Error('Email sudah terdaftar dengan password berbeda. Gunakan password yang sama atau hubungi Super Owner.')
              }
              throw signInErr
            }
          } else {
            throw authErr
          }
        } finally {
          await secondaryAuth.signOut()
          await deleteApp(secondaryApp)
        }

        await setDoc(doc(db, 'users', uid), {
          uid,
          email: form.email.trim().toLowerCase(),
          display_name: form.display_name.trim(),
          role: 'CASHIER',
          is_active: true,
          assigned_store: 'branch_01',
          pin_hash: hashPin(form.pin),
          pin_length: form.pin.length,
          created_at: serverTimestamp(),
        })
      } else {
        const updates = {
          display_name: form.display_name.trim(),
          is_active: form.is_active,
        }
        if (form.pin && form.pin.length >= 4) {
          updates.pin_hash = hashPin(form.pin)
          updates.pin_length = form.pin.length
        }
        await updateDoc(doc(db, 'users', editUser.id), updates)
      }
      onSaved?.()
      onClose()
    } catch (e) {
      if (e.code === 'auth/invalid-email') setError('Format email tidak valid')
      else if (e.code === 'auth/weak-password') setError('Password terlalu lemah (min. 6 karakter)')
      else setError(e.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? 'Edit Kasir' : 'Tambah Kasir Baru'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label>
            <input type="text" value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="cth: Budi Santoso" />
          </div>

          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} disabled
                className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">Email tidak bisa diubah. Untuk ganti email, hapus akun ini dan buat akun baru.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="kasir@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green pr-10"
                    placeholder="Min. 6 karakter" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PIN {isEdit ? '(kosongkan jika tidak diubah)' : '*'} <span className="text-slate-400 font-normal">(4–6 digit)</span>
            </label>
            <input type="password" inputMode="numeric" maxLength={6}
              value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green tracking-widest"
              placeholder="4-6 digit angka" />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Status Akun</p>
                <p className="text-xs text-slate-400">{form.is_active ? 'Aktif — bisa login' : 'Nonaktif — tidak bisa login'}</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-brand-green' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          )}

          {error && <p className="text-brand-danger text-sm bg-red-50 rounded-xl p-3">{error}</p>}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 active:scale-95 transition-all">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-brand-green text-white font-bold rounded-xl py-2.5 active:scale-95 transition-all disabled:opacity-50">
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Akun'}
          </button>
        </div>
      </div>
    </div>
  )
}
