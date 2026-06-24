<template>
  <div class="kiosk-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🏪</div>
      <h2>{{ t('title') }}</h2>
      <p class="subtitle">{{ t('subtitle') }}</p>

      <div class="energy-bar" :class="hasEnergy ? '' : 'no-energy'">
        <span>⚡ {{ t('energy') }}: {{ player.energiaActual }} / {{ player.energiaMaxima }}</span>
      </div>

      <div v-if="!hasEnergy" class="warn-box">{{ t('noEnergy') }}</div>

      <div class="intro-box">
        <p>{{ t('introText') }}</p>
        <ul class="objectives">
          <li v-for="obj in t('objectives')" :key="obj">{{ obj }}</li>
        </ul>
      </div>

      <button class="btn-primary" :disabled="!hasEnergy" @click="phase = 'difficulty'">
        {{ t('startBtn') }}
      </button>
    </div>

    <!-- ══ DIFFICULTY ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'difficulty'" class="phase">
      <h2>{{ t('selectDifficulty') }}</h2>
      <div class="diff-grid">
        <div
          v-for="d in DIFFICULTIES"
          :key="d.id"
          class="diff-card"
          :class="d.id"
          @click="startGame(d.id)"
        >
          <div class="diff-icon">{{ d.icon }}</div>
          <h3>{{ isEN ? d.nameEN : d.name }}</h3>
          <div class="diff-info">
            <span>💰 {{ t('capital') }}: ${{ d.capital.toLocaleString() }}</span>
            <span>📅 {{ t('days') }}: {{ d.days }}</span>
          </div>
          <ul class="diff-products">
            <li v-for="pid in d.products" :key="pid">{{ productName(pid) }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ══ BUY INVENTORY ═════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'buy'" class="phase">
      <div class="phase-header">
        <h2>{{ t('buyInventory') }}</h2>
        <div class="day-badge">{{ t('day') }} {{ currentDay }} / {{ totalDays }}</div>
      </div>

      <!-- Logistics banner (always visible) -->
      <div class="logistics-banner" :class="dayLogisticsEvent ? 'logistics-alert' : ''">
        <span class="log-icon">🚚</span>
        <div class="log-info">
          <span>
            {{ t('logisticsPerUnit') }}:
            <strong :class="dayLogisticsEvent ? 'neg' : ''">
              ${{ dayLogisticsCost.toLocaleString() }}
            </strong>
            {{ t('perUnit') }}
          </span>
          <span v-if="dayLogisticsEvent" class="log-event-label">
            ⚠️ {{ isEN ? dayLogisticsEvent.nameEN : dayLogisticsEvent.nameES }}
            — {{ isEN ? dayLogisticsEvent.descEN : dayLogisticsEvent.descES }}
          </span>
          <span v-else class="log-normal">{{ t('logisticsNormal') }}</span>
        </div>
      </div>

      <div class="capital-bar">
        <span>💰 {{ t('availableCapital') }}:</span>
        <strong :class="remainingCapital < 0 ? 'neg' : 'pos'">${{ remainingCapital.toLocaleString() }}</strong>
        <span class="cost-info">{{ t('spent') }}: ${{ totalBuyCost.toLocaleString() }}</span>
      </div>

      <div class="products-grid">
        <div v-for="p in currentProducts" :key="p.id" class="product-card">
          <div class="p-header">
            <span class="p-icon">{{ p.icon }}</span>
            <div>
              <strong>{{ isEN ? p.en : p.es }}</strong>
              <div class="p-meta">
                <span class="demand-tag" :class="p.demand">{{ t(p.demand) }}</span>
              </div>
            </div>
          </div>

          <!-- Cost breakdown visible before buying -->
          <div class="cost-breakdown">
            <div class="cb-row">
              <span>🏷️ {{ t('buyCost') }}</span>
              <span class="cb-val">${{ p.buy.toLocaleString() }}</span>
            </div>
            <div class="cb-row">
              <span>🚚 {{ t('logisticsCost') }}</span>
              <span class="cb-val" :class="dayLogisticsEvent ? 'neg' : ''">
                ${{ dayLogisticsCost.toLocaleString() }}
              </span>
            </div>
            <div class="cb-row cb-total-cost">
              <span>= {{ t('realCostUnit') }}</span>
              <span class="cb-val"><strong>${{ (p.buy + dayLogisticsCost).toLocaleString() }}</strong></span>
            </div>
          </div>

          <div class="p-controls">
            <!-- Quantity -->
            <div class="qty-row">
              <label>{{ t('quantity') }}:</label>
              <div class="qty-btns">
                <button class="qty-btn" @click="adjustQty(p.id, -5)">-5</button>
                <button class="qty-btn" @click="adjustQty(p.id, -1)">-1</button>
                <span class="qty-val">{{ buyOrders[p.id]?.qty || 0 }}</span>
                <button class="qty-btn" @click="adjustQty(p.id, 1)">+1</button>
                <button class="qty-btn" @click="adjustQty(p.id, 5)">+5</button>
              </div>
            </div>

            <!-- Free sell price -->
            <div class="price-section">
              <label class="price-label">{{ t('sellPrice') }}:</label>
              <div class="price-input-row">
                <button class="adj-btn" @click="adjustPrice(p.id, -100)">−100</button>
                <button class="adj-btn" @click="adjustPrice(p.id, -50)">−50</button>
                <input
                  type="number"
                  class="price-field"
                  min="0"
                  max="3000"
                  step="50"
                  :value="buyOrders[p.id]?.price ?? p.suggested"
                  @change="setPrice(p.id, $event.target.value)"
                />
                <button class="adj-btn" @click="adjustPrice(p.id, 50)">+50</button>
                <button class="adj-btn" @click="adjustPrice(p.id, 100)">+100</button>
              </div>
              <!-- Unit profit indicator -->
              <div class="unit-profit-row">
                <span :class="getUnitProfit(p) >= 0 ? 'profit-ok' : 'profit-neg'">
                  {{ getUnitProfit(p) >= 0 ? '📈' : '📉' }}
                  {{ t('unitProfit') }}:
                  {{ getUnitProfit(p) >= 0 ? '+' : '' }}${{ getUnitProfit(p).toLocaleString() }}/{{ t('unit') }}
                </span>
                <span class="suggested-lbl">({{ t('suggested') }}: ${{ p.suggested }})</span>
              </div>
            </div>

            <div class="subtotal-row">
              {{ t('subtotal') }}: <strong>${{ ((buyOrders[p.id]?.qty || 0) * (p.buy + dayLogisticsCost)).toLocaleString() }}</strong>
              <span class="sub-detail">({{ buyOrders[p.id]?.qty || 0 }} × ${{ (p.buy + dayLogisticsCost).toLocaleString() }})</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="remainingCapital < 0" class="warn-box">⚠️ {{ t('overBudget') }}</div>

      <button
        class="btn-primary"
        :disabled="totalBuyCost === 0 || remainingCapital < 0"
        @click="runDay"
      >
        {{ t('openKiosk') }} →
      </button>
    </div>

    <!-- ══ DAY RESULT ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'dayResult'" class="phase">
      <div class="phase-header">
        <h2>{{ t('dayResults') }}</h2>
        <div class="day-badge">{{ t('day') }} {{ currentDay }} / {{ totalDays }}</div>
      </div>

      <!-- Demand event -->
      <div v-if="dayEvent" class="event-box">
        <span class="event-icon">{{ dayEvent.icon }}</span>
        <div>
          <strong>{{ isEN ? dayEvent.nameEN : dayEvent.nameES }}</strong>
          <p>{{ isEN ? dayEvent.descEN : dayEvent.descES }}</p>
        </div>
      </div>

      <!-- Logistics event reminder -->
      <div v-if="dayLogisticsEvent" class="event-box event-logistics">
        <span class="event-icon">🚚</span>
        <div>
          <strong>{{ isEN ? dayLogisticsEvent.nameEN : dayLogisticsEvent.nameES }}</strong>
          <p>{{ t('logisticsImpacted') }}: ${{ dayLogisticsCost.toLocaleString() }}/{{ t('unit') }}</p>
        </div>
      </div>

      <div class="sales-table">
        <div class="st-header">
          <span>{{ t('product') }}</span>
          <span>{{ t('bought') }}</span>
          <span>{{ t('sold') }}</span>
          <span>{{ t('unsold') }}</span>
          <span>{{ t('revenue') }}</span>
          <span>{{ t('result') }}</span>
        </div>
        <div
          v-for="s in salesResults"
          :key="s.id"
          class="st-row"
          :class="s.profit >= 0 ? 'ok-row' : 'bad-row'"
        >
          <span>{{ s.icon }} {{ isEN ? s.nameEN : s.nameES }}</span>
          <span>{{ s.bought }}</span>
          <span>{{ s.sold }}</span>
          <span :class="s.unsold > 0 ? 'neg' : ''">{{ s.unsold }}</span>
          <span>${{ s.revenue.toLocaleString() }}</span>
          <span :class="s.profit >= 0 ? 'pos' : 'neg'">${{ s.profit.toLocaleString() }}</span>
        </div>
      </div>

      <div class="day-summary">
        <div class="sum-row">
          <span>🏷️ {{ t('productsCost') }}</span>
          <span class="neg">−${{ dayProductsCost.toLocaleString() }}</span>
        </div>
        <div class="sum-row" :class="dayLogisticsEvent ? 'sum-logistics-alert' : ''">
          <span>🚚 {{ t('logisticsCost') }}</span>
          <span class="neg">−${{ dayLogisticsTotal.toLocaleString() }}</span>
        </div>
        <div class="sum-row">
          <span>{{ t('totalRevenue') }}</span>
          <span class="pos">+${{ dayRevenue.toLocaleString() }}</span>
        </div>
        <div class="sum-row net-row">
          <span><strong>{{ t('dayProfit') }}</strong></span>
          <span :class="dayProfit >= 0 ? 'pos' : 'neg'"><strong>${{ dayProfit.toLocaleString() }}</strong></span>
        </div>
        <div class="sum-row">
          <span>{{ t('newCapital') }}</span>
          <span>${{ capital.toLocaleString() }}</span>
        </div>
      </div>

      <button class="btn-primary" @click="nextDayOrFinish">
        {{ currentDay < totalDays ? t('nextDay') : t('seeResults') }}
      </button>
    </div>

    <!-- ══ FINAL RESULTS ═════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'final'" class="phase">
      <div class="phase-icon">{{ finalIcon }}</div>
      <h2>{{ finalTitle }}</h2>

      <div class="final-stats">
        <div class="stat-box">
          <div class="stat-label">{{ t('initialCapital') }}</div>
          <div class="stat-val">${{ initialCapital.toLocaleString() }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('totalSpentLabel') }}</div>
          <div class="stat-val neg">−${{ totalGameSpent.toLocaleString() }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('totalRevenueLabel') }}</div>
          <div class="stat-val pos">+${{ totalGameRevenue.toLocaleString() }}</div>
        </div>
        <div class="stat-box highlight-box">
          <div class="stat-label">{{ t('totalProfit') }}</div>
          <div class="stat-val" :class="totalGameProfit >= 0 ? 'pos' : 'neg'">${{ totalGameProfit.toLocaleString() }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('finalCapital') }}</div>
          <div class="stat-val">${{ capital.toLocaleString() }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('rentability') }}</div>
          <div class="stat-val" :class="rentability >= 0 ? 'pos' : 'neg'">{{ rentability }}%</div>
        </div>
      </div>

      <div v-if="newAchievements.length > 0" class="achievements-box">
        <h3>🏅 {{ t('newAchievements') }}</h3>
        <div v-for="a in newAchievements" :key="a.id" class="ach-item">
          <span class="ach-badge">{{ a.badge }}</span>
          <div>
            <strong>{{ isEN ? a.titleEN : a.title }}</strong>
            <p>{{ isEN ? a.descEN : a.desc }}</p>
          </div>
        </div>
      </div>

      <div class="feedback-box" :class="feedbackType">
        <p>{{ feedback }}</p>
      </div>

      <div class="reward-box">
        <p>{{ t('reward') }}: <strong class="coins">+{{ rewardCoins }} 🪙</strong></p>
      </div>

      <button class="btn-primary" @click="finish">{{ t('finish') }}</button>
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
    title: 'Administra Tu Kiosco', subtitle: 'Compra, vende y aprende a hacer negocios.',
    energy: 'Energía', noEnergy: 'Necesitas al menos 1 punto de energía para administrar tu kiosco.',
    introText: 'Administra un kiosco escolar. Fija libremente tus precios de venta y considera todos los costos: compra + logística.',
    objectives: ['Diferencia costo de compra, logística y precio de venta', 'Entiende la ganancia y la pérdida por unidad', 'Administra tu presupuesto', 'Descubre cómo el precio afecta la demanda'],
    startBtn: '¡Comenzar!', selectDifficulty: 'Elige la dificultad',
    capital: 'Capital inicial', days: 'Duración', buyInventory: 'Compra tu inventario',
    day: 'Día', availableCapital: 'Capital disponible', spent: 'Gasto total',
    buyCost: 'Costo de compra', logisticsCost: 'Costo logístico', realCostUnit: 'Costo real/unidad',
    logisticsPerUnit: 'Logística', perUnit: '/unidad',
    logisticsNormal: 'Condiciones normales de distribución.',
    logisticsImpacted: 'Logística impactada',
    high: '🔥 Alta demanda', medium: '📊 Demanda media', low: '📉 Baja demanda',
    quantity: 'Cantidad', sellPrice: 'Precio de venta (libre)', unit: 'ud',
    unitProfit: 'Ganancia real', suggested: 'Sugerido',
    subtotal: 'Subtotal (costo total)', overBudget: '¡Excediste tu capital! Reduce el inventario.',
    openKiosk: 'Abrir el kiosco', dayResults: 'Resultados del día',
    product: 'Producto', bought: 'Comprado', sold: 'Vendido', unsold: 'Sin vender',
    revenue: 'Ingresos', result: 'Ganancia',
    productsCost: 'Costo de productos', totalRevenue: 'Total ingresos',
    dayProfit: 'Ganancia del día', newCapital: 'Capital disponible',
    nextDay: 'Continuar al día siguiente →', seeResults: 'Ver resultados finales →',
    initialCapital: 'Capital inicial', totalSpentLabel: 'Total invertido (prod.+log.)',
    totalRevenueLabel: 'Total vendido', totalProfit: 'Ganancia total',
    finalCapital: 'Capital final', rentability: 'Rentabilidad',
    newAchievements: '¡Nuevos logros!', reward: 'Recompensa', finish: 'Terminar',
  },
  en: {
    title: 'Run Your Kiosk', subtitle: 'Buy, sell and learn how business works.',
    energy: 'Energy', noEnergy: 'You need at least 1 energy point to run your kiosk.',
    introText: 'Manage a school kiosk. Set your own sell prices freely and account for ALL costs: purchase + logistics.',
    objectives: ['Understand purchase cost, logistics and sell price', 'Grasp unit profit and loss', 'Manage your budget', 'Discover how price affects demand'],
    startBtn: "Let's go!", selectDifficulty: 'Choose difficulty',
    capital: 'Starting capital', days: 'Duration', buyInventory: 'Buy your inventory',
    day: 'Day', availableCapital: 'Available capital', spent: 'Total spent',
    buyCost: 'Purchase cost', logisticsCost: 'Logistics cost', realCostUnit: 'Real cost/unit',
    logisticsPerUnit: 'Logistics', perUnit: '/unit',
    logisticsNormal: 'Normal distribution conditions.',
    logisticsImpacted: 'Logistics impacted',
    high: '🔥 High demand', medium: '📊 Medium demand', low: '📉 Low demand',
    quantity: 'Quantity', sellPrice: 'Sell price (free)', unit: 'unit',
    unitProfit: 'Real profit', suggested: 'Suggested',
    subtotal: 'Subtotal (total cost)', overBudget: 'Over budget! Reduce your inventory.',
    openKiosk: 'Open the kiosk', dayResults: "Day's results",
    product: 'Product', bought: 'Bought', sold: 'Sold', unsold: 'Unsold',
    revenue: 'Revenue', result: 'Profit',
    productsCost: 'Product costs', totalRevenue: 'Total revenue',
    dayProfit: "Day's profit", newCapital: 'Remaining capital',
    nextDay: 'Continue to next day →', seeResults: 'See final results →',
    initialCapital: 'Starting capital', totalSpentLabel: 'Total invested (prod.+log.)',
    totalRevenueLabel: 'Total revenue', totalProfit: 'Total profit',
    finalCapital: 'Final capital', rentability: 'Profitability',
    newAchievements: 'New achievements!', reward: 'Reward', finish: 'Finish',
  }
}
const t = (key) => (isEN.value ? TEXTS.en : TEXTS.es)[key] ?? key

