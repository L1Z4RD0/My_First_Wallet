<template>
  <div class="sb-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">❄️</div>
      <h2>La Bola de Nieve</h2>
      <p class="subtitle">Interés compuesto: ¿a favor tuyo o en tu contra?</p>

      <div class="intro-cards">
        <div class="intro-card debt-card">
          <h4>💳 Tus Deudas</h4>
          <div v-for="d in scenario.debts" :key="d.id" class="info-row">
            <span>{{ d.name }}</span>
            <span class="rate-bad">{{ d.monthlyRate }}%/mes</span>
            <span>${{ d.balance }}</span>
          </div>
        </div>
        <div class="intro-card invest-card">
          <h4>📈 Opciones de Inversión</h4>
          <div v-for="inv in scenario.investments" :key="inv.id" class="info-row">
            <span>{{ inv.name }}</span>
            <span class="rate-good">{{ inv.monthlyRate }}%/mes</span>
            <span class="risk-tag" :class="inv.risk">{{ inv.risk }}</span>
          </div>
        </div>
      </div>

      <div class="income-box">
        <span>💵 Ingreso mensual disponible:</span>
        <strong>${{ scenario.income }}/mes × {{ scenario.months }} meses</strong>
      </div>

      <div class="objective-box">
        <p>🎯 <strong>Objetivo:</strong> Maximizar tu patrimonio neto al cabo de {{ scenario.months }} meses.</p>
        <p class="hint">💡 ¿Conviene pagar la deuda de {{ maxDebtRate }}%/mes antes de invertir al {{ maxInvRate }}%/mes?</p>
      </div>

      <button class="btn-primary" @click="startGame">Comenzar simulación</button>
    </div>

    <!-- ══ SIMULATION TURNS ═══════════════════════════════════════════════ -->
    <div v-else-if="phase === 'playing'" class="phase">
      <div class="hud">
        <div class="hud-item">
          <span class="hud-label">Mes</span>
          <span class="hud-val">{{ currentMonth }}/{{ scenario.months }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Patrimonio</span>
          <span class="hud-val" :class="netWorth >= 0 ? 'pos' : 'neg'">${{ netWorth }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">A distribuir</span>
          <span class="hud-val green">${{ remainingToAssign }}</span>
        </div>
      </div>

      <!-- Event banner -->
      <div v-if="currentEvent" class="event-banner" :class="currentEvent.type">
        <span>{{ currentEvent.icon }}</span>
        <p>{{ currentEvent.text }} <strong>{{ currentEvent.amount > 0 ? '+' : '' }}${{ currentEvent.amount }}</strong></p>
      </div>

      <!-- Debt sliders -->
      <div class="section-title">💳 Pagar Deudas</div>
      <div v-for="d in activeDebts" :key="d.id" class="slider-row">
        <div class="slider-info">
          <span class="sl-name">{{ d.name }}</span>
          <span class="sl-balance">Saldo: ${{ Math.round(d.balance) }}</span>
          <span class="sl-rate rate-bad">{{ d.monthlyRate }}%/mes</span>
        </div>
        <input
          type="range" min="0" :max="Math.min(d.balance, remainingToAssign + allocations.debts[d.id])"
          step="10" v-model.number="allocations.debts[d.id]"
          @input="clampAllocations"
        />
        <span class="sl-amount">${{ allocations.debts[d.id] }}</span>
      </div>

      <!-- Investment sliders -->
      <div class="section-title">📈 Invertir</div>
      <div v-for="inv in scenario.investments" :key="inv.id" class="slider-row">
        <div class="slider-info">
          <span class="sl-name">{{ inv.name }}</span>
          <span class="sl-balance">Acumulado: ${{ Math.round(portfolios[inv.id] ?? 0) }}</span>
          <span class="sl-rate rate-good">+{{ inv.monthlyRate }}%/mes</span>
          <span class="risk-tag sm" :class="inv.risk">{{ inv.risk }}</span>
        </div>
        <input
          type="range" min="0" :max="remainingToAssign + allocations.investments[inv.id]"
          step="10" v-model.number="allocations.investments[inv.id]"
          @input="clampAllocations"
        />
        <span class="sl-amount">${{ allocations.investments[inv.id] }}</span>
      </div>

      <div class="unassigned-row" :class="{ warn: remainingToAssign > 0 }">
        {{ remainingToAssign > 0 ? `⚠️ $${remainingToAssign} sin asignar → se queda en efectivo (pierde valor)` : '✅ Todo asignado' }}
      </div>

      <button class="btn-primary" @click="advanceMonth">
        Pasar al Mes {{ currentMonth + 1 }} →
      </button>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase">
      <h2>📊 Resultado Final</h2>

      <div class="result-grid">
        <div class="res-card">
          <span class="res-label">Patrimonio final</span>
          <span class="res-val" :class="finalNetWorth >= 0 ? 'pos' : 'neg'">${{ Math.round(finalNetWorth) }}</span>
        </div>
        <div class="res-card">
          <span class="res-label">Inversiones</span>
          <span class="res-val pos">${{ Math.round(totalInvested) }}</span>
        </div>
        <div class="res-card">
          <span class="res-label">Deuda restante</span>
          <span class="res-val" :class="totalDebt > 0 ? 'neg' : 'pos'">${{ Math.round(totalDebt) }}</span>
        </div>
      </div>

      <div class="insight-box" :class="insightClass">
        <h4>{{ insightTitle }}</h4>
        <p>{{ insightText }}</p>
      </div>

      <div class="chart-bars">
        <div class="bar-row" v-for="(snap, i) in history" :key="i">
          <span class="bar-label">M{{ i + 1 }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="barStyle(snap.netWorth)"></div>
          </div>
          <span class="bar-val" :class="snap.netWorth >= 0 ? 'pos' : 'neg'">${{ Math.round(snap.netWorth) }}</span>
        </div>
      </div>

      <div class="reward-box">
        <p>Recompensa: <strong class="coins">+${{ rewardCoins }}</strong> 🪙</p>
      </div>

      <button class="btn-primary" @click="finish">Terminar</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { usePlayerStore } from '../../store/player'

const emit   = defineEmits(['game-completed'])
const player = usePlayerStore()
const variant = computed(() => Math.min(player.diaActual, 4))

// ── SCENARIOS BY VARIANT ──────────────────────────────────────────────────

const scenarios = {
  1: {
    months: 6, income: 200,
    debts: [
      { id: 'cc', name: 'Tarjeta de crédito', balance: 400, monthlyRate: 1.5 }
    ],
    investments: [
      { id: 'safe', name: 'Fondo seguro', monthlyRate: 0.6, risk: 'bajo', rngRange: null }
    ],
    events: []
  },
  2: {
    months: 8, income: 300,
    debts: [
      { id: 'cc',   name: 'Tarjeta (18% anual)', balance: 500, monthlyRate: 1.5 },
      { id: 'loan', name: 'Préstamo (5% anual)',  balance: 800, monthlyRate: 0.4 }
    ],
    investments: [
      { id: 'safe', name: 'Fondo seguro',    monthlyRate: 0.6, risk: 'bajo',   rngRange: null },
      { id: 'mid',  name: 'Fondo moderado',  monthlyRate: 0.9, risk: 'medio',  rngRange: [-0.3, 1.8] }
    ],
    events: []
  },
  3: {
    months: 10, income: 300,
    debts: [
      { id: 'cc',   name: 'Tarjeta', balance: 600, monthlyRate: 1.5 },
      { id: 'loan', name: 'Préstamo', balance: 1000, monthlyRate: 0.4 }
    ],
    investments: [
      { id: 'safe', name: 'Fondo seguro',   monthlyRate: 0.6,  risk: 'bajo',  rngRange: null },
      { id: 'mid',  name: 'Fondo moderado', monthlyRate: 0.9,  risk: 'medio', rngRange: [-0.3, 1.8] },
      { id: 'high', name: 'Acciones',       monthlyRate: 1.5,  risk: 'alto',  rngRange: [-5, 12] }
    ],
    events: [
      { month: 4, type: 'negative', icon: '🏥', text: 'Gasto médico inesperado:', amount: -80 },
      { month: 7, type: 'positive', icon: '🎁', text: 'Bono extra recibido:', amount: 150 }
    ]
  },
  4: {
    months: 12, income: 300,
    debts: [
      { id: 'cc',   name: 'Tarjeta (18%/año)',  balance: 800, monthlyRate: 1.5 },
      { id: 'loan', name: 'Préstamo (5%/año)',   balance: 1200, monthlyRate: 0.4 }
    ],
    investments: [
      { id: 'safe', name: 'Fondo seguro (7%/año)',   monthlyRate: 0.6,  risk: 'bajo',  rngRange: null },
      { id: 'mid',  name: 'Fondo moderado (11%/año)', monthlyRate: 0.9, risk: 'medio', rngRange: [-0.3, 1.8] },
      { id: 'high', name: 'Acciones (±volátil)',       monthlyRate: 1.5, risk: 'alto',  rngRange: [-5, 12] }
    ],
    events: [
      { month: 3,  type: 'negative', icon: '🔧', text: 'Reparación urgente:', amount: -100 },
      { month: 6,  type: 'positive', icon: '🎁', text: 'Bono extra:', amount: 200 },
      { month: 9,  type: 'negative', icon: '🏥', text: 'Gasto médico:', amount: -150 },
      { month: 11, type: 'positive', icon: '💼', text: 'Horas extra:', amount: 120 }
    ]
  }
}

const scenario = computed(() => scenarios[variant.value] ?? scenarios[4])

const maxDebtRate = computed(() => Math.max(...scenario.value.debts.map(d => d.monthlyRate)))
const maxInvRate  = computed(() => Math.max(...scenario.value.investments.map(i => i.monthlyRate)))

// ── STATE ─────────────────────────────────────────────────────────────────

const phase        = ref('intro')
const currentMonth = ref(0)
const debtState    = ref([])
const portfolios   = reactive({})
const cashReserve  = ref(0)
const history      = ref([])
const currentEvent = ref(null)
const rewardCoins  = ref(0)
const finalNetWorth = ref(0)

const allocations = reactive({ debts: {}, investments: {} })

const activeDebts = computed(() => debtState.value.filter(d => d.balance > 1))

const totalDebt     = computed(() => debtState.value.reduce((s, d) => s + d.balance, 0))
const totalInvested = computed(() => Object.values(portfolios).reduce((s, v) => s + v, 0))
const netWorth      = computed(() => totalInvested.value + cashReserve.value - totalDebt.value)

const remainingToAssign = computed(() => {
  const assigned = Object.values(allocations.debts).reduce((s, v) => s + v, 0)
    + Object.values(allocations.investments).reduce((s, v) => s + v, 0)
  const available = scenario.value.income + (currentEvent.value?.amount > 0 ? currentEvent.value.amount : 0)
  return Math.max(0, available - assigned)
})

// ── INIT ──────────────────────────────────────────────────────────────────

const startGame = () => {
  debtState.value = scenario.value.debts.map(d => ({ ...d }))
  scenario.value.investments.forEach(inv => { portfolios[inv.id] = 0 })
  scenario.value.debts.forEach(d => { allocations.debts[d.id] = 0 })
  scenario.value.investments.forEach(inv => { allocations.investments[inv.id] = 0 })
  cashReserve.value = 0
  currentMonth.value = 1
  phase.value = 'playing'
  checkEvent()
}

const checkEvent = () => {
  currentEvent.value = scenario.value.events.find(e => e.month === currentMonth.value) ?? null
  if (currentEvent.value?.amount < 0) {
    // Pre-apply negative event
    cashReserve.value = Math.max(0, cashReserve.value + currentEvent.value.amount)
  }
}

// ── TURN ADVANCE ──────────────────────────────────────────────────────────

const clampAllocations = () => {
  const maxAvail = scenario.value.income + (currentEvent.value?.amount > 0 ? currentEvent.value.amount : 0)
  let used = 0
  for (const id in allocations.debts) {
    const d = debtState.value.find(x => x.id === id)
    const cap = Math.min(d?.balance ?? 0, maxAvail - used)
    allocations.debts[id] = Math.max(0, Math.min(allocations.debts[id], cap))
    used += allocations.debts[id]
  }
  for (const id in allocations.investments) {
    allocations.investments[id] = Math.max(0, Math.min(allocations.investments[id], maxAvail - used))
    used += allocations.investments[id]
  }
}

const advanceMonth = () => {
  const income = scenario.value.income + (currentEvent.value?.amount > 0 ? currentEvent.value.amount : 0)

  // Pay debts
  for (const d of debtState.value) {
    const pay = allocations.debts[d.id] ?? 0
    d.balance = Math.max(0, d.balance - pay)
  }
  // Invest
  for (const inv of scenario.value.investments) {
    const add = allocations.investments[inv.id] ?? 0
    portfolios[inv.id] = (portfolios[inv.id] ?? 0) + add
    // Compound return
    let rate = inv.monthlyRate / 100
    if (inv.rngRange) {
      const [lo, hi] = inv.rngRange
      rate = (lo + Math.random() * (hi - lo)) / 100
    }
    portfolios[inv.id] = Math.round(portfolios[inv.id] * (1 + rate))
  }
  // Cash remainder
  cashReserve.value += remainingToAssign.value

  // Apply inflation on cash
  cashReserve.value = Math.round(cashReserve.value * 0.997)

  // Compound debt interest
  for (const d of debtState.value) {
    d.balance = Math.round(d.balance * (1 + d.monthlyRate / 100))
  }

  history.value.push({ netWorth: netWorth.value })

  // Reset allocations
  scenario.value.debts.forEach(d => { allocations.debts[d.id] = 0 })
  scenario.value.investments.forEach(inv => { allocations.investments[inv.id] = 0 })

  if (currentMonth.value >= scenario.value.months) {
    finalNetWorth.value = netWorth.value
    computeReward()
    phase.value = 'result'
  } else {
    currentMonth.value++
    checkEvent()
  }
}

// ── REWARD ────────────────────────────────────────────────────────────────

const computeReward = () => {
  const base = [20, 30, 45, 60][variant.value - 1] ?? 30
  const pct  = Math.min(1, Math.max(0, (finalNetWorth.value + 200) / 1000))
  rewardCoins.value = Math.round(base * pct + base * 0.3)
}

// ── INSIGHT ───────────────────────────────────────────────────────────────

const insightClass = computed(() => finalNetWorth.value > 100 ? 'insight-good' : finalNetWorth.value > 0 ? 'insight-ok' : 'insight-bad')
const insightTitle = computed(() => finalNetWorth.value > 100 ? '🏆 Excelente estrategia' : finalNetWorth.value > 0 ? '👍 Buen trabajo' : '💡 Para la próxima')
const insightText  = computed(() => {
  const highDebt = maxDebtRate.value > maxInvRate.value
  if (highDebt) return `La deuda de ${maxDebtRate.value}%/mes crecía más rápido que la mejor inversión (${maxInvRate.value}%/mes). Pagar primero la deuda cara siempre maximiza el patrimonio.`
  return `Cuando la tasa de inversión supera a la tasa de deuda, vale la pena invertir a la vez que pagas la deuda mínima.`
})

// ── CHART HELPERS ─────────────────────────────────────────────────────────

const maxAbsNW = computed(() => Math.max(1, ...history.value.map(s => Math.abs(s.netWorth))))
const barStyle = (nw) => {
  const pct = (Math.abs(nw) / maxAbsNW.value) * 100
  return { width: pct + '%', background: nw >= 0 ? '#00b894' : '#d63031' }
}

const finish = () => {
  const res = player.jugarMinijuego('alcancia', rewardCoins.value)
  emit('game-completed', {
    success: finalNetWorth.value >= 0,
    recompensa: res.recompensa,
    title: insightTitle.value,
    msg: insightText.value
  })
}
</script>

<style scoped>
.sb-container { max-width: 640px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; }

/* INTRO */
.intro-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.intro-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); }
.intro-card h4 { margin: 0 0 0.75rem; font-size: 1rem; }
.debt-card h4 { color: #d63031; }
.invest-card h4 { color: #00b894; }
.info-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; margin-bottom: 0.4rem; gap: 0.5rem; }
.rate-bad  { color: #d63031; font-weight: 800; }
.rate-good { color: #00b894; font-weight: 800; }
.income-box { background: #eef0ff; border-radius: 12px; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.95rem; }
.objective-box { background: #f8fafc; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; font-size: 0.9rem; line-height: 1.6; }
.hint { color: #636e72; margin-top: 0.4rem; font-style: italic; }

/* HUD */
.hud { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.hud-item { flex: 1; background: white; border-radius: 12px; padding: 0.75rem; text-align: center; box-shadow: var(--shadow-sm); }
.hud-label { font-size: 0.75rem; font-weight: 800; color: #636e72; text-transform: uppercase; display: block; }
.hud-val { font-family: 'Fredoka', sans-serif; font-size: 1.4rem; font-weight: 700; display: block; }
.pos { color: #00b894; } .neg { color: #d63031; } .green { color: #0984e3; }

/* Event */
.event-banner { display: flex; align-items: center; gap: 0.75rem; border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 1rem; font-size: 0.95rem; animation: popIn 0.4s ease; }
.event-banner.positive { background: #d1fae5; color: #065f46; }
.event-banner.negative { background: #fee2e2; color: #991b1b; }
.event-banner span { font-size: 1.5rem; }

/* Sliders */
.section-title { font-weight: 800; font-size: 1rem; margin: 1.25rem 0 0.6rem; color: var(--text-dark); }
.slider-row { background: white; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 0.6rem; box-shadow: var(--shadow-sm); }
.slider-info { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.sl-name { flex: 1; font-weight: 700; font-size: 0.9rem; }
.sl-balance { font-size: 0.82rem; color: #636e72; }
.sl-rate { font-size: 0.82rem; font-weight: 800; }
.sl-amount { font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--primary-color); text-align: right; display: block; margin-top: 0.3rem; }
.risk-tag { font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; }
.risk-tag.bajo { background: #d1fae5; color: #065f46; }
.risk-tag.medio { background: #fef3c7; color: #92400e; }
.risk-tag.alto  { background: #fee2e2; color: #991b1b; }
.risk-tag.sm { font-size: 0.65rem; padding: 0.1rem 0.4rem; }
input[type=range] { width: 100%; accent-color: var(--primary-color); }
.unassigned-row { text-align: center; padding: 0.6rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem; }
.unassigned-row.warn { background: #fef3c7; color: #92400e; }
.unassigned-row:not(.warn) { background: #d1fae5; color: #065f46; }

/* Result */
.result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 1.25rem 0; }
.res-card { background: white; border-radius: 12px; padding: 1rem; text-align: center; box-shadow: var(--shadow-sm); }
.res-label { font-size: 0.78rem; font-weight: 800; color: #636e72; text-transform: uppercase; display: block; margin-bottom: 0.3rem; }
.res-val { font-family: 'Fredoka', sans-serif; font-size: 1.4rem; font-weight: 700; display: block; }

.insight-box { border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
.insight-good { background: #d1fae5; } .insight-ok { background: #fef3c7; } .insight-bad { background: #fee2e2; }
.insight-box h4 { margin: 0 0 0.5rem; } .insight-box p { margin: 0; font-size: 0.92rem; line-height: 1.6; }

.chart-bars { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1.25rem; max-height: 200px; overflow-y: auto; }
.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-label { font-size: 0.75rem; color: #636e72; min-width: 2rem; }
.bar-track { flex: 1; background: #f1f2f6; border-radius: 4px; height: 12px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; min-width: 2px; }
.bar-val { font-size: 0.78rem; font-weight: 700; min-width: 60px; text-align: right; }

.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
