import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  userProfile: null,
  isPinUnlocked: false,
  loading: true,
  profileError: null,
  loginError: null,

  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile, profileError: null }),
  setLoading: (loading) => set({ loading }),
  setProfileError: (error) => set({ profileError: error, loading: false }),
  setLoginError: (msg) => set({ loginError: msg }),
  clearLoginError: () => set({ loginError: null }),
  unlockPin: () => set({ isPinUnlocked: true }),
  lockPin: () => set({ isPinUnlocked: false }),
  reset: () => set({ user: null, userProfile: null, isPinUnlocked: false, loading: false, profileError: null, loginError: null }),
}))
