<template>
  <Teleport to="body">
    <div v-if="visible" class="eod-overlay" @click.self="cancel">
      <div class="eod-modal">

        <!-- PHASE 1: Expense Breakdown -->
        <div v-if="eodPhase === 'expenses'" class="eod-phase">
          <div class="eod-header">
            <span class="moon-icon">🌙</span>
            <h2>End of Day</h2>
            <p>Daily expenses breakdown — <em>read carefully</em></p>
          </div>

          <div class="expenses-list">
            <div v-for="exp in EXPENSES" :key="exp.id" class="exp-row">
              <span class="exp-icon">{{ exp.icon }}</span>
              <div class="exp-detail">
                <span class="exp-name-en">{{ exp.nameEN }}</span>
                <span class="exp-name-es">{{ exp.nameES }}</span>
              </div>
              <span class="exp-amount">−${{ exp.amount }}</span>
            </div>
            <div class="exp-total-row">
              <span>Total daily expenses</span>
              <span class="total-amount">−${{ TOTAL_FIXED }}</span>
            </div>
          </div>

          <button class="btn-continue" @click="eodPhase = 'roulette'">
            Roll the day's events 🎲
          </button>
        </div>

        <!-- PHASE 2: Roulette / RNG Event -->
        <div v-else-if="eodPhase === 'roulette'" class="eod-phase">
          <div class="roulette-section">
            <div class="roulette-wheel" :class="{ spinning: isSpinning }">
              <span>{{ isSpinning ? '🎲' : (rolledEvent ? rolledEvent.icon : '❓') }}</span>
            </div>
            <p v-if="isSpinning" class="spin-label">Rolling today's random event...</p>
          </div>

          <div v-if="!isSpinning && rolledEvent" class="event-reveal" :class="'event-' + rolledEvent.type">
            <div class="event-header">
              <span class="event-big-icon">{{ rolledEvent.icon }}</span>
              <div>
                <p class="event-label">Today's Event</p>
                <h3 class="event-title-en">{{ rolledEvent.titleEN }}</h3>
              </div>
            </div>
            <p class="event-desc-en">{{ rolledEvent.descEN }}</p>

            <!-- Comprehension quiz -->
            <div v-if="!comprehensionAnswered" class="comp-quiz">
              <p class="comp-question">❓ <strong>What happened today?</strong></p>
              <div class="comp-options">
                <button
                  v-for="(opt, i) in comprehensionOptions"
                  :key="i"
                  class="comp-opt"
                  @click="answerComprehension(i)"
                >{{ opt }}</button>
              </div>
            </div>

            <div v-else class="comp-result" :class="comprehensionCorrect ? 'comp-ok' : 'comp-miss'">
              {{ comprehensionCorrect
                ? `✅ Correct! You understood the situation — discount: 25% off`
                : `❌ Incorrect. Read more carefully next time.` }}
              <strong class="event-impact">
                Impact: {{ rolledEvent.amount > 0 ? '+' : '' }}${{ finalEventAmount }}
              </strong>
            </div>
          </div>

          <button
            v-if="!isSpinning && rolledEvent && comprehensionAnswered"
            class="btn-continue confirm-btn"
            @click="confirmDay"
          >
            Confirm & End Day ✓
          </button>
        </div>

        <!-- PHASE 3: Day Summary -->
        <div v-else-if="eodPhase === 'summary'" class="eod-phase">
          <h2>📊 Day {{ dayNumber }} Summary</h2>

          <div class="summary-grid">
            <div class="sum-card" :class="summaryData.inDebt ? 'sum-debt' : 'sum-ok'">
              <span>{{ summaryData.inDebt ? '🔴' : '🟢' }}</span>
              <div>
                <p class="sc-label">Status</p>
                <p class="sc-val">{{ summaryData.inDebt ? 'In Debt' : 'Debt Free' }}</p>
              </div>
            </div>
            <div class="sum-card">
              <span>💰</span>
              <div>
                <p class="sc-label">Available</p>
                <p class="sc-val">${{ summaryData.dineroDisponible }}</p>
              </div>
            </div>
            <div class="sum-card">
              <span>⚡</span>
              <div>
                <p class="sc-label">Tomorrow's energy</p>
                <p class="sc-val">{{ summaryData.energiaMaxima }}</p>
              </div>
            </div>
          </div>

          <div v-if="summaryData.inDebt" class="debt-warning">
            ⚠️ <strong>You're in debt!</strong> Tomorrow you'll have reduced energy (max {{ summaryData.energiaMaxima }}).
            Earn more to pay it off.
          </div>
          <div v-else class="success-note">
            ✅ Good job! You made it through Day {{ dayNumber }}.
          </div>

          <button class="btn-continue" @click="close">Start Day {{ dayNumber + 1 }} →</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../store/player'

