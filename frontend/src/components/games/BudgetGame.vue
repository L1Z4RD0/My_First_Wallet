<template>
  <div class="bg-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">📦</div>
      <h2>{{ isEN ? 'The Delivery Run' : 'El Repartidor' }}</h2>
      <p class="subtitle">{{ isEN ? 'Pick routes wisely. Fuel costs can turn profit into loss.' : 'Elige tus rutas. El combustible puede convertir ganancias en pérdidas.' }}</p>

      <div class="intro-box">
        <div class="vehicle-row">
          <span class="v-icon">🛵</span>
          <div class="v-stats">
            <div class="v-stat">
              <span class="v-label">{{ isEN ? 'Tank' : 'Tanque' }}</span>
              <span class="v-val">{{ fuelBudget }}L ({{ fuelBudget * KM_PER_LITER }}km)</span>
            </div>
            <div class="v-stat">
              <span class="v-label">{{ isEN ? 'Efficiency' : 'Rendimiento' }}</span>
              <span class="v-val">{{ KM_PER_LITER }} km/L</span>
            </div>
            <div class="v-stat">
              <span class="v-label">{{ isEN ? 'Fuel price' : 'Precio combustible' }}</span>
              <span class="v-val highlight">${{ FUEL_COST_PER_LITER.toLocaleString() }}/L (${{ FUEL_COST_PER_KM }}/km)</span>
            </div>
            <div class="v-stat">
              <span class="v-label">{{ isEN ? 'Max orders' : 'Capacidad' }}</span>
              <span class="v-val">{{ capacity }} {{ isEN ? 'orders' : 'pedidos' }}</span>
            </div>
          </div>
        </div>

        <div class="formula-box">
          <span class="form-label">{{ isEN ? '📐 Formula:' : '📐 Fórmula:' }}</span>
          <span class="form-text">{{ isEN
            ? 'Net Profit = Order Payment − (km × $150/km)'
            : 'Ganancia Neta = Pago del pedido − (km × $150/km)' }}</span>
        </div>

        <p class="tip warning-tip">
          ⚠️ {{ isEN
            ? 'Some routes PAY LESS than their fuel cost — those generate losses!'
            : '¡Algunas rutas PAGAN MENOS que su combustible — generan pérdidas!' }}
        </p>
      </div>

      <div class="orders-preview">
        <h4>{{ isEN ? '📋 Available Orders' : '📋 Pedidos disponibles' }}</h4>
        <div v-for="o in orders" :key="o.id" class="order-preview">
          <span class="o-num">#{{ o.id }}</span>
          <span class="o-dest">{{ isEN ? o.destEN : o.dest }}</span>
          <span class="o-km">{{ o.km }} km</span>
          <span class="o-pay">${{ o.pay.toLocaleString() }}</span>
          <span class="o-tip" v-if="o.tip">+${{ o.tip.toLocaleString() }}</span>
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
          ? `Max ${capacity} orders · ${fuelBudget * KM_PER_LITER}km range · Calculate fuel before accepting!`
          : `Máx ${capacity} pedidos · ${fuelBudget * KM_PER_LITER}km de rango · ¡Calcula el combustible antes de aceptar!` }}
      </p>

      <div class="orders-list">
        <div
          v-for="o in orders"
          :key="o.id"
          class="order-card"
          :class="{
            selected: selectedIds.includes(o.id),
            disabled: !selectedIds.includes(o.id) && (selectedIds.length >= capacity || projectedKm + o.km > fuelBudget * KM_PER_LITER),
            'net-loss': orderNet(o) < 0
          }"
          @click="toggleOrder(o)"
        >
          <div class="oc-header">
            <span class="oc-id">#{{ o.id }}</span>
            <span v-if="selectedIds.includes(o.id)" class="oc-check">✓</span>
            <span v-if="orderNet(o) < 0 && !selectedIds.includes(o.id)" class="trap-tag">⚠️</span>
          </div>
          <div class="oc-dest">
            <span class="dest-icon">📍</span>{{ isEN ? o.destEN : o.dest }}
          </div>
          <div v-if="isEN && o.conditionEN" class="oc-condition">
            📋 <em>{{ o.conditionEN }}</em>
          </div>
          <div class="oc-meta">
            <span>📏 {{ o.km }} km</span>
            <span>⛽ {{ (o.km / KM_PER_LITER).toFixed(1) }}L</span>
            <span>💰 ${{ o.pay.toLocaleString() }}</span>
            <span v-if="o.tip" class="tip-tag">+${{ o.tip.toLocaleString() }}</span>
          </div>

          <!-- Breakdown shown when selected -->
          <div class="oc-calc" v-if="selectedIds.includes(o.id)">
            <div class="calc-row">
              <span>{{ isEN ? 'Payment:' : 'Pago:' }}</span>
              <span class="pos">+${{ (o.pay + (o.tip ?? 0)).toLocaleString() }}</span>
            </div>
            <div class="calc-row">
              <span>{{ isEN ? 'Fuel:' : 'Combustible:' }}</span>
              <span class="neg">−${{ (o.km * FUEL_COST_PER_KM).toLocaleString() }}</span>
            </div>
            <div class="calc-row net-calc">
              <span><strong>{{ isEN ? 'Net:' : 'Neto:' }}</strong></span>
              <strong :class="orderNet(o) >= 0 ? 'pos' : 'neg'">
                ${{ orderNet(o).toLocaleString() }}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div class="projection-bar">
        <span>⛽ {{ projectedKm }} km / {{ fuelBudget * KM_PER_LITER }} km</span>
        <span>📦 {{ selectedIds.length }} / {{ capacity }}</span>
        <span class="proj-net" :class="estimatedNet >= 0 ? 'pos' : 'neg'">
          {{ isEN ? 'Est. net:' : 'Neto estimado:' }} <strong>${{ Math.round(estimatedNet).toLocaleString() }}</strong>
        </span>
      </div>

      <button class="btn-primary" :disabled="selectedIds.length === 0" @click="startDelivery">
        {{ isEN ? 'Confirm & Deliver →' : 'Confirmar y Repartir →' }}
      </button>
    </div>

    <!-- ══ DELIVERY RESOLUTION ════════════════════════════════════════════ -->
    <div v-else-if="phase === 'delivery'" class="phase">
      <h3>{{ isEN ? '🛵 Delivery Summary' : '🛵 Resumen de entregas' }}</h3>

      <!-- Per-order breakdown -->
      <div v-for="(r, i) in results" :key="i" class="delivery-result" :class="r.net >= 0 ? 'del-ok' : 'del-issue'">
        <div class="dr-header">
          <span class="dr-id">#{{ r.id }}</span>
          <span class="dr-dest">{{ isEN ? r.destEN : r.dest }}</span>
          <span :class="r.net >= 0 ? 'ok-tag' : 'fail-tag'">{{ r.net >= 0 ? '✓' : '📉' }}</span>
        </div>
        <p v-if="r.conditionFailed" class="condition-fail">
          {{ isEN ? '❌ Condition not met: ' : '❌ Condición incumplida: ' }}{{ isEN ? r.conditionEN : r.condition }}
        </p>
        <div class="dr-breakdown">
          <div class="db-row">
            <span>{{ isEN ? 'Payment received:' : 'Pago recibido:' }}</span>
            <span class="pos">+${{ r.gross.toLocaleString() }}</span>
          </div>
          <div class="db-row">
            <span>⛽ {{ r.km }}km → {{ r.liters }}L × ${{ FUEL_COST_PER_LITER.toLocaleString() }}/L:</span>
            <span class="neg">−${{ r.fuelCost.toLocaleString() }}</span>
          </div>
          <div v-if="r.penalty" class="db-row">
            <span>{{ isEN ? 'Penalty:' : 'Penalidad:' }}</span>
            <span class="neg">−${{ r.penalty.toLocaleString() }}</span>
          </div>
          <div class="db-row net-row-order">
            <strong>{{ isEN ? 'Net this order:' : 'Neto este pedido:' }}</strong>
            <strong :class="r.net >= 0 ? 'pos' : 'neg'">
              {{ r.net >= 0 ? '+' : '' }}${{ r.net.toLocaleString() }}
            </strong>
          </div>
        </div>
      </div>

      <!-- Global summary -->
      <div class="summary-box">
        <div class="sum-row">
          <span>{{ isEN ? 'Total payments' : 'Total pagos recibidos' }}</span>
          <span class="pos">+${{ totalGross.toLocaleString() }}</span>
        </div>
        <div class="sum-row">
          <span>⛽ {{ isEN ? 'Fuel consumed' : 'Combustible consumido' }}: {{ actualKm }} km → {{ fuelLiters }}L</span>
          <span class="neg">−${{ totalFuelCost.toLocaleString() }}</span>
        </div>
        <div v-if="totalPenalties > 0" class="sum-row">
          <span>{{ isEN ? 'Penalties' : 'Penalidades' }}</span>
          <span class="neg">−${{ totalPenalties.toLocaleString() }}</span>
        </div>
        <div class="sum-row net-row">
          <strong>{{ isEN ? 'NET PROFIT / LOSS' : 'GANANCIA NETA / PÉRDIDA' }}</strong>
          <strong class="net-final" :class="finalNet >= 0 ? 'pos' : 'neg'">
            {{ finalNet >= 0 ? '+' : '' }}${{ Math.round(finalNet).toLocaleString() }}
          </strong>
        </div>
      </div>

      <div class="insight" v-if="bestPossibleNet > finalNet + 500">
        💡 {{ isEN
          ? `Optimal selection would have earned $${Math.round(bestPossibleNet).toLocaleString()}. You earned $${Math.round(finalNet).toLocaleString()}.`
          : `La selección óptima hubiera dado $${Math.round(bestPossibleNet).toLocaleString()}. Obtuviste $${Math.round(finalNet).toLocaleString()}.` }}
      </div>

      <div class="reward-box" :class="{ penalty: rewardCoins < 0, ok: rewardCoins === 10, great: rewardCoins === 40 }">
        <div class="reward-tier-icon">{{ rewardCoins >= 40 ? '🏆' : rewardCoins >= 0 ? '👍' : '📉' }}</div>
        <p v-if="rewardCoins > 0">
          {{ isEN ? 'Reward:' : 'Recompensa:' }}
          <strong class="coins">+{{ rewardCoins }} 🪙</strong>
        </p>
        <p v-else>
          {{ isEN ? 'Penalty — unprofitable route!' : '¡Penalización — ruta no rentable!' }}
          <strong class="coins-neg">{{ rewardCoins }} 🪙</strong>
        </p>
        <p class="tier-reason">{{ tierReason }}</p>
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

