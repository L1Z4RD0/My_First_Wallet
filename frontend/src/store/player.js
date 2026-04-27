import { defineStore } from 'pinia'

const loadState = () => {
  const saved = localStorage.getItem('playerState')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error('Error parseando playerState', e)
    }
  }
  return {
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
      inversion: 0
    }
  }
}

export const usePlayerStore = defineStore('player', {
  state: () => loadState(),
  getters: {
    enDeuda: (state) => state.deuda > 0,
    energiaAgotada: (state) => state.energiaActual <= 0,
    patrimonioTotal: (state) => state.dineroDisponible + state.dineroAhorrado + state.dineroInvertido - state.deuda
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
      
      // Sistema Anti-Exploit de repetición diaria
      if (vecesJugado === 1) multiplicador = 0.5;
      else if (vecesJugado >= 2) multiplicador = 0;

      const recompensaReal = Math.floor(recompensaBase * multiplicador);
      
      if (recompensaReal > 0) {
        this.ganarDinero(recompensaReal);
      }
      
      this.juegosJugadosHoy[tipoJuego] = vecesJugado + 1;
      
      this.save();
      return { success: true, recompensa: recompensaReal, multiplicador };
    },
    terminarDia() {
      const GASTOS_DIARIOS = 20;
      
      // Cobrar gastos de subsistencia
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

      // Guardar registro histórico
      this.historial.push({
        dia: this.diaActual,
        dineroFinal: this.patrimonioTotal,
        entroEnDeuda: this.enDeuda,
        gastos: GASTOS_DIARIOS
      });

      // Calcular rachas para bonus
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

      // Actualizar energía máxima del día siguiente
      if (this.deuda > 0) {
        this.energiaMaxima = 3; // Penalización estricta por deuda
      } else {
        let bonus = 0;
        if (this.rachas.diasSinDeuda > 0) bonus += 1;
        if (this.rachas.diasConAhorro > 0) bonus += 1;
        this.energiaMaxima = Math.min(5 + bonus, 6); // Base 5, max 6
      }

      // Intereses del banco (1% diario, tope en 200 monedas de capital)
      if (this.dineroAhorrado > 0) {
        const capitalGenerador = Math.min(this.dineroAhorrado, 200);
        // Usar Math.ceil o Math.floor, para niños es mejor darles al menos 1 moneda si tienen algo de ahorro.
        // Si es 1% de 100 es 1. Para que no sea 0 si tienen poco, daremos mínimo 1 si tienen más de 10 ahorrados.
        const interes = Math.floor(capitalGenerador * 0.01); 
        const interesReal = interes > 0 ? interes : (capitalGenerador >= 10 ? 1 : 0);
        this.dineroAhorrado += interesReal;
      }

      // Restaurar energía y avanzar día
      this.energiaActual = this.energiaMaxima;
      this.diaActual += 1;
      
      // Limpiar anti-exploit diario
      this.juegosJugadosHoy = {
        presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0
      };

      this.save();
    },
    pagarDeuda(cantidad) {
      const aPagar = Math.min(cantidad, this.deuda, this.dineroDisponible);
      if (aPagar > 0) {
        this.dineroDisponible -= aPagar;
        this.deuda -= aPagar;
        
        // Al salir de la deuda, se restaura la posibilidad de tener 5 de energía,
        // pero la energía actual no se llena hasta que termine el día.
        if (this.deuda === 0) {
          this.energiaMaxima = 5;
        }
        
        this.save();
        return true;
      }
      return false;
    },
    depositarAhorro(cantidad) {
      if (this.enDeuda) return false; // Regla estricta: No se puede ahorrar ni invertir con deuda
      
      if (this.dineroDisponible >= cantidad && cantidad > 0) {
        this.dineroDisponible -= cantidad;
        this.dineroAhorrado += cantidad;
        this.save();
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
    resetJuego() {
      localStorage.removeItem('playerState');
      const initialState = loadState();
      // Si loadState encontró localStorage vacío, retornó el objeto base.
      // Si no, podríamos tener que forzar el objeto base explícitamente.
      const base = {
        nombre: "Alex", dineroDisponible: 50, dineroAhorrado: 0, dineroInvertido: 0,
        deuda: 0, energiaActual: 5, energiaMaxima: 5, diaActual: 1, historial: [],
        rachas: { diasSinDeuda: 0, diasConAhorro: 0 },
        juegosJugadosHoy: { presupuesto: 0, supermercado: 0, alcancia: 0, ruleta: 0, inversion: 0 }
      };
      Object.assign(this.$state, base);
      this.save();
    }
  }
})