const emit = defineEmits(['close', 'cancel'])

const player  = usePlayerStore()
const visible = ref(false)
const eodPhase = ref('expenses')
const isSpinning = ref(false)
const rolledEvent = ref(null)
const comprehensionAnswered = ref(false)
const comprehensionCorrect  = ref(false)
const finalEventAmount      = ref(0)

// ── EXPENSE TABLE ─────────────────────────────────────────────────────────

const EXPENSES = [
  { id: 'rent',      icon: '🏠', nameEN: 'Housing — daily rent installment',    nameES: 'Arriendo diario',    amount: 8 },
  { id: 'food',      icon: '🛒', nameEN: 'Food & Groceries',                    nameES: 'Alimentos',          amount: 5 },
  { id: 'transport', icon: '🚌', nameEN: 'Transportation — public transit pass', nameES: 'Transporte',         amount: 4 },
  { id: 'utilities', icon: '💡', nameEN: 'Utilities — electricity & water',      nameES: 'Servicios básicos',  amount: 3 },
]
const TOTAL_FIXED = EXPENSES.reduce((s, e) => s + e.amount, 0)

// ── RNG EVENT POOL ────────────────────────────────────────────────────────

const eventPool = [
  // Negative
  { type: 'negative', icon: '🏥', titleEN: 'Medical Appointment',  descEN: 'An unexpected doctor visit was required. Health always comes first, but it comes at a cost.', amount: -35, prob: 0.12, correctAnswer: 'You had a medical expense', wrongAnswers: ['You won a health contest', 'Your insurance paid fully'] },
  { type: 'negative', icon: '🔧', titleEN: 'Equipment Failure',    descEN: 'Your bicycle requires urgent repair before tomorrow\'s deliveries. The mechanic charges for parts and labor.', amount: -28, prob: 0.08, correctAnswer: 'Your bicycle broke down', wrongAnswers: ['You bought a new bicycle', 'Someone stole your bike'] },
  { type: 'negative', icon: '📈', titleEN: 'Price Surge',          descEN: 'Market prices for basic goods surged today due to supply chain disruptions. Extra food expenses incurred.', amount: -12, prob: 0.10, correctAnswer: 'Food prices increased unexpectedly', wrongAnswers: ['You found a discount coupon', 'You donated food to charity'] },
  { type: 'negative', icon: '👛', titleEN: 'Lost Wallet',          descEN: 'You misplaced your wallet on public transit. Some cash is gone — consider keeping less on you.', amount: -18, prob: 0.04, correctAnswer: 'You lost some cash', wrongAnswers: ['Someone returned your wallet with extra cash', 'Your bank increased your credit limit'] },
  { type: 'negative', icon: '🎫', titleEN: 'Parking Fine',        descEN: 'A parking violation ticket was issued to your account. Pay within 5 business days to avoid surcharges.', amount: -22, prob: 0.06, correctAnswer: 'You received a fine', wrongAnswers: ['You won a parking lottery', 'The city refunded old fines'] },
  { type: 'negative', icon: '📋', titleEN: 'Tax Adjustment',       descEN: 'The government issued an annual tax underpayment notice. A small amount is due immediately.', amount: -40, prob: 0.03, correctAnswer: 'You owe extra taxes', wrongAnswers: ['You received a tax refund', 'Your taxes were cancelled'] },
  // Positive
  { type: 'positive', icon: '💵', titleEN: 'Lucky Find',           descEN: 'You found cash on the ground near the market. It\'s your lucky day — small wins matter!', amount: +10, prob: 0.07, correctAnswer: 'You found money unexpectedly', wrongAnswers: ['You earned overtime pay', 'You won the lottery'] },
  { type: 'positive', icon: '⏰', titleEN: 'Overtime Pay',         descEN: 'You completed an extra shift at work. The overtime wages have been credited to your account.', amount: +20, prob: 0.08, correctAnswer: 'You earned extra from working more', wrongAnswers: ['Your salary was cut', 'You received a government bonus'] },
  { type: 'positive', icon: '🏅', titleEN: 'Performance Bonus',   descEN: 'Your employer recognized your monthly performance. A one-time bonus has been credited.', amount: +30, prob: 0.05, correctAnswer: 'You received a work bonus', wrongAnswers: ['You received a penalty at work', 'Your boss forgot to pay you'] },
  { type: 'positive', icon: '📩', titleEN: 'Tax Rebate',           descEN: 'The government issued a tax overpayment refund. Your account has been credited accordingly.', amount: +25, prob: 0.03, correctAnswer: 'The government refunded overpaid taxes', wrongAnswers: ['You paid extra taxes by mistake', 'You donated to a government fund'] },
  { type: 'positive', icon: '🎓', titleEN: 'Academic Scholarship', descEN: 'You were awarded an academic merit scholarship. The grant has been deposited into your account.', amount: +50, prob: 0.02, correctAnswer: 'You won a scholarship', wrongAnswers: ['You paid tuition fees', 'A scholarship was cancelled'] },
  // Neutral
  { type: 'neutral', icon: '📅', titleEN: 'Ordinary Day',          descEN: 'No unexpected events today. Sometimes the most valuable thing is stability.', amount: 0, prob: 0.32, correctAnswer: 'Nothing unusual happened', wrongAnswers: ['You had a major windfall', 'You suffered a big loss'] },
]

