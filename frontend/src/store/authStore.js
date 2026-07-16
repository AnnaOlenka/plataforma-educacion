import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,

  setAuth: (user, access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ user, token: access })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, token: null })
  },
}))

export default useAuthStore