// ── FUEL CONSTANTS ────────────────────────────────────────────────────────
const FUEL_COST_PER_LITER = 1500
const KM_PER_LITER        = 10
const FUEL_COST_PER_KM    = FUEL_COST_PER_LITER / KM_PER_LITER   // 150

const fuelBudget = computed(() => ({ 1: 20, 2: 15, 3: 12, 4: 10 }[variant.value] ?? 15))
const capacity   = computed(() => ({ 1: 2,  2: 3,  3: 3,  4: 3  }[variant.value] ?? 3))

// ── ORDER POOLS ───────────────────────────────────────────────────────────
// All prices in realistic CLP scale. TRAP orders have fuel cost > payment.
// Net = pay + tip - km × $150/km
// Trap v1 #3: 18km → $2700 fuel > $2500 pay → -$200 loss
// Trap v2 #3: 16km → $2400 fuel > $2100 pay → -$300 loss
// Trap v3 #5: 15km → $2250 fuel > $2000 pay → -$250 loss
const orderPools = {
  1: [
    { id: 1, dest: 'Calle Los Pinos 320',    destEN: '320 Pine St',        km: 4,  pay: 1800, tip: 500,  timeLimit: null, condition: null, conditionEN: null },
    { id: 2, dest: 'Av. Central 88',          destEN: '88 Central Ave',     km: 8,  pay: 3200, tip: 800,  timeLimit: null, condition: null, conditionEN: null },
    { id: 3, dest: 'Plaza Mayor 15',          destEN: '15 Main Square',     km: 18, pay: 2500, tip: 0,    timeLimit: null, condition: null, conditionEN: null },
    { id: 4, dest: 'Sector Comercial Norte',  destEN: 'North Business Hub', km: 3,  pay: 1200, tip: 400,  timeLimit: null, condition: null, conditionEN: null },
  ],
  2: [
    { id: 1, dest: 'Residencial Las Palmas',  destEN: '8 Palm Residence',   km: 5,  pay: 2000, tip: 600,  timeLimit: 30, condition: null, conditionEN: 'Deliver before 6 PM' },
    { id: 2, dest: 'Centro Histórico',         destEN: 'Historic Center',    km: 9,  pay: 3500, tip: 1000, timeLimit: 20, condition: null, conditionEN: 'Ring buzzer — do NOT leave at door' },
    { id: 3, dest: 'Zona Industrial',          destEN: 'Industrial Zone',    km: 16, pay: 2100, tip: 0,    timeLimit: null, condition: null, conditionEN: null },
    { id: 4, dest: 'Condominio Sur',           destEN: 'South Condo',        km: 6,  pay: 2200, tip: 800,  timeLimit: null, condition: null, conditionEN: null },
    { id: 5, dest: 'Aeropuerto Terminal A',    destEN: 'Airport Terminal A', km: 12, pay: 4500, tip: 0,    timeLimit: 40, condition: null, conditionEN: 'Deliver ONLY if passenger name matches ID' },
  ],
  3: [
    { id: 1, dest: 'Barrio Universitario',     destEN: 'University District', km: 4,  pay: 1500, tip: 500,  timeLimit: 25, condition: 'Solo si hay portero', conditionEN: 'Deliver ONLY if doorman is present' },
    { id: 2, dest: 'Av. Las Industrias',       destEN: '200 Industry Blvd',   km: 10, pay: 3800, tip: 0,    timeLimit: null, condition: null, conditionEN: null },
    { id: 3, dest: 'Hotel Gran Mirador',       destEN: 'Grand View Hotel',    km: 7,  pay: 2800, tip: 1500, timeLimit: 20, condition: null, conditionEN: 'Leave at reception — do NOT go to room' },
    { id: 4, dest: 'Feria Municipal',          destEN: 'City Market',         km: 5,  pay: 1800, tip: 600,  timeLimit: null, condition: null, conditionEN: null },
    { id: 5, dest: 'Clínica Santa Rosa',       destEN: 'St. Rose Clinic',     km: 15, pay: 2000, tip: 0,    timeLimit: 30, condition: 'Solo paquetes <5kg', conditionEN: 'Deliver ONLY if package weighs under 5kg' },
    { id: 6, dest: 'Subcentro Oriente',        destEN: 'East Subcenter',      km: 8,  pay: 3200, tip: 0,    timeLimit: null, condition: null, conditionEN: null },
  ],
}

