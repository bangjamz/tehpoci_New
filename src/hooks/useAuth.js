import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

async function fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, setProfileError, reset }) {
  const userRef = doc(db, 'users', firebaseUser.uid)

  console.log('[Auth] Fetching profile for:', firebaseUser.email)

  try {
    const snap = await getDoc(userRef)
    console.log('[Auth] Doc exists:', snap.exists())

    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }
      if (!profile.is_active) {
        await auth.signOut()
        reset()
        return
      }
      setUserProfile(profile)
      setLoading(false)
      return
    }

    // Dokumen belum ada
    if (firebaseUser.email === BOOTSTRAP_OWNER_EMAIL) {
      console.log('[Auth] Bootstrapping owner...')
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
      console.log('[Auth] Owner doc created')

      const storeRef = doc(db, 'stores', 'branch_01')
      const storeSnap = await getDoc(storeRef)
      if (!storeSnap.exists()) {
        await setDoc(storeRef, {
          name: 'Teh Poci - Cabang Utama',
          address: '',
          created_at: serverTimestamp(),
        })
        console.log('[Auth] Store doc created')
      }

      setUserProfile({ id: firebaseUser.uid, ...ownerProfile })
      setLoading(false)
      return
    }

    console.warn('[Auth] Email tidak terdaftar:', firebaseUser.email)
    await auth.signOut()
    reset()

  } catch (e) {
    console.error('[Auth] ERROR code:', e.code)
    console.error('[Auth] ERROR message:', e.message)
    // Set error state agar App.jsx bisa tampilkan pesan + tombol retry
    setProfileError(e.code + ': ' + e.message)
  }
}

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, setProfileError, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] State changed:', firebaseUser?.email ?? 'logged out')
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, setProfileError, reset })
      } else {
        reset()
      }
    })
    return unsubscribe
  }, [])
}
