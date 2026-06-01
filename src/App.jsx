import { signOut } from 'firebase/auth'
import { auth } from './lib/firebase'
import { useAuthStore } from './store/authStore'
import { useAuthListener } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import PinLockPage from './pages/PinLockPage'
import PosPage from './pages/PosPage'
import DashboardPage from './pages/DashboardPage'
import LoadingScreen from './components/shared/LoadingScreen'

function ErrorScreen({ error, onRetry, onLogout }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="font-bold text-slate-900 mb-1">Gagal memuat profil</h2>
        <p className="text-slate-500 text-sm mb-4">
          Login berhasil, tapi data pengguna tidak bisa diambil dari database.
        </p>
        <div className="bg-slate-50 rounded-xl p-3 mb-5 text-left">
          <p className="text-xs font-mono text-slate-500 break-all">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 active:scale-95 transition-all"
          >
            Logout
          </button>
          <button
            onClick={onRetry}
            className="flex-1 bg-brand-green text-white font-bold rounded-xl py-2.5 active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  useAuthListener()

  const { user, userProfile, isPinUnlocked, loading, profileError, reset } = useAuthStore()

  if (loading) return <LoadingScreen />

  if (user && profileError) {
    return (
      <ErrorScreen
        error={profileError}
        onRetry={() => window.location.reload()}
        onLogout={async () => { await signOut(auth); reset() }}
      />
    )
  }

  if (user && !userProfile) return <LoadingScreen />

  if (!user) return <LoginPage />

  if (userProfile.role === 'CASHIER' && !isPinUnlocked) return <PinLockPage />

  if (userProfile.role === 'OWNER') return <DashboardPage />

  return <PosPage />
}