const orders = computed(() => orderPools[Math.min(variant.value, 3)] ?? orderPools[3])

// ── HELPERS ───────────────────────────────────────────────────────────────

const orderNet = (o) => o.pay + (o.tip ?? 0) - o.km * FUEL_COST_PER_KM

// ── STATE ─────────────────────────────────────────────────────────────────

const phase          = ref('intro')
const selectedIds    = ref([])
const results        = ref([])
const actualKm       = ref(0)
const totalGross     = ref(0)
const totalFuelCost  = ref(0)
const totalPenalties = ref(0)
const finalNet       = ref(0)
const bestPossibleNet = ref(0)
const rewardCoins    = ref(0)
const fuelLiters     = ref(0)

const projectedKm = computed(() =>
  selectedIds.value.reduce((s, id) => s + (orders.value.find(x => x.id === id)?.km ?? 0), 0)
)

const estimatedNet = computed(() =>
  selectedIds.value.reduce((s, id) => {
    const o = orders.value.find(x => x.id === id)
    return o ? s + orderNet(o) : s
  }, 0)
)

const tierReason = computed(() => {
  if (rewardCoins.value >= 40) return isEN.value
    ? '🏆 Excellent route optimization! You maximized net profit.'
    : '🏆 ¡Excelente optimización de ruta! Maximizaste la ganancia neta.'
  if (rewardCoins.value >= 10) return isEN.value
    ? '👍 Profitable run, but a better route selection was available.'
    : '👍 Turno rentable, pero existía una selección de rutas mejor.'
  return isEN.value
    ? '📉 The fuel cost exceeded the order payment — always calculate before accepting.'
    : '📉 El costo de combustible superó el pago del pedido — siempre calcula antes de aceptar.'
})

