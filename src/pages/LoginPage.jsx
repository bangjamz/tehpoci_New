import { useState } from 'react'
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { Coffee, AlertCircle, X, Clock } from 'lucide-react'

const LS_KEY = 'tp_recent_logins'

function getRecentLogins() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function saveLogin(email) {
  try {
    const prev = getRecentLogins()
    const next = [email, ...prev.filter(e => e !== email)].slice(0, 4)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {}
}

function removeLogin(email) {
  try {
    const next = getRecentLogins().filter(e => e !== email)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {}
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginError, clearLoginError } = useAuthStore()
  const [mode, setMode] = useState('select')
  const recentLogins = getRecentLogins()

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') setError('Login dibatalkan.')
      else if (e.code === 'auth/popup-blocked') setError('Popup diblokir browser. Izinkan popup untuk domain ini.')
      else setError('Login gagal: ' + e.code)
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      saveLogin(email)
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Email atau password salah.')
      } else {
        setError('Login gagal: ' + e.code)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-green rounded-2xl mb-4 shadow-lg">
            <Coffee className="text-brand-yellow" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-brand-green">Teh Poci POS</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem Kasir Digital</p>
        </div>

        {loginError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex gap-3">
            <AlertCircle size={18} className="text-brand-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-danger mb-0.5">Akses Ditolak</p>
              <p className="text-sm text-red-700">{loginError}</p>
            </div>
            <button onClick={clearLoginError} className="text-red-300 hover:text-red-500 shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6">
          {mode === 'select' && (
            <div className="space-y-3">
              <p className="text-center text-sm text-slate-500 mb-4">Masuk sebagai:</p>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full touch-target flex items-center justify-center gap-3 bg-brand-green text-white rounded-xl px-4 py-3 font-semibold hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                {loading ? 'Membuka...' : 'Owner (Google)'}
              </button>
              <button
                onClick={() => { setMode('cashier'); setError('') }}
                disabled={loading}
                className="w-full touch-target flex items-center justify-center gap-3 border-2 border-brand-green text-brand-green rounded-xl px-4 py-3 font-semibold hover:bg-brand-light active:scale-95 transition-all disabled:opacity-50"
              >
                Kasir (Email & Password)
              </button>
              {error && <p className="text-brand-danger text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>}
            </div>
          )}

          {mode === 'cashier' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => { setMode('select'); setError('') }}
                  className="text-slate-400 hover:text-brand-green text-sm active:scale-95">
                  ← Kembali
                </button>
                <span className="text-slate-700 font-semibold">Login Kasir</span>
              </div>

              {/* Recent logins */}
              {recentLogins.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <Clock size={11} /> Login sebelumnya:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentLogins.map(e => (
                      <div key={e} className="flex items-center gap-1 bg-slate-100 rounded-lg pl-3 pr-1 py-1">
                        <button
                          type="button"
                          onClick={() => setEmail(e)}
                          className="text-xs text-slate-700 font-medium hover:text-brand-green max-w-[160px] truncate"
                        >
                          {e}
                        </button>
                        <button
                          type="button"
                          onClick={() => { removeLogin(e); setEmail(prev => prev === e ? '' : prev) }}
                          className="text-slate-300 hover:text-brand-danger ml-0.5 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus={recentLogins.length === 0}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="kasir@tehpoci.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus={recentLogins.length > 0}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-brand-danger text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full touch-target bg-brand-green text-white rounded-xl py-3 font-semibold hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Teh Poci POS v2.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
