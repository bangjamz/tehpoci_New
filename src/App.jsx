import { useEffect } from 'react'
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

  if (loading) return <LoadingScreen />

  // Belum login
  if (!user || !userProfile) return <LoginPage />

  // Sudah login tapi PIN belum di-unlock (khusus Cashier)
  if (userProfile.role === 'CASHIER' && !isPinUnlocked) return <PinLockPage />

  // Owner → Dashboard
  if (userProfile.role === 'OWNER') return <DashboardPage />

  // Cashier → POS
  return <PosPage />
}
