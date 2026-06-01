import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            const profile = { id: snap.id, ...snap.data() }
            if (!profile.is_active) {
              // Akun dinonaktifkan oleh Owner
              await auth.signOut()
              reset()
              return
            }
            setUserProfile(profile)
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
