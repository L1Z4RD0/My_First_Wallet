<template>
  <div class="app-container">
    <AppHeader :currentView="currentView" @change-view="changeView" />
    
    <main class="main-content">
      <transition name="fade" mode="out-in">
        <WalletView v-if="currentView === 'wallet'" />
        <div v-else-if="!currentGame" class="games-grid">
          <GameCard 
            v-for="game in games" 
            :key="game.id" 
            :game="game" 
            @play="openGame"
          />
        </div>
        <div v-else class="game-view">
          <div class="game-view-header">
            <button class="back-btn" @click="closeGame">
              <span class="icon">🔙</span> Volver a los juegos
            </button>
          </div>
          
          <component 
            :is="currentGameComponent" 
            @game-completed="onGameCompleted"
          />
        </div>
      </transition>
    </main>
    
    <!-- Reward Modal -->
    <div v-if="showRewardModal" class="modal-overlay">
      <div class="modal-content reward-modal">
        <h2>{{ modalTitle }}</h2>
        <div class="coins-animation">💰</div>
        <p>{{ modalMessage }}</p>
        <h3 class="reward-amount" v-if="lastReward > 0">+${{ lastReward }}</h3>
        
        <button class="btn-primary" @click="closeRewardModal">¡Entendido!</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from './store/player'
import AppHeader from './components/AppHeader.vue'
import GameCard from './components/GameCard.vue'
import WalletView from './components/WalletView.vue'

// Import placeholders for the 5 games (they will be created next)
import BudgetGame from './components/games/BudgetGame.vue'
import SupermarketGame from './components/games/SupermarketGame.vue'
import SavingsGame from './components/games/SavingsGame.vue'
import RouletteGame from './components/games/RouletteGame.vue'
import InvestmentGame from './components/games/InvestmentGame.vue'

const playerStore = usePlayerStore()

const games = ref([
  {
    id: 'budget-game',
    title: 'El Repartidor',
    level: 1,
    description: 'Reparte tu sueldo sabiamente. ¡Cuidado con los imprevistos!',
    bgColor: '#FF6B6B',
    icon: '📊'
  },
  {
    id: 'supermarket-game',
    title: 'El Supermercado',
    level: 1,
    description: 'Compra inteligente y ahorra dinero eligiendo la mejor opción.',
    bgColor: '#4ECDC4',
    icon: '🛒'
  },
  {
    id: 'savings-game',
    title: 'La Alcancía Mágica',
    level: 2,
    description: '¿Gastar ahora o guardar para el futuro? Tú decides.',
    bgColor: '#FFD166',
    icon: '🐷'
  },
  {
    id: 'roulette-game',
    title: 'La Ruleta de la Vida',
    level: 2,
    description: 'Eventos inesperados. ¡Es mejor tener un seguro!',
    bgColor: '#118AB2',
    icon: '🎡'
  },
  {
    id: 'investment-game',
    title: 'El Puesto de Limonada',
    level: 3,
    description: 'Invierte en tu negocio. El clima decidirá tu suerte.',
    bgColor: '#06D6A0',
    icon: '🍋'
  }
])

const currentGame = ref(null)
const showRewardModal = ref(false)
const lastReward = ref(0)
const modalTitle = ref('¡Felicidades! 🎉')
const modalMessage = ref('Has ganado')
const currentView = ref('games')

const componentMap = {
  'budget-game': BudgetGame,
  'supermarket-game': SupermarketGame,
  'savings-game': SavingsGame,
  'roulette-game': RouletteGame,
  'investment-game': InvestmentGame
}

const currentGameComponent = computed(() => {
  return currentGame.value ? componentMap[currentGame.value.id] : null
})

const openGame = (game) => {
  if (playerStore.enDeuda && game.id === 'investment-game') {
    alert("¡Estás en deuda! No puedes invertir hasta que pagues lo que debes.");
    return;
  }
  if (playerStore.energiaAgotada) {
    alert("Te has quedado sin energía por hoy. ¡Termina el día para recuperarla!");
    return;
  }
  currentGame.value = game
}

const closeGame = () => {
  currentGame.value = null
}

const changeView = (view) => {
  currentView.value = view
  if (view === 'games') currentGame.value = null
}

const closeRewardModal = () => {
  showRewardModal.value = false
}

const onGameCompleted = (result) => {
  if (result) {
    if (result.recompensa > 0) {
      lastReward.value = result.recompensa
      modalTitle.value = result.title || '¡Felicidades! 🎉'
      modalMessage.value = result.msg || 'Has ganado'
    } else {
      lastReward.value = 0
      modalTitle.value = result.title || 'Sigue intentándolo'
      modalMessage.value = result.msg || 'Esta vez no hubo ganancias.'
    }
    showRewardModal.value = true
    closeGame()
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: popIn 0.5s ease-out;
}

.main-content {
  flex: 1;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.game-view {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-md);
}

.game-view-header {
  margin-bottom: 2rem;
}

.back-btn {
  background: white;
  border: 2px solid #dfe6e9;
  color: var(--text-dark);
  padding: 10px 20px;
  border-radius: 50px;
  font-family: 'Fredoka', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.back-btn:hover {
  background: #f1f2f6;
  transform: translateX(-5px);
  border-color: #b2bec3;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: white;
  padding: 3rem;
  border-radius: var(--border-radius-lg);
  text-align: center;
  box-shadow: var(--shadow-hover);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.reward-modal h2 {
  color: var(--primary-color);
  font-size: 2rem;
  margin-bottom: 1rem;
}

.coins-animation {
  font-size: 5rem;
  margin: 1rem 0;
  animation: bounce 2s infinite;
}

.reward-amount {
  font-size: 3rem;
  color: var(--accent-color);
  text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}
</style>
