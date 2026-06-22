<template>
  <div class="app-container">
    <AppHeader
      :currentView="currentView"
      :currentStreak="playerStore.consecutiveDays"
      :achievementsCount="playerStore.achievements.filter(a => a.unlocked).length"
      @change-view="changeView"
    />

    <main class="main-content">
      <transition name="fade" mode="out-in">
        <WalletView v-if="currentView === 'wallet'" />
        <ProfileView v-else-if="currentView === 'profile'" />
        <ShopView v-else-if="currentView === 'shop'" />

        <!-- Subjects grid -->
        <div v-else-if="currentView === 'games' && !currentSubject && !currentGame" class="subjects-grid">
          <div
            v-for="subject in subjects"
            :key="subject.id"
            class="subject-card"
            @click="openSubject(subject)"
          >
            <div class="subject-icon">{{ subject.icon }}</div>
            <div>
              <h3>{{ subject.title }}</h3>
              <p>{{ subject.description }}</p>
            </div>
            <button class="btn-primary">Abrir materia</button>
          </div>
        </div>

        <!-- Games within subject -->
        <div v-else-if="currentView === 'games' && currentSubject && !currentGame" class="subject-games-view">
          <div class="subject-header">
            <button class="back-btn subject-back" @click="closeSubject">
              <span class="icon">🔙</span> Volver a materias
            </button>
            <div>
              <h2>{{ currentSubject.title }}</h2>
              <p>{{ currentSubject.description }}</p>
            </div>
          </div>
          <div class="day-indicator">
            <span>📅 Día {{ playerStore.diaActual }} — Nivel de juegos: {{ variantLabel }}</span>
          </div>
          <div class="games-grid">
            <GameCard
              v-for="game in subjectGames"
              :key="game.id"
              :game="game"
              @play="openGame"
            />
          </div>
        </div>

        <!-- Active game -->
        <div v-else-if="currentGame" class="game-view">
          <div class="game-view-header">
            <button class="back-btn" @click="closeGame">
              <span class="icon">🔙</span> Volver a los juegos
            </button>
          </div>
          <component
            :is="currentGameComponent"
            :language="currentSubject?.language ?? 'es'"
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

    <Notification />
    <ConfirmModal />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../store/player'
import AppHeader from '../components/AppHeader.vue'
import GameCard from '../components/GameCard.vue'
import WalletView from '../components/WalletView.vue'
import ProfileView from '../components/avatar/ProfileView.vue'
import ShopView from '../components/avatar/ShopView.vue'
import { useAvatarStore } from '../store/avatar'
import Notification from '../components/Notification.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { showNotification } from '../composables/useNotification'

import BudgetGame              from '../components/games/BudgetGame.vue'
import SupermarketGame         from '../components/games/SupermarketGame.vue'
import SavingsGame             from '../components/games/SavingsGame.vue'
import RouletteGame            from '../components/games/RouletteGame.vue'
import InvestmentGame          from '../components/games/InvestmentGame.vue'
import QuizGame                from '../components/games/QuizGame.vue'
import SnowballGame            from '../components/games/SnowballGame.vue'
import InternationalMarketGame from '../components/games/InternationalMarketGame.vue'
import KioskGame              from '../components/games/KioskGame.vue'
import SmartShoppingGame      from '../components/games/SmartShoppingGame.vue'

const playerStore = usePlayerStore()
const avatarStore = useAvatarStore()

onMounted(() => {
  avatarStore.init()
  playerStore.checkLoginStreak()
  playerStore.evaluateAchievements()
})

// ── SUBJECTS ──────────────────────────────────────────────────────────────

const subjects = ref([
  {
    id: 'math',
    title: 'Matemáticas',
    description: 'Juegos de lógica, cálculo y gestión financiera en español.',
    icon: '➗',
    language: 'es'
  },
  {
    id: 'english',
    title: 'English',
    description: 'Financial literacy games in English — read, calculate and trade!',
    icon: '📝',
    language: 'en'
  }
])

// ── GAME DEFINITIONS ──────────────────────────────────────────────────────

