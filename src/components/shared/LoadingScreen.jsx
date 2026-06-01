import { Coffee } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center gap-4">
      <div className="animate-pulse">
        <Coffee className="text-brand-yellow" size={48} />
      </div>
      <p className="text-green-200 text-sm font-medium">Memuat...</p>
    </div>
  )
}
