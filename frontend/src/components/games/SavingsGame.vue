<template>
  <div class="sav-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🐷</div>
      <h2>La Alcancía Mágica</h2>
      <p class="subtitle">Inflación + interés variable: ¿tu dinero vale más o menos mañana?</p>

      <div class="scenario-box">
        <div class="inflation-preview">
          <span class="infl-icon">📈</span>
          <div>
            <p class="infl-label">Inflación estimada del día</p>
            <p class="infl-value" :class="inflationRate > 0.5 ? 'high' : 'low'">{{ inflationRate }}% diario</p>
          </div>
        </div>

        <div class="instruments">
          <h4>Instrumentos disponibles hoy</h4>
          <div v-for="inst in instruments" :key="inst.id" class="inst-row">
            <span>{{ inst.emoji }}</span>
            <span class="inst-name">{{ inst.name }}</span>
            <span class="inst-rate" :class="inst.rate > inflationRate ? 'beats-infl' : 'loses-infl'">
              {{ inst.rate > 0 ? '+' : '' }}{{ inst.rate }}%/día
            </span>
            <span v-if="inst.locked" class="locked-tag">🔒 {{ inst.lockDays }} días</span>
            <span v-if="inst.note" class="inst-note">{{ inst.note }}</span>
          </div>
        </div>
      </div>

      <div class="goal-box">
        <p>🎯 <strong>Objetivo:</strong> Maximizar el poder adquisitivo de tus ${{ startAmount }} en {{ simDays }} días.</p>
        <p class="hint" v-if="inflationRate > 0.3">⚠️ Con inflación de {{ inflationRate }}% diario, el efectivo pierde valor rápido.</p>
      </div>

      <button class="btn-primary" @click="startSim">Comenzar simulación</button>
    </div>

    <!-- ══ SIMULATION ══════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'sim'" class="phase">
      <div class="sim-hud">
        <div class="hud-item">
          <span class="hl">Día</span>
          <span class="hv">{{ currentDay }}/{{ simDays }}</span>
        </div>
        <div class="hud-item">
          <span class="hl">Objetivo</span>
          <span class="hv target">${{ targetItem.price }}</span>
        </div>
        <div class="hud-item">
          <span class="hl">Tu poder adq.</span>
          <span class="hv" :class="totalValue >= targetItem.price ? 'above' : 'below'">${{ Math.round(totalValue) }}</span>
        </div>
      </div>

      <!-- Inflation event -->
      <div v-if="inflEvent" class="infl-event" :class="inflEvent.type">
        <span>{{ inflEvent.icon }}</span>
        <p>{{ inflEvent.text }} → inflación hoy: <strong>{{ inflEvent.newRate }}%</strong></p>
      </div>

      <!-- Item price tracker -->
      <div class="item-track">
        <span class="it-emoji">{{ targetItem.emoji }}</span>
        <div>
          <p class="it-name">{{ targetItem.name }}</p>
          <p class="it-price">Precio actual: <strong>${{ Math.round(targetItem.price) }}</strong></p>
          <div class="price-bar-wrap">
            <div class="price-bar" :style="{ width: Math.min(100, (totalValue / targetItem.price) * 100) + '%', background: totalValue >= targetItem.price ? '#00b894' : '#e17055' }"></div>
          </div>
          <p class="price-pct">{{ Math.round((totalValue / targetItem.price) * 100) }}% del precio</p>
        </div>
      </div>

      <!-- Allocation -->
      <h4>¿Cómo distribuyes tus ${{ Math.round(dayTotal) }}?</h4>
      <div v-for="inst in instruments.filter(i => i.id !== 'cash')" :key="inst.id" class="alloc-row">
        <div class="alloc-info">
          <span>{{ inst.emoji }}</span>
          <span class="alloc-name">{{ inst.name }}</span>
          <span :class="inst.rate > todayInflation ? 'beats-infl' : 'loses-infl'" class="alloc-rate">{{ inst.rate > 0 ? '+' : '' }}{{ inst.rate }}%/día</span>
          <span v-if="inst.locked" class="locked-sm">🔒{{ inst.lockDays }}d</span>
        </div>
        <input
          type="range" min="0" :max="Math.round(portfolioState[inst.id] + unallocated)"
          step="5" v-model.number="portfolioState[inst.id]"
          :disabled="inst.id === 'deposit' && depositLocked"
          @input="clampAll(inst.id)"
        />
        <span class="alloc-val">${{ Math.round(portfolioState[inst.id]) }}</span>
      </div>

      <div class="cash-display">
        💵 Efectivo (sin asignar): <strong :class="unallocated > 0 ? 'warn' : 'ok'">${{ Math.round(unallocated) }}</strong>
        <span v-if="unallocated > 0" class="cash-warn"> ← pierde {{todayInflation}}%/día</span>
      </div>

      <button class="btn-primary" @click="advanceDay">
        Pasar al día {{ currentDay + 1 }} →
      </button>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase">
      <div class="result-header" :class="finalResult.class">
        <span class="ri">{{ finalResult.icon }}</span>
        <h2>{{ finalResult.title }}</h2>
        <p>{{ finalResult.sub }}</p>
      </div>

      <div class="comparison-table">
        <div class="comp-row header-row">
          <span>Estrategia</span><span>Resultado</span><span>vs. Efectivo</span>
        </div>
        <div v-for="r in finalResult.comparison" :key="r.label" class="comp-row" :class="r.best ? 'best-row' : ''">
          <span>{{ r.label }}</span>
          <span :class="r.value >= startAmount ? 'pos' : 'neg'">${{ Math.round(r.value) }}</span>
          <span :class="r.diff >= 0 ? 'pos' : 'neg'">{{ r.diff >= 0 ? '+' : '' }}${{ Math.round(r.diff) }}</span>
        </div>
      </div>

      <div class="lesson-box">
        <h4>💡 Lección del día</h4>
        <p>{{ lesson }}</p>
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

