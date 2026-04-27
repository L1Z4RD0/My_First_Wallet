<template>
  <div class="game-container">
    <h2>📊 El Repartidor</h2>
    
    <div v-if="!gameStarted" class="intro-screen">
      <p>Reparte tu sueldo de manera inteligente. A veces hay imprevistos, ¡así que lee bien la situación de hoy!</p>
      <button class="btn-primary" @click="startGame">Comenzar</button>
    </div>

    <div v-else-if="!gameOver" class="play-screen">
      <div class="scenario-card">
        <h3>Situación de hoy</h3>
        <p class="scenario-text">{{ currentScenario.text }}</p>
        <p class="total-money">Dinero a repartir: <strong>${{ totalAmount }}</strong></p>
      </div>

      <div class="allocation-section">
        <div class="bucket">
          <label>🏠 Necesidades (Comida, transporte)</label>
          <input type="range" min="0" :max="totalAmount" v-model.number="allocations.necesidades" />
          <span class="amount">${{ allocations.necesidades }}</span>
        </div>

        <div class="bucket">
          <label>🐷 Ahorro (Para el futuro)</label>
          <input type="range" min="0" :max="totalAmount" v-model.number="allocations.ahorro" />
          <span class="amount">${{ allocations.ahorro }}</span>
        </div>

        <div class="bucket">
          <label>🎮 Deseos (Juguetes, dulces)</label>
          <input type="range" min="0" :max="totalAmount" v-model.number="allocations.deseos" />
          <span class="amount">${{ allocations.deseos }}</span>
        </div>
      </div>

      <div class="summary">
        <p>Total repartido: <strong :class="{'text-danger': currentTotal !== totalAmount, 'text-success': currentTotal === totalAmount}">${{ currentTotal }}</strong> / ${{ totalAmount }}</p>
        <p v-if="currentTotal > totalAmount" class="error">¡Estás gastando más de lo que tienes!</p>
        <p v-if="currentTotal < totalAmount" class="error">¡Aún te falta dinero por repartir!</p>
      </div>

      <button class="btn-primary" :disabled="currentTotal !== totalAmount" @click="checkResult">
        Repartir
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../store/player'

const emit = defineEmits(['game-completed'])
const playerStore = usePlayerStore()

const gameStarted = ref(false)
const gameOver = ref(false)

const baseAmount = 50

const scenarios = [
  { text: "Día normal. Tienes tu sueldo completo.", extra: 0, minNec: 0.5, maxNec: 0.7 },
  { text: "¡El transporte está más caro hoy! Necesitarás gastar un poco más en necesidades.", extra: 0, minNec: 0.6, maxNec: 0.8 },
  { text: "Tuviste un gasto médico imprevisto.", extra: -10, minNec: 0.6, maxNec: 0.8 },
  { text: "¡Recibiste un bono por ayudar en casa!", extra: 15, minNec: 0.4, maxNec: 0.6 }
]

const currentScenario = ref(scenarios[0])
const totalAmount = computed(() => Math.max(10, baseAmount + currentScenario.value.extra))

const allocations = ref({
  necesidades: 0,
  ahorro: 0,
  deseos: 0
})

const currentTotal = computed(() => {
  return allocations.value.necesidades + allocations.value.ahorro + allocations.value.deseos
})

const startGame = () => {
  const randomIdx = Math.floor(Math.random() * scenarios.length)
  currentScenario.value = scenarios[randomIdx]
  
  allocations.value = {
    necesidades: 0,
    ahorro: 0,
    deseos: 0
  }
  
  gameStarted.value = true
}

const checkResult = () => {
  const necRatio = allocations.value.necesidades / totalAmount.value
  const ahorroRatio = allocations.value.ahorro / totalAmount.value

  const minN = currentScenario.value.minNec
  const maxN = currentScenario.value.maxNec
  
  let success = false
  let msg = ""

  if (necRatio < minN) {
    msg = "Pusiste muy poco en Necesidades. ¡Recuerda que debes pagar comida y transporte primero!"
  } else if (necRatio > maxN) {
    msg = "Pusiste demasiado en Necesidades. Podrías haber ahorrado más."
  } else if (ahorroRatio < 0.1) {
    msg = "No ahorraste lo suficiente. Siempre es bueno guardar al menos el 10% para el futuro."
  } else {
    success = true
    msg = "¡Excelente distribución! Cubriste tus necesidades y ahorraste inteligentemente."
  }

  gameOver.value = true

  if (success) {
    const res = playerStore.jugarMinijuego('presupuesto', 10)
    emit('game-completed', {
      success: true,
      recompensa: res.recompensa,
      title: '¡Buen Presupuesto!',
      msg: `${msg} (Multiplicador de premio: x${res.multiplicador})`
    })
  } else {
    playerStore.gastarEnergia(1)
    emit('game-completed', {
      success: false,
      recompensa: 0,
      title: 'Debes mejorar',
      msg: msg
    })
  }
}
</script>

<style scoped>
.game-container {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.scenario-card {
  background: #f1f2f6;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border-left: 5px solid var(--primary-color);
}

.scenario-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3436;
}

.total-money {
  font-size: 1.5rem;
  color: var(--accent-color);
  margin-top: 1rem;
}

.bucket {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
}

.bucket label {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.bucket input[type=range] {
  width: 100%;
  margin-bottom: 0.5rem;
}

.amount {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary-color);
}

.summary {
  margin: 2rem 0;
  font-size: 1.2rem;
}

.text-danger { color: #d63031; }
.text-success { color: #00b894; }
.error { color: #d63031; font-size: 0.9rem; font-weight: bold;}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
}
.btn-primary:disabled {
  background: #b2bec3;
  cursor: not-allowed;
}
.btn-primary:not(:disabled):hover {
  transform: scale(1.05);
}
</style>
