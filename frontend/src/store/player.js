import { defineStore } from 'pinia'

const defaultAchievements = [
  { id: 'first-game',    title: 'Primer juego',       description: 'Completa tu primer juego educativo.',          difficulty: 'easy',   badge: '🏅', unlocked: false, pinned: false },
  { id: 'savings-star',  title: 'Estrella del ahorro', description: 'Deposita al menos 50 monedas en el banco.',    difficulty: 'medium', badge: '🏵️', unlocked: false, pinned: false },
  { id: 'wealth-wizard', title: 'Mago del patrimonio', description: 'Alcanza 200 monedas de patrimonio total.',     difficulty: 'hard',   badge: '🥇', unlocked: false, pinned: false },
  { id: 'streak-master', title: 'Racha estelar',       description: 'Conéctate 3 días seguidos.',                  difficulty: 'hard',   badge: '🌟', unlocked: false, pinned: false },
  { id: 'debt-free',     title: 'Libre de deuda',      description: 'Termina un día sin deudas.',                  difficulty: 'medium', badge: '✨', unlocked: false, pinned: false }
]

function storageKey(userId) {
  return userId ? `playerState_${userId}` : 'playerState'
}

function defaultState() {
  return {
    nombre: 'Jugador',
    dineroDisponible: 50,
    dineroAhorrado: 0,
    dineroInvertido: 0,
    deuda: 0,
    energiaActual: 5,
    energiaMaxima: 5,
    diaActual: 1,
    historial: [],
    rachas: { diasSinDeuda: 0, diasConAhorro: 0 },
    juegosJugadosHoy: { presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0, quiz: 0 },
    ultimoReset: null,
    lastLogin: null,
    consecutiveDays: 0,
    achievements: defaultAchievements
  }
}

function loadState(userId) {
  const key = storageKey(userId)
  const saved = localStorage.getItem(key)
  const base = defaultState()
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (!parsed.achievements) parsed.achievements = defaultAchievements
      return parsed
    } catch { /* ignore */ }
  }
  return base
}

