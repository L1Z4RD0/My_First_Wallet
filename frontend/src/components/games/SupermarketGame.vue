<template>
  <div class="game-container">
    <h2>🛒 El Supermercado</h2>
    
    <div v-if="!gameStarted" class="intro-screen">
      <p>Tienes que hacer las compras de la semana. Tienes un presupuesto de <strong>$20</strong>. Elige la mejor opción para ahorrar, pero ¡cuidado con comprar cosas de mala calidad!</p>
      <button class="btn-primary" @click="startGame">Ir de Compras</button>
    </div>

    <div v-else-if="!gameOver" class="play-screen">
      <div class="product-header">
        <h3>Lista de compras: <span class="highlight">{{ currentProduct.name }}</span></h3>
        <p>Presupuesto: <strong>$20</strong></p>
      </div>

      <div class="options-grid">
        <div class="option-card" @click="selectOption('premium')">
          <div class="emoji">{{ currentProduct.emoji }}</div>
          <h4>Marca Premium</h4>
          <p class="desc">La más cara y lujosa del mercado.</p>
          <p class="price">$18</p>
        </div>

        <div class="option-card" @click="selectOption('generic')">
          <div class="emoji">{{ currentProduct.emoji }}</div>
          <h4>Marca Genérica</h4>
          <p class="desc">Buena calidad, precio justo.</p>
          <p class="price">$12</p>
        </div>

        <div class="option-card" @click="selectOption('dubious')">
          <div class="emoji">❓</div>
          <h4>Marca Dudosa</h4>
          <p class="desc">Muy barata, pero expira mañana.</p>
          <p class="price">$5</p>
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

const products = [
  { name: 'Cereal', emoji: '🥣' },
  { name: 'Leche', emoji: '🥛' },
  { name: 'Pan', emoji: '🍞' }
]

const currentProduct = ref(null)

const startGame = () => {
  const randomIdx = Math.floor(Math.random() * products.length)
  currentProduct.value = products[randomIdx]
  gameStarted.value = true
}

const selectOption = (type) => {
  gameOver.value = true
  let success = false
  let msg = ""
  let baseReward = 0

  if (type === 'premium') {
    msg = "Compraste lo más caro sin necesidad. Te gastaste casi todo tu presupuesto ($18)."
    baseReward = 2 // 20 - 18
  } else if (type === 'dubious') {
    msg = "¡Oh no! El producto estaba malo y tuviste que tirarlo. Gastaste $5 para nada y no te ahorraste nada real."
    baseReward = 0
  } else if (type === 'generic') {
    success = true
    msg = "¡Excelente decisión! Compraste algo de buena calidad a un precio justo y te ahorraste $8."
    baseReward = 8 // 20 - 12
  }

  if (success) {
    const res = playerStore.jugarMinijuego('supermercado', baseReward)
    emit('game-completed', {
      success: true,
      recompensa: res.recompensa,
      title: '¡Compra Inteligente!',
      msg: `${msg} (Multiplicador de premio: x${res.multiplicador})`
    })
  } else {
    playerStore.gastarEnergia(1)
    emit('game-completed', {
      success: false,
      recompensa: baseReward, // give them the change if any, but it's small
      title: 'Cuidado con tus gastos',
      msg: msg
    })
  }
}
</script>

<style scoped>
.game-container {
  text-align: center;
}

.highlight {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.options-grid {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
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

.option-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
}

.emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.price {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-color);
  margin-top: auto;
  padding-top: 1rem;
}

.desc {
  font-size: 0.9rem;
  color: #636e72;
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
