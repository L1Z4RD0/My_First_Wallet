<template>
  <div class="bg-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">📦</div>
      <h2>{{ isEN ? 'The Delivery Run' : 'El Repartidor' }}</h2>
      <p class="subtitle">{{ isEN ? 'Read the instructions. Maximize net profit.' : 'Elige las rutas. Maximiza tu ganancia neta.' }}</p>

      <div class="intro-box">
        <div class="vehicle-row">
          <span class="v-icon">🛵</span>
          <div>
            <p><strong>{{ isEN ? 'Fuel:' : 'Combustible:' }}</strong> {{ fuelBudget }}L ({{ fuelBudget * KM_PER_LITER }}km)</p>
            <p><strong>{{ isEN ? 'Capacity:' : 'Capacidad:' }}</strong> {{ capacity }} {{ isEN ? 'orders' : 'pedidos' }}</p>
            <p><strong>{{ isEN ? 'Cost:' : 'Costo combustible:' }}</strong> ${{ FUEL_COST_PER_KM }}/km</p>
          </div>
        </div>
        <p class="tip" v-if="!isEN">💡 Ganancia neta = pagos − (km totales × ${{ FUEL_COST_PER_KM }}) − penalidades por atraso</p>
        <p class="tip" v-else>💡 Net profit = payments − (total km × ${{ FUEL_COST_PER_KM }}) − late penalties</p>
      </div>

      <div class="orders-preview">
        <h4>{{ isEN ? '📋 Available Orders' : '📋 Pedidos disponibles' }}</h4>
        <div v-for="o in orders" :key="o.id" class="order-preview">
          <span class="o-num">#{{ o.id }}</span>
          <span class="o-dest">{{ isEN ? o.destEN : o.dest }}</span>
          <span class="o-km">{{ o.km }} km</span>
          <span class="o-pay">${{ o.pay }}</span>
          <span class="o-tip" v-if="o.tip">+${{ o.tip }} tip</span>
        </div>
      </div>

      <button class="btn-primary" @click="phase = 'select'">
        {{ isEN ? '🚀 Start Delivery' : '🚀 Iniciar Turno' }}
      </button>
    </div>

    <!-- ══ ORDER SELECTION ═════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'select'" class="phase">
      <h3>{{ isEN ? 'Select orders to accept' : 'Selecciona los pedidos a aceptar' }}</h3>
      <p class="sel-hint">
        {{ isEN
          ? `Max ${capacity} orders · ${fuelBudget * KM_PER_LITER}km range · Choose wisely!`
          : `Máx ${capacity} pedidos · ${fuelBudget * KM_PER_LITER}km de rango · ¡Calcula bien!` }}
      </p>

      <div class="orders-list">
        <div
          v-for="o in orders"
          :key="o.id"
          class="order-card"
          :class="{
            selected: selectedIds.includes(o.id),
            disabled: !selectedIds.includes(o.id) && (selectedIds.length >= capacity || projectedKm + o.km > fuelBudget * KM_PER_LITER)
          }"
          @click="toggleOrder(o)"
        >
          <div class="oc-header">
            <span class="oc-id">#{{ o.id }}</span>
            <span v-if="selectedIds.includes(o.id)" class="oc-check">✓</span>
          </div>
          <div class="oc-dest">
            <span class="dest-icon">📍</span>
            {{ isEN ? o.destEN : o.dest }}
          </div>
          <div v-if="isEN && o.conditionEN" class="oc-condition">
            📋 <em>{{ o.conditionEN }}</em>
          </div>
          <div class="oc-meta">
            <span>📏 {{ o.km }} km</span>
            <span>💰 ${{ o.pay }}</span>
            <span v-if="o.tip" class="tip-tag">+${{ o.tip }} tip</span>
            <span v-if="o.timeLimit" class="time-tag">⏱ {{ o.timeLimit }}min</span>
          </div>
          <div class="oc-calc" v-if="selectedIds.includes(o.id)">
            Costo: ${{ (o.km * FUEL_COST_PER_KM).toFixed(0) }} →
            Neto: <strong :class="(o.pay + (o.tip || 0) - o.km * FUEL_COST_PER_KM) > 0 ? 'pos' : 'neg'">
              ${{ (o.pay + (o.tip || 0) - o.km * FUEL_COST_PER_KM).toFixed(0) }}
            </strong>
          </div>
        </div>
      </div>

      <div class="projection-bar">
        <span>Km usados: {{ projectedKm }} / {{ fuelBudget * KM_PER_LITER }}</span>
        <span>Pedidos: {{ selectedIds.length }} / {{ capacity }}</span>
        <span class="proj-net">Ganancia estimada: <strong>${{ estimatedNet.toFixed(0) }}</strong></span>
      </div>

      <button class="btn-primary" :disabled="selectedIds.length === 0" @click="startDelivery">
        {{ isEN ? 'Confirm & Deliver →' : 'Confirmar y Repartir →' }}
      </button>
    </div>

    <!-- ══ DELIVERY RESOLUTION ════════════════════════════════════════════ -->
    <div v-else-if="phase === 'delivery'" class="phase">
      <h3>{{ isEN ? '🛵 Delivering...' : '🛵 Realizando entregas...' }}</h3>

      <div v-for="(r, i) in results" :key="i" class="delivery-result" :class="r.ok ? 'del-ok' : 'del-issue'">
        <div class="dr-header">
          <span>#{{ r.id }}</span>
          <span>{{ isEN ? r.destEN : r.dest }}</span>
          <span :class="r.ok ? 'ok-tag' : 'fail-tag'">{{ r.ok ? '✓' : '⚠️' }}</span>
        </div>
        <p v-if="r.conditionFailed" class="condition-fail">
          {{ isEN ? '❌ Condition not met: ' : '❌ Condición incumplida: ' }}{{ isEN ? r.conditionEN : r.condition }}
        </p>
        <div class="dr-money">
          <span>+${{ r.pay }}</span>
          <span v-if="r.tip">+${{ r.tip }} tip</span>
          <span v-if="r.penalty" class="penalty">−${{ r.penalty }} penalty</span>
          <span class="dr-net">Neto: ${{ r.net }}</span>
        </div>
      </div>

      <div class="summary-box">
        <div class="sum-row">
          <span>{{ isEN ? 'Total payments' : 'Pagos totales' }}</span>
          <span>${{ totalGross.toFixed(0) }}</span>
        </div>
        <div class="sum-row">
          <span>{{ isEN ? 'Fuel cost' : 'Costo combustible' }}</span>
          <span>−${{ (actualKm * FUEL_COST_PER_KM).toFixed(0) }}</span>
        </div>
        <div class="sum-row">
          <span>{{ isEN ? 'Penalties' : 'Penalidades' }}</span>
          <span class="penalty">−${{ totalPenalties.toFixed(0) }}</span>
        </div>
        <div class="sum-row net-row">
          <span><strong>{{ isEN ? 'Net Profit' : 'Ganancia Neta' }}</strong></span>
          <span class="net-final" :class="finalNet >= 0 ? 'pos' : 'neg'">
            <strong>${{ finalNet.toFixed(0) }}</strong>
          </span>
        </div>
      </div>

      <div class="insight" v-if="bestPossibleNet > finalNet + 5">
        {{ isEN
          ? `💡 Optimal route would have earned $${bestPossibleNet.toFixed(0)}. You earned $${finalNet.toFixed(0)}.`
          : `💡 La ruta óptima hubiera dado $${bestPossibleNet.toFixed(0)}. Obtuviste $${finalNet.toFixed(0)}.` }}
      </div>

      <div class="reward-box">
        <p>{{ isEN ? 'Reward:' : 'Recompensa:' }} <strong class="coins">+${{ rewardCoins }}</strong> 🪙</p>
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