export const usePlayerStore = defineStore('player', {
  state: () => {
    // Lee el userId guardado en la sesión de auth para cargar el estado correcto
    let userId = null
    try {
      const session = JSON.parse(localStorage.getItem('auth_session') || '{}')
      userId = session?.user?.id ?? null
    } catch { /* ignore */ }
    return loadState(userId)
  },

  getters: {
    enDeuda:        (state) => state.deuda > 0,
    energiaAgotada: (state) => state.energiaActual <= 0,
    patrimonioTotal:(state) => state.dineroDisponible + state.dineroAhorrado + state.dineroInvertido - state.deuda,
    totalJuegosHoy: (state) => Object.values(state.juegosJugadosHoy).reduce((s, v) => s + v, 0)
  },

  actions: {
    _userId() {
      try {
        const session = JSON.parse(localStorage.getItem('auth_session') || '{}')
        return session?.user?.id ?? null
      } catch { return null }
    },

    save() {
      localStorage.setItem(storageKey(this._userId()), JSON.stringify(this.$state))
    },

    // Recarga el estado cuando cambia el usuario (llamar al hacer login)
    reloadForUser(userId) {
      const state = loadState(userId)
      Object.assign(this.$state, state)
    },

    syncToBackend() {
      const token = JSON.parse(localStorage.getItem('auth_session') || '{}')?.token
      if (!token) return
      const unlockedCount = this.achievements.filter(a => a.unlocked).length
      fetch('http://localhost:3000/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ consecutive_days: this.consecutiveDays, achievements_count: unlockedCount })
      }).catch(() => { /* sync silencioso */ })
    },

    gastarEnergia(cantidad = 1) {
      if (this.energiaActual >= cantidad) {
        this.energiaActual -= cantidad
        this.save()
        return true
      }
      return false
    },

    ganarDinero(cantidad) {
      this.dineroDisponible += cantidad
      this.save()
    },

    gastarDinero(cantidad) {
      if (this.dineroDisponible >= cantidad) {
        this.dineroDisponible -= cantidad
        this.save()
        return true
      }
      return false
    },

    jugarMinijuego(tipoJuego, recompensaBase) {
      if (!this.gastarEnergia(1)) return { success: false, msg: 'Sin energía suficiente.' }

      const vecesJugado = this.juegosJugadosHoy[tipoJuego] || 0
      let multiplicador = 1
      if (vecesJugado === 1)  multiplicador = 0.5
      else if (vecesJugado >= 2) multiplicador = 0

      const recompensaReal = Math.floor(recompensaBase * multiplicador)
      if (recompensaReal > 0) this.ganarDinero(recompensaReal)

      this.juegosJugadosHoy[tipoJuego] = vecesJugado + 1
      this.save()
      this.evaluateAchievements()
      return { success: true, recompensa: recompensaReal, multiplicador }
    },

    terminarDia() {
      const GASTOS_DIARIOS = 50

      if (this.dineroDisponible >= GASTOS_DIARIOS) {
        this.dineroDisponible -= GASTOS_DIARIOS
      } else {
        let faltante = GASTOS_DIARIOS - this.dineroDisponible
        this.dineroDisponible = 0
        if (this.dineroAhorrado >= faltante) {
          this.dineroAhorrado -= faltante
        } else {
          faltante -= this.dineroAhorrado
          this.dineroAhorrado = 0
          this.deuda += faltante
        }
      }

      this.historial.push({
        dia: this.diaActual,
        dineroFinal: this.patrimonioTotal,
        entroEnDeuda: this.enDeuda,
        gastos: GASTOS_DIARIOS
      })

      if (this.deuda === 0) this.rachas.diasSinDeuda += 1
      else this.rachas.diasSinDeuda = 0

      if (this.dineroAhorrado > 0) this.rachas.diasConAhorro += 1
      else this.rachas.diasConAhorro = 0

      if (this.deuda > 0) {
        this.energiaMaxima = 3
      } else {
        let bonus = 0
        if (this.rachas.diasSinDeuda > 0) bonus += 1
        if (this.rachas.diasConAhorro > 0) bonus += 1
        this.energiaMaxima = Math.min(5 + bonus, 6)
      }

      if (this.dineroAhorrado > 0) {
        const capitalGenerador = Math.min(this.dineroAhorrado, 200)
        const interes = Math.floor(capitalGenerador * 0.01)
        const interesReal = interes > 0 ? interes : (capitalGenerador >= 10 ? 1 : 0)
        this.dineroAhorrado += interesReal
      }

      this.energiaActual = this.energiaMaxima
      this.diaActual += 1
      this.juegosJugadosHoy = { presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0, quiz: 0 }
      this.save()
      this.evaluateAchievements()
    },

    pagarDeuda(cantidad) {
      const aPagar = Math.min(cantidad, this.deuda, this.dineroDisponible)
      if (aPagar > 0) {
        this.dineroDisponible -= aPagar
        this.deuda -= aPagar
        if (this.deuda === 0) this.energiaMaxima = 5
        this.save()
        this.evaluateAchievements()
        return true
      }
      return false
    },

    depositarAhorro(cantidad) {
      if (this.enDeuda) return false
      if (this.dineroDisponible >= cantidad && cantidad > 0) {
        this.dineroDisponible -= cantidad
        this.dineroAhorrado += cantidad
        this.save()
        this.evaluateAchievements()
        return true
      }
      return false
    },

    retirarAhorro(cantidad) {
      if (this.dineroAhorrado >= cantidad && cantidad > 0) {
        this.dineroAhorrado -= cantidad
        this.dineroDisponible += cantidad
        this.save()
        return true
      }
      return false
    },

    checkLoginStreak() {
      const today = new Date().toISOString().slice(0, 10)
      if (this.lastLogin === today) return
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      if (this.lastLogin === yesterday) this.consecutiveDays = (this.consecutiveDays || 0) + 1
      else this.consecutiveDays = 1
      this.lastLogin = today
      this.save()
      this.evaluateAchievements()
      this.syncToBackend()
    },

    unlockAchievement(id) {
      const a = this.achievements.find(a => a.id === id)
      if (a && !a.unlocked) { a.unlocked = true; this.save(); return a }
      return null
    },

    togglePinAchievement(id) {
      const a = this.achievements.find(a => a.id === id)
      if (a && a.unlocked) { a.pinned = !a.pinned; this.save(); return true }
      return false
    },

    evaluateAchievements() {
      const newlyUnlocked = []
      const totalJugados = Object.values(this.juegosJugadosHoy).reduce((s, v) => s + v, 0)

      if (totalJugados >= 1)         { const u = this.unlockAchievement('first-game');    if (u) newlyUnlocked.push(u) }
      if (this.dineroAhorrado >= 50) { const u = this.unlockAchievement('savings-star');  if (u) newlyUnlocked.push(u) }
      if (this.patrimonioTotal >= 200){ const u = this.unlockAchievement('wealth-wizard'); if (u) newlyUnlocked.push(u) }
      if (this.consecutiveDays >= 3) { const u = this.unlockAchievement('streak-master'); if (u) newlyUnlocked.push(u) }
      if (!this.enDeuda && this.diaActual > 1) { const u = this.unlockAchievement('debt-free'); if (u) newlyUnlocked.push(u) }

      if (newlyUnlocked.length > 0) this.syncToBackend()
      return newlyUnlocked.map(a => a.id)
    },

    resetJuego() {
      const ahora = new Date().getTime()
      const UN_MES_MS = 30 * 24 * 60 * 60 * 1000
      if (this.ultimoReset && (ahora - this.ultimoReset < UN_MES_MS)) {
        const diasRestantes = Math.ceil((UN_MES_MS - (ahora - this.ultimoReset)) / (24 * 60 * 60 * 1000))
        return { success: false, msg: `Solo puedes reiniciar una vez al mes. Faltan ${diasRestantes} días.` }
      }
      const userId = this._userId()
      localStorage.removeItem(storageKey(userId))
      const base = { ...defaultState(), ultimoReset: ahora }
      Object.assign(this.$state, base)
      this.save()
      return { success: true, msg: 'Juego reiniciado correctamente.' }
    }
  }
})
