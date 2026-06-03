import { defineStore } from 'pinia'

const API = 'http://localhost:3000'

export const useAuthStore = defineStore('auth', {
  state: () => {
    const saved = localStorage.getItem('auth_session')
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return { token: null, user: null }
  },

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin:    (state) => state.user?.role === 'admin',
    isDocente:  (state) => state.user?.role === 'docente',
    isAlumno:   (state) => state.user?.role === 'alumno',
    userId:     (state) => state.user?.id ?? null,
  },

  actions: {
    async login(username, password) {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')

      this.token = data.token
      this.user  = data.user
      localStorage.setItem('auth_session', JSON.stringify({ token: data.token, user: data.user }))
      return data.user
    },

    logout() {
      this.token = null
      this.user  = null
      localStorage.removeItem('auth_session')
    },

    authHeader() {
      return { Authorization: `Bearer ${this.token}` }
    }
  }
})