const mathGames = ref([
  {
    id: 'budget-game',
    title: 'El Repartidor',
    englishTitle: 'The Delivery Run',
    level: 2,
    description: 'Elige las rutas. Calcula combustible vs. pago. Maximiza tu ganancia neta.',
    englishDescription: 'Pick your routes. Calculate fuel vs. payment. Maximize net profit.',
    bgColor: '#FF6B6B',
    icon: '📦'
  },
  {
    id: 'supermarket-game',
    title: 'El Supermercado',
    englishTitle: 'Supermarket Sprint',
    level: 1,
    description: 'Compara precio por unidad. ¡Cuidado con las promociones engañosas!',
    englishDescription: 'Compare price per unit. Watch out for misleading promotions!',
    bgColor: '#4ECDC4',
    icon: '🛒'
  },
  {
    id: 'savings-game',
    title: 'La Alcancía Mágica',
    englishTitle: 'The Savings Puzzle',
    level: 2,
    description: 'Inflación + interés variable: ¿dónde poner tu dinero para no perder poder adquisitivo?',
    englishDescription: 'Inflation is real — allocate wisely to preserve purchasing power.',
    bgColor: '#FFD166',
    icon: '🐷'
  },
  {
    id: 'snowball-game',
    title: 'La Bola de Nieve',
    englishTitle: 'The Snowball',
    level: 3,
    description: 'Interés compuesto: gestiona deudas e inversiones en 12 meses simulados.',
    englishDescription: 'Compound interest: manage debts and investments over 12 months.',
    bgColor: '#6c5ce7',
    icon: '❄️'
  },
  {
    id: 'kiosk-game',
    title: 'Administra Tu Kiosco',
    englishTitle: 'Run Your Kiosk',
    level: 2,
    description: 'Compra productos, fija precios y vende en el kiosco escolar. ¡Aprende a generar ganancias!',
    englishDescription: 'Buy products, set prices and sell at the school kiosk. Learn to generate profit!',
    bgColor: '#f39c12',
    icon: '🏪'
  },
  {
    id: 'shopping-game',
    title: 'Compras Inteligentes',
    englishTitle: 'Smart International Shopping',
    level: 2,
    description: 'Calcula el costo real de una compra internacional: envío, IVA y aranceles.',
    englishDescription: 'Calculate the real cost of an international purchase: shipping, VAT and customs.',
    bgColor: '#0984e3',
    icon: '🌎'
  },
])

const englishGames = ref([
  {
    id: 'quiz-game',
    title: 'Desafío Mental',
    englishTitle: 'Mind Challenge',
    level: 1,
    description: 'Apuesta antes de ver la pregunta. ¿Cuánto arriesgas?',
    englishDescription: 'Stake your coins BEFORE seeing the question. High risk = high reward!',
    bgColor: '#a29bfe',
    icon: '💡'
  },
  {
    id: 'supermarket-game',
    title: 'El Supermercado EN',
    englishTitle: 'Supermarket Sprint',
    level: 1,
    description: 'Lee la lista de compras en inglés. ¡No te dejes engañar por las descripciones!',
    englishDescription: 'Read the English shopping list carefully. Descriptions can be tricky!',
    bgColor: '#00b894',
    icon: '🛒'
  },
  {
    id: 'investment-game',
    title: 'El Puesto de Limonada',
    englishTitle: 'Lemonade Stand',
    level: 2,
    description: 'Lee el forecast del tiempo en inglés. Fija el precio óptimo.',
    englishDescription: 'Read the weather forecast in English. Set the optimal price!',
    bgColor: '#fdcb6e',
    icon: '🍋'
  },
  {
    id: 'market-game',
    title: 'Mercado Internacional',
    englishTitle: 'International Market',
    level: 3,
    description: 'Lee noticias financieras en inglés y toma decisiones de inversión.',
    englishDescription: 'Read financial news in English and make investment decisions!',
    bgColor: '#1a1a2e',
    icon: '🌐'
  },
  {
    id: 'kiosk-game',
    title: 'El Kiosco (EN)',
    englishTitle: 'Run Your Kiosk',
    level: 2,
    description: 'Administra el kiosco escolar. Eventos y productos descritos en inglés.',
    englishDescription: 'Manage the school kiosk. All events and product descriptions are in English!',
    bgColor: '#e67e22',
    icon: '🏪'
  },
  {
    id: 'shopping-game',
    title: 'Compras Internacionales (EN)',
    englishTitle: 'Smart International Shopping',
    level: 2,
    description: 'Calcula el costo real de importaciones en inglés: shipping, VAT y customs.',
    englishDescription: 'Calculate real import costs in English: product price, shipping, VAT and customs duties!',
    bgColor: '#6c5ce7',
    icon: '🌎'
  },
])

// ── COMPONENT MAP ─────────────────────────────────────────────────────────

const componentMap = {
  'budget-game':      BudgetGame,
  'supermarket-game': SupermarketGame,
  'savings-game':     SavingsGame,
  'roulette-game':    RouletteGame,
  'investment-game':  InvestmentGame,
  'quiz-game':        QuizGame,
  'snowball-game':    SnowballGame,
  'market-game':      InternationalMarketGame,
  'kiosk-game':         KioskGame,
  'shopping-game':      SmartShoppingGame,
}

// ── STATE ─────────────────────────────────────────────────────────────────

const currentSubject   = ref(null)
const currentGame      = ref(null)
const showRewardModal  = ref(false)
const lastReward       = ref(0)
const modalTitle       = ref('¡Felicidades! 🎉')
const modalMessage     = ref('Has ganado')
const currentView      = ref('games')