// ── PRODUCTS ──────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 'jugos',       es: 'Jugos',             en: 'Juices',        buy: 500,  suggested: 900,  demand: 'high',   icon: '🥤' },
  { id: 'galletas',    es: 'Galletas',           en: 'Cookies',       buy: 300,  suggested: 700,  demand: 'medium', icon: '🍪' },
  { id: 'chocolates',  es: 'Chocolates',         en: 'Chocolates',    buy: 400,  suggested: 800,  demand: 'medium', icon: '🍫' },
  { id: 'frutas',      es: 'Frutas',             en: 'Fruits',        buy: 300,  suggested: 700,  demand: 'high',   icon: '🍎' },
  { id: 'sandwiches',  es: 'Sándwiches',         en: 'Sandwiches',    buy: 800,  suggested: 1500, demand: 'medium', icon: '🥪' },
  { id: 'yogures',     es: 'Yogures',            en: 'Yogurts',       buy: 600,  suggested: 1100, demand: 'low',    icon: '🥛' },
  { id: 'barras',      es: 'Barras de cereal',   en: 'Cereal Bars',   buy: 350,  suggested: 750,  demand: 'low',    icon: '🌾' },
]

const productName = (id) => {
  const p = PRODUCTS.find(x => x.id === id)
  return p ? (isEN.value ? p.en : p.es) : id
}

