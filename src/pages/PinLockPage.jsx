import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { Lock, Delete, LogOut } from 'lucide-react'

function hashPin(pin) {
  return btoa(pin)
}

export default function PinLockPage() {
  const { user, userProfile, unlockPin, reset } = useAuthStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pinLength = userProfile?.pin_length || 4
  const isComplete = pin.length === pinLength

  const handleDigitPress = (d) => {
    if (loading || pin.length >= pinLength) return
    const newPin = pin + d
    setPin(newPin)
    if (newPin.length === pinLength) {
      setTimeout(() => handleSubmitWithPin(newPin), 80)
    }
  }

  const handleDelete = () => {
    if (!loading) setPin(p => p.slice(0, -1))
  }

  const handleSubmitWithPin = async (pinValue) => {
    setLoading(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      const data = snap.data()
      if (!data?.pin_hash) {
        setError('PIN belum dikonfigurasi. Hubungi Owner.')
        setPin('')
        return
      }
      if (data.pin_hash === hashPin(pinValue)) {
        unlockPin()
      } else {
        setError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch {
      setError('Gagal verifikasi PIN. Cek koneksi.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    reset()
    await signOut(auth)
  }

  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center p-6 select-none">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
          <Lock className="text-white" size={32} />
        </div>
        <h2 className="text-white text-xl font-bold">Masukkan PIN</h2>
        <p className="text-green-200 text-sm mt-1">
          Halo, {userProfile?.display_name || 'Kasir'} 👋
        </p>
        <p className="text-green-300 text-xs mt-0.5">{pinLength} digit</p>
      </div>

      {/* PIN dots — dinamis sesuai pin_length */}
      <div className="flex gap-4 mb-6">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-white transition-all duration-150 ${
              i < pin.length ? 'bg-brand-yellow border-brand-yellow scale-110' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-200 text-sm mb-4 bg-red-500 bg-opacity-20 px-4 py-2 rounded-lg text-center max-w-xs">
          {error}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {DIGITS.map((d, i) => {
          if (d === '') return <div key={i} />
          if (d === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center h-16 rounded-2xl bg-white bg-opacity-10 text-white active:bg-opacity-25 transition-all disabled:opacity-40"
              >
                <Delete size={22} />
              </button>
            )
          }
          return (
            <button
              key={i}
              onClick={() => handleDigitPress(d)}
              disabled={loading || isComplete}
              className="flex items-center justify-center h-16 rounded-2xl bg-white bg-opacity-10 text-white text-2xl font-semibold active:bg-opacity-25 transition-all disabled:opacity-40"
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Status / loading */}
      {loading && (
        <p className="mt-6 text-green-200 text-sm animate-pulse">Memverifikasi...</p>
      )}

      {/* Ganti Akun */}
      <button
        onClick={handleLogout}
        className="mt-10 flex items-center gap-2 text-green-300 text-sm hover:text-white transition-colors active:scale-95"
      >
        <LogOut size={16} />
        Ganti Akun
      </button>
    </div>
  )
}
