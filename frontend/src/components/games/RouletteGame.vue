<template>
  <div class="game-container">
    <h2>🎡 La Ruleta de la Vida</h2>
    
    <div v-if="!gameStarted" class="intro-screen">
      <p>La vida está llena de sorpresas. Gira la ruleta y descubre qué evento inesperado te depara el destino.</p>
      
      <div class="insurance-box">
        <h3>🛡️ Seguro Contra Accidentes</h3>
        <p>¿Quieres pagar <strong>🪙 5</strong> por un seguro? Si te toca algo muy malo, el seguro cubrirá el costo.</p>
        <div class="insurance-buttons">
          <button class="btn-insurance yes" @click="buyInsurance(true)" :disabled="playerStore.dineroDisponible < 5">Comprar Seguro (🪙 5)</button>
          <button class="btn-insurance no" @click="buyInsurance(false)">No, me arriesgaré</button>
        </div>
      </div>
    </div>

    <div v-else class="play-screen">
      <div class="roulette-wheel" :class="{ 'spinning': isSpinning }">
        <div class="emoji">❓</div>
      </div>

      <div v-if="!isSpinning && eventResult" class="result-card" :class="eventResult.type">
        <h3>{{ eventResult.title }}</h3>
        <p>{{ eventResult.desc }}</p>
        <p class="impact">Impacto: <strong>{{ eventResult.impactLabel }}</strong></p>
        <p v-if="hasInsurance && eventResult.type === 'negative'" class="insurance-used">
          🛡️ ¡Menos mal tenías seguro! El seguro cubrió los gastos.
        </p>
        <button class="btn-primary mt" @click="finishGame">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../../store/player'

const emit = defineEmits(['game-completed'])
const playerStore = usePlayerStore()

const gameStarted = ref(false)
const isSpinning = ref(false)
const hasInsurance = ref(false)
const eventResult = ref(null)

const events = [
  { id: 1, title: '¡Cumpleaños!', desc: 'Tus abuelos te regalaron dinero.', type: 'positive', amount: 20 },
  { id: 2, title: 'Día de suerte', desc: 'Encontraste un billete en la calle.', type: 'positive', amount: 10 },
  { id: 3, title: 'Bici ponchada', desc: 'Se pinchó la rueda de tu bicicleta.', type: 'negative', amount: -15 },
  { id: 4, title: 'Enfermedad', desc: 'Tuviste que ir al doctor por un resfriado.', type: 'negative', amount: -20 },
  { id: 5, title: 'Día tranquilo', desc: 'No pasó nada fuera de lo común.', type: 'neutral', amount: 0 }
]

const buyInsurance = (buy) => {
  if (buy) {
    if (playerStore.gastarDinero(5)) {
      hasInsurance.value = true
    } else {
      return // Should not happen due to button disabled state
    }
  }
  
  if (!playerStore.gastarEnergia(1)) {
    emit('game-completed', { success: false, recompensa: 0, title: 'Sin energía', msg: 'No tienes energía para girar.' })
    return
  }

  gameStarted.value = true
  spinRoulette()
}

const spinRoulette = () => {
  isSpinning.value = true
  
  setTimeout(() => {
    const randomIdx = Math.floor(Math.random() * events.length)
    const ev = events[randomIdx]
    
    let realAmount = ev.amount
    let impactLabel = ev.amount > 0 ? `+🪙 ${ev.amount}` : `🪙 ${ev.amount}`
    
    if (ev.type === 'negative' && hasInsurance.value) {
      realAmount = 0
      impactLabel = '🪙 0 (Cubierto)'
    }

    eventResult.value = { ...ev, realAmount, impactLabel }
    isSpinning.value = false
  }, 2000)
}

const finishGame = () => {
  let title = eventResult.value.title
  let msg = eventResult.value.desc
  let recompensa = 0

  if (eventResult.value.realAmount > 0) {
    // Es ganancia
    playerStore.ganarDinero(eventResult.value.realAmount)
    recompensa = eventResult.value.realAmount
  } else if (eventResult.value.realAmount < 0) {
    // Es pérdida, cobramos a la fuerza
    let absLoss = Math.abs(eventResult.value.realAmount)
    if (playerStore.dineroDisponible >= absLoss) {
      playerStore.dineroDisponible -= absLoss
    } else {
      let faltante = absLoss - playerStore.dineroDisponible
      playerStore.dineroDisponible = 0
      playerStore.deuda += faltante
      msg += ` ¡Tus ahorros no fueron suficientes y quedaste con una deuda de 🪙 ${faltante}!`
    }
    playerStore.save()
  }

  emit('game-completed', {
    success: true,
    recompensa: recompensa,
    title: title,
    msg: msg
  })
}
</script>

<style scoped>
.game-container {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.insurance-box {
  background: #fff3cd;
  border: 2px solid #ffeeba;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  margin-top: 2rem;
}

.insurance-box h3 {
  color: #856404;
  margin-top: 0;
}

.insurance-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.btn-insurance {
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: transform 0.2s;
}

.btn-insurance.yes {
  background: #28a745;
  color: white;
}
.btn-insurance.yes:disabled { background: #6c757d; cursor: not-allowed; }
.btn-insurance.no {
  background: transparent;
  border: 2px solid #6c757d;
  color: #6c757d;
}

.btn-insurance:not(:disabled):hover {
  transform: scale(1.05);
}

.roulette-wheel {
  width: 150px;
  height: 150px;
  background: linear-gradient(45deg, #FF6B6B, #4ECDC4, #FFD166, #118AB2);
  border-radius: 50%;
  margin: 2rem auto;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  transition: transform 2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.spinning {
  animation: spin 0.5s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.roulette-wheel .emoji {
  font-size: 4rem;
  background: white;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.result-card {
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  animation: popIn 0.5s;
  border: 2px solid transparent;
}

.result-card.positive { background: #d4edda; border-color: #c3e6cb; color: #155724; }
.result-card.negative { background: #f8d7da; border-color: #f5c6cb; color: #721c24; }
.result-card.neutral { background: #e2e3e5; border-color: #d6d8db; color: #383d41; }

.impact {
  font-size: 1.5rem;
  margin: 1rem 0;
}

.insurance-used {
  background: rgba(255,255,255,0.8);
  padding: 0.5rem;
  border-radius: 10px;
  color: #28a745;
  font-weight: bold;
}

.mt {
  margin-top: 1.5rem;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
}
</style>