const FUEL_COST_PER_KM = 1.5
const KM_PER_LITER     = 10

const fuelBudget = computed(() => ({ 1: 20, 2: 15, 3: 12, 4: 10 }[variant.value] ?? 15))
const capacity   = computed(() => ({ 1: 2,  2: 3,  3: 3,  4: 3  }[variant.value] ?? 3))

const orderPools = {
  1: [
    { id: 1, dest: 'Calle Los Pinos 320',    destEN: '320 Pine St',       km: 4,  pay: 18, tip: 5,   timeLimit: null, condition: null, conditionEN: null },
    { id: 2, dest: 'Av. Central 88',          destEN: '88 Central Ave',    km: 8,  pay: 32, tip: 8,   timeLimit: null, condition: null, conditionEN: null },
    { id: 3, dest: 'Plaza Mayor 15',          destEN: '15 Main Square',    km: 12, pay: 40, tip: 0,   timeLimit: null, condition: null, conditionEN: null },
    { id: 4, dest: 'Sector Comercial Norte',  destEN: 'North Business Hub', km: 3,  pay: 12, tip: 4,   timeLimit: null, condition: null, conditionEN: null },
  ],
  2: [
    { id: 1, dest: 'Residencial Las Palmas',  destEN: '8 Palm Residence',   km: 5,  pay: 20, tip: 6,   timeLimit: 30, condition: null, conditionEN: 'Deliver before 6 PM' },
    { id: 2, dest: 'Centro Histórico',         destEN: 'Historic Center',    km: 9,  pay: 35, tip: 10,  timeLimit: 20, condition: null, conditionEN: 'Ring buzzer — do NOT leave at door' },
    { id: 3, dest: 'Zona Industrial',          destEN: 'Industrial Zone',    km: 14, pay: 45, tip: 0,   timeLimit: null, condition: null, conditionEN: null },
    { id: 4, dest: 'Condominio Sur',           destEN: 'South Condo',        km: 6,  pay: 22, tip: 8,   timeLimit: null, condition: null, conditionEN: null },
    { id: 5, dest: 'Aeropuerto Terminal A',    destEN: 'Airport Terminal A', km: 18, pay: 60, tip: 15,  timeLimit: 40, condition: null, conditionEN: 'Deliver ONLY if passenger name matches ID' },
  ],
  3: [
    { id: 1, dest: 'Barrio Universitario',     destEN: 'University District', km: 4,  pay: 15, tip: 5,  timeLimit: 25, condition: 'Solo si hay portero', conditionEN: 'Deliver ONLY if doorman is present' },
    { id: 2, dest: 'Av. Las Industrias',       destEN: '200 Industry Blvd',   km: 10, pay: 38, tip: 0,  timeLimit: null, condition: null, conditionEN: null },
    { id: 3, dest: 'Hotel Gran Mirador',       destEN: 'Grand View Hotel',    km: 7,  pay: 28, tip: 15, timeLimit: 20, condition: null, conditionEN: 'Leave at reception — do NOT go to room' },
    { id: 4, dest: 'Feria Municipal',          destEN: 'City Market',         km: 5,  pay: 18, tip: 6,  timeLimit: null, condition: null, conditionEN: null },
    { id: 5, dest: 'Clínica Santa Rosa',       destEN: 'St. Rose Clinic',     km: 12, pay: 42, tip: 12, timeLimit: 30, condition: 'Solo paquetes <5kg', conditionEN: 'Deliver ONLY if package weighs under 5kg (check label)' },
    { id: 6, dest: 'Subcentro Oriente',        destEN: 'East Subcenter',      km: 16, pay: 55, tip: 0,  timeLimit: null, condition: null, conditionEN: null },
  ],
}