// ── SCENARIO CONFIG ────────────────────────────────────────────────────────

const configs = {
  1: { simDays: 4, startAmount: 100, inflBase: 0.3, inflRange: 0 },
  2: { simDays: 5, startAmount: 150, inflBase: 0.5, inflRange: 0.3 },
  3: { simDays: 6, startAmount: 200, inflBase: 0.6, inflRange: 0.5 },
  4: { simDays: 7, startAmount: 250, inflBase: 0.7, inflRange: 0.8 },
}
const config = computed(() => configs[variant.value] ?? configs[4])

const instrumentDefs = {
  1: [
    { id: 'bank',    emoji: '🏦', name: 'Banco Vista',       rate: 0.01, locked: false, lockDays: 0, note: 'Siempre accesible' },
    { id: 'cash',    emoji: '💵', name: 'Efectivo',           rate: 0,    locked: false, lockDays: 0, note: 'Pierde valor' },
  ],
  2: [
    { id: 'bank',    emoji: '🏦', name: 'Banco Vista',       rate: 0.01, locked: false, lockDays: 0, note: null },
    { id: 'deposit', emoji: '🔒', name: 'Depósito a Plazo',  rate: 0.8,  locked: true,  lockDays: 3, note: '3 días bloqueado' },
    { id: 'cash',    emoji: '💵', name: 'Efectivo',           rate: 0,    locked: false, lockDays: 0, note: null },
  ],
  3: [
    { id: 'bank',    emoji: '🏦', name: 'Banco Vista (0.01%)', rate: 0.01, locked: false, lockDays: 0, note: null },
    { id: 'deposit', emoji: '🔒', name: 'Depósito 3 días (0.8%)', rate: 0.8, locked: true, lockDays: 3, note: null },
    { id: 'asset',   emoji: '📦', name: 'Activo físico',      rate: 0,    locked: false, lockDays: 0, note: 'Sube con inflación' },
    { id: 'cash',    emoji: '💵', name: 'Efectivo',           rate: 0,    locked: false, lockDays: 0, note: null },
  ],
  4: [
    { id: 'bank',    emoji: '🏦', name: 'Banco Vista (0.01%)', rate: 0.01, locked: false, lockDays: 0, note: null },
    { id: 'deposit', emoji: '🔒', name: 'Depósito 3d (0.8%)', rate: 0.8,  locked: true,  lockDays: 3, note: null },
    { id: 'asset',   emoji: '📦', name: 'Activo físico',      rate: 0,    locked: false, lockDays: 0, note: 'Sube con inflación' },
    { id: 'cash',    emoji: '💵', name: 'Efectivo',           rate: 0,    locked: false, lockDays: 0, note: null },
  ]
}