// ── DIFFICULTIES ──────────────────────────────────────────────────────────
const DIFFICULTIES = [
  { id: 'easy',   icon: '🟢', name: 'Fácil',   nameEN: 'Easy',   capital: 50000,  days: 1, products: ['jugos','galletas','chocolates'] },
  { id: 'medium', icon: '🟡', name: 'Medio',   nameEN: 'Medium', capital: 75000,  days: 2, products: ['jugos','galletas','chocolates','frutas','sandwiches'] },
  { id: 'hard',   icon: '🔴', name: 'Difícil', nameEN: 'Hard',   capital: 100000, days: 3, products: ['jugos','galletas','chocolates','frutas','sandwiches','yogures','barras'] },
]

// ── DEMAND EVENTS ────────────────────────────────────────────────────────
const DEMAND_EVENTS = [
  { id: 'hot',    icon: '☀️', nameES: 'Día caluroso ☀️',       nameEN: 'Hot day ☀️',         descES: '+30% ventas de jugos y frutas.',            descEN: '+30% juice and fruit sales.',        affects: ['jugos','frutas'], multiplier: 1.3,  global: 1.0 },
  { id: 'short',  icon: '⏰', nameES: 'Recreo más corto ⏰',    nameEN: 'Short break ⏰',       descES: '−20% ventas de todos los productos.',       descEN: '−20% sales on all products.',        affects: [],                multiplier: 1.0,  global: 0.8 },
  { id: 'sports', icon: '⚽', nameES: 'Actividad deportiva ⚽', nameEN: 'Sports activity ⚽',  descES: '+25% ventas de jugos y frutas.',            descEN: '+25% juice and fruit sales.',        affects: ['jugos','frutas'], multiplier: 1.25, global: 1.0 },
  { id: 'fair',   icon: '🎪', nameES: 'Feria escolar 🎪',       nameEN: 'School fair 🎪',       descES: '+20% ventas de todos los productos.',       descEN: '+20% sales on all products.',        affects: [],                multiplier: 1.0,  global: 1.2 },
  { id: 'exam',   icon: '📝', nameES: 'Día de examen 📝',       nameEN: 'Exam day 📝',          descES: '−15% ventas. Alumnos ocupados.',            descEN: '−15% sales. Students studying.',     affects: [],                multiplier: 1.0,  global: 0.85 },
  { id: 'normal', icon: '😊', nameES: 'Día normal 😊',          nameEN: 'Normal day 😊',        descES: 'Sin eventos especiales.',                   descEN: 'No special events.',                 affects: [],                multiplier: 1.0,  global: 1.0 },
]

