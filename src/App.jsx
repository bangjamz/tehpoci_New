import { useAuthStore } from './store/authStore'
import { useAuthListener } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import PinLockPage from './pages/PinLockPage'
import PosPage from './pages/PosPage'
import DashboardPage from './pages/DashboardPage'
import LoadingScreen from './components/shared/LoadingScreen'

export default function App() {
  useAuthListener()

  const { user, userProfile, isPinUnlocked, loading } = useAuthStore()

  // Masih mengecek status auth
  if (loading) return <LoadingScreen />

  // Sudah login tapi profil Firestore belum dimuat → tampilkan loading
  // (bukan login page — ini mencegah loop redirect saat Firestore lambat)
  if (user && !userProfile) return <LoadingScreen />

  // Belum login sama sekali
  if (!user) return <LoginPage />

  // Kasir: PIN belum dibuka
  if (userProfile.role === 'CASHIER' && !isPinUnlocked) return <PinLockPage />

  // Owner → Dashboard
  if (userProfile.role === 'OWNER') return <DashboardPage />

  // Kasir → POS
  return <PosPage />
}