// ── TOGGLE ────────────────────────────────────────────────────────────────

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

// ── DELIVERY RESOLUTION ───────────────────────────────────────────────────

const startDelivery = () => {
  const selected = orders.value.filter(o => selectedIds.value.includes(o.id))
  let gross = 0, penalties = 0, km = 0, fuelTotal = 0

  results.value = selected.map(o => {
    km += o.km
    const fuelCost = o.km * FUEL_COST_PER_KM
    fuelTotal += fuelCost
    const liters = parseFloat((o.km / KM_PER_LITER).toFixed(1))

    // EN mode: conditions apply (25% failure chance)
    const conditionFailed = isEN.value && !!o.conditionEN && Math.random() < 0.25
    const penalty = conditionFailed ? Math.round((o.tip ?? 0)) : 0
    const orderGross = o.pay + (conditionFailed ? 0 : (o.tip ?? 0))
    gross     += orderGross
    penalties += penalty
    const net  = orderGross - fuelCost - penalty

    return {
      id: o.id, dest: o.dest, destEN: o.destEN, km: o.km, liters,
      gross: orderGross, fuelCost, penalty,
      condition: o.condition, conditionEN: o.conditionEN,
      conditionFailed, ok: net >= 0, net,
    }
  })

  actualKm.value       = km
  fuelLiters.value     = parseFloat((km / KM_PER_LITER).toFixed(1))
  totalGross.value     = gross
  totalFuelCost.value  = fuelTotal
  totalPenalties.value = penalties
  finalNet.value       = gross - fuelTotal - penalties

  // ── Best possible net (greedy by net/km ratio) ────────────────────────
  const sorted = [...orders.value].sort((a, b) => orderNet(b) / b.km - orderNet(a) / a.km)
  let bestKm = 0, bestNet = 0, bestCount = 0
  for (const o of sorted) {
    if (bestCount >= capacity.value) break
    if (bestKm + o.km > fuelBudget.value * KM_PER_LITER) continue
    bestNet += orderNet(o)
    bestKm  += o.km
    bestCount++
  }
  bestPossibleNet.value = bestNet

  // ── Reward tiers ──────────────────────────────────────────────────────
  // -10: loss   |   +10: profit but suboptimal   |   +40: well optimized
  if (finalNet.value < 0) {
    rewardCoins.value = -10
  } else if (bestNet > 0 && finalNet.value >= bestNet * 0.70) {
    rewardCoins.value = 40
  } else {
    rewardCoins.value = 10
  }

  phase.value = 'delivery'
}