// ── LOGISTICS EVENTS ─────────────────────────────────────────────────────
const BASE_LOGISTICS = 200

const LOGISTICS_EVENTS = [
  { id: 'strike',  icon: '🚚', cost: 600, nameES: 'Huelga de transporte 🚚',  nameEN: 'Transport strike 🚚',   descES: '¡Costo logístico sube a $600 por unidad!',              descEN: 'Logistics cost rises to $600 per unit!' },
  { id: 'distant', icon: '📦', cost: 450, nameES: 'Proveedor lejano 📦',      nameEN: 'Distant supplier 📦',   descES: 'Distribución más cara: $450 por unidad.',              descEN: 'Longer distribution: $450 per unit.' },
  { id: 'fuel',    icon: '⛽', cost: 380, nameES: 'Alza de combustible ⛽',   nameEN: 'Fuel price surge ⛽',   descES: 'El alza de bencina sube el flete a $380 por unidad.',   descEN: 'Fuel costs push freight to $380 per unit.' },
]

const BASE_CUSTOMERS = { high: 12, medium: 8, low: 5 }

// ── STATE ─────────────────────────────────────────────────────────────────
const phase              = ref('intro')
const difficulty         = ref(null)
const currentDay         = ref(1)
const totalDays          = ref(1)
const capital            = ref(0)
const initialCapital     = ref(0)
const currentProducts    = ref([])
const buyOrders          = reactive({})

