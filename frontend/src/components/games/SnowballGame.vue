<template>
  <div class="sb-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">❄️</div>
      <h2>La Bola de Nieve</h2>
      <p class="subtitle">Tasas que cambian, decisiones que importan</p>

      <div class="intro-cards">
        <div class="intro-card debt-card">
          <h4>💳 Tus Deudas Iniciales</h4>
          <div v-for="d in DEBTS" :key="d.id" class="info-row">
            <span class="d-name">{{ d.name }}</span>
            <span class="rate-bad">{{ d.baseRate }}%/mes</span>
            <span class="d-bal">${{ d.balance }}</span>
          </div>
        </div>
        <div class="intro-card rules-card">
          <h4>📋 Cómo funciona</h4>
          <ul class="rules-list">
            <li>💵 Recibes ${{ INCOME }}/mes para repartir</li>
            <li>📊 Las tasas cambian cada mes</li>
            <li>🎯 Paga primero la deuda más cara</li>
            <li>💰 El dinero no asignado va a ahorro</li>
          </ul>
        </div>
      </div>

      <div class="duration-picker">
        <p class="dp-label">⏱️ ¿Cuántos meses quieres simular?</p>
        <div class="dp-options">
          <button
            v-for="m in [3, 4, 5, 6]" :key="m"
            class="dp-btn" :class="{ active: selectedMonths === m }"
            @click="selectedMonths = m"
          >
            {{ m }} meses
            <span class="dp-stars">{{ m === 6 ? '⭐⭐⭐' : m === 5 ? '⭐⭐' : m === 4 ? '⭐' : '' }}</span>
          </button>
        </div>
        <p class="dp-hint">Más meses = mayor acumulación de intereses = mayor desafío</p>
      </div>

      <div class="objective-box">
        <p>🎯 <strong>Objetivo:</strong> Eliminar la mayor deuda posible en {{ selectedMonths }} meses.</p>
        <p class="hint">💡 Tip: Usa la estrategia <strong>avalancha</strong> — ataca siempre la deuda con mayor tasa de interés.</p>
      </div>

      <button class="btn-primary" :disabled="player.energiaActual <= 0" @click="startGame">
        {{ player.energiaActual > 0 ? 'Comenzar simulación ❄️' : 'Sin energía ⚡' }}
      </button>
    </div>

    <!-- ══ PLAYING ════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'playing'" class="phase">

      <!-- HUD -->
      <div class="hud">
        <div class="hud-item">
          <span class="hud-label">Mes</span>
          <span class="hud-val">{{ currentMonth }}/{{ totalMonths }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Deuda Total</span>
          <span class="hud-val neg">${{ Math.round(totalDebt) }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Ahorro</span>
          <span class="hud-val pos">${{ Math.round(savings) }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">A distribuir</span>
          <span class="hud-val green">${{ monthlyIncome }}</span>
        </div>
      </div>

      <!-- Rate-change banner (from month 2 onward) -->
      <div v-if="rateChanges.length" class="rate-banner">
        <div class="rb-title">📊 Cambio de tasas este mes:</div>
        <div class="rb-items">
          <div v-for="rc in rateChanges" :key="rc.id" class="rb-item" :class="rc.dir">
            <span class="rb-name">{{ rc.name }}</span>
            <span class="rb-arrow">{{ rc.dir === 'up' ? '↑' : rc.dir === 'down' ? '↓' : '=' }}</span>
            <span class="rb-rates">{{ rc.oldRate }}% → <strong>{{ rc.newRate }}%</strong></span>
          </div>
        </div>
      </div>

      <!-- Event banner -->
      <div v-if="currentEvent" class="event-banner" :class="currentEvent.type">
        <span class="ev-icon">{{ currentEvent.icon }}</span>
        <p>{{ currentEvent.text }}</p>
      </div>

      <!-- Debt sliders -->
      <div class="section-title">
        💳 Pagar Deudas
        <span v-if="highestRateDebt" class="hot-hint">
          🔥 Mayor tasa: {{ highestRateDebt.name }} ({{ highestRateDebt.currentRate }}%)
        </span>
      </div>

      <div
        v-for="d in activeDebts" :key="d.id"
        class="slider-row" :class="{ 'is-highest': d.id === highestRateDebt?.id }"
      >
        <div class="slider-info">
          <span class="sl-name">{{ d.name }}</span>
          <span class="sl-balance">Saldo: ${{ Math.round(d.balance) }}</span>
          <span class="sl-rate rate-bad">{{ d.currentRate }}%/mes</span>
          <span v-if="d.id === highestRateDebt?.id" class="hot-tag">🔥 Atacar</span>
        </div>
        <input
          type="range" min="0"
          :max="Math.min(Math.round(d.balance), remaining + (allocations[d.id] ?? 0))"
          step="10"
          v-model.number="allocations[d.id]"
          @input="clampAllocations"
        />
        <span class="sl-amount">${{ allocations[d.id] ?? 0 }}</span>
      </div>

      <div v-if="!activeDebts.length" class="all-paid-banner">
        🎉 ¡Todas las deudas pagadas! El resto va a ahorro.
      </div>

      <div class="unassigned-row" :class="{ warn: remaining > 0 && activeDebts.length > 0 }">
        {{ remaining > 0
          ? `💰 $${remaining} irá a ahorro (0.5%/mes)`
          : '✅ Todo asignado a deudas' }}
      </div>

      <button class="btn-primary" @click="advanceMonth">
        {{ currentMonth < totalMonths ? `Avanzar al Mes ${currentMonth + 1} →` : 'Finalizar simulación →' }}
      </button>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase">
      <h2>📊 Resultado Final</h2>

      <div class="tier-banner" :class="tierClass">
        <span class="tier-icon">{{ tierIcon }}</span>
        <div class="tier-text">
          <div class="tier-title">{{ tierTitle }}</div>
          <div class="tier-sub">{{ tierSub }}</div>
        </div>
      </div>

      <div class="result-grid">
        <div class="res-card">
          <span class="res-label">Deuda eliminada</span>
          <span class="res-val pos">${{ Math.round(debtEliminated) }}</span>
        </div>
        <div class="res-card">
          <span class="res-label">Deuda restante</span>
          <span class="res-val" :class="finalTotalDebt > 0 ? 'neg' : 'pos'">${{ Math.round(finalTotalDebt) }}</span>
        </div>
        <div class="res-card">
          <span class="res-label">Ahorro final</span>
          <span class="res-val pos">${{ Math.round(finalSavings) }}</span>
        </div>
        <div class="res-card">
          <span class="res-label">Eficiencia Avalancha</span>
          <span class="res-val" :class="avalancheEff >= 60 ? 'pos' : avalancheEff >= 30 ? 'amber' : 'neg'">
            {{ avalancheEff }}%
          </span>
        </div>
      </div>

      <div class="insight-box" :class="insightClass">
        <h4>{{ insightTitle }}</h4>
        <p>{{ insightText }}</p>
      </div>

      <div class="chart-title">Evolución de la deuda por mes</div>
      <div class="chart-bars">
        <div class="bar-row" v-for="(snap, i) in history" :key="i">
          <span class="bar-label">M{{ i + 1 }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="debtBarStyle(snap.debt)"></div>
          </div>
          <span class="bar-val neg">${{ Math.round(snap.debt) }}</span>
        </div>
      </div>

      <div class="reward-box" :class="{ penalty: rewardCoins < 0 }">
        <p v-if="rewardCoins > 0">
          Recompensa: <strong class="coins">+{{ rewardCoins }} 🪙</strong>
        </p>
        <p v-else>
          Penalización: <strong class="coins-neg">{{ rewardCoins }} 🪙</strong>
        </p>
        <p class="score-line">Puntuación: {{ finalScore }}/100</p>
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

// ── CONSTANTS ─────────────────────────────────────────────────────────────

const INCOME = 300

const DEBTS = [
  { id: 'cc',   name: 'Tarjeta de crédito', balance: 600, baseRate: 2.0 },
  { id: 'loan', name: 'Préstamo personal',  balance: 900, baseRate: 1.2 },
  { id: 'auto', name: 'Crédito de auto',    balance: 500, baseRate: 0.7 },
]

const EVENT_POOL = [
  { type: 'positive', icon: '🎁', text: 'Bono inesperado: +$150 extra este mes', amount: 150 },
  { type: 'positive', icon: '💼', text: 'Horas extra: +$80 adicionales', amount: 80 },
  { type: 'negative', icon: '🏥', text: 'Gasto médico urgente: −$100 de tu ahorro', amount: -100 },
  { type: 'negative', icon: '🔧', text: 'Reparación del hogar: −$120 de tu ahorro', amount: -120 },
  { type: 'negative', icon: '🚗', text: 'Multa de tránsito: −$60 de tu ahorro', amount: -60 },
]

// ── STATE ─────────────────────────────────────────────────────────────────

const phase          = ref('intro')
const selectedMonths = ref(4)
const totalMonths    = ref(4)
const currentMonth   = ref(0)
const debtState      = ref([])
const savings        = ref(0)
const history        = ref([])
const rateChanges    = ref([])
const currentEvent   = ref(null)
const allocations    = reactive({})
const presetEvents   = ref([])

// Avalanche tracking
const avalancheTurns = ref(0)
const totalTurns     = ref(0)

// Result state
const finalTotalDebt  = ref(0)
const finalSavings    = ref(0)
const debtEliminated  = ref(0)
const avalancheEff    = ref(0)
const finalScore      = ref(0)
const rewardCoins     = ref(0)
const initialDebt     = ref(0)

// ── COMPUTED ──────────────────────────────────────────────────────────────

const activeDebts = computed(() => debtState.value.filter(d => d.balance > 0.5))
const totalDebt   = computed(() => debtState.value.reduce((s, d) => s + d.balance, 0))

const highestRateDebt = computed(() => {
  if (!activeDebts.value.length) return null
  return activeDebts.value.reduce((best, d) => d.currentRate > best.currentRate ? d : best, activeDebts.value[0])
})

const monthlyIncome = computed(() =>
  INCOME + (currentEvent.value?.amount > 0 ? currentEvent.value.amount : 0)
)

const remaining = computed(() => {
  const spent = Object.values(allocations).reduce((s, v) => s + (v ?? 0), 0)
  return Math.max(0, monthlyIncome.value - spent)
})

// Result computed (read from finalScore ref set in endGame)
const tierClass    = computed(() => finalScore.value >= 70 ? 'tier-gold' : finalScore.value >= 40 ? 'tier-silver' : 'tier-bad')
const tierIcon     = computed(() => finalScore.value >= 70 ? '🏆' : finalScore.value >= 40 ? '👍' : '💸')
const tierTitle    = computed(() => finalScore.value >= 70 ? '¡Estratega Financiero!' : finalScore.value >= 40 ? 'Administración Aceptable' : 'Gestión Deficiente')
const tierSub      = computed(() => finalScore.value >= 70 ? 'Priorizaste las deudas costosas y redujiste tu carga de forma efectiva.' : finalScore.value >= 40 ? 'Lograste reducir algunas deudas, pero hay margen de mejora.' : 'Las deudas crecieron más de lo necesario por falta de priorización.')
const insightClass = computed(() => finalScore.value >= 70 ? 'insight-good' : finalScore.value >= 40 ? 'insight-ok' : 'insight-bad')
const insightTitle = computed(() => tierTitle.value)
const insightText  = computed(() => {
  if (finalScore.value >= 70) return `Aplicaste correctamente la estrategia avalancha con ${avalancheEff.value}% de eficiencia. Pagaste las deudas más caras primero, evitando que el interés compuesto trabajara en tu contra.`
  if (finalScore.value >= 40) return `Redujiste tu deuda, pero con solo ${avalancheEff.value}% de eficiencia en la estrategia avalancha podrías haber ahorrado más en intereses. La próxima vez prioriza la deuda con mayor tasa cada mes.`
  return `Los intereses superaron tus pagos en varios meses. La estrategia avalancha —pagar siempre la deuda más cara primero— reduce drásticamente el costo total. Tu eficiencia fue del ${avalancheEff.value}%.`
})

// ── INIT ──────────────────────────────────────────────────────────────────

const startGame = () => {
  if (player.energiaActual <= 0) return

  totalMonths.value    = selectedMonths.value
  currentMonth.value   = 1
  savings.value        = 0
  history.value        = []
  rateChanges.value    = []
  currentEvent.value   = null
  avalancheTurns.value = 0
  totalTurns.value     = 0

  debtState.value = DEBTS.map(d => ({ ...d, currentRate: d.baseRate }))
  initialDebt.value = debtState.value.reduce((s, d) => s + d.balance, 0)

  DEBTS.forEach(d => { allocations[d.id] = 0 })

  // Pre-generate random events for months 2..N (35% chance each)
  presetEvents.value = []
  for (let m = 2; m <= totalMonths.value; m++) {
    if (Math.random() < 0.35) {
      presetEvents.value.push({
        ...EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)],
        month: m
      })
    }
  }

  phase.value = 'playing'
}

// ── RATE CHANGES ──────────────────────────────────────────────────────────

const rollRateChanges = () => {
  const changes = []
  for (const d of debtState.value) {
    if (d.balance <= 0.5) continue
    const old   = d.currentRate
    const delta = +((Math.random() * 0.7 - 0.2).toFixed(1))
    const next  = Math.max(0.3, Math.min(3.5, +(old + delta).toFixed(1)))
    const dir   = next > old ? 'up' : next < old ? 'down' : 'same'
    d.currentRate = next
    changes.push({ id: d.id, name: d.name, oldRate: old.toFixed(1), newRate: next.toFixed(1), dir })
  }
  rateChanges.value = changes
}

// ── EVENTS ────────────────────────────────────────────────────────────────

const loadEvent = () => {
  const ev = presetEvents.value.find(e => e.month === currentMonth.value) ?? null
  currentEvent.value = ev
  if (ev?.amount < 0) {
    savings.value = Math.max(0, savings.value + ev.amount)
  }
}

// ── CLAMP ─────────────────────────────────────────────────────────────────

const clampAllocations = () => {
  const income = monthlyIncome.value
  let used = 0
  for (const d of debtState.value) {
    const cap = Math.max(0, Math.min(Math.round(d.balance), income - used))
    allocations[d.id] = Math.max(0, Math.min(allocations[d.id] ?? 0, cap))
    used += allocations[d.id]
  }
}

// ── ADVANCE MONTH ─────────────────────────────────────────────────────────

const advanceMonth = () => {
  // Track avalanche efficiency: did player pay the most to highest-rate debt?
  if (activeDebts.value.length > 1 && highestRateDebt.value) {
    totalTurns.value++
    const hrId     = highestRateDebt.value.id
    const hrPay    = allocations[hrId] ?? 0
    const maxOther = Math.max(0, ...activeDebts.value
      .filter(d => d.id !== hrId)
      .map(d => allocations[d.id] ?? 0))
    if (hrPay >= maxOther) avalancheTurns.value++
  }

  // Apply payments
  for (const d of debtState.value) {
    const pay = allocations[d.id] ?? 0
    d.balance = Math.max(0, +(d.balance - pay).toFixed(2))
  }

  // Unassigned income → savings (0.5%/mes)
  savings.value += remaining.value
  savings.value  = Math.round(savings.value * 1.005)

  // Apply interest on remaining debt balances
  for (const d of debtState.value) {
    if (d.balance > 0.5) {
      d.balance = Math.round(d.balance * (1 + d.currentRate / 100) * 10) / 10
    }
  }

  history.value.push({ debt: totalDebt.value, savings: savings.value })

  // Reset allocations for next month
  DEBTS.forEach(d => { allocations[d.id] = 0 })

  if (currentMonth.value >= totalMonths.value) {
    endGame()
  } else {
    currentMonth.value++
    rollRateChanges()
    loadEvent()
  }
}

// ── END GAME ──────────────────────────────────────────────────────────────

const endGame = () => {
  finalTotalDebt.value  = totalDebt.value
  finalSavings.value    = savings.value
  debtEliminated.value  = Math.max(0, initialDebt.value - finalTotalDebt.value)
  avalancheEff.value    = totalTurns.value > 0
    ? Math.round(avalancheTurns.value / totalTurns.value * 100)
    : 100

  // Score 0-100: debt reduction 60% + avalanche efficiency 30% + savings bonus 10%
  const debtPct  = initialDebt.value > 0 ? Math.max(0, 1 - finalTotalDebt.value / initialDebt.value) : 1
  const avPct    = avalancheEff.value / 100
  const savBonus = Math.min(0.1, finalSavings.value / 2000)
  finalScore.value = Math.round((debtPct * 0.6 + avPct * 0.3 + savBonus * 0.1) * 100)

  rewardCoins.value = finalScore.value >= 70 ? 50 : finalScore.value >= 40 ? 20 : -10
  phase.value = 'result'
}

// ── CHART ─────────────────────────────────────────────────────────────────

const maxDebt = computed(() =>
  Math.max(1, initialDebt.value, ...history.value.map(s => s.debt))
)
const debtBarStyle = (debt) => ({
  width: (debt / maxDebt.value * 100) + '%',
  background: debt > initialDebt.value * 0.7 ? '#d63031'
            : debt > initialDebt.value * 0.3 ? '#e17055'
            : '#00b894'
})

// ── FINISH ────────────────────────────────────────────────────────────────

const finish = () => {
  let recompensa = 0
  if (rewardCoins.value < 0) {
    player.gastarDinero(Math.abs(rewardCoins.value))
    player.jugarMinijuego('alcancia', 0)
    recompensa = rewardCoins.value
  } else {
    const res = player.jugarMinijuego('alcancia', rewardCoins.value)
    recompensa = res.recompensa
  }
  emit('game-completed', {
    success: rewardCoins.value >= 0,
    recompensa,
    title: tierTitle.value,
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

/* ── INTRO ────────────────────────────────────────────────────────────── */
.intro-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
.intro-card { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); }
.intro-card h4 { margin: 0 0 0.75rem; font-size: 0.95rem; }
.debt-card h4 { color: #d63031; }
.rules-card h4 { color: #0984e3; }
.info-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.4rem; gap: 0.4rem; }
.d-name { flex: 1; font-weight: 600; }
.d-bal { font-weight: 700; }
.rate-bad  { color: #d63031; font-weight: 800; }
.rate-good { color: #00b894; font-weight: 800; }
.rules-list { margin: 0; padding-left: 1.2rem; font-size: 0.88rem; line-height: 1.9; }

.duration-picker { background: #eef0ff; border-radius: 14px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
.dp-label { font-weight: 700; font-size: 0.95rem; margin: 0 0 0.75rem; text-align: center; }
.dp-options { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.5rem; }
.dp-btn { flex: 1; min-width: 80px; background: white; border: 2px solid #c7c9f0; border-radius: 10px; padding: 0.55rem 0.5rem; font-family: 'Fredoka', sans-serif; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; }
.dp-btn:hover { border-color: var(--primary-color); }
.dp-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
.dp-stars { display: block; font-size: 0.7rem; margin-top: 0.1rem; }
.dp-hint { font-size: 0.78rem; color: #636e72; text-align: center; margin: 0; font-style: italic; }

.objective-box { background: #f8fafc; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; font-size: 0.9rem; line-height: 1.6; }
.hint { color: #636e72; margin-top: 0.4rem; font-style: italic; font-size: 0.88rem; }

/* ── HUD ──────────────────────────────────────────────────────────────── */
.hud { display: flex; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
.hud-item { flex: 1; min-width: 70px; background: white; border-radius: 12px; padding: 0.65rem; text-align: center; box-shadow: var(--shadow-sm); }
.hud-label { font-size: 0.7rem; font-weight: 800; color: #636e72; text-transform: uppercase; display: block; }
.hud-val { font-family: 'Fredoka', sans-serif; font-size: 1.25rem; font-weight: 700; display: block; }
.pos { color: #00b894; } .neg { color: #d63031; } .green { color: #0984e3; } .amber { color: #e17055; }

/* Rate banner */
.rate-banner { background: #1e1e2e; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 0.85rem; }
.rb-title { font-size: 0.78rem; font-weight: 800; color: #a29bfe; text-transform: uppercase; margin-bottom: 0.5rem; }
.rb-items { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.rb-item { background: rgba(255,255,255,0.07); border-radius: 8px; padding: 0.4rem 0.7rem; display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; }
.rb-item.up   { border-left: 3px solid #d63031; }
.rb-item.down { border-left: 3px solid #00b894; }
.rb-item.same { border-left: 3px solid #636e72; }
.rb-name { color: #dfe6e9; font-weight: 600; }
.rb-arrow { font-size: 1rem; font-weight: 900; }
.rb-item.up   .rb-arrow { color: #ff7675; }
.rb-item.down .rb-arrow { color: #55efc4; }
.rb-item.same .rb-arrow { color: #b2bec3; }
.rb-rates { color: #b2bec3; font-size: 0.78rem; }
.rb-rates strong { color: white; }

/* Event */
.event-banner { display: flex; align-items: center; gap: 0.75rem; border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 0.85rem; font-size: 0.9rem; animation: popIn 0.4s ease; }
@keyframes popIn { from { transform:scale(0.92); opacity:0; } to { transform:scale(1); opacity:1; } }
.event-banner.positive { background: #d1fae5; color: #065f46; }
.event-banner.negative { background: #fee2e2; color: #991b1b; }
.ev-icon { font-size: 1.5rem; }

/* Sliders */
.section-title { font-weight: 800; font-size: 0.95rem; margin: 1rem 0 0.6rem; color: var(--text-dark); display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.hot-hint { font-size: 0.78rem; font-weight: 700; color: #d63031; background: #fff0f0; padding: 0.2rem 0.6rem; border-radius: 20px; }
.slider-row { background: white; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 0.5rem; box-shadow: var(--shadow-sm); transition: box-shadow 0.2s; }
.slider-row.is-highest { box-shadow: 0 0 0 2px #d63031, var(--shadow-sm); }
.slider-info { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.sl-name { flex: 1; font-weight: 700; font-size: 0.88rem; }
.sl-balance { font-size: 0.8rem; color: #636e72; }
.sl-rate { font-size: 0.8rem; font-weight: 800; }
.hot-tag { font-size: 0.7rem; font-weight: 800; background: #fee2e2; color: #c0392b; padding: 0.15rem 0.45rem; border-radius: 20px; }
.sl-amount { font-family: 'Fredoka', sans-serif; font-size: 1.05rem; font-weight: 700; color: var(--primary-color); text-align: right; display: block; margin-top: 0.25rem; }
input[type=range] { width: 100%; accent-color: var(--primary-color); }
.unassigned-row { text-align: center; padding: 0.55rem; border-radius: 10px; font-size: 0.83rem; font-weight: 700; margin: 0.5rem 0 1rem; }
.unassigned-row.warn { background: #eef0ff; color: #5b5ffb; }
.unassigned-row:not(.warn) { background: #d1fae5; color: #065f46; }
.all-paid-banner { text-align: center; background: #d1fae5; color: #065f46; border-radius: 12px; padding: 1rem; font-weight: 700; margin-bottom: 0.75rem; }

/* ── RESULT ───────────────────────────────────────────────────────────── */
.tier-banner { display: flex; align-items: center; gap: 1rem; border-radius: 14px; padding: 1.1rem 1.25rem; margin: 1rem 0; }
.tier-gold   { background: linear-gradient(135deg, #fdcb6e, #ffeaa7); }
.tier-silver { background: linear-gradient(135deg, #eef0ff, #c7c9f0); }
.tier-bad    { background: linear-gradient(135deg, #fee2e2, #ffb8b8); }
.tier-icon { font-size: 2.5rem; }
.tier-title { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; }
.tier-gold   .tier-title { color: #6c4b00; }
.tier-silver .tier-title { color: #2d3436; }
.tier-bad    .tier-title { color: #991b1b; }
.tier-sub { font-size: 0.83rem; margin-top: 0.2rem; color: #555; }

.result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.65rem; margin-bottom: 1.25rem; }
.res-card { background: white; border-radius: 12px; padding: 0.85rem; text-align: center; box-shadow: var(--shadow-sm); }
.res-label { font-size: 0.72rem; font-weight: 800; color: #636e72; text-transform: uppercase; display: block; margin-bottom: 0.25rem; }
.res-val { font-family: 'Fredoka', sans-serif; font-size: 1.35rem; font-weight: 700; display: block; }

.insight-box { border-radius: var(--border-radius-md); padding: 1.1rem 1.25rem; margin-bottom: 1.25rem; }
.insight-good { background: #d1fae5; } .insight-ok { background: #fef3c7; } .insight-bad { background: #fee2e2; }
.insight-box h4 { margin: 0 0 0.4rem; } .insight-box p { margin: 0; font-size: 0.88rem; line-height: 1.65; }

.chart-title { font-weight: 800; font-size: 0.82rem; color: #636e72; text-transform: uppercase; margin-bottom: 0.5rem; }
.chart-bars { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1.25rem; max-height: 220px; overflow-y: auto; }
.bar-row { display: flex; align-items: center; gap: 0.5rem; }
.bar-label { font-size: 0.75rem; color: #636e72; min-width: 2.2rem; }
.bar-track { flex: 1; background: #f1f2f6; border-radius: 4px; height: 14px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; min-width: 3px; }
.bar-val { font-size: 0.78rem; font-weight: 700; min-width: 58px; text-align: right; }

.reward-box { text-align: center; border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); }
.reward-box.penalty { background: linear-gradient(135deg, #fee2e2, #fab1b1); }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.coins-neg { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #c0392b; }
.score-line { font-size: 0.82rem; color: #636e72; margin: 0.3rem 0 0; }

.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
