import { useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { Lock, Delete } from 'lucide-react'

// PIN disimpan sebagai hash sederhana di Firestore field `pin_hash`
// Format: btoa(pin) — cukup untuk mencegah plain-text exposure tanpa bcrypt
function hashPin(pin) {
  return btoa(pin)
}

export default function PinLockPage() {
  const { user, userProfile, unlockPin } = useAuthStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDigit = (d) => {
    if (pin.length < 6) setPin((p) => p + d)
  }

  const handleDelete = () => setPin((p) => p.slice(0, -1))

  const handleSubmit = async () => {
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      const data = snap.data()

      if (!data.pin_hash) {
        // Belum set PIN, Owner belum assign PIN ke kasir ini
        setError('PIN belum dikonfigurasi. Hubungi Owner.')
        setLoading(false)
        return
      }

      if (data.pin_hash === hashPin(pin)) {
        unlockPin()
      } else {
        setError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch (e) {
      setError('Gagal verifikasi PIN.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit saat PIN sudah 4-6 digit dan user pencet digit terakhir
  const handleDigitPress = (d) => {
    const newPin = pin + d
    if (newPin.length <= 6) {
      setPin(newPin)
      if (newPin.length >= 4 && newPin.length === (userProfile?.pin_length || 4)) {
        setTimeout(() => handleSubmitWithPin(newPin), 100)
      }
    }
  }

  const handleSubmitWithPin = async (pinValue) => {
    setLoading(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      const data = snap.data()
      if (!data.pin_hash) {
        setError('PIN belum dikonfigurasi. Hubungi Owner.')
        setPin('')
        setLoading(false)
        return
      }
      if (data.pin_hash === hashPin(pinValue)) {
        unlockPin()
      } else {
        setError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch {
      setError('Gagal verifikasi PIN.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center p-6 select-none">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
          <Lock className="text-white" size={32} />
        </div>
        <h2 className="text-white text-xl font-bold">Masukkan PIN</h2>
        <p className="text-green-200 text-sm mt-1">
          Halo, {userProfile?.display_name || user?.displayName || 'Kasir'} 👋
        </p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-white transition-all ${
              i < pin.length ? 'bg-brand-yellow border-brand-yellow' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-200 text-sm mb-4 bg-red-500 bg-opacity-20 px-4 py-2 rounded-lg">
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
                className="touch-target flex items-center justify-center h-16 rounded-2xl bg-white bg-opacity-10 text-white active:bg-opacity-20 transition-all"
              >
                <Delete size={22} />
              </button>
            )
          }
          return (
            <button
              key={i}
              onClick={() => handleDigitPress(d)}
              disabled={loading}
              className="touch-target flex items-center justify-center h-16 rounded-2xl bg-white bg-opacity-10 text-white text-2xl font-semibold active:bg-opacity-20 transition-all disabled:opacity-50"
            >
              {d}
            </button>
          )
        })}
      </div>

      {pin.length >= 4 && (
        <button
          onClick={() => handleSubmitWithPin(pin)}
          disabled={loading}
          className="mt-6 bg-brand-yellow text-brand-green font-bold px-8 py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Verifikasi...' : 'Masuk →'}
        </button>
      )}
    </div>
  )
}