const instruments = computed(() => instrumentDefs[variant.value] ?? instrumentDefs[4])

const inflationEvents = [
  { day: 3, type: 'spike', icon: '⚡', text: 'Huelga de transportistas — precios suben', newRate: 1.2 },
  { day: 5, type: 'calm',  icon: '📉', text: 'Acuerdo comercial reduce inflación', newRate: 0.2 },
]

// ── STATE ─────────────────────────────────────────────────────────────────

const phase         = ref('intro')
const startAmount   = computed(() => config.value.startAmount)
const simDays       = computed(() => config.value.simDays)
const inflationRate = ref(0)
const todayInflation = ref(0)
const currentDay    = ref(1)
const inflEvent     = ref(null)
const depositLocked = ref(false)
const depositDaysLeft = ref(0)
const rewardCoins   = ref(0)

const portfolioState = reactive({ bank: 0, deposit: 0, asset: 0 })
const dayTotal       = ref(0)
const unallocated    = ref(0)

// Sum of all instrument slots (excluding cash – cash IS unallocated)
const nonCashSum = () =>
  Object.keys(portfolioState).reduce((s, k) => s + (Number(portfolioState[k]) || 0), 0)

const totalValue = computed(() => nonCashSum() + unallocated.value)

const targetItems = [
  { emoji: '🎮', name: 'Consola de videojuegos', price: 180 },
  { emoji: '👟', name: 'Zapatillas de marca',    price: 120 },
  { emoji: '🎸', name: 'Guitarra eléctrica',     price: 200 },
  { emoji: '📱', name: 'Smartphone',             price: 250 },
]
const targetItem = ref(targetItems[0])

// ── INIT ──────────────────────────────────────────────────────────────────

const startSim = () => {
  targetItem.value    = targetItems[Math.floor(Math.random() * targetItems.length)]
  inflationRate.value = +(config.value.inflBase + (Math.random() * config.value.inflRange)).toFixed(2)
  todayInflation.value = inflationRate.value
  targetItem.value    = { ...targetItem.value, price: +targetItem.value.price }

  // Reset only non-cash instruments (cash is tracked via unallocated)
  Object.keys(portfolioState).forEach(k => { portfolioState[k] = 0 })
  instruments.value.forEach(i => { if (i.id !== 'cash') portfolioState[i.id] = 0 })

  portfolioState.bank  = startAmount.value
  unallocated.value    = 0
  dayTotal.value       = startAmount.value
  depositLocked.value  = false
  depositDaysLeft.value = 0
  phase.value = 'sim'
}

// ── SIM LOGIC ─────────────────────────────────────────────────────────────

const clampAll = (changedId) => {
  // Prevent negative values
  if (portfolioState[changedId] < 0) portfolioState[changedId] = 0

  // Prevent over-allocation beyond dayTotal
  const allocated = nonCashSum()
  if (allocated > dayTotal.value) {
    portfolioState[changedId] = Math.max(0, portfolioState[changedId] - (allocated - dayTotal.value))
  }

  // Recalculate unallocated (= cash): what's left after all instruments
  unallocated.value = Math.max(0, dayTotal.value - nonCashSum())

  // Lock deposit when the user allocates money to it for the first time
  const depositInst = instruments.value.find(i => i.id === 'deposit')
  if (changedId === 'deposit' && depositInst) {
    if (portfolioState.deposit > 0 && !depositLocked.value) {
      depositLocked.value   = true
      depositDaysLeft.value = depositInst.lockDays
    } else if (portfolioState.deposit === 0) {
      depositLocked.value   = false
      depositDaysLeft.value = 0
    }
  }
}