// Logistics (set at start of each buy phase)
const dayLogisticsCost   = ref(BASE_LOGISTICS)
const dayLogisticsEvent  = ref(null)

// Day results
const dayEvent           = ref(null)
const salesResults       = ref([])
const dayProductsCost    = ref(0)
const dayLogisticsTotal  = ref(0)
const dayRevenue         = ref(0)
const dayProfit          = ref(0)

// Accumulated
const totalGameSpent     = ref(0)
const totalGameRevenue   = ref(0)

// Final
const rewardCoins        = ref(0)
const newAchievements    = ref([])
const feedbackType       = ref('good')
const feedback           = ref('')

// ── COMPUTED ──────────────────────────────────────────────────────────────
const hasEnergy = computed(() => player.energiaActual > 0)

// Total cost now includes logistics per unit
const totalBuyCost = computed(() =>
  currentProducts.value.reduce((s, p) => {
    const qty = buyOrders[p.id]?.qty || 0
    return s + qty * (p.buy + dayLogisticsCost.value)
  }, 0)
)

const remainingCapital = computed(() => capital.value - totalBuyCost.value)
const totalGameProfit  = computed(() => totalGameRevenue.value - totalGameSpent.value)

const rentability = computed(() => {
  if (totalGameSpent.value === 0) return 0
  return Math.round((totalGameProfit.value / totalGameSpent.value) * 100)
})

const finalIcon = computed(() => {
  const r = rentability.value
  if (r > 30) return '🏆'
  if (r > 15) return '⭐'
  if (r > 0)  return '😊'
  return '😓'
})

const finalTitle = computed(() => {
  const r = rentability.value
  if (isEN.value) {
    if (r > 30) return 'Excellent Management!'
    if (r > 15) return 'Good Job!'
    if (r > 5)  return 'Not bad!'
    if (r >= 0) return 'You barely broke even.'
    return 'Your kiosk ended in loss.'
  }
  if (r > 30) return '¡Excelente gestión!'
  if (r > 15) return '¡Buen trabajo!'
  if (r > 5)  return '¡Nada mal!'
  if (r >= 0) return 'Apenas cubriste costos.'
  return 'Tu kiosco terminó con pérdidas.'
})

// ── HELPERS ───────────────────────────────────────────────────────────────
const adjustQty = (id, delta) => {
  if (!buyOrders[id]) buyOrders[id] = { qty: 0, price: PRODUCTS.find(p => p.id === id)?.suggested ?? 0 }
  buyOrders[id].qty = Math.max(0, (buyOrders[id].qty || 0) + delta)
}

const setPrice = (id, val) => {
  const num = Math.max(0, Math.min(3000, parseInt(val) || 0))
  if (!buyOrders[id]) buyOrders[id] = { qty: 0, price: num }
  else buyOrders[id].price = num
}

const adjustPrice = (id, delta) => {
  const current = buyOrders[id]?.price ?? PRODUCTS.find(p => p.id === id)?.suggested ?? 0
  setPrice(id, current + delta)
}

// Unit profit = sell price - (buy cost + logistics per unit)
const getUnitProfit = (p) => {
  const price = buyOrders[p.id]?.price ?? p.suggested
  return price - p.buy - dayLogisticsCost.value
}

// ── GAME FLOW ─────────────────────────────────────────────────────────────
const pickDemandEvent = () => {
  const id = difficulty.value?.id
  if (id === 'easy') return DEMAND_EVENTS.find(e => e.id === 'normal')
  const pool = id === 'hard' ? DEMAND_EVENTS.filter(e => e.id !== 'normal') : DEMAND_EVENTS
  return pool[Math.floor(Math.random() * pool.length)]
}

const pickLogisticsEvent = () => {
  const id = difficulty.value?.id
  if (id === 'easy') return null          // easy: always normal logistics
  const threshold = id === 'hard' ? 0.60 : 0.35
  if (Math.random() >= threshold) return null
  return LOGISTICS_EVENTS[Math.floor(Math.random() * LOGISTICS_EVENTS.length)]
}

const beginDay = () => {
  // Reset quantities only (keep prices)
  currentProducts.value.forEach(p => { buyOrders[p.id].qty = 0 })

  // Determine today's logistics cost (revealed BEFORE buying so player can price accordingly)
  const logEvt = pickLogisticsEvent()
  dayLogisticsEvent.value = logEvt
  dayLogisticsCost.value  = logEvt ? logEvt.cost : BASE_LOGISTICS

  phase.value = 'buy'
}

const startGame = (diffId) => {
  const d = DIFFICULTIES.find(x => x.id === diffId)
  difficulty.value     = d
  totalDays.value      = d.days
  capital.value        = d.capital
  initialCapital.value = d.capital
  currentDay.value     = 1
  currentProducts.value = PRODUCTS.filter(p => d.products.includes(p.id))
  totalGameSpent.value   = 0
  totalGameRevenue.value = 0

  // Initialize buy orders with suggested prices
  currentProducts.value.forEach(p => { buyOrders[p.id] = { qty: 0, price: p.suggested } })

  // beginDay sets logistics event and transitions to 'buy'
  const logEvt = pickLogisticsEvent()
  dayLogisticsEvent.value = logEvt
  dayLogisticsCost.value  = logEvt ? logEvt.cost : BASE_LOGISTICS
  phase.value = 'buy'
}