const currentGameComponent = computed(() => currentGame.value ? componentMap[currentGame.value.id] : null)

const variantLabel = computed(() => {
  const d = playerStore.diaActual
  if (d <= 1) return 'Principiante'
  if (d === 2) return 'Intermedio'
  if (d === 3) return 'Avanzado'
  return 'Experto'
})

const subjectGames = computed(() => {
  if (!currentSubject.value) return []
  const pool = currentSubject.value.language === 'en' ? englishGames.value : mathGames.value
  return pool.map(game => ({
    ...game,
    title:       currentSubject.value.language === 'en' ? game.englishTitle       : game.title,
    description: currentSubject.value.language === 'en' ? game.englishDescription : game.description
  }))
})

// ── NAVIGATION ────────────────────────────────────────────────────────────

const openSubject  = (subject) => { currentSubject.value = subject; currentGame.value = null }
const closeSubject = () => { currentSubject.value = null; currentGame.value = null }
const openGame     = (game) => {
  if (playerStore.enDeuda && game.id === 'investment-game') {
    showNotification('error', '¡Estás en deuda! No puedes invertir hasta que pagues lo que debes.')
    return
  }
  if (playerStore.energiaAgotada) {
    showNotification('warning', 'Te has quedado sin energía por hoy. ¡Termina el día para recuperarla!')
    return
  }
  currentGame.value = game
}
const closeGame       = () => { currentGame.value = null }
const changeView      = (view) => { currentView.value = view; currentSubject.value = null; currentGame.value = null }
const closeRewardModal = () => { showRewardModal.value = false }

const onGameCompleted = (result) => {
  if (result) {
    if (result.recompensa > 0) {
      lastReward.value   = result.recompensa
      modalTitle.value   = result.title || '¡Felicidades! 🎉'
      modalMessage.value = result.msg   || 'Has ganado'
    } else {
      lastReward.value   = 0
      modalTitle.value   = result.title || 'Sigue intentándolo'
      modalMessage.value = result.msg   || 'Esta vez no hubo ganancias.'
    }
    const newAchievementIds = playerStore.evaluateAchievements()
    newAchievementIds.forEach(id => {
      const a = playerStore.achievements.find(a => a.id === id)
      if (a) showNotification('success', `${a.badge} ¡Logro desbloqueado! "${a.title}"`)
    })
    showRewardModal.value = true
    closeGame()
  }
}
</script>

<style scoped>
.app-container { display: flex; flex-direction: column; gap: 2rem; animation: popIn 0.5s ease-out; }
.main-content { flex: 1; }
.subjects-grid, .games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.6rem; }
.subject-card { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(242,246,255,0.96)); border: 1px solid rgba(59,130,246,0.12); backdrop-filter: blur(12px); border-radius: var(--border-radius-lg); padding: 2rem; min-height: 220px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-md); cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.subject-card:hover { transform: translateY(-6px); box-shadow: 0 16px 32px rgba(34,34,34,0.12); }
.subject-card .subject-icon { font-size: 3rem; }
.subject-card h3 { margin: 1rem 0 0.75rem; font-size: 1.7rem; }
.subject-card p  { color: #5f6c7b; line-height: 1.6; }
.subject-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.subject-header h2 { margin: 0; font-size: 2rem; color: var(--primary-color); }
.subject-header p  { margin: 0.5rem 0 0; color: #5f6c7b; }
.subject-back { background: white; border: 2px solid #dfe6e9; color: var(--text-dark); padding: 0.85rem 1.2rem; border-radius: 999px; font-weight: 700; }
.subject-back:hover { background: #f1f2f6; }
.day-indicator { background: #eef0ff; color: var(--primary-color); padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; margin-bottom: 1.25rem; display: inline-block; }
.game-view { background: var(--card-bg); border-radius: var(--border-radius-lg); padding: 2rem; box-shadow: var(--shadow-md); }
.game-view-header { margin-bottom: 2rem; }
.back-btn { background: white; border: 2px solid #dfe6e9; color: var(--text-dark); padding: 10px 20px; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: var(--transition); box-shadow: var(--shadow-sm); }
.back-btn:hover { background: #f1f2f6; transform: translateX(-5px); border-color: #b2bec3; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(20px); }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px); }
.modal-content { background: white; border-radius: var(--border-radius-lg); padding: 2rem; width: min(95%, 420px); box-shadow: var(--shadow-md); text-align: center; }
.reward-modal h2 { margin-bottom: 1rem; color: var(--primary-color); }
.coins-animation { font-size: 3rem; margin: 1rem 0; }
.reward-amount { font-size: 2rem; margin: 1rem 0; color: #2d3436; }
</style>
