import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  userProfile: null,
  isPinUnlocked: false,
  loading: true,
  profileError: null,

  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile, profileError: null }),
  setLoading: (loading) => set({ loading }),
  setProfileError: (error) => set({ profileError: error, loading: false }),
  unlockPin: () => set({ isPinUnlocked: true }),
  lockPin: () => set({ isPinUnlocked: false }),
  reset: () => set({ user: null, userProfile: null, isPinUnlocked: false, loading: false, profileError: null }),
}))