const runDay = () => {
  const event = pickDemandEvent()
  dayEvent.value = event

  let productsCost = 0, logisticsTotal = 0, revenue = 0
  const results = []

  currentProducts.value.forEach(p => {
    const { qty = 0, price = p.suggested } = buyOrders[p.id] || {}
    if (qty === 0) return

    productsCost   += qty * p.buy
    logisticsTotal += qty * dayLogisticsCost.value

    // Base demand by product type
    let customers = BASE_CUSTOMERS[p.demand]

    // Apply demand event modifiers
    if (event.affects.includes(p.id)) customers = Math.round(customers * event.multiplier)
    customers = Math.round(customers * event.global)

    // Extended price effect on demand (free pricing from $0 to $3000)
    const ratio = price > 0 ? price / p.suggested : 0
    let pm
    if (price === 0)        pm = 3.5   // free: maximum demand
    else if (ratio < 0.3)  pm = 2.5   // very cheap: very high demand
    else if (ratio < 0.6)  pm = 1.7   // significantly under price
    else if (ratio < 0.85) pm = 1.25  // somewhat under
    else if (ratio <= 1.1) pm = 1.0   // normal zone
    else if (ratio <= 1.3) pm = 0.80
    else if (ratio <= 1.6) pm = 0.55
    else if (ratio <= 2.0) pm = 0.30
    else                   pm = 0.10  // extreme overpricing

    const sold    = Math.min(qty, Math.round(customers * pm))
    const unsold  = qty - sold
    const rev     = sold * price
    revenue += rev

    // Profit includes BOTH purchase cost and logistics for all bought units
    const totalUnitCost = p.buy + dayLogisticsCost.value
    results.push({
      id: p.id, icon: p.icon, nameES: p.es, nameEN: p.en,
      bought: qty, sold, unsold, revenue: rev,
      profit: rev - qty * totalUnitCost
    })
  })

  const totalSpentDay = productsCost + logisticsTotal

  dayProductsCost.value  = productsCost
  dayLogisticsTotal.value = logisticsTotal
  dayRevenue.value       = revenue
  dayProfit.value        = revenue - totalSpentDay
  capital.value          = capital.value - totalSpentDay + revenue
  totalGameSpent.value   += totalSpentDay
  totalGameRevenue.value += revenue
  salesResults.value     = results
  phase.value            = 'dayResult'
}

const nextDayOrFinish = () => {
  if (currentDay.value < totalDays.value) {
    currentDay.value++
    beginDay()   // picks new logistics event for next day
  } else {
    showFinal()
  }
}

// ── KIOSK ACHIEVEMENTS ────────────────────────────────────────────────────
const KIOSK_ACHIEVEMENTS = [
  { id: 'kiosk-first',  title: 'Primer Emprendedor', titleEN: 'First Entrepreneur', badge: '🌱', desc: 'Obtuviste tu primera ganancia en el kiosco.',  descEN: 'You made your first kiosk profit.',         check: (s) => s.totalProfit > 0 },
  { id: 'kiosk-streak', title: 'Experto en Ventas',  titleEN: 'Sales Expert',       badge: '📈', desc: 'Ganaste en 5 partidas seguidas.',              descEN: 'Won 5 kiosk games in a row.',               check: (s) => (s.profitStreak || 0) >= 5 },
  { id: 'kiosk-rich',   title: 'Rey del Kiosco',     titleEN: 'Kiosk King',         badge: '👑', desc: 'Acumulaste más de $50.000 en ganancias.',      descEN: 'Earned over $50,000 in total profit.',      check: (s) => (s.accumulatedProfit || 0) >= 50000 },
  { id: 'kiosk-master', title: 'Maestro Financiero', titleEN: 'Financial Master',   badge: '🏆', desc: 'Completaste todos los niveles de dificultad.', descEN: 'Completed all difficulty levels.',          check: (s) => (s.difficultiesCompleted || []).length >= 3 },
]

const loadKioskStats   = () => { try { return JSON.parse(localStorage.getItem('kiosk_stats') || '{}') } catch { return {} } }
const saveKioskStats   = (s) => localStorage.setItem('kiosk_stats', JSON.stringify(s))
const loadKioskAchievs = () => { try { return new Set(JSON.parse(localStorage.getItem('kiosk_achievements') || '[]')) } catch { return new Set() } }