const advanceDay = () => {
  // Apply bank interest (tiny daily rate)
  portfolioState.bank = portfolioState.bank * (1 + 0.0001)

  // Asset tracks inflation (protected)
  if (portfolioState.asset) {
    portfolioState.asset = portfolioState.asset * (1 + todayInflation.value / 100)
  }

  // Deposit: count down lock days, release when done
  if (depositLocked.value) {
    depositDaysLeft.value--
    if (depositDaysLeft.value <= 0) {
      depositLocked.value = false
      portfolioState.bank += portfolioState.deposit * 1.008
      portfolioState.deposit = 0
    }
  }

  // Cash (unallocated) loses value to inflation
  unallocated.value = unallocated.value * (1 - todayInflation.value / 100)

  // Item price rises with inflation
  targetItem.value = { ...targetItem.value, price: targetItem.value.price * (1 + todayInflation.value / 100) }

  // Update dayTotal so sliders on the next day use the new totals
  dayTotal.value = nonCashSum() + unallocated.value

  // Resolve next day's inflation event
  const ev = inflationEvents.find(e => e.day === currentDay.value + 1)
  inflEvent.value = ev ?? null
  if (ev) todayInflation.value = ev.newRate
  else todayInflation.value = +(inflationRate.value + (Math.random() - 0.5) * 0.2).toFixed(2)

  if (currentDay.value >= simDays.value) {
    computeResult()
    phase.value = 'result'
  } else {
    currentDay.value++
  }
}

// ── RESULT ────────────────────────────────────────────────────────────────

const finalResult = ref({})
const lesson = ref('')

const computeResult = () => {
  const pureInflation = startAmount.value * Math.pow(1 - inflationRate.value / 100, simDays.value)
  const bankOnly      = startAmount.value * Math.pow(1 + 0.0001, simDays.value)
  const my            = totalValue.value

  const comparison = [
    { label: '💵 Todo en efectivo', value: pureInflation, diff: pureInflation - startAmount.value },
    { label: '🏦 Todo en banco',    value: bankOnly,      diff: bankOnly - startAmount.value },
    { label: '🎯 Tu elección',      value: my,            diff: my - startAmount.value, best: true },
  ]

  const achieved = my >= targetItem.value.price

  finalResult.value = {
    class: achieved ? 'result-win' : my >= startAmount.value * 0.95 ? 'result-ok' : 'result-loss',
    icon:  achieved ? '🏆' : my >= startAmount.value * 0.95 ? '👍' : '📉',
    title: achieved ? '¡Compraste el objetivo!' : my >= startAmount.value ? '¡Preservaste valor!' : 'Perdiste poder adquisitivo',
    sub: `Tu dinero vale $${Math.round(my)} vs. precio objetivo $${Math.round(targetItem.value.price)}`,
    comparison
  }

  const base = [10, 20, 30, 45][variant.value - 1] ?? 20
  const pct  = Math.min(1, my / (startAmount.value * (1 + inflationRate.value * simDays.value / 100)))
  rewardCoins.value = Math.round(base * pct + base * 0.4)

  if (inflationRate.value > bankOnly / startAmount.value - 1) {
    lesson.value = `Con inflación del ${inflationRate.value}%/día, ni el banco protege tu dinero. Activos físicos o depósitos a plazo son necesarios.`
  } else {
    lesson.value = `El banco vista entregó solo ${((bankOnly / startAmount.value - 1) * 100).toFixed(2)}% mientras la inflación fue ${inflationRate.value}%/día. El rendimiento real importa más que el nominal.`
  }
}

const finish = () => {
  const res = player.jugarMinijuego('alcancia', rewardCoins.value)
  emit('game-completed', {
    success:    totalValue.value >= startAmount.value,
    recompensa: res.recompensa,
    title:      finalResult.value.title,
    msg:        lesson.value
  })
}
</script>

<style scoped>
.sav-container { max-width: 640px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; }

