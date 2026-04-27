<template>
  <div class="game-container">
    <h2>🐷 La Alcancía Mágica</h2>
    
    <div v-if="!gameStarted" class="intro-screen">
      <p>Has ayudado a un vecino a limpiar su jardín y te ha pagado <strong>20 monedas</strong>.</p>
      <div class="money-img">🪙 x 20</div>
      <button class="btn-primary" @click="startGame">¿Qué harás con ellas?</button>
    </div>

    <div v-else-if="!gameOver" class="play-screen">
      <h3>¿Qué quieres hacer con tus monedas?</h3>
      
      <div class="options-grid">
        <div class="option-card spend" @click="selectOption('spend')">
          <div class="emoji">🍭</div>
          <h4>Comprar Dulces Ahora</h4>
          <p class="desc">Gastarás las 20 monedas al instante, pero serás feliz por un rato.</p>
          <span class="tag tag-danger">Gastar</span>
        </div>

        <div class="option-card save" @click="selectOption('save')">
          <div class="emoji">🏦</div>
          <h4>Guardar en el Banco</h4>
          <p class="desc">Enviarlas a tu cuenta de ahorros donde generarán intereses mañana.</p>
          <span class="tag tag-success">Ahorrar</span>
        </div>
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
const gameOver = ref(false)

const startGame = () => {
  gameStarted.value = true
}

const selectOption = (choice) => {
  gameOver.value = true
  
  if (!playerStore.gastarEnergia(1)) {
    emit('game-completed', { success: false, recompensa: 0, title: 'Sin energía', msg: 'No pudiste jugar.' })
    return;
  }

  const baseReward = 20

  if (choice === 'spend') {
    // Si gasta, le damos las monedas pero su mensaje es neutral/negativo a largo plazo
    // En realidad, si "compra dulces" se gasta las 20, por ende gana 0 netos.
    emit('game-completed', {
      success: true,
      recompensa: 0, // Se ganaron 20 pero se gastaron 20 al instante
      title: '¡Qué ricos dulces!',
      msg: 'Te gastaste tus 20 monedas en dulces. Fue divertido, pero tu alcancía sigue vacía.'
    })
  } else if (choice === 'save') {
    // Si ahorra, enviamos 20 a su ahorro directo
    if (playerStore.enDeuda) {
      // Regla estricta: No puede ahorrar con deuda
      emit('game-completed', {
        success: false,
        recompensa: 0,
        title: '¡Estás endeudado!',
        msg: 'Querías ahorrar, pero el banco retuvo tus 20 monedas para pagar una parte de tu deuda. ¡Prioridades!'
      })
      playerStore.pagarDeuda(20) // Forzamos el pago
    } else {
      playerStore.dineroAhorrado += baseReward;
      playerStore.save();
      emit('game-completed', {
        success: true,
        recompensa: 0, // No va a disponible, fue directo a ahorro, mostramos 0 en popup pero el dinero subió
        title: '¡Excelente decisión!',
        msg: 'Tus 20 monedas fueron depositadas directo a tu ahorro. ¡Mañana empezarán a darte intereses!'
      })
    }
  }
}
</script>

<style scoped>
.game-container {
  text-align: center;
}

.money-img {
  font-size: 3rem;
  margin: 1.5rem 0;
  animation: pulse 2s infinite;
}

.options-grid {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.option-card {
  background: white;
  border: 2px solid #dfe6e9;
  border-radius: var(--border-radius-lg);
  padding: 2.5rem;
  width: 220px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.option-card.spend:hover { border-color: #d63031; transform: scale(1.05); }
.option-card.save:hover { border-color: #00b894; transform: scale(1.05); }

.emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.desc {
  font-size: 0.95rem;
  color: #636e72;
  margin-bottom: 2rem;
}

.tag {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 10px;
  font-weight: bold;
  color: white;
}

.tag-danger { background: #d63031; }
.tag-success { background: #00b894; }

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