// ── FINISH ────────────────────────────────────────────────────────────────

const finish = () => {
  let recompensa = 0
  if (rewardCoins.value < 0) {
    player.gastarDinero(Math.abs(rewardCoins.value))
    player.jugarMinijuego('presupuesto', 0)
    recompensa = rewardCoins.value
  } else {
    const res = player.jugarMinijuego('presupuesto', rewardCoins.value)
    recompensa = res.recompensa
  }
  emit('game-completed', {
    success:    finalNet.value >= 0,
    recompensa,
    title: isEN.value
      ? (rewardCoins.value >= 40 ? 'Expert Delivery Driver! 🏆' : rewardCoins.value >= 10 ? 'Good Run! 👍' : 'Unprofitable Route 📉')
      : (rewardCoins.value >= 40 ? '¡Repartidor Experto! 🏆'   : rewardCoins.value >= 10 ? '¡Buen Turno! 👍' : 'Ruta No Rentable 📉'),
    msg: isEN.value
      ? `Net: $${Math.round(finalNet.value).toLocaleString()} of $${Math.round(bestPossibleNet.value).toLocaleString()} optimal. Fuel: ${fuelLiters.value}L = $${totalFuelCost.value.toLocaleString()}.`
      : `Neto: $${Math.round(finalNet.value).toLocaleString()} de $${Math.round(bestPossibleNet.value).toLocaleString()} óptimo. Combustible: ${fuelLiters.value}L = $${totalFuelCost.value.toLocaleString()}.`,
  })
}
</script>

<style scoped>
.bg-container { max-width: 680px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; font-size: 0.95rem; }

