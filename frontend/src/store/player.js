import { defineStore } from 'pinia'

const defaultAchievements = [
  { id: 'first-game', title: 'Primer juego', description: 'Completa tu primer juego educativo.', difficulty: 'easy', badge: '🏅', unlocked: false, pinned: false },
  { id: 'savings-star', title: 'Estrella del ahorro', description: 'Deposita al menos 50 monedas en el banco.', difficulty: 'medium', badge: '🏵️', unlocked: false, pinned: false },
  { id: 'wealth-wizard', title: 'Mago del patrimonio', description: 'Alcanza 200 monedas de patrimonio total.', difficulty: 'hard', badge: '🥇', unlocked: false, pinned: false },
  { id: 'streak-master', title: 'Racha de estelar', description: 'Conéctate 3 días seguidos.', difficulty: 'hard', badge: '🌟', unlocked: false, pinned: false },
  { id: 'debt-free', title: 'Libre de deuda', description: 'Termina un día sin deudas.', difficulty: 'medium', badge: '✨', unlocked: false, pinned: false }
]

const loadState = () => {
  const saved = localStorage.getItem('playerState')
  const defaultState = {
    nombre: "Alex",
    dineroDisponible: 50,
    dineroAhorrado: 0,
    dineroInvertido: 0,
    deuda: 0,
    energiaActual: 5,
    energiaMaxima: 5,
    diaActual: 1,
    historial: [],
    rachas: {
      diasSinDeuda: 0,
      diasConAhorro: 0
    },
    juegosJugadosHoy: {
      presupuesto: 0,
      supermercado: 0,
      alcancia: 0,
      ruleta: 0,
      inversion: 0,
      quiz: 0
    },
    ultimoReset: null,
    lastLogin: null,
    consecutiveDays: 0,
    achievements: defaultAchievements
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (!parsed.achievements) {
        parsed.achievements = defaultAchievements
      }
      return parsed
    } catch (e) {
      console.error('Error parseando playerState', e)
    }
  }
  return defaultState
}