const rollEvent = () => {
  const rand = Math.random()
  let cumulative = 0
  for (const ev of eventPool) {
    cumulative += ev.prob
    if (rand <= cumulative) return ev
  }
  return eventPool[eventPool.length - 1]
}

// ── COMPREHENSION ─────────────────────────────────────────────────────────

const comprehensionOptions = computed(() => {
  if (!rolledEvent.value) return []
  const correct = rolledEvent.value.correctAnswer
  const wrong   = rolledEvent.value.wrongAnswers
  return [correct, ...wrong].sort(() => 0.5 - Math.random())
})

const answerComprehension = (i) => {
  comprehensionCorrect.value  = comprehensionOptions.value[i] === rolledEvent.value.correctAnswer
  comprehensionAnswered.value = true
  const discount = comprehensionCorrect.value && rolledEvent.value.amount < 0 ? 0.75 : 1
  finalEventAmount.value = Math.round(rolledEvent.value.amount * discount)
}

// ── CONFIRM DAY ───────────────────────────────────────────────────────────

const dayNumber  = computed(() => player.diaActual)
const summaryData = ref({})

const confirmDay = () => {
  // Apply RNG event
  if (finalEventAmount.value > 0) {
    player.ganarDinero(finalEventAmount.value)
  } else if (finalEventAmount.value < 0) {
    const loss = Math.abs(finalEventAmount.value)
    if (player.dineroDisponible >= loss) {
      player.dineroDisponible -= loss
    } else {
      const faltante = loss - player.dineroDisponible
      player.dineroDisponible = 0
      if (player.dineroAhorrado >= faltante) player.dineroAhorrado -= faltante
      else { player.deuda += faltante - player.dineroAhorrado; player.dineroAhorrado = 0 }
    }
    player.save()
  }

  // Run the day end
  player.terminarDia()

  summaryData.value = {
    inDebt:           player.enDeuda,
    dineroDisponible: player.dineroDisponible,
    energiaMaxima:    player.energiaMaxima,
  }

  eodPhase.value = 'summary'
}

const cancel = () => { emit('cancel') }
const close  = () => { visible.value = false; eodPhase.value = 'expenses'; emit('close') }

// ── PUBLIC API ────────────────────────────────────────────────────────────

const open = () => {
  eodPhase.value         = 'expenses'
  rolledEvent.value      = null
  comprehensionAnswered.value = false
  comprehensionCorrect.value  = false
  finalEventAmount.value = 0
  visible.value = true
  // Auto-spin after showing expenses (small delay for UX)
}

const spin = () => {
  if (eodPhase.value !== 'roulette') return
  isSpinning.value = true
  setTimeout(() => {
    rolledEvent.value  = rollEvent()
    isSpinning.value  = false
  }, 1800)
}

