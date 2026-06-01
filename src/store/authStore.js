import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,           // Firebase Auth user
  userProfile: null,    // Firestore user document (role, is_active, etc.)
  isPinUnlocked: false, // PIN lock screen state
  loading: true,

  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ loading }),
  unlockPin: () => set({ isPinUnlocked: true }),
  lockPin: () => set({ isPinUnlocked: false }),
  reset: () => set({ user: null, userProfile: null, isPinUnlocked: false, loading: false }),
}))