const orders = computed(() => orderPools[Math.min(variant.value, 3)] ?? orderPools[3])

// ── STATE ─────────────────────────────────────────────────────────────────

const phase       = ref('intro')
const selectedIds = ref([])
const results     = ref([])
const actualKm    = ref(0)
const totalGross  = ref(0)
const totalPenalties = ref(0)
const finalNet    = ref(0)
const bestPossibleNet = ref(0)
const rewardCoins = ref(0)

const projectedKm = computed(() =>
  selectedIds.value.reduce((s, id) => {
    const o = orders.value.find(x => x.id === id)
    return s + (o?.km ?? 0)
  }, 0)
)

const estimatedNet = computed(() => {
  return selectedIds.value.reduce((s, id) => {
    const o = orders.value.find(x => x.id === id)
    if (!o) return s
    return s + o.pay + (o.tip ?? 0) - o.km * FUEL_COST_PER_KM
  }, 0)
})

const toggleOrder = (o) => {
  const idx = selectedIds.value.indexOf(o.id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    if (selectedIds.value.length >= capacity.value) return
    if (projectedKm.value + o.km > fuelBudget.value * KM_PER_LITER) return
    selectedIds.value.push(o.id)
  }
}

const startDelivery = () => {
  const selected = orders.value.filter(o => selectedIds.value.includes(o.id))
  let gross = 0, penalties = 0, km = 0

  results.value = selected.map(o => {
    km += o.km
    const fuelCost  = o.km * FUEL_COST_PER_KM
    // In EN mode, conditions matter — simulate a random pass/fail (70% pass)
    const conditionFailed = isEN.value && o.conditionEN && Math.random() < 0.25
    const penalty = conditionFailed ? (o.tip ?? 0) : 0
    const pay = o.pay + (conditionFailed ? 0 : (o.tip ?? 0))
    gross     += pay
    penalties += penalty
    const net = pay - fuelCost - penalty
    return {
      id: o.id, dest: o.dest, destEN: o.destEN,
      pay: o.pay, tip: o.tip, penalty,
      condition: o.condition, conditionEN: o.conditionEN,
      conditionFailed, ok: !conditionFailed, net: net.toFixed(0)
    }
  })

  actualKm.value    = km
  totalGross.value  = gross
  totalPenalties.value = penalties
  finalNet.value    = gross - km * FUEL_COST_PER_KM - penalties

  // Compute best possible
  const all = orders.value
  const sorted = [...all].sort((a, b) => {
    const na = (a.pay + (a.tip ?? 0) - a.km * FUEL_COST_PER_KM) / a.km
    const nb = (b.pay + (b.tip ?? 0) - b.km * FUEL_COST_PER_KM) / b.km
    return nb - na
  })
  let bestKm = 0, bestNet = 0, bestCount = 0
  for (const o of sorted) {
    if (bestCount >= capacity.value) break
    if (bestKm + o.km > fuelBudget.value * KM_PER_LITER) continue
    bestNet  += o.pay + (o.tip ?? 0) - o.km * FUEL_COST_PER_KM
    bestKm   += o.km
    bestCount++
  }
  bestPossibleNet.value = bestNet

  const base = [15, 25, 35, 50][variant.value - 1] ?? 25
  const pct  = bestNet > 0 ? Math.min(1, Math.max(0, finalNet.value / bestNet)) : 0
  rewardCoins.value = Math.round(base * pct + base * 0.3)

  phase.value = 'delivery'
}

