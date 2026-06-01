import { useState } from 'react'
import { signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { Coffee } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('select') // 'select' | 'cashier'

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      // Redirect-based login — lebih kompatibel dengan COOP policy browser modern
      await signInWithRedirect(auth, googleProvider)
      // Halaman akan redirect ke Google, lalu kembali ke sini secara otomatis
    } catch (e) {
      setError('Login Google gagal. Coba lagi.')
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError('Email atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-green rounded-2xl mb-4 shadow-lg">
            <Coffee className="text-brand-yellow" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-brand-green">Teh Poci POS</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem Kasir Digital</p>
        </div>

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
                {loading ? 'Mengarahkan ke Google...' : 'Owner (Google)'}
              </button>
              <button
                onClick={() => setMode('cashier')}
                className="w-full touch-target flex items-center justify-center gap-3 border-2 border-brand-green text-brand-green rounded-xl px-4 py-3 font-semibold hover:bg-brand-light active:scale-95 transition-all"
              >
                Kasir (Email & Password)
              </button>
            </div>
          )}

          {mode === 'cashier' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setMode('select'); setError('') }}
                  className="text-slate-400 hover:text-brand-green text-sm"
                >
                  ← Kembali
                </button>
                <span className="text-slate-700 font-semibold">Login Kasir</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="kasir@tehpoci.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <p className="text-brand-danger text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full touch-target bg-brand-green text-white rounded-xl py-3 font-semibold hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>
          )}

          {mode === 'select' && error && (
            <p className="text-brand-danger text-sm text-center mt-3 bg-red-50 rounded-lg p-2">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Teh Poci POS v1.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