/* Scenario */
.scenario-box { background: white; border-radius: var(--border-radius-md); padding: 1.5rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.inflation-preview { display: flex; align-items: center; gap: 1rem; background: #fff3cd; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; }
.infl-icon { font-size: 2.5rem; }
.infl-label { font-size: 0.85rem; font-weight: 700; color: #92400e; margin: 0; }
.infl-value { font-family: 'Fredoka', sans-serif; font-size: 1.5rem; font-weight: 700; margin: 0.2rem 0 0; }
.infl-value.high { color: #d63031; } .infl-value.low { color: #00b894; }
.instruments h4 { margin: 0 0 0.75rem; font-size: 0.95rem; }
.inst-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f2f6; font-size: 0.88rem; flex-wrap: wrap; }
.inst-row:last-child { border-bottom: none; }
.inst-name { flex: 1; font-weight: 700; }
.inst-rate { font-weight: 800; }
.beats-infl { color: #00b894; } .loses-infl { color: #d63031; }
.locked-tag { background: #fee2e2; color: #991b1b; font-size: 0.75rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; }
.inst-note { font-size: 0.75rem; color: #636e72; }
.goal-box { background: #eef0ff; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; line-height: 1.6; }
.hint { color: #d63031; font-weight: 700; font-size: 0.9rem; margin-top: 0.4rem; }

/* HUD */
.sim-hud { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
.hud-item { flex: 1; background: white; border-radius: 12px; padding: 0.65rem; text-align: center; box-shadow: var(--shadow-sm); }
.hl { font-size: 0.72rem; font-weight: 800; color: #636e72; text-transform: uppercase; display: block; }
.hv { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 700; display: block; }
.target { color: var(--primary-color); } .above { color: #00b894; } .below { color: #e17055; }

/* Events */
.infl-event { display: flex; align-items: center; gap: 0.75rem; border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 1rem; font-size: 0.9rem; }
.infl-event.spike { background: #fee2e2; color: #991b1b; }
.infl-event.calm  { background: #d1fae5; color: #065f46; }
.infl-event span  { font-size: 1.5rem; }

/* Item tracker */
.item-track { display: flex; align-items: center; gap: 1rem; background: white; border-radius: 12px; padding: 1rem 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1.25rem; }
.it-emoji { font-size: 3rem; }
.it-name { font-weight: 700; margin: 0 0 0.3rem; }
.it-price { font-size: 0.9rem; color: #636e72; margin: 0 0 0.4rem; }
.price-bar-wrap { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 0.3rem; }
.price-bar { height: 100%; border-radius: 4px; transition: width 0.4s, background 0.4s; }
.price-pct { font-size: 0.78rem; font-weight: 700; color: #636e72; }

/* Allocation */
h4 { margin: 0 0 0.75rem; }
.alloc-row { background: white; border-radius: 12px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; box-shadow: var(--shadow-sm); }
.alloc-info { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; flex-wrap: wrap; font-size: 0.88rem; }
.alloc-name { flex: 1; font-weight: 700; }
.alloc-rate { font-weight: 800; font-size: 0.82rem; }
.locked-sm { font-size: 0.75rem; color: #991b1b; font-weight: 800; }
.alloc-val { font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--primary-color); display: block; text-align: right; margin-top: 0.3rem; }
input[type=range] { width: 100%; accent-color: var(--primary-color); }
.cash-display { font-size: 0.88rem; color: #636e72; margin-bottom: 1rem; padding: 0.6rem 1rem; background: #f8fafc; border-radius: 10px; }
.cash-warn { color: #d63031; font-weight: 700; }
.warn { color: #d63031; font-weight: 800; } .ok { color: #00b894; font-weight: 800; }

/* Result */
.result-header { text-align: center; border-radius: var(--border-radius-lg); padding: 2rem; margin-bottom: 1.5rem; }
.result-win  { background: linear-gradient(135deg, #00b894, #55efc4); color: white; }
.result-ok   { background: linear-gradient(135deg, #fdcb6e, #e17055); color: white; }
.result-loss { background: linear-gradient(135deg, #b2bec3, #636e72); color: white; }
.result-header h2 { color: white; margin: 0.4rem 0; }
.result-header p { opacity: 0.9; margin: 0; }
.ri { font-size: 3.5rem; display: block; }

.comparison-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1.25rem; }
.comp-row { display: grid; grid-template-columns: 2fr 1fr 1fr; padding: 0.75rem 1rem; border-bottom: 1px solid #f1f2f6; font-size: 0.9rem; }
.comp-row:last-child { border-bottom: none; }
.header-row { background: #f8f9fa; font-weight: 800; font-size: 0.8rem; color: #636e72; text-transform: uppercase; }
.best-row { background: #eef0ff; font-weight: 700; }
.pos { color: #00b894; font-weight: 800; } .neg { color: #d63031; font-weight: 800; }

.lesson-box { background: #1a1a2e; color: #a8b2d8; border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
.lesson-box h4 { color: #edf2f7; margin: 0 0 0.5rem; }
.lesson-box p { margin: 0; line-height: 1.6; font-size: 0.9rem; }

.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