const finish = () => {
  const res = player.jugarMinijuego('presupuesto', rewardCoins.value)
  emit('game-completed', {
    success:    finalNet.value > 0,
    recompensa: res.recompensa,
    title:      isEN.value
      ? (finalNet.value > bestPossibleNet.value * 0.8 ? 'Expert Delivery Driver!' : 'Good Run!')
      : (finalNet.value > bestPossibleNet.value * 0.8 ? '¡Repartidor Experto!' : '¡Buen Turno!'),
    msg: isEN.value
      ? `Net profit: $${finalNet.value.toFixed(0)} of $${bestPossibleNet.value.toFixed(0)} optimal.`
      : `Ganancia neta: $${finalNet.value.toFixed(0)} de $${bestPossibleNet.value.toFixed(0)} óptimo.`
  })
}
</script>

<style scoped>
.bg-container { max-width: 680px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; }

/* Intro */
.intro-box { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.vehicle-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.v-icon { font-size: 3rem; }
.vehicle-row p { margin: 0.2rem 0; font-size: 0.9rem; }
.tip { color: #636e72; font-size: 0.85rem; font-style: italic; margin: 0.5rem 0 0; }
.orders-preview h4 { margin: 0 0 0.75rem; }
.order-preview { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f2f6; font-size: 0.88rem; }
.order-preview:last-child { border-bottom: none; }
.o-num { background: var(--primary-color); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; }
.o-dest { flex: 1; font-weight: 600; }
.o-km { color: #636e72; font-size: 0.82rem; }
.o-pay { font-weight: 800; color: #00b894; }
.o-tip { font-size: 0.8rem; color: #fdcb6e; font-weight: 700; }

/* Select */
.sel-hint { color: #636e72; font-size: 0.88rem; margin-bottom: 1rem; text-align: center; }
.orders-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.85rem; margin-bottom: 1rem; }
.order-card { background: white; border: 2px solid #e2e8f0; border-radius: var(--border-radius-md); padding: 1rem; cursor: pointer; transition: all 0.18s; }
.order-card:hover:not(.disabled) { border-color: var(--primary-color); transform: translateY(-2px); }
.order-card.selected { border-color: var(--primary-color); background: #eef0ff; }
.order-card.disabled { opacity: 0.45; cursor: not-allowed; }
.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
.oc-id { background: var(--primary-color); color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
.oc-check { color: #00b894; font-size: 1.2rem; font-weight: 800; }
.oc-dest { font-weight: 700; font-size: 0.92rem; margin-bottom: 0.4rem; }
.oc-condition { background: #fff3cd; color: #92400e; font-size: 0.78rem; padding: 0.4rem 0.6rem; border-radius: 8px; margin-bottom: 0.5rem; line-height: 1.4; }
.oc-meta { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.82rem; margin-bottom: 0.4rem; }
.tip-tag  { color: #fdcb6e; font-weight: 800; }
.time-tag { color: #e17055; font-weight: 800; }
.oc-calc { font-size: 0.78rem; color: #636e72; padding-top: 0.4rem; border-top: 1px solid #f1f2f6; }
.pos { color: #00b894; font-weight: 800; } .neg { color: #d63031; font-weight: 800; }

.projection-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.88rem; font-weight: 700; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
.proj-net { color: #00b894; }

/* Delivery results */
.delivery-result { background: white; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; box-shadow: var(--shadow-sm); }
.del-ok   { border-left: 4px solid #00b894; }
.del-issue{ border-left: 4px solid #e17055; }
.dr-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem; font-weight: 700; }
.ok-tag { color: #00b894; font-weight: 800; } .fail-tag { color: #e17055; font-weight: 800; }
.condition-fail { color: #e17055; font-size: 0.82rem; font-weight: 700; margin: 0.3rem 0; background: #fff5f5; padding: 0.4rem 0.6rem; border-radius: 8px; }
.dr-money { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.88rem; font-weight: 700; }
.penalty { color: #d63031; }
.dr-net { margin-left: auto; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; color: var(--primary-color); }

.summary-box { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.sum-row { display: flex; justify-content: space-between; padding: 0.75rem 1.25rem; border-bottom: 1px solid #f1f2f6; font-size: 0.95rem; }
.sum-row:last-child { border-bottom: none; }
.net-row { background: #f8f9fa; }
.net-final { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; }

.insight { background: #eef0ff; color: #3730a3; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
