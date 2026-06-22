<template>
  <div class="smart-shopping">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🌎</div>
      <h2>{{ t('title') }}</h2>
      <p class="subtitle">{{ t('subtitle') }}</p>

      <div class="energy-bar" :class="!hasEnergy ? 'no-energy' : ''">
        ⚡ {{ t('energy') }}: {{ player.energiaActual }} / {{ player.energiaMaxima }}
      </div>
      <div v-if="!hasEnergy" class="warn-box">{{ t('noEnergy') }}</div>

      <div class="intro-box">
        <p>{{ t('introText') }}</p>
        <ul class="obj-list">
          <li v-for="o in t('objectives')" :key="o">{{ o }}</li>
        </ul>
      </div>

      <button class="btn-primary" :disabled="!hasEnergy" @click="phase = 'difficulty'">
        {{ t('startBtn') }}
      </button>
    </div>

    <!-- ══ DIFFICULTY ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'difficulty'" class="phase">
      <h2>{{ t('chooseDiff') }}</h2>

      <div v-if="roundsPlayed > 0" class="session-status">
        🎯 {{ t('round') }} {{ roundsPlayed + 1 }}/3
        &nbsp;|&nbsp; 🪙 {{ totalCoins }} {{ isEN ? 'coins' : 'monedas' }}
      </div>

      <div class="diff-grid">
        <div
          v-for="d in DIFFICULTIES"
          :key="d.id"
          class="diff-card"
          :class="d.id"
          @click="startRound(d.id)"
        >
          <div class="d-icon">{{ d.icon }}</div>
          <h3>{{ isEN ? d.nameEN : d.name }}</h3>
          <p class="d-range">{{ d.range }}</p>
          <div class="d-tags">
            <span v-for="c in (isEN ? d.conceptsEN : d.concepts)" :key="c" class="concept-tag">{{ c }}</span>
          </div>
          <div class="d-reward">
            ✅ +{{ d.coinsWin }} · ❌ +{{ d.coinsLose }} 🪙
          </div>
        </div>
      </div>

      <button v-if="roundsPlayed > 0" class="btn-secondary" @click="finishGame">
        {{ t('finishEarly') }}
      </button>
    </div>

    <!-- ══ QUESTION ═══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'question' && scenario" class="phase">
      <div class="q-header">
        <div class="diff-pill" :class="selectedDiff">
          {{ DIFFICULTIES.find(d => d.id === selectedDiff)?.icon }}
          {{ isEN ? DIFFICULTIES.find(d => d.id === selectedDiff)?.nameEN : DIFFICULTIES.find(d => d.id === selectedDiff)?.name }}
        </div>
        <div class="q-counter">{{ t('round') }} {{ roundsPlayed + 1 }}/3</div>
      </div>

      <!-- Product showcase -->
      <div class="product-showcase">
        <span class="p-big-icon">{{ scenario.product.icon }}</span>
        <div>
          <h3 class="p-name">{{ isEN ? scenario.product.en : scenario.product.es }}</h3>
          <p class="p-origin">🌍 {{ t('importedFrom') }}</p>
        </div>
      </div>

      <!-- Cost info card (with hidden cells) -->
      <div class="info-card">
        <div class="ic-row">
          <span>🏷️ {{ t('productPrice') }}</span>
          <span class="ic-val">${{ scenario.price.toLocaleString() }} USD</span>
        </div>
        <div class="ic-row">
          <span>📦 {{ t('shippingCost') }}</span>
          <span class="ic-val">${{ scenario.shipping.toLocaleString() }} USD</span>
        </div>
        <div class="ic-row ic-base">
          <span>= {{ t('subtotal') }}</span>
          <span class="ic-val"><strong>${{ scenario.base.toLocaleString() }} USD</strong></span>
        </div>
        <div class="ic-row ic-tax">
          <span>📋 {{ t('iva') }} {{ (scenario.ivaRate * 100).toFixed(0) }}%</span>
          <span class="ic-val ic-hidden">?</span>
        </div>
        <div v-if="scenario.arancelRate > 0" class="ic-row ic-tax">
          <span>🛃 {{ t('arancel') }} {{ (scenario.arancelRate * 100).toFixed(0) }}%</span>
          <span class="ic-val ic-hidden">?</span>
        </div>
        <div class="ic-row ic-total">
          <span><strong>{{ t('totalCost') }}</strong></span>
          <span class="ic-val ic-hidden"><strong>$??? USD</strong></span>
        </div>
      </div>

      <!-- Budget pill (medium) -->
      <div v-if="scenario.budget !== null" class="budget-pill">
        💰 {{ t('yourBudget') }}: <strong>${{ scenario.budget.toLocaleString() }} USD</strong>
      </div>

      <!-- Q1: Calculate total -->
      <div class="question-section">
        <p class="q-label">{{ t('q1Label') }}</p>
        <div class="opts-grid">
          <button
            v-for="(opt, idx) in scenario.options"
            :key="idx"
            class="opt-btn"
            :class="{ selected: selectedAnswer === idx }"
            @click="selectedAnswer = idx"
          >
            ${{ opt.toFixed(2) }} USD
          </button>
        </div>
      </div>

      <!-- Q2: Budget convenient? (medium, shown after Q1 answered) -->
      <transition name="slide-in">
        <div v-if="selectedDiff === 'medium' && selectedAnswer !== null" class="question-section">
          <p class="q-label">
            {{ t('q2Label') }} ${{ scenario.budget?.toLocaleString() }} USD?
          </p>
          <div class="yesno-row">
            <button
              class="opt-btn yesno"
              :class="{ selected: selectedBudgetAnswer === 'yes' }"
              @click="selectedBudgetAnswer = 'yes'"
            >
              ✅ {{ t('yes') }}
            </button>
            <button
              class="opt-btn yesno"
              :class="{ selected: selectedBudgetAnswer === 'no' }"
              @click="selectedBudgetAnswer = 'no'"
            >
              ❌ {{ t('no') }}
            </button>
          </div>
        </div>
      </transition>

      <button class="btn-primary" :disabled="!canSubmit" @click="submitAnswer">
        {{ t('verify') }} →
      </button>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result' && scenario" class="phase">

      <div class="result-banner" :class="isCorrect ? 'banner-win' : 'banner-lose'">
        <span class="banner-icon">{{ isCorrect ? '🎉' : '📖' }}</span>
        <h2>{{ isCorrect ? t('correct') : t('incorrect') }}</h2>
      </div>

      <!-- Full breakdown revealed -->
      <div class="info-card revealed">
        <div class="ic-row">
          <span>🏷️ {{ t('productPrice') }}</span>
          <span class="ic-val">${{ scenario.price.toLocaleString() }} USD</span>
        </div>
        <div class="ic-row">
          <span>📦 {{ t('shippingCost') }}</span>
          <span class="ic-val">${{ scenario.shipping.toLocaleString() }} USD</span>
        </div>
        <div class="ic-row ic-base">
          <span>= {{ t('subtotal') }}</span>
          <span class="ic-val"><strong>${{ scenario.base.toLocaleString() }} USD</strong></span>
        </div>
        <div class="ic-row ic-tax">
          <span>📋 {{ t('iva') }} {{ (scenario.ivaRate * 100).toFixed(0) }}%</span>
          <span class="ic-val reveal-tax">+${{ scenario.iva.toFixed(2) }} USD</span>
        </div>
        <div v-if="scenario.arancelRate > 0" class="ic-row ic-tax">
          <span>🛃 {{ t('arancel') }} {{ (scenario.arancelRate * 100).toFixed(0) }}%</span>
          <span class="ic-val reveal-tax">+${{ scenario.arancel.toFixed(2) }} USD</span>
        </div>
        <div class="ic-row ic-total">
          <span><strong>{{ t('totalCost') }}</strong></span>
          <span class="ic-val reveal-total"><strong>${{ scenario.total.toFixed(2) }} USD</strong></span>
        </div>
      </div>

      <!-- Budget result (medium) -->
      <div v-if="scenario.budget !== null" class="budget-result-row" :class="isBudgetCorrect ? 'ok' : 'bad'">
        <span>💰 {{ t('yourBudget') }}: ${{ scenario.budget?.toLocaleString() }} USD</span>
        <span class="br-arrow">→</span>
        <span>{{ scenario.budgetConvenient ? t('yes') : t('no') }}</span>
        <span>{{ isBudgetCorrect ? '✅' : '❌' }}</span>
      </div>

      <!-- Coins earned this round -->
      <div class="round-coins">
        {{ t('youEarned') }}: <strong class="coin-num">+{{ roundCoins }}</strong> 🪙
      </div>

      <!-- Educational feedback -->
      <div class="feedback" :class="isCorrect ? 'fb-good' : 'fb-learn'">
        <p>{{ feedback }}</p>
      </div>

      <div class="result-actions">
        <button v-if="roundsPlayed < 3" class="btn-secondary" @click="nextRound">
          {{ t('anotherRound') }}
        </button>
        <button class="btn-primary" @click="finishGame">
          {{ t('finish') }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { usePlayerStore } from '../../store/player'

const props = defineProps({ language: { type: String, default: 'es' } })
const emit  = defineEmits(['game-completed'])
const player = usePlayerStore()

const isEN = computed(() => props.language === 'en')

// ── TRANSLATIONS ──────────────────────────────────────────────────────────
const TEXTS = {
  es: {
    title: 'Compras Inteligentes al Extranjero',
    subtitle: 'Calcula el costo real antes de comprar.',
    energy: 'Energía',
    noEnergy: 'Necesitas al menos 1 punto de energía para jugar.',
    introText: 'Aprende a calcular el costo real de una compra internacional considerando envío, IVA y aranceles aduaneros.',
    objectives: ['¿Qué es el IVA?','¿Qué son los costos de envío?','¿Qué son los aranceles?','¿Cómo calcular el precio final real?'],
    startBtn: '¡Comenzar!', chooseDiff: 'Selecciona la dificultad',
    round: 'Ronda', importedFrom: 'Importado desde el extranjero',
    productPrice: 'Precio del producto', shippingCost: 'Costo de envío',
    subtotal: 'Subtotal (base)', iva: 'IVA', arancel: 'Arancel aduanero',
    totalCost: 'Costo total', yourBudget: 'Tu presupuesto',
    q1Label: '¿Cuál es el costo total de la compra?',
    q2Label: '¿Con tu presupuesto de', yes: 'Sí, conviene', no: 'No conviene',
    verify: 'Verificar', correct: '¡Correcto!', incorrect: 'Respuesta incorrecta',
    youEarned: 'Ganaste', anotherRound: 'Otra pregunta →',
    finishEarly: 'Terminar sesión', finish: 'Terminar',
  },
  en: {
    title: 'Smart International Shopping',
    subtitle: 'Calculate the real cost before buying.',
    energy: 'Energy',
    noEnergy: 'You need at least 1 energy point to play.',
    introText: 'Learn to calculate the real cost of an international purchase including shipping, VAT and customs duties.',
    objectives: ['What is VAT?','What are shipping costs?','What are customs duties?','How to calculate the true final price?'],
    startBtn: "Let's go!", chooseDiff: 'Select difficulty',
    round: 'Round', importedFrom: 'Imported from abroad',
    productPrice: 'Product price', shippingCost: 'Shipping cost',
    subtotal: 'Subtotal (base)', iva: 'VAT', arancel: 'Customs duty',
    totalCost: 'Total cost', yourBudget: 'Your budget',
    q1Label: 'What is the total cost of the purchase?',
    q2Label: 'With your budget of', yes: 'Yes, it fits', no: "No, it doesn't fit",
    verify: 'Check answer', correct: 'Correct!', incorrect: 'Wrong answer',
    youEarned: 'You earned', anotherRound: 'Next question →',
    finishEarly: 'End session', finish: 'Finish',
  }
}
const t = (key) => (isEN.value ? TEXTS.en : TEXTS.es)[key] ?? key

// ── PRODUCT POOLS ─────────────────────────────────────────────────────────
const EASY_PRODUCTS = [
  { es: 'Audífonos Gamer',      en: 'Gaming Headset',         icon: '🎧' },
  { es: 'Polera Deportiva',     en: 'Sports T-Shirt',         icon: '👕' },
  { es: 'Mochila Escolar',      en: 'School Backpack',        icon: '🎒' },
  { es: 'Libro Educativo',      en: 'Educational Book',       icon: '📚' },
  { es: 'Mouse Inalámbrico',    en: 'Wireless Mouse',         icon: '🖱️' },
  { es: 'Peluche Coleccionable',en: 'Collectible Plush',      icon: '🧸' },
  { es: 'Set de Cuadernos',     en: 'Notebook Set',           icon: '📓' },
  { es: 'Figura de Acción',     en: 'Action Figure',          icon: '🤖' },
]

const MEDIUM_PRODUCTS = [
  { es: 'Teclado Mecánico',     en: 'Mechanical Keyboard',    icon: '⌨️' },
  { es: 'Tablet Educativa',     en: 'Educational Tablet',     icon: '📱' },
  { es: 'Consola Portátil',     en: 'Portable Console',       icon: '🎮' },
  { es: 'Set Ropa Deportiva',   en: 'Sports Clothing Set',    icon: '👟' },
  { es: 'Parlante Bluetooth',   en: 'Bluetooth Speaker',      icon: '🔊' },
  { es: 'Smartwatch Básico',    en: 'Basic Smartwatch',       icon: '⌚' },
  { es: 'Cámara Básica',        en: 'Basic Camera',           icon: '📷' },
]

const HARD_PRODUCTS = [
  { es: 'Notebook Gamer',       en: 'Gaming Laptop',          icon: '💻' },
  { es: 'Celular Flagship',     en: 'Flagship Smartphone',    icon: '📱' },
  { es: 'Cámara Profesional',   en: 'Professional Camera',    icon: '📸' },
  { es: 'PC Gamer',             en: 'Gaming Desktop',         icon: '🖥️' },
  { es: 'Impresora 3D',         en: '3D Printer',             icon: '🖨️' },
  { es: 'Drone con Cámara',     en: 'Camera Drone',           icon: '🚁' },
  { es: 'Monitor 4K',           en: '4K Monitor',             icon: '🖥️' },
]

// ── DIFFICULTIES ──────────────────────────────────────────────────────────
const DIFFICULTIES = [
  {
    id: 'easy', icon: '🟢', name: 'Fácil', nameEN: 'Easy',
    range: 'USD $10 – $80',
    concepts: ['Precio', 'Envío', 'IVA 19%'], conceptsEN: ['Price', 'Shipping', 'VAT 19%'],
    coinsWin: 5, coinsLose: 1,
  },
  {
    id: 'medium', icon: '🟡', name: 'Medio', nameEN: 'Medium',
    range: 'USD $80 – $300',
    concepts: ['Precio', 'Envío', 'IVA 19%', 'Presupuesto'], conceptsEN: ['Price', 'Shipping', 'VAT 19%', 'Budget'],
    coinsWin: 10, coinsLose: 2,
  },
  {
    id: 'hard', icon: '🔴', name: 'Difícil', nameEN: 'Hard',
    range: 'USD $500 – $1.500',
    concepts: ['Precio', 'Envío', 'IVA 19%', 'Arancel 6%'], conceptsEN: ['Price', 'Shipping', 'VAT 19%', 'Customs 6%'],
    coinsWin: 15, coinsLose: 3,
  },
]

// ── HELPERS ───────────────────────────────────────────────────────────────
const r2 = (n) => Math.round(n * 100) / 100
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function buildOptions(price, shipping, ivaRate, arancelRate) {
  const base = price + shipping
  const correct = r2(base * (1 + ivaRate + arancelRate))

  let wrongA, wrongB, wrongC
  if (arancelRate > 0) {
    wrongA = r2(base * (1 + ivaRate))        // forgot customs
    wrongB = base                             // forgot all taxes
    wrongC = r2(base * (1 + arancelRate))    // only customs, forgot VAT
  } else {
    wrongA = base                             // forgot VAT entirely
    wrongB = r2(price * (1 + ivaRate) + shipping) // VAT on product only
    wrongC = r2(base * 1.10)                 // wrong rate: 10% instead of 19%
  }

  const seen = new Set()
  const opts = []
  for (const v of [correct, wrongA, wrongB, wrongC]) {
    const key = v.toFixed(2)
    if (!seen.has(key) && v > 0) { seen.add(key); opts.push(v) }
  }
  while (opts.length < 4) {
    const extra = r2(correct * (0.8 + Math.random() * 0.4))
    const key = extra.toFixed(2)
    if (!seen.has(key)) { seen.add(key); opts.push(extra) }
  }

  const shuffled = opts.slice(0, 4).sort(() => Math.random() - 0.5)
  const correctIdx = shuffled.findIndex(v => Math.abs(v - correct) < 0.005)
  return { options: shuffled, correctIdx }
}

function generateScenario(diffId) {
  const pools = { easy: EASY_PRODUCTS, medium: MEDIUM_PRODUCTS, hard: HARD_PRODUCTS }
  const product = pick(pools[diffId])

  let price, shipping
  if (diffId === 'easy') {
    price    = pick([10,15,20,25,30,35,40,45,50,55,60,65,70,75,80])
    shipping = pick([5, 8, 10, 12, 15, 20])
  } else if (diffId === 'medium') {
    price    = 80 + Math.floor(Math.random() * 23) * 10   // 80, 90 … 300
    shipping = pick([10, 15, 20, 25, 30])
  } else {
    price    = 500 + Math.floor(Math.random() * 21) * 50  // 500, 550 … 1500
    shipping = pick([30, 40, 50, 60, 70, 80, 100])
  }

  const base       = price + shipping
  const ivaRate    = 0.19
  const arancelRate = diffId === 'hard' ? 0.06 : 0
  const iva        = r2(base * ivaRate)
  const arancel    = r2(base * arancelRate)
  const total      = r2(base + iva + arancel)

  const { options, correctIdx } = buildOptions(price, shipping, ivaRate, arancelRate)

  let budget = null, budgetConvenient = false
  if (diffId === 'medium') {
    budgetConvenient = Math.random() > 0.5
    // Ensure budget is clearly above OR below total
    budget = budgetConvenient
      ? Math.ceil(total / 10) * 10 + 20
      : Math.floor(total / 10) * 10 - 30
    if (budget <= 0) budget = 10
  }

  return { product, price, shipping, base, iva, arancel, ivaRate, arancelRate, total, options, correctIdx, budget, budgetConvenient }
}

// ── STATE ─────────────────────────────────────────────────────────────────
const phase               = ref('intro')
const selectedDiff        = ref(null)
const scenario            = ref(null)
const selectedAnswer      = ref(null)
const selectedBudgetAnswer= ref(null)
const isCorrect           = ref(false)
const isBudgetCorrect     = ref(false)
const roundsPlayed        = ref(0)
const totalCoins          = ref(0)
const roundCoins          = ref(0)
const feedback            = ref('')
const sessionCorrect      = ref(0)

// ── COMPUTED ──────────────────────────────────────────────────────────────
const hasEnergy = computed(() => player.energiaActual > 0)

const canSubmit = computed(() => {
  if (selectedAnswer.value === null) return false
  if (selectedDiff.value === 'medium') return selectedBudgetAnswer.value !== null
  return true
})

// ── GAME FLOW ─────────────────────────────────────────────────────────────
const startRound = (diffId) => {
  selectedDiff.value         = diffId
  scenario.value             = generateScenario(diffId)
  selectedAnswer.value       = null
  selectedBudgetAnswer.value = null
  phase.value                = 'question'
}

const submitAnswer = () => {
  const sc        = scenario.value
  const totalOk   = selectedAnswer.value === sc.correctIdx
  const budgetOk  = selectedDiff.value !== 'medium' ||
                    (selectedBudgetAnswer.value === 'yes') === sc.budgetConvenient

  isCorrect.value      = totalOk && budgetOk
  isBudgetCorrect.value = budgetOk

  const cfg   = DIFFICULTIES.find(d => d.id === selectedDiff.value)
  const coins = isCorrect.value ? cfg.coinsWin : cfg.coinsLose
  roundCoins.value  = coins
  totalCoins.value += coins
  roundsPlayed.value++
  if (isCorrect.value) sessionCorrect.value++

  feedback.value = makeFeedback(isCorrect.value, sc)
  updateAchievements()
  phase.value = 'result'
}

const nextRound = () => {
  phase.value = 'difficulty'
}

const finishGame = () => {
  if (roundsPlayed.value === 0) { emit('game-completed', null); return }
  const res = player.jugarMinijuego('compras', totalCoins.value)
  emit('game-completed', {
    success:    sessionCorrect.value > 0,
    recompensa: res.recompensa,
    title:      isEN.value ? 'Smart International Shopper!' : '¡Comprador Internacional Inteligente!',
    msg: isEN.value
      ? `${roundsPlayed.value} round(s) · ${sessionCorrect.value} correct · ${totalCoins.value} coins`
      : `${roundsPlayed.value} ronda(s) · ${sessionCorrect.value} correctas · ${totalCoins.value} monedas`
  })
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────
function makeFeedback(correct, sc) {
  if (isEN.value) {
    if (correct) {
      let m = `✅ Excellent! Before buying abroad, always check the product price, shipping and taxes. The listed price is rarely the final price.`
      if (sc.arancelRate > 0) m += ` For purchases over USD 500, a ${(sc.arancelRate*100).toFixed(0)}% customs duty also applies on the base amount (product + shipping).`
      return m
    }
    return `❌ Not quite! The formula is: Total = (Product + Shipping) × (1 + VAT${sc.arancelRate > 0 ? ' + Customs' : ''}). Many shoppers forget to apply VAT to the full base — including shipping!`
  }
  if (correct) {
    let m = `✅ ¡Excelente! Antes de comprar en el extranjero siempre considera el precio del producto, el costo de envío y los impuestos. El precio publicado rara vez es el precio final.`
    if (sc.arancelRate > 0) m += ` En compras sobre USD 500 se aplica también un arancel del ${(sc.arancelRate*100).toFixed(0)}% sobre la base (producto + envío).`
    return m
  }
  return `❌ No fue la respuesta correcta. La fórmula es: Total = (Producto + Envío) × (1 + IVA${sc.arancelRate > 0 ? ' + Arancel' : ''}). Muchos compradores olvidan aplicar el IVA sobre la base completa, ¡incluyendo el envío!`
}

// ── ACHIEVEMENTS ──────────────────────────────────────────────────────────
const SHOPPING_ACHIEVEMENTS = [
  { id: 'shop-first',    title: 'Primer Importador',    titleEN: 'First Importer',      badge: '🌍', desc: 'Realiza tu primer cálculo internacional.',        descEN: 'Complete your first international calculation.',   check: (s) => (s.gamesPlayed || 0) >= 1 },
  { id: 'shop-streak',   title: 'Experto en Aduanas',   titleEN: 'Customs Expert',       badge: '🛃', desc: 'Acierta 10 cálculos correctos seguidos.',         descEN: 'Get 10 calculations correct in a row.',            check: (s) => (s.correctStreak || 0) >= 10 },
  { id: 'shop-perfect',  title: 'Calculadora Humana',   titleEN: 'Human Calculator',     badge: '🧮', desc: 'Obtén 100% de precisión en una sesión de 3.',     descEN: 'Get 100% accuracy in a 3-round session.',          check: (s) => s.sessionPerfect },
  { id: 'shop-alldiffs', title: 'Comprador Inteligente',titleEN: 'Smart Shopper',        badge: '🛒', desc: 'Completa todos los niveles de dificultad.',       descEN: 'Complete all difficulty levels.',                  check: (s) => (s.difficultiesCompleted || []).length >= 3 },
  { id: 'shop-veteran',  title: 'Maestro del Comercio', titleEN: 'Trade Master',         badge: '🏆', desc: 'Completa 50 partidas.',                           descEN: 'Complete 50 games.',                               check: (s) => (s.gamesPlayed || 0) >= 50 },
]

function loadShopStats()   { try { return JSON.parse(localStorage.getItem('shop_stats') || '{}') } catch { return {} } }
function loadShopAchievs() { try { return new Set(JSON.parse(localStorage.getItem('shop_achievements') || '[]')) } catch { return new Set() } }

function updateAchievements() {
  const prev  = loadShopStats()
  const diffs = [...new Set([...(prev.difficultiesCompleted || []), selectedDiff.value])]
  const streak = isCorrect.value ? (prev.correctStreak || 0) + 1 : 0

  const newStats = {
    gamesPlayed:           (prev.gamesPlayed || 0) + 1,
    correctStreak:         streak,
    difficultiesCompleted: diffs,
    sessionPerfect:        roundsPlayed.value === 3 && sessionCorrect.value === 3,
  }
  localStorage.setItem('shop_stats', JSON.stringify(newStats))

  const unlocked = loadShopAchievs()
  const fresh = []
  SHOPPING_ACHIEVEMENTS.forEach(a => {
    if (!unlocked.has(a.id) && a.check(newStats)) { unlocked.add(a.id); fresh.push(a) }
  })
  if (fresh.length) localStorage.setItem('shop_achievements', JSON.stringify([...unlocked]))
}
</script>

<style scoped>
.smart-shopping { max-width: 680px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

h2 { text-align: center; color: var(--primary-color); margin-bottom: 0.5rem; }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.25rem; }

/* Energy */
.energy-bar { background: #eef0ff; color: var(--primary-color); padding: 0.5rem 1rem; border-radius: 10px; font-weight: 700; text-align: center; margin-bottom: 1rem; }
.energy-bar.no-energy { background: #fff5f5; color: #d63031; }

/* Intro */
.intro-box { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1.25rem; }
.intro-box p { margin: 0 0 0.75rem; }
.obj-list { margin: 0; padding-left: 1.25rem; }
.obj-list li { margin: 0.3rem 0; font-size: 0.9rem; color: #444; }

/* Session status */
.session-status { text-align: center; background: #eef0ff; color: var(--primary-color); padding: 0.5rem 1rem; border-radius: 10px; font-weight: 700; font-size: 0.9rem; margin-bottom: 1rem; }

/* Difficulty cards */
.diff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.diff-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); cursor: pointer; border: 2px solid transparent; transition: all 0.2s; text-align: center; }
.diff-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.diff-card.easy:hover   { border-color: #00b894; }
.diff-card.medium:hover { border-color: #fdcb6e; }
.diff-card.hard:hover   { border-color: #d63031; }
.d-icon { font-size: 2.2rem; margin-bottom: 0.4rem; }
.diff-card h3 { margin: 0 0 0.3rem; font-size: 1.1rem; }
.d-range { color: #636e72; font-size: 0.82rem; margin: 0 0 0.6rem; }
.d-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem; margin-bottom: 0.75rem; }
.concept-tag { background: #eef0ff; color: var(--primary-color); padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
.d-reward { font-size: 0.82rem; font-weight: 700; color: #636e72; }

/* Question header */
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.diff-pill { padding: 0.3rem 0.85rem; border-radius: 999px; font-size: 0.85rem; font-weight: 700; color: white; }
.diff-pill.easy   { background: #00b894; }
.diff-pill.medium { background: #fdcb6e; color: #555; }
.diff-pill.hard   { background: #d63031; }
.q-counter { font-size: 0.85rem; font-weight: 700; color: #636e72; }

/* Product showcase */
.product-showcase { display: flex; align-items: center; gap: 1rem; background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.p-big-icon { font-size: 3.5rem; }
.p-name { margin: 0 0 0.25rem; font-size: 1.2rem; }
.p-origin { margin: 0; color: #636e72; font-size: 0.85rem; }

/* Info card */
.info-card { background: white; border-radius: var(--border-radius-md); overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.ic-row { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1.1rem; border-bottom: 1px solid #f1f2f6; font-size: 0.9rem; }
.ic-row:last-child { border-bottom: none; }
.ic-base  { background: #f8f9fa; }
.ic-tax   { background: #fffbea; }
.ic-total { background: #eef0ff; }
.ic-val   { font-weight: 700; }
.ic-hidden { color: #b2bec3; font-style: italic; letter-spacing: 0.1em; }

/* Revealed styles */
.info-card.revealed .reveal-tax   { color: #e17055; font-weight: 800; }
.info-card.revealed .reveal-total { color: #00b894; font-weight: 800; font-size: 1.1rem; }

/* Budget pill */
.budget-pill { background: #d4f1e8; color: #006b4e; border-radius: 12px; padding: 0.65rem 1rem; margin-bottom: 1rem; font-size: 0.92rem; font-weight: 700; text-align: center; }

/* Questions */
.question-section { margin-bottom: 1rem; }
.q-label { font-weight: 700; font-size: 0.95rem; color: #2d3436; margin: 0 0 0.75rem; }
.opts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.opt-btn { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 0.5rem; font-family: 'Fredoka', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.18s; color: #2d3436; }
.opt-btn:hover  { border-color: var(--primary-color); transform: translateY(-2px); }
.opt-btn.selected { border-color: var(--primary-color); background: #eef0ff; color: var(--primary-color); }
.opt-btn.yesno { flex: 1; min-width: 0; }
.yesno-row { display: flex; gap: 0.75rem; }

/* Slide in transition */
.slide-in-enter-active { transition: all 0.3s ease; }
.slide-in-enter-from   { opacity: 0; transform: translateY(-10px); }

/* Result banner */
.result-banner { display: flex; flex-direction: column; align-items: center; padding: 1.25rem; border-radius: var(--border-radius-md); margin-bottom: 1rem; }
.result-banner h2 { margin: 0.5rem 0 0; }
.banner-icon { font-size: 2.5rem; }
.banner-win  { background: linear-gradient(135deg, #d4edda, #c3e6cb); }
.banner-lose { background: linear-gradient(135deg, #f8d7da, #f5c6cb); }

/* Budget result */
.budget-result-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; margin-bottom: 0.75rem; flex-wrap: wrap; }
.budget-result-row.ok  { background: #d4f1e8; color: #006b4e; }
.budget-result-row.bad { background: #ffeaa7; color: #8b6914; }
.br-arrow { color: #636e72; }

/* Coins earned */
.round-coins { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 0.85rem; margin-bottom: 1rem; font-size: 1rem; }
.coin-num { font-family: 'Fredoka', sans-serif; font-size: 1.7rem; color: #6c4b00; }

/* Feedback */
.feedback { border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; font-size: 0.9rem; line-height: 1.65; }
.fb-good  { background: #d1ecf1; color: #0c5460; }
.fb-learn { background: #fff3cd; color: #856404; }
.feedback p { margin: 0; }

/* Result actions */
.result-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.result-actions .btn-primary { flex: 1; }
.result-actions .btn-secondary { flex: 1; }

/* Utils */
.pos { color: #00b894; font-weight: 800; }
.neg { color: #d63031; font-weight: 800; }
.warn-box { background: #fff5f5; border: 1px solid #fab1a0; color: #d63031; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 700; margin-bottom: 0.75rem; }

.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
.btn-secondary { display: block; width: 100%; background: white; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 0.85rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.05rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-secondary:hover { background: #eef0ff; }
</style>