/* ── INTRO ─────────────────────────────────────────────────────────────── */
.intro-box { background: white; border-radius: var(--border-radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.vehicle-row { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.v-icon { font-size: 3rem; }
.v-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; flex: 1; }
.v-stat { background: #f8fafc; border-radius: 8px; padding: 0.4rem 0.6rem; }
.v-label { display: block; font-size: 0.7rem; font-weight: 800; color: #636e72; text-transform: uppercase; }
.v-val { display: block; font-size: 0.9rem; font-weight: 700; color: #2d3436; }
.v-val.highlight { color: #d63031; }

.formula-box { background: #eef0ff; border-radius: 10px; padding: 0.65rem 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.form-label { font-size: 0.82rem; font-weight: 800; color: #5b5bf6; white-space: nowrap; }
.form-text { font-size: 0.85rem; font-weight: 700; color: #2d3436; }

.tip { color: #636e72; font-size: 0.85rem; font-style: italic; margin: 0.25rem 0 0; }
.warning-tip { color: #c0392b; background: #fff5f5; border-radius: 8px; padding: 0.5rem 0.75rem; font-style: normal; font-weight: 700; margin-top: 0.5rem; }

.orders-preview h4 { margin: 0 0 0.75rem; }
.order-preview { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f2f6; font-size: 0.88rem; }
.order-preview:last-child { border-bottom: none; }
.o-num { background: var(--primary-color); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
.o-dest { flex: 1; font-weight: 600; }
.o-km { color: #636e72; font-size: 0.82rem; }
.o-pay { font-weight: 800; color: #00b894; }
.o-tip { font-size: 0.8rem; color: #fdcb6e; font-weight: 700; }

/* ── SELECT ────────────────────────────────────────────────────────────── */
.sel-hint { color: #636e72; font-size: 0.88rem; margin-bottom: 1rem; text-align: center; }
.orders-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.85rem; margin-bottom: 1rem; }

.order-card { background: white; border: 2px solid #e2e8f0; border-radius: var(--border-radius-md); padding: 1rem; cursor: pointer; transition: all 0.18s; position: relative; }
.order-card:hover:not(.disabled) { border-color: var(--primary-color); transform: translateY(-2px); }
.order-card.selected { border-color: var(--primary-color); background: #eef0ff; }
.order-card.disabled { opacity: 0.45; cursor: not-allowed; }
.order-card.net-loss { border-left: 3px solid #e17055; }
.order-card.net-loss.selected { border-color: #d63031; background: #fff5f5; }

.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
.oc-id { background: var(--primary-color); color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
.oc-check { color: #00b894; font-size: 1.2rem; font-weight: 800; }
.trap-tag { font-size: 0.75rem; }

.oc-dest { font-weight: 700; font-size: 0.9rem; margin-bottom: 0.4rem; }
.oc-condition { background: #fff3cd; color: #92400e; font-size: 0.78rem; padding: 0.4rem 0.6rem; border-radius: 8px; margin-bottom: 0.5rem; line-height: 1.4; }
.oc-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; font-size: 0.82rem; margin-bottom: 0.4rem; }
.tip-tag { color: #fdcb6e; font-weight: 800; }

.oc-calc { border-top: 1px solid #e2e8f0; padding-top: 0.5rem; margin-top: 0.4rem; }
.calc-row { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.2rem; }
.net-calc { font-size: 0.88rem; margin-top: 0.25rem; padding-top: 0.25rem; border-top: 1px dashed #e2e8f0; }

.projection-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.88rem; font-weight: 700; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }

/* ── DELIVERY ──────────────────────────────────────────────────────────── */
.delivery-result { background: white; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; box-shadow: var(--shadow-sm); }
.del-ok   { border-left: 4px solid #00b894; }
.del-issue{ border-left: 4px solid #d63031; }

.dr-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; font-weight: 700; font-size: 0.92rem; }
.dr-id { background: var(--primary-color); color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; }
.dr-dest { flex: 1; }
.ok-tag  { color: #00b894; font-size: 1rem; }
.fail-tag{ color: #d63031; font-size: 1rem; }

.condition-fail { color: #e17055; font-size: 0.82rem; font-weight: 700; margin: 0 0 0.5rem; background: #fff5f5; padding: 0.4rem 0.6rem; border-radius: 8px; }

.dr-breakdown { background: #f8fafc; border-radius: 8px; padding: 0.6rem 0.75rem; }
.db-row { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 0.2rem 0; }
.net-row-order { margin-top: 0.3rem; padding-top: 0.3rem; border-top: 1px dashed #e2e8f0; font-size: 0.9rem; }

.summary-box { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); margin: 1rem 0; }
.sum-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-bottom: 1px solid #f1f2f6; font-size: 0.92rem; }
.sum-row:last-child { border-bottom: none; }
.net-row { background: #f8f9fa; padding: 1rem 1.25rem; }
.net-final { font-family: 'Fredoka', sans-serif; font-size: 1.4rem; }

.insight { background: #eef0ff; color: #3730a3; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }

.pos { color: #00b894; font-weight: 800; }
.neg { color: #d63031; font-weight: 800; }
.proj-net { }

/* ── REWARD ────────────────────────────────────────────────────────────── */
.reward-box { text-align: center; border-radius: var(--border-radius-md); padding: 1.1rem 1rem; margin-bottom: 1rem; }
.reward-box.great   { background: linear-gradient(135deg, #fdcb6e, #ffeaa7); }
.reward-box.ok      { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
.reward-box.penalty { background: linear-gradient(135deg, #fee2e2, #ffb8b8); }
.reward-tier-icon { font-size: 2rem; margin-bottom: 0.3rem; }
.reward-box p { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.coins-neg { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #c0392b; }
.tier-reason { font-size: 0.82rem; font-weight: 600; color: #555; margin-top: 0.4rem !important; font-style: italic; }

.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