const showFinal = () => {
  const r = rentability.value
  let coins = 3
  if (r > 30) coins = 20
  else if (r > 15) coins = 15
  else if (r > 5)  coins = 10
  else if (r > 0)  coins = 5
  rewardCoins.value = coins

  const logHint = isEN.value
    ? ' Remember: your real cost per unit = purchase price + logistics cost. Always price above that to make a profit!'
    : ' Recuerda: el costo real por unidad = costo de compra + costo logístico. ¡Siempre fija tu precio sobre ese total para ser rentable!'

  if (r > 30) {
    feedbackType.value = 'excellent'
    feedback.value = isEN.value
      ? '✅ Excellent! You bought high-demand products, accounted for logistics and priced your items wisely.'
      : '✅ ¡Excelente! Compraste productos con buena demanda, consideraste la logística y fijaste precios que generaron ganancias reales.'
  } else if (r > 15) {
    feedbackType.value = 'good'
    feedback.value = isEN.value
      ? `✅ Good job! You made a profit. Review which products sold best next time.${logHint}`
      : `✅ ¡Buen trabajo! Lograste ganancias. Revisa cuáles productos tuvieron mejor rendimiento.${logHint}`
  } else if (r > 0) {
    feedbackType.value = 'ok'
    feedback.value = isEN.value
      ? `⚠️ Small profit. Perhaps your sell prices barely covered the total unit cost (purchase + logistics).${logHint}`
      : `⚠️ Ganancia pequeña. Quizás tus precios apenas cubrieron el costo real por unidad (compra + logística).${logHint}`
  } else {
    feedbackType.value = 'bad'
    feedback.value = isEN.value
      ? `❌ Your kiosk ended with losses. Check that your sell price covers BOTH the purchase cost AND the logistics cost per unit before opening.${logHint}`
      : `❌ Tu kiosco terminó con pérdidas. Asegúrate de que tu precio de venta cubra TANTO el costo de compra COMO el costo logístico por unidad antes de abrir.${logHint}`
  }

  const stats    = loadKioskStats()
  const newStats = {
    accumulatedProfit:     (stats.accumulatedProfit || 0) + Math.max(0, totalGameProfit.value),
    profitStreak:          totalGameProfit.value > 0 ? (stats.profitStreak || 0) + 1 : 0,
    difficultiesCompleted: [...new Set([...(stats.difficultiesCompleted || []), difficulty.value.id])],
    totalProfit:           totalGameProfit.value,
  }
  saveKioskStats(newStats)

  const unlocked       = loadKioskAchievs()
  const freshlyUnlocked = []
  KIOSK_ACHIEVEMENTS.forEach(a => {
    if (!unlocked.has(a.id) && a.check(newStats)) { unlocked.add(a.id); freshlyUnlocked.push(a) }
  })
  if (freshlyUnlocked.length) localStorage.setItem('kiosk_achievements', JSON.stringify([...unlocked]))
  newAchievements.value = freshlyUnlocked

  phase.value = 'final'
}

const finish = () => {
  const res = player.jugarMinijuego('kiosco', rewardCoins.value)
  emit('game-completed', {
    success:    totalGameProfit.value > 0,
    recompensa: res.recompensa,
    title:      finalTitle.value,
    msg: isEN.value
      ? `Profitability: ${rentability.value}%`
      : `Rentabilidad: ${rentability.value}%`
  })
}
</script>

<style scoped>
.kiosk-container { max-width: 720px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

h2 { text-align: center; color: var(--primary-color); margin-bottom: 0.5rem; }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.25rem; }

