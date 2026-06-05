import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

const BOOTSTRAP_OWNER_EMAIL = 'indrajamz@gmail.com'

async function isAuthorizedOwner(email) {
  try {
    const snap = await getDoc(doc(db, 'config', 'authorized_owners'))
    if (!snap.exists()) return email === BOOTSTRAP_OWNER_EMAIL
    const emails = snap.data().emails || []
    return emails.includes(email) || email === BOOTSTRAP_OWNER_EMAIL
  } catch {
    return email === BOOTSTRAP_OWNER_EMAIL
  }
}

async function fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, setProfileError, setLoginError, reset }) {
  const userRef = doc(db, 'users', firebaseUser.uid)

  try {
    const snap = await getDoc(userRef)

    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() }
      if (!profile.is_active) {
        await auth.signOut()
        setLoginError('Akun kamu sudah dinonaktifkan oleh Owner.')
        reset()
        return
      }
      setUserProfile(profile)
      setLoading(false)
      return
    }

    // Tidak ada dokumen — cek apakah email ini authorized Owner
    const authorized = await isAuthorizedOwner(firebaseUser.email)

    if (authorized) {
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

    // Email tidak diizinkan
    await auth.signOut()
    setLoginError(`Akun Google (${firebaseUser.email}) tidak terdaftar di sistem ini. Hubungi Owner untuk mendapatkan akses.`)
    reset()

  } catch (e) {
    console.error('[Auth] Error:', e.code, e.message)
    setProfileError(e.code + ': ' + e.message)
    setLoading(false)
  }
}

export function useAuthListener() {
  const { setUser, setUserProfile, setLoading, setProfileError, setLoginError, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrBootstrapProfile(firebaseUser, { setUserProfile, setLoading, setProfileError, setLoginError, reset })
      } else {
        reset()
      }
    })
    return unsubscribe
  }, [])
}
