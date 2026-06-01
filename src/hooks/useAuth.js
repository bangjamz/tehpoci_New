import { useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

async function fetchOrBootstrapProfile(firebaseUser, { setUserProfile, reset }) {
  const userRef = doc(db, 'users', firebaseUser.uid)

  // Retry hingga 3x jika Firestore belum terhubung
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const profile = { id: snap.id, ...snap.data() }
        if (!profile.is_active) {
          await auth.signOut()
          reset()
          return
        }
        setUserProfile(profile)
        return
      }

      // Dokumen belum ada — bootstrap jika Owner
      if (firebaseUser.email === BOOTSTRAP_OWNER_EMAIL) {
        const ownerProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || 'Owner',
          role: 'OWNER',
          is_active: true,
          assigned_store: 'branch_01',
          created_at: serverTimestamp(),
        }
        await setDoc(userRef, ownerProfile)

        // Buat store utama jika belum ada
        const storeRef = doc(db, 'stores', 'branch_01')
        const storeSnap = await getDoc(storeRef)
        if (!storeSnap.exists()) {
          await setDoc(storeRef, {
            name: 'Teh Poci - Cabang Utama',
            address: '',
            created_at: serverTimestamp(),
          })
        }

        setUserProfile({ id: firebaseUser.uid, ...ownerProfile })
        return
      }

      // User tidak dikenal
      await auth.signOut()
      reset()
      return
    } catch (e) {
      const isOffline = e?.code === 'unavailable' || e?.message?.includes('offline')
      if (isOffline && attempt < 3) {
        // Tunggu sebentar lalu retry
        await new Promise(r => setTimeout(r, 1500 * attempt))
        continue
      }
      console.error('Failed to fetch user profile:', e.message)
      // Jika masih gagal setelah 3x, logout
      await auth.signOut()
      reset()
      return
    }
  }
}

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Handle redirect result dari signInWithRedirect (Google login)
    getRedirectResult(auth).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrBootstrapProfile(firebaseUser, { setUserProfile, reset })
        setLoading(false)
      } else {
        reset()
      }
    })

    return unsubscribe
  }, [])
}
