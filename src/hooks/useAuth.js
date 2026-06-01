import { useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

async function fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, reset }) {
  const userRef = doc(db, 'users', firebaseUser.uid)

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
      setLoading(false)
      return
    }

    // Dokumen tidak ada — bootstrap Owner
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
      setLoading(false)
      return
    }

    // Email tidak dikenal
    console.warn('User tidak terdaftar di sistem:', firebaseUser.email)
    await auth.signOut()
    reset()

  } catch (e) {
    console.error('Firestore error saat fetch profil:', e.code, e.message)
    // JANGAN signOut saat Firestore error — tunjukkan error ke user saja
    // User tetap login, tapi profil belum dimuat
    setLoading(false)
  }
}

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Proses pending redirect dari Google sign-in
    getRedirectResult(auth)
      .then((result) => {
        // Jika ada redirect result, onAuthStateChanged akan otomatis fire
        if (result?.user) {
          console.log('Redirect result diterima:', result.user.email)
        }
      })
      .catch((e) => {
        // auth/credential-already-in-use atau redirect dibatalkan — abaikan
        if (e.code !== 'auth/credential-already-in-use') {
          console.warn('Redirect result error:', e.code)
        }
      })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, reset })
      } else {
        reset()
      }
    })

    return unsubscribe
  }, [])
}