// Auto-spin when entering roulette phase
import { watch } from 'vue'
watch(eodPhase, (v) => { if (v === 'roulette') spin() })

defineExpose({ open, close })
</script>

<style scoped>
.eod-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; backdrop-filter: blur(6px);
  padding: 1rem;
}

.eod-modal {
  background: white;
  border-radius: var(--border-radius-lg);
  width: min(100%, 500px);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
  animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
}

@keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.eod-phase { padding: 2rem; }

/* Header */
.eod-header { text-align: center; margin-bottom: 1.5rem; }
.moon-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
.eod-header h2 { color: var(--primary-color); margin: 0.3rem 0 0.4rem; }
.eod-header p { color: #636e72; font-size: 0.9rem; margin: 0; }

/* Expenses */
.expenses-list { background: #f8fafc; border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1.5rem; }
.exp-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid #e2e8f0; }
.exp-row:last-child { border-bottom: none; }
.exp-icon { font-size: 1.4rem; }
.exp-detail { flex: 1; display: flex; flex-direction: column; }
.exp-name-en { font-size: 0.88rem; font-weight: 700; color: var(--text-dark); }
.exp-name-es { font-size: 0.75rem; color: #636e72; }
.exp-amount { font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 700; color: #d63031; }
.exp-total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; font-weight: 800; font-size: 0.95rem; }
.total-amount { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; color: #d63031; }

/* Roulette */
.roulette-section { text-align: center; margin-bottom: 1.5rem; }
.roulette-wheel {
  width: 100px; height: 100px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), #a29bfe, #00b894);
  margin: 0 auto 0.75rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 8px 20px rgba(91,95,251,0.3);
}
.spinning { animation: spin 0.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin-label { color: #636e72; font-style: italic; }

/* Event */
.event-reveal { border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
.event-positive { background: #d1fae5; }
.event-negative { background: #fee2e2; }
.event-neutral  { background: #f1f2f6; }
.event-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.event-big-icon { font-size: 2.5rem; }
.event-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; opacity: 0.7; margin: 0; }
.event-title-en { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; margin: 0; }
.event-desc-en { font-size: 0.88rem; line-height: 1.6; margin-bottom: 1rem; opacity: 0.85; }

/* Comprehension */
.comp-quiz { background: rgba(255,255,255,0.7); border-radius: 12px; padding: 1rem; }
.comp-question { font-weight: 800; margin: 0 0 0.75rem; }
.comp-options { display: flex; flex-direction: column; gap: 0.5rem; }
.comp-opt { background: white; border: 2px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 1rem; text-align: left; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.18s; }
.comp-opt:hover { border-color: var(--primary-color); background: #eef0ff; }
.comp-result { background: rgba(255,255,255,0.8); border-radius: 12px; padding: 1rem; font-size: 0.88rem; font-weight: 700; line-height: 1.5; }
.comp-ok   { color: #065f46; }
.comp-miss { color: #991b1b; }
.event-impact { display: block; font-family: 'Fredoka', sans-serif; font-size: 1.4rem; margin-top: 0.4rem; color: var(--text-dark); }

/* Summary */
.summary-grid { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
.sum-card { flex: 1; background: #f8fafc; border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; }
.sum-card span { font-size: 1.8rem; }
.sc-label { font-size: 0.72rem; font-weight: 800; color: #636e72; text-transform: uppercase; margin: 0; }
.sc-val { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; margin: 0.2rem 0 0; }
.sum-debt  { background: #fee2e2; }
.sum-ok    { background: #d1fae5; }
.debt-warning { background: #fee2e2; color: #991b1b; border-radius: 12px; padding: 1rem; font-size: 0.88rem; margin-bottom: 1rem; line-height: 1.5; }
.success-note { background: #d1fae5; color: #065f46; border-radius: 12px; padding: 1rem; font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; }

/* Buttons */
.btn-continue {
  display: block; width: 100%;
  background: linear-gradient(135deg, var(--primary-color), #a29bfe);
  color: white; border: none; padding: 0.9rem;
  border-radius: 50px; font-family: 'Fredoka', sans-serif;
  font-size: 1.1rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.btn-continue:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
.confirm-btn { background: linear-gradient(135deg, #00b894, #55efc4); }
</style>
