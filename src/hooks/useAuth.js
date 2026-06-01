import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

// UID Google yang diizinkan menjadi Owner pertama
// Kosongkan setelah setup selesai, atau isi UID kamu di sini
const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const userRef = doc(db, 'users', firebaseUser.uid)
          const snap = await getDoc(userRef)

          if (snap.exists()) {
            const profile = { id: snap.id, ...snap.data() }
            if (!profile.is_active) {
              await auth.signOut()
              reset()
              return
            }
            setUserProfile(profile)
          } else if (firebaseUser.email === BOOTSTRAP_OWNER_EMAIL) {
            // Auto-bootstrap: buat dokumen Owner pertama secara otomatis
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

            // Buat dokumen store utama jika belum ada
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
          } else {
            // User tidak dikenal, tidak punya profil
            await auth.signOut()
            reset()
            return
          }
        } catch (e) {
          console.error('Failed to fetch user profile', e)
        }
        setLoading(false)
      } else {
        reset()
      }
    })
    return unsubscribe
  }, [])
}