/* Energy */
.energy-bar { background: #eef0ff; color: var(--primary-color); padding: 0.5rem 1rem; border-radius: 10px; font-weight: 700; text-align: center; margin-bottom: 1rem; display: inline-block; width: 100%; box-sizing: border-box; }
.energy-bar.no-energy { background: #fff5f5; color: #d63031; }

/* Intro */
.intro-box { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1.25rem; }
.intro-box p { margin: 0 0 0.75rem; }
.objectives { margin: 0; padding-left: 1.25rem; }
.objectives li { margin: 0.3rem 0; font-size: 0.9rem; color: #444; }

/* Difficulty */
.diff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.diff-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); cursor: pointer; border: 2px solid transparent; transition: all 0.2s; text-align: center; }
.diff-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.diff-card.easy:hover   { border-color: #00b894; }
.diff-card.medium:hover { border-color: #fdcb6e; }
.diff-card.hard:hover   { border-color: #d63031; }
.diff-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.diff-card h3 { margin: 0 0 0.5rem; font-size: 1.2rem; }
.diff-info { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #636e72; margin-bottom: 0.75rem; }
.diff-products { list-style: none; padding: 0; margin: 0; text-align: left; font-size: 0.82rem; color: #444; }
.diff-products li::before { content: '• '; color: var(--primary-color); }

/* Logistics banner */
.logistics-banner { display: flex; align-items: flex-start; gap: 0.75rem; background: #f0fff4; border: 1.5px solid #b7ebd5; border-radius: 12px; padding: 0.85rem 1.1rem; margin-bottom: 1rem; font-size: 0.9rem; }
.logistics-banner.logistics-alert { background: #fff5f5; border-color: #fab1a0; }
.log-icon { font-size: 1.6rem; flex-shrink: 0; }
.log-info { display: flex; flex-direction: column; gap: 0.2rem; }
.log-event-label { font-size: 0.82rem; color: #d63031; font-weight: 700; }
.log-normal { font-size: 0.82rem; color: #636e72; }

/* Capital bar */
.phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
.day-badge { background: var(--primary-color); color: white; padding: 0.3rem 0.9rem; border-radius: 999px; font-size: 0.85rem; font-weight: 700; }
.capital-bar { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border-radius: 10px; padding: 0.65rem 1rem; margin-bottom: 1.25rem; font-size: 0.92rem; flex-wrap: wrap; }
.cost-info { color: #636e72; font-size: 0.85rem; margin-left: auto; }

/* Products grid */
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.product-card { background: white; border-radius: var(--border-radius-md); padding: 1rem; box-shadow: var(--shadow-sm); border: 2px solid #f1f2f6; }
.p-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.p-icon { font-size: 2rem; }
.p-header strong { font-size: 1rem; }
.p-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #636e72; margin-top: 0.2rem; flex-wrap: wrap; }
.demand-tag { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.demand-tag.high   { background: #ffeaa7; color: #d4830a; }
.demand-tag.medium { background: #dfe6e9; color: #636e72; }
.demand-tag.low    { background: #f1f2f6; color: #888; }

/* Cost breakdown inside product card */
.cost-breakdown { background: #f8fafc; border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.82rem; }
.cb-row { display: flex; justify-content: space-between; padding: 0.2rem 0; }
.cb-val { font-weight: 700; }
.cb-total-cost { border-top: 1px solid #e2e8f0; padding-top: 0.35rem; margin-top: 0.2rem; font-size: 0.85rem; }
.cb-total-cost .cb-val { color: #2d3436; }

/* Controls */
.p-controls { display: flex; flex-direction: column; gap: 0.65rem; }
.qty-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.88rem; }
.qty-btns { display: flex; align-items: center; gap: 0.3rem; }
.qty-btn { background: #f1f2f6; border: none; border-radius: 6px; width: 32px; height: 28px; font-weight: 800; cursor: pointer; font-size: 0.85rem; transition: background 0.15s; }
.qty-btn:hover { background: #dfe6e9; }
.qty-val { min-width: 32px; text-align: center; font-weight: 800; font-size: 1rem; }

/* Free price section */
.price-section { display: flex; flex-direction: column; gap: 0.35rem; }
.price-label { font-size: 0.85rem; font-weight: 700; color: #444; }
.price-input-row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.adj-btn { background: #eef0ff; border: none; border-radius: 6px; padding: 0.25rem 0.5rem; font-weight: 800; cursor: pointer; font-size: 0.78rem; color: var(--primary-color); transition: background 0.15s; flex-shrink: 0; }
.adj-btn:hover { background: #c7d2fe; }
.price-field { width: 80px; text-align: center; border: 2px solid #e2e8f0; border-radius: 8px; padding: 0.3rem 0.4rem; font-family: 'Fredoka', sans-serif; font-size: 1rem; font-weight: 700; color: #2d3436; }
.price-field:focus { outline: none; border-color: var(--primary-color); }

/* Unit profit indicator */
.unit-profit-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; flex-wrap: wrap; }
.profit-ok  { color: #00b894; font-weight: 800; }
.profit-neg { color: #d63031; font-weight: 800; }
.suggested-lbl { color: #b2bec3; font-size: 0.78rem; }

.subtotal-row { font-size: 0.82rem; color: #636e72; border-top: 1px solid #f1f2f6; padding-top: 0.5rem; }
.sub-detail { color: #b2bec3; font-size: 0.75rem; margin-left: 0.35rem; }

/* Events */
.event-box { display: flex; align-items: flex-start; gap: 1rem; background: #eef0ff; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 0.75rem; }
.event-box.event-logistics { background: #fff5f5; }
.event-icon { font-size: 2rem; }
.event-box strong { font-size: 1rem; }
.event-box p { margin: 0.25rem 0 0; font-size: 0.88rem; color: #636e72; }

/* Sales table */
.sales-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.st-header, .st-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr 1.2fr; padding: 0.65rem 1rem; gap: 0.5rem; font-size: 0.82rem; align-items: center; }
.st-header { background: #f8fafc; font-weight: 800; color: #636e72; font-size: 0.78rem; text-transform: uppercase; }
.st-row { border-top: 1px solid #f1f2f6; }
.ok-row  { border-left: 3px solid #00b894; }
.bad-row { border-left: 3px solid #e17055; }

/* Day summary */
.day-summary { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.sum-row { display: flex; justify-content: space-between; padding: 0.7rem 1.25rem; border-bottom: 1px solid #f1f2f6; font-size: 0.92rem; }
.sum-row:last-child { border-bottom: none; }
.net-row { background: #f8f9fa; }
.sum-logistics-alert { background: #fff8f8; }

/* Final stats */
.final-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }
.stat-box { background: white; border-radius: 12px; padding: 1rem 1.25rem; box-shadow: var(--shadow-sm); text-align: center; }
.highlight-box { background: #eef0ff; }
.stat-label { font-size: 0.78rem; color: #636e72; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem; }
.stat-val { font-family: 'Fredoka', sans-serif; font-size: 1.5rem; font-weight: 700; }

/* Achievements */
.achievements-box { background: #fffbea; border: 2px solid #fdcb6e; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
.achievements-box h3 { margin: 0 0 0.75rem; font-size: 1rem; }
.ach-item { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.ach-badge { font-size: 1.8rem; }
.ach-item strong { font-size: 0.95rem; }
.ach-item p { margin: 0.15rem 0 0; font-size: 0.82rem; color: #636e72; }

/* Feedback */
.feedback-box { border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; font-size: 0.92rem; line-height: 1.6; }
.feedback-box.excellent { background: #d4edda; color: #155724; }
.feedback-box.good      { background: #d1ecf1; color: #0c5460; }
.feedback-box.ok        { background: #fff3cd; color: #856404; }
.feedback-box.bad       { background: #f8d7da; color: #721c24; }
.feedback-box p { margin: 0; }

/* Reward */
.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }

/* Utils */
.pos { color: #00b894; font-weight: 800; }
.neg { color: #d63031; font-weight: 800; }
.warn-box { background: #fff5f5; border: 1px solid #fab1a0; color: #d63031; border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 700; margin-bottom: 0.75rem; }

.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }

@media (max-width: 480px) {
  .st-header, .st-row { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .st-header span:nth-child(5), .st-row span:nth-child(5),
  .st-header span:nth-child(6), .st-row span:nth-child(6) { display: none; }
  .products-grid { grid-template-columns: 1fr; }
  .price-input-row { flex-wrap: nowrap; overflow-x: auto; }
}
</style>