export const usePlayerStore = defineStore('player', {
  state: () => loadState(),
  getters: {
    enDeuda: (state) => state.deuda > 0,
    energiaAgotada: (state) => state.energiaActual <= 0,
    patrimonioTotal: (state) => state.dineroDisponible + state.dineroAhorrado + state.dineroInvertido - state.deuda,
    totalJuegosHoy: (state) => Object.values(state.juegosJugadosHoy).reduce((sum, val) => sum + val, 0)
  },
  actions: {
    save() {
      localStorage.setItem('playerState', JSON.stringify(this.$state))
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
      if (!this.gastarEnergia(1)) return { success: false, msg: "Sin energía suficiente." };

      const vecesJugado = this.juegosJugadosHoy[tipoJuego] || 0;
      let multiplicador = 1;
      
      if (vecesJugado === 1) multiplicador = 0.5;
      else if (vecesJugado >= 2) multiplicador = 0;

      const recompensaReal = Math.floor(recompensaBase * multiplicador);
      
      if (recompensaReal > 0) {
        this.ganarDinero(recompensaReal);
      }
      
      this.juegosJugadosHoy[tipoJuego] = vecesJugado + 1;
      this.save();
      this.evaluateAchievements();
      return { success: true, recompensa: recompensaReal, multiplicador };
    },
    terminarDia() {
      const GASTOS_DIARIOS = 20;
      
      if (this.dineroDisponible >= GASTOS_DIARIOS) {
        this.dineroDisponible -= GASTOS_DIARIOS;
      } else {
        let faltante = GASTOS_DIARIOS - this.dineroDisponible;
        this.dineroDisponible = 0;
        
        if (this.dineroAhorrado >= faltante) {
          this.dineroAhorrado -= faltante;
        } else {
          faltante -= this.dineroAhorrado;
          this.dineroAhorrado = 0;
          this.deuda += faltante;
        }
      }

      this.historial.push({
        dia: this.diaActual,
        dineroFinal: this.patrimonioTotal,
        entroEnDeuda: this.enDeuda,
        gastos: GASTOS_DIARIOS
      });

      if (this.deuda === 0) {
        this.rachas.diasSinDeuda += 1;
      } else {
        this.rachas.diasSinDeuda = 0;
      }

      if (this.dineroAhorrado > 0) {
        this.rachas.diasConAhorro += 1;
      } else {
        this.rachas.diasConAhorro = 0;
      }

      if (this.deuda > 0) {
        this.energiaMaxima = 3;
      } else {
        let bonus = 0;
        if (this.rachas.diasSinDeuda > 0) bonus += 1;
        if (this.rachas.diasConAhorro > 0) bonus += 1;
        this.energiaMaxima = Math.min(5 + bonus, 6);
      }

      if (this.dineroAhorrado > 0) {
        const capitalGenerador = Math.min(this.dineroAhorrado, 200);
        const interes = Math.floor(capitalGenerador * 0.01);
        const interesReal = interes > 0 ? interes : (capitalGenerador >= 10 ? 1 : 0);
        this.dineroAhorrado += interesReal;
      }

      this.energiaActual = this.energiaMaxima;
      this.diaActual += 1;
      this.juegosJugadosHoy = {
        presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0, quiz: 0
      };
      this.save();
      this.evaluateAchievements();
    },
    pagarDeuda(cantidad) {
      const aPagar = Math.min(cantidad, this.deuda, this.dineroDisponible);
      if (aPagar > 0) {
        this.dineroDisponible -= aPagar;
        this.deuda -= aPagar;
        
        if (this.deuda === 0) {
          this.energiaMaxima = 5;
        }
        
        this.save();
        this.evaluateAchievements();
        return true;
      }
      return false;
    },
    depositarAhorro(cantidad) {
      if (this.enDeuda) return false;
      
      if (this.dineroDisponible >= cantidad && cantidad > 0) {
        this.dineroDisponible -= cantidad;
        this.dineroAhorrado += cantidad;
        this.save();
        this.evaluateAchievements();
        return true;
      }
      return false;
    },
    retirarAhorro(cantidad) {
      if (this.dineroAhorrado >= cantidad && cantidad > 0) {
        this.dineroAhorrado -= cantidad;
        this.dineroDisponible += cantidad;
        this.save();
        return true;
      }
      return false;
    },
    checkLoginStreak() {
      const today = new Date().toISOString().slice(0, 10);
      if (this.lastLogin === today) return;

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (this.lastLogin === yesterday) {
        this.consecutiveDays = (this.consecutiveDays || 0) + 1;
      } else {
        this.consecutiveDays = 1;
      }
      this.lastLogin = today;
      this.save();
      this.evaluateAchievements();
    },
    unlockAchievement(id) {
      const achievement = this.achievements.find((a) => a.id === id);
      if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
        this.save();
        return achievement;
      }
      return null;
    },
    togglePinAchievement(id) {
      const achievement = this.achievements.find((a) => a.id === id);
      if (achievement && achievement.unlocked) {
        achievement.pinned = !achievement.pinned;
        this.save();
        return true;
      }
      return false;
    },
    evaluateAchievements() {
      const newlyUnlocked = [];
      const totalJugados = Object.values(this.juegosJugadosHoy).reduce((sum, val) => sum + val, 0);

      if (totalJugados >= 1) {
        const unlocked = this.unlockAchievement('first-game')
        if (unlocked) newlyUnlocked.push(unlocked)
      }

      if (this.dineroAhorrado >= 50) {
        const unlocked = this.unlockAchievement('savings-star')
        if (unlocked) newlyUnlocked.push(unlocked)
      }

      if (this.patrimonioTotal >= 200) {
        const unlocked = this.unlockAchievement('wealth-wizard')
        if (unlocked) newlyUnlocked.push(unlocked)
      }

      if (this.consecutiveDays >= 3) {
        const unlocked = this.unlockAchievement('streak-master')
        if (unlocked) newlyUnlocked.push(unlocked)
      }

      if (!this.enDeuda && this.diaActual > 1) {
        const unlocked = this.unlockAchievement('debt-free')
        if (unlocked) newlyUnlocked.push(unlocked)
      }

      return newlyUnlocked.map((achievement) => achievement.id);
    },
    resetJuego() {
      const ahora = new Date().getTime();
      const UN_MES_MS = 30 * 24 * 60 * 60 * 1000;
      
      if (this.ultimoReset && (ahora - this.ultimoReset < UN_MES_MS)) {
        const diasRestantes = Math.ceil((UN_MES_MS - (ahora - this.ultimoReset)) / (24 * 60 * 60 * 1000));
        return { success: false, msg: `Solo puedes reiniciar una vez al mes. Faltan ${diasRestantes} días.` };
      }

      localStorage.removeItem('playerState');
      const base = {
        nombre: "Alex", dineroDisponible: 50, dineroAhorrado: 0, dineroInvertido: 0,
        deuda: 0, energiaActual: 5, energiaMaxima: 5, diaActual: 1, historial: [],
        rachas: { diasSinDeuda: 0, diasConAhorro: 0 },
        juegosJugadosHoy: { presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0, quiz: 0 },
        ultimoReset: ahora,
        lastLogin: null,
        consecutiveDays: 0,
        achievements: [
          { id: 'first-game', title: 'Primer juego', description: 'Completa tu primer juego educativo.', difficulty: 'easy', badge: '🏅', unlocked: false, pinned: false },
          { id: 'savings-star', title: 'Estrella del ahorro', description: 'Deposita al menos 50 monedas en el banco.', difficulty: 'medium', badge: '🏵️', unlocked: false, pinned: false },
          { id: 'wealth-wizard', title: 'Mago del patrimonio', description: 'Alcanza 200 monedas de patrimonio total.', difficulty: 'hard', badge: '🥇', unlocked: false, pinned: false },
          { id: 'streak-master', title: 'Racha de estelar', description: 'Conéctate 3 días seguidos.', difficulty: 'hard', badge: '🌟', unlocked: false, pinned: false },
          { id: 'debt-free', title: 'Libre de deuda', description: 'Termina un día sin deudas.', difficulty: 'medium', badge: '✨', unlocked: false, pinned: false }
        ]
      };
      Object.assign(this.$state, base);
      this.save();
      return { success: true, msg: "Juego reiniciado correctamente." };
    }
  }
})
