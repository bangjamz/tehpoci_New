import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

async function fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, reset }) {
  const userRef = doc(db, 'users', firebaseUser.uid)

  console.log('[Auth] Fetching profile for:', firebaseUser.email, 'UID:', firebaseUser.uid)

  try {
    const snap = await getDoc(userRef)
    console.log('[Auth] Firestore snap exists:', snap.exists())

    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }
      console.log('[Auth] Profile found, role:', profile.role, 'active:', profile.is_active)

      if (!profile.is_active) {
        console.warn('[Auth] Account inactive, signing out')
        await auth.signOut()
        reset()
        return
      }
      setUserProfile(profile)
      setLoading(false)
      return
    }

    // Dokumen tidak ada — cek apakah Owner yang bootstrap
    console.log('[Auth] No profile found. Bootstrap check for:', firebaseUser.email)

    if (firebaseUser.email === BOOTSTRAP_OWNER_EMAIL) {
      console.log('[Auth] Bootstrapping Owner profile...')
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
      console.log('[Auth] Owner profile created')

      const storeRef = doc(db, 'stores', 'branch_01')
      const storeSnap = await getDoc(storeRef)
      if (!storeSnap.exists()) {
        await setDoc(storeRef, {
          name: 'Teh Poci - Cabang Utama',
          address: '',
          created_at: serverTimestamp(),
        })
        console.log('[Auth] Store branch_01 created')
      }

      setUserProfile({ id: firebaseUser.uid, ...ownerProfile })
      setLoading(false)
      return
    }

    // Email tidak terdaftar
    console.warn('[Auth] Unknown email, signing out:', firebaseUser.email)
    await auth.signOut()
    reset()

  } catch (e) {
    console.error('[Auth] Firestore error:', e.code, e.message)
    // Jangan sign out — mungkin hanya koneksi lambat
    // User tetap authenticated, tapi profil belum tersedia
    setLoading(false)
  }
}

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged fired, user:', firebaseUser?.email ?? 'null')

      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, reset })
      } else {
        console.log('[Auth] No user — showing login')
        reset()
      }
    })

    return unsubscribe
  }, [])
}
