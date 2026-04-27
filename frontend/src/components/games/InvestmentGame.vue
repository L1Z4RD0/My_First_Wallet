<template>
  <div class="game-container">
    <h2>🍋 El Puesto de Limonada</h2>
    
    <div v-if="!gameStarted" class="intro-screen">
      <p>Abre tu propio puesto de limonada. Tienes que invertir dinero para empezar.</p>
      <p class="warning-text">Puede ir bien o mal dependiendo del clima. ¡Piensa bien cuánto quieres arriesgar!</p>
      
      <div v-if="yaJugoHoy" class="error-msg">
        Ya abriste tu puesto hoy. ¡Vuelve mañana!
      </div>
      <div v-else class="options-grid">
        <div class="option-card" :class="{ disabled: playerStore.dineroDisponible < 10 }" @click="invest(10)">
          <div class="emoji">🏪</div>
          <h4>Puesto Pequeño</h4>
          <p>Cuesta: <strong>$10</strong></p>
          <button class="btn-invest" :disabled="playerStore.dineroDisponible < 10">Invertir</button>
        </div>

        <div class="option-card" :class="{ disabled: playerStore.dineroDisponible < 30 }" @click="invest(30)">
          <div class="emoji">🏬</div>
          <h4>Puesto Grande</h4>
          <p>Cuesta: <strong>$30</strong></p>
          <button class="btn-invest" :disabled="playerStore.dineroDisponible < 30">Invertir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../store/player'

const emit = defineEmits(['game-completed'])
const playerStore = usePlayerStore()

const gameStarted = ref(false)

const yaJugoHoy = computed(() => {
  return playerStore.juegosJugadosHoy.inversion >= 1
})

const invest = (amount) => {
  if (yaJugoHoy.value || playerStore.dineroDisponible < amount) return

  if (!playerStore.gastarEnergia(1)) {
    emit('game-completed', { success: false, recompensa: 0, title: 'Sin energía', msg: 'No tienes energía.' })
    return
  }

  // Cobrar la inversión
  playerStore.gastarDinero(amount)
  
  // Registrar que ya jugó
  playerStore.juegosJugadosHoy.inversion += 1
  playerStore.save()

  gameStarted.value = true

  // Determinar clima (70% bueno, 30% malo)
  const isGoodWeather = Math.random() < 0.7
  
  let payout = 0
  let msg = ""

  if (amount === 10) {
    if (isGoodWeather) {
      payout = 15
      msg = "Hizo un sol radiante. ¡Vendiste mucha limonada! Ganaste $15 (+$5 de ganancia)."
    } else {
      payout = 8
      msg = "Llovió todo el día. Hubo pocos clientes. Recuperaste $8 (Perdiste $2)."
    }
  } else if (amount === 30) {
    if (isGoodWeather) {
      payout = 45
      msg = "¡Clima perfecto! Tu puesto grande fue un éxito. Ganaste $45 (+$15 de ganancia)."
    } else {
      payout = 10
      msg = "Una tormenta arruinó el día. Casi nadie compró. Recuperaste $10 (Perdiste $20)."
    }
  }

  // Entregar payout
  if (payout > 0) {
    playerStore.ganarDinero(payout)
  }

  emit('game-completed', {
    success: true,
    recompensa: payout,
    title: isGoodWeather ? '¡Gran Día de Ventas!' : 'Mal Clima',
    msg: msg
  })
}
</script>

<style scoped>
.game-container {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.warning-text {
  color: #d35400;
  font-weight: bold;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.error-msg {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 8px;
  font-weight: bold;
}

.options-grid {
  display: flex;
  gap: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.option-card {
  background: white;
  border: 2px solid #dfe6e9;
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  width: 200px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.option-card:hover:not(.disabled) {
  transform: translateY(-5px);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
}

.option-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(100%);
}

.emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.btn-invest {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  width: 100%;
}

.btn-invest:disabled {
  background: #b2bec3;
  cursor: not-allowed;
}
</style>
