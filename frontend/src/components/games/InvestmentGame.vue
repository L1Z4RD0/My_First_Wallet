<template>
  <div class="inv-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🍋</div>
      <h2>{{ isEN ? 'Lemonade Stand' : 'El Puesto de Limonada' }}</h2>
      <p class="subtitle">{{ isEN ? 'Set your price. Read the weather. Maximize profit.' : 'Fija tu precio. Lee el clima. Maximiza las ganancias.' }}</p>

      <div class="forecast-card">
        <div class="weather-big" :style="{ background: weatherInfo.bg }">
          <span class="w-emoji">{{ weatherInfo.emoji }}</span>
          <div>
            <p class="w-title">{{ isEN ? weatherInfo.labelEN : weatherInfo.label }}</p>
            <p class="w-forecast">{{ isEN ? weatherInfo.forecastEN : weatherInfo.forecast }}</p>
          </div>
        </div>
        <div class="weather-meta">
          <span>🌡️ Multiplicador de demanda: <strong>×{{ weatherInfo.mult }}</strong></span>
          <span v-if="competitor">🏪 {{ isEN ? competitor.descEN : competitor.desc }}</span>
        </div>
      </div>

      <div class="economics-card">
        <h4>{{ isEN ? 'Your Economics' : 'Tu Economía' }}</h4>
        <div class="eco-row"><span>{{ isEN ? 'Variable cost per cup:' : 'Costo variable por vaso:' }}</span><span>${{ VARIABLE_COST }}</span></div>
        <div class="eco-row"><span>{{ isEN ? 'Daily fixed cost:' : 'Costo fijo diario:' }}</span><span>${{ FIXED_COST }}</span></div>
        <div class="eco-row"><span>{{ isEN ? 'Base demand (no weather):' : 'Demanda base (sin clima):' }}</span><span>{{ BASE_DEMAND }} {{ isEN ? 'customers' : 'clientes' }}</span></div>
        <div class="eco-formula">
          {{ isEN ? 'Demand = ' : 'Demanda = ' }}{{ BASE_DEMAND }} × {{ weatherInfo.mult }} × (1 − 1.2 × ({{ isEN ? 'price' : 'precio' }} − {{ OPTIMAL_PRICE }}) / {{ OPTIMAL_PRICE }})
        </div>
      </div>

      <p class="tip">{{ isEN ? '💡 Maximize profit = set price where revenue beats all costs.' : '💡 Maximiza: fija el precio donde ingresos superen todos los costos.' }}</p>

      <button class="btn-primary" @click="phase = 'pricing'">
        {{ isEN ? '🍋 Open for Business' : '🍋 Abrir el Puesto' }}
      </button>
    </div>

    <!-- ══ PRICING ════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'pricing'" class="phase">
      <div class="pricing-header">
        <h3>{{ isEN ? 'Set your lemonade price' : 'Fija el precio de tu limonada' }}</h3>
        <div class="weather-chip" :style="{ background: weatherInfo.bg, color: weatherInfo.txtColor }">
          {{ weatherInfo.emoji }} {{ isEN ? weatherInfo.labelEN : weatherInfo.label }}
        </div>
      </div>

      <div v-if="competitor" class="competitor-box">
        <span>🏪</span>
        <p>{{ isEN ? competitor.descEN : competitor.desc }}
           <strong>{{ isEN ? 'Price:' : 'Precio:' }} ${{ competitor.price }}</strong></p>
      </div>

      <!-- Price slider -->
      <div class="price-slider-wrap">
        <div class="price-display">
          <span class="price-val">${{ chosenPrice }}</span>
          <span class="price-sub">{{ isEN ? 'per cup' : 'por vaso' }}</span>
        </div>
        <input type="range" min="3" max="20" step="0.5" v-model.number="chosenPrice" />
        <div class="price-range-labels"><span>$3</span><span>${{ OPTIMAL_PRICE }} óptimo</span><span>$20</span></div>
      </div>

      <!-- Supply decision (variant 2+) -->
      <div v-if="variant >= 2" class="supply-card">
        <h4>{{ isEN ? '🍋 Buy lemons' : '🍋 Comprar limones' }}</h4>
        <p>{{ isEN ? 'Bulk reduces variable cost. Min. order: 30 cups.' : 'Compra a granel reduce el costo variable. Mínimo: 30 vasos.' }}</p>
        <div class="supply-opts">
          <div
            v-for="opt in supplyOptions"
            :key="opt.id"
            class="supply-card-opt"
            :class="{ selected: supplyChoice === opt.id }"
            @click="supplyChoice = opt.id"
          >
            <span>{{ opt.cups }} {{ isEN ? 'cups capacity' : 'vasos cap.' }}</span>
            <span class="s-cost">${{ opt.cost }} {{ isEN ? 'upfront' : 'por adelantado' }}</span>
            <span class="s-vc" :class="opt.vc < VARIABLE_COST ? 'better' : ''">
              ${{ opt.vc }}/{{ isEN ? 'cup' : 'vaso' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Live projection -->
      <div class="projection-live">
        <div class="proj-item">
          <span>{{ isEN ? 'Est. customers' : 'Clientes est.' }}</span>
          <strong>{{ Math.round(estimatedDemand) }}</strong>
        </div>
        <div class="proj-item">
          <span>{{ isEN ? 'Revenue' : 'Ingresos' }}</span>
          <strong>${{ Math.round(estimatedRevenue) }}</strong>
        </div>
        <div class="proj-item">
          <span>{{ isEN ? 'Total costs' : 'Costos totales' }}</span>
          <strong>−${{ Math.round(estimatedCosts) }}</strong>
        </div>
        <div class="proj-item" :class="estimatedProfit >= 0 ? 'profit-pos' : 'profit-neg'">
          <span>{{ isEN ? 'Est. profit' : 'Ganancia est.' }}</span>
          <strong>{{ estimatedProfit >= 0 ? '+' : '' }}${{ Math.round(estimatedProfit) }}</strong>
        </div>
      </div>

      <button class="btn-primary" @click="resolveDay">
        {{ isEN ? '☀️ Open the Stand!' : '☀️ ¡Abrir el día!' }}
      </button>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase">
      <div class="result-header" :class="actualProfit >= 0 ? 'res-win' : 'res-loss'">
        <span class="ri">{{ actualProfit > 50 ? '🏆' : actualProfit >= 0 ? '👍' : '😔' }}</span>
        <h2>{{ isEN ? 'Day Complete!' : '¡Día Terminado!' }}</h2>
        <p>{{ weatherInfo.emoji }} {{ isEN ? weatherInfo.labelEN : weatherInfo.label }}</p>
      </div>

      <div class="results-detail">
        <div class="rd-row"><span>{{ isEN ? 'Customers served' : 'Clientes atendidos' }}</span><span>{{ Math.round(actualDemand) }}</span></div>
        <div class="rd-row"><span>{{ isEN ? 'Price per cup' : 'Precio por vaso' }}</span><span>${{ chosenPrice }}</span></div>
        <div class="rd-row"><span>{{ isEN ? 'Revenue' : 'Ingresos' }}</span><span class="pos">${{ Math.round(actualRevenue) }}</span></div>
        <div class="rd-row"><span>{{ isEN ? 'Variable costs' : 'Costos variables' }}</span><span class="neg">−${{ Math.round(actualVariableCost) }}</span></div>
        <div class="rd-row"><span>{{ isEN ? 'Fixed costs' : 'Costos fijos' }}</span><span class="neg">−${{ FIXED_COST }}</span></div>
        <div class="rd-row profit-row">
          <span><strong>{{ isEN ? 'Net Profit' : 'Ganancia Neta' }}</strong></span>
          <span :class="actualProfit >= 0 ? 'pos' : 'neg'"><strong>${{ Math.round(actualProfit) }}</strong></span>
        </div>
      </div>

      <div class="opt-comparison" v-if="Math.abs(optimalProfit - actualProfit) > 5">
        <p>
          {{ isEN ? `💡 Optimal price was $${optimalPriceFound} → profit $${Math.round(optimalProfit)}` : `💡 Precio óptimo era $${optimalPriceFound} → ganancia $${Math.round(optimalProfit)}` }}
        </p>
      </div>

      <div class="reward-box">
        <p>{{ isEN ? 'Reward:' : 'Recompensa:' }} <strong class="coins">+{{ rewardCoins }} 🪙</strong></p>
      </div>

      <button class="btn-primary" @click="finish">{{ isEN ? 'Finish' : 'Terminar' }}</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../store/player'

const props = defineProps({ language: { type: String, default: 'es' } })
const emit  = defineEmits(['game-completed'])
const player = usePlayerStore()

const isEN    = computed(() => props.language === 'en')
const variant = computed(() => Math.min(player.diaActual, 4))

const BASE_DEMAND   = 60
const VARIABLE_COST = 2.5
const FIXED_COST    = 20
const OPTIMAL_PRICE = 8
const ELASTICITY    = 1.2

const weatherOptions = [
  { id: 'hot',     emoji: '🌞', label: 'Muy Caluroso',  labelEN: 'Very Hot',   mult: 2.0, bg: '#fff3cd', txtColor: '#6c4b00', forecast: 'Temperatura máxima de 38°C. Demanda altísima.', forecastEN: 'Temperature reaching 38°C. Maximum demand expected.' },
  { id: 'sunny',   emoji: '⛅', label: 'Soleado',       labelEN: 'Sunny',      mult: 1.4, bg: '#d1fae5', txtColor: '#065f46', forecast: 'Día agradable con sol. Buena demanda.',          forecastEN: 'Pleasant sunny day. Good demand expected.' },
  { id: 'cloudy',  emoji: '☁️', label: 'Nublado',       labelEN: 'Overcast',   mult: 0.8, bg: '#e2e8f0', txtColor: '#374151', forecast: 'Cielo cubierto. Demanda moderada.',               forecastEN: 'Overcast skies. Moderate demand.' },
  { id: 'rainy',   emoji: '🌧️', label: 'Lluvioso',      labelEN: 'Rainy',      mult: 0.3, bg: '#bee3f8', txtColor: '#2b6cb0', forecast: 'Lluvia durante todo el día. Baja demanda.',       forecastEN: 'Rain all day. Low demand — consider a lower price.' },
]

const competitorOptions = [
  null,
  { price: 7,  desc: 'Competidor cobra $7/vaso (misma calidad)',     descEN: 'Competitor charges $7/cup (same quality)' },
  { price: 5,  desc: 'Competidor cobra $5/vaso (calidad inferior)',  descEN: 'Competitor charges $5/cup (lower quality)' },
  { price: 10, desc: 'Competidor cobra $10/vaso (premium)',          descEN: 'Competitor charges $10/cup (premium brand)' },
]

const supplyOptions = [
  { id: 'standard', cups: 60,  cost: 0,   vc: 2.5, label: 'Estándar' },
  { id: 'medium',   cups: 100, cost: 30,  vc: 2.0, label: 'Granel medio' },
  { id: 'bulk',     cups: 150, cost: 60,  vc: 1.5, label: 'Granel grande' },
]

// ── STATE ─────────────────────────────────────────────────────────────────

const weatherInfo   = ref(weatherOptions[0])
const competitor    = ref(null)
const chosenPrice   = ref(OPTIMAL_PRICE)
const supplyChoice  = ref('standard')
const phase         = ref('intro')
const actualDemand  = ref(0)
const actualRevenue = ref(0)
const actualVariableCost = ref(0)
const actualProfit  = ref(0)
const optimalProfit = ref(0)
const optimalPriceFound = ref(0)
const rewardCoins   = ref(0)

// ── COMPUTED PROJECTIONS ──────────────────────────────────────────────────

const activeVc = computed(() => supplyOptions.find(s => s.id === supplyChoice.value)?.vc ?? VARIABLE_COST)
const supplyCost = computed(() => supplyOptions.find(s => s.id === supplyChoice.value)?.cost ?? 0)

const estimatedDemand = computed(() => {
  const base = BASE_DEMAND * weatherInfo.value.mult
  const elast = ELASTICITY * (chosenPrice.value - OPTIMAL_PRICE) / OPTIMAL_PRICE
  let demand = base * (1 - elast)
  // Competitor effect
  if (competitor.value) {
    if (chosenPrice.value > competitor.value.price) demand *= 0.7
    else if (chosenPrice.value < competitor.value.price) demand *= 1.1
  }
  return Math.max(0, demand)
})

const estimatedRevenue   = computed(() => estimatedDemand.value * chosenPrice.value)
const estimatedCosts     = computed(() => estimatedDemand.value * activeVc.value + FIXED_COST + supplyCost.value)
const estimatedProfit    = computed(() => estimatedRevenue.value - estimatedCosts.value)

// ── INIT ──────────────────────────────────────────────────────────────────

const yaJugoHoy = computed(() => player.juegosJugadosHoy.inversion >= 1)

// Called on mount / when entering component
const weatherIdx = Math.floor(Math.random() * weatherOptions.length)
weatherInfo.value = weatherOptions[weatherIdx]
if (variant.value >= 2) {
  const compIdx = Math.floor(Math.random() * competitorOptions.length)
  competitor.value = competitorOptions[compIdx]
}

// ── RESOLVE ───────────────────────────────────────────────────────────────

const resolveDay = () => {
  if (yaJugoHoy.value) return

  player.juegosJugadosHoy.inversion = 1
  player.save()

  if (!player.gastarEnergia(1)) {
    emit('game-completed', { success: false, recompensa: 0, title: 'Sin energía', msg: 'No tienes energía.' })
    return
  }

  // Add noise to demand
  const noise = (Math.random() - 0.5) * 0.2
  actualDemand.value = Math.max(0, Math.round(estimatedDemand.value * (1 + noise)))
  actualRevenue.value = actualDemand.value * chosenPrice.value
  actualVariableCost.value = actualDemand.value * activeVc.value
  actualProfit.value = actualRevenue.value - actualVariableCost.value - FIXED_COST - supplyCost.value

  // Deduct supply cost from player
  if (supplyCost.value > 0) player.gastarDinero(supplyCost.value)

  // Award profit to player
  if (actualProfit.value > 0) player.ganarDinero(Math.round(actualProfit.value))

  // Find actual optimal price
  let bestOpt = -Infinity, bestP = OPTIMAL_PRICE
  for (let p = 3; p <= 20; p += 0.5) {
    const d = Math.max(0, BASE_DEMAND * weatherInfo.value.mult * (1 - ELASTICITY * (p - OPTIMAL_PRICE) / OPTIMAL_PRICE))
    const profit = d * p - d * activeVc.value - FIXED_COST - supplyCost.value
    if (profit > bestOpt) { bestOpt = profit; bestP = p }
  }
  optimalProfit.value     = bestOpt
  optimalPriceFound.value = bestP

  const base = [15, 25, 35, 50][variant.value - 1] ?? 25
  const pct  = optimalProfit.value > 0 ? Math.min(1, Math.max(0, actualProfit.value / optimalProfit.value)) : 0
  rewardCoins.value = Math.round(base * pct + base * 0.3)

  phase.value = 'result'
}

const finish = () => {
  emit('game-completed', {
    success:    actualProfit.value > 0,
    recompensa: Math.max(0, Math.round(actualProfit.value)),
    title:      actualProfit.value > 50
      ? (isEN.value ? '🏆 Excellent Stand!' : '🏆 ¡Puesto Excelente!')
      : actualProfit.value >= 0
        ? (isEN.value ? '👍 Profitable Day!' : '👍 ¡Día Rentable!')
        : (isEN.value ? '💡 The weather was tough' : '💡 El clima fue difícil'),
    msg: isEN.value
      ? `Price: $${chosenPrice.value} | Customers: ${Math.round(actualDemand.value)} | Profit: $${Math.round(actualProfit.value)}`
      : `Precio: $${chosenPrice.value} | Clientes: ${Math.round(actualDemand.value)} | Ganancia: $${Math.round(actualProfit.value)}`
  })
}
</script>

<style scoped>
.inv-container { max-width: 640px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; }

/* Weather */
.forecast-card { border-radius: var(--border-radius-md); overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.weather-big { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.5rem; }
.w-emoji { font-size: 3rem; }
.w-title { font-family: 'Fredoka', sans-serif; font-size: 1.4rem; font-weight: 700; margin: 0; }
.w-forecast { font-size: 0.88rem; margin: 0.3rem 0 0; opacity: 0.9; }
.weather-meta { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.85rem 1.25rem; background: white; font-size: 0.88rem; font-weight: 600; }

/* Economics */
.economics-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.economics-card h4 { margin: 0 0 0.75rem; }
.eco-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.9rem; border-bottom: 1px solid #f1f2f6; }
.eco-row:last-child { border-bottom: none; }
.eco-formula { font-size: 0.78rem; color: #636e72; font-family: monospace; background: #f8fafc; padding: 0.5rem; border-radius: 8px; margin-top: 0.75rem; line-height: 1.5; }
.tip { color: #636e72; font-size: 0.85rem; text-align: center; margin-bottom: 1rem; }

/* Pricing */
.pricing-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
.pricing-header h3 { margin: 0; }
.weather-chip { padding: 0.35rem 0.9rem; border-radius: 999px; font-size: 0.82rem; font-weight: 800; }
.competitor-box { display: flex; align-items: flex-start; gap: 0.75rem; background: #fff3cd; border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 1rem; font-size: 0.88rem; line-height: 1.5; }
.competitor-box span { font-size: 1.5rem; }

.price-slider-wrap { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; text-align: center; }
.price-display { margin-bottom: 0.75rem; }
.price-val { font-family: 'Fredoka', sans-serif; font-size: 3rem; font-weight: 700; color: var(--primary-color); }
.price-sub { font-size: 0.85rem; color: #636e72; margin-left: 0.3rem; }
input[type=range] { width: 100%; accent-color: var(--primary-color); margin: 0.5rem 0; }
.price-range-labels { display: flex; justify-content: space-between; font-size: 0.75rem; color: #636e72; }

/* Supply */
.supply-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.supply-card h4 { margin: 0 0 0.4rem; }
.supply-card p { font-size: 0.85rem; color: #636e72; margin: 0 0 0.75rem; }
.supply-opts { display: flex; gap: 0.75rem; }
.supply-card-opt { flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 0.75rem; cursor: pointer; text-align: center; font-size: 0.82rem; font-weight: 700; display: flex; flex-direction: column; gap: 0.25rem; transition: all 0.18s; }
.supply-card-opt.selected { border-color: var(--primary-color); background: #eef0ff; }
.supply-card-opt:hover { border-color: var(--primary-color); }
.s-cost { color: #e17055; }
.s-vc { } .better { color: #00b894; }

/* Live projection */
.projection-live { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
.proj-item { background: white; border-radius: 12px; padding: 0.75rem; text-align: center; box-shadow: var(--shadow-sm); }
.proj-item span { display: block; font-size: 0.72rem; font-weight: 800; color: #636e72; text-transform: uppercase; margin-bottom: 0.2rem; }
.proj-item strong { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 700; }
.profit-pos strong { color: #00b894; }
.profit-neg strong { color: #d63031; }

/* Result */
.result-header { text-align: center; border-radius: var(--border-radius-lg); padding: 2rem; margin-bottom: 1.5rem; }
.res-win  { background: linear-gradient(135deg, #00b894, #55efc4); color: white; }
.res-loss { background: linear-gradient(135deg, #b2bec3, #636e72); color: white; }
.result-header h2 { color: white; margin: 0.4rem 0; }
.result-header p { opacity: 0.9; margin: 0; }
.ri { font-size: 3.5rem; display: block; }
.results-detail { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.rd-row { display: flex; justify-content: space-between; padding: 0.75rem 1.25rem; border-bottom: 1px solid #f1f2f6; font-size: 0.9rem; }
.rd-row:last-child { border-bottom: none; }
.profit-row { background: #f8f9fa; }
.pos { color: #00b894; font-weight: 800; } .neg { color: #d63031; font-weight: 800; }
.opt-comparison { background: #eef0ff; color: #3730a3; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
