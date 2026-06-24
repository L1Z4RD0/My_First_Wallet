<template>
  <Teleport to="body">
    <div v-if="visible" class="eod-overlay" @click.self="cancel">
      <div class="eod-modal">

        <!-- PHASE 1: Expense Breakdown (ESPAÑOL) -->
        <div v-if="eodPhase === 'expenses'" class="eod-phase">
          <div class="eod-header">
            <span class="moon-icon">🌙</span>
            <h2>Fin del Día</h2>
            <p>Gastos fijos del día — estos se descuentan automáticamente</p>
          </div>

          <div class="expenses-list">
            <div v-for="exp in EXPENSES" :key="exp.id" class="exp-row">
              <span class="exp-icon">{{ exp.icon }}</span>
              <div class="exp-detail">
                <span class="exp-name-en">{{ exp.nameES }}</span>
              </div>
              <span class="exp-amount">−🪙 {{ exp.amount }}</span>
            </div>
            <div class="exp-total-row">
              <span>Total gastos fijos</span>
              <span class="total-amount">−🪙 {{ TOTAL_FIXED }}</span>
            </div>
          </div>

          <button class="btn-continue" @click="eodPhase = 'roulette'">
            Ver eventos del día 🎲
          </button>
        </div>

        <!-- PHASE 2: Roulette / RNG Event -->
        <div v-else-if="eodPhase === 'roulette'" class="eod-phase">
          <div class="roulette-section">
            <div class="roulette-wheel" :class="{ spinning: isSpinning }">
              <span>{{ isSpinning ? '🎲' : (rolledEvent ? rolledEvent.icon : '❓') }}</span>
            </div>
            <p v-if="isSpinning" class="spin-label">Sorteando el evento del día...</p>
          </div>

          <div v-if="!isSpinning && rolledEvent" class="event-reveal" :class="'event-' + rolledEvent.type">
            <div class="event-header">
              <span class="event-big-icon">{{ rolledEvent.icon }}</span>
              <div>
                <p class="event-label">Evento del Día</p>
                <h3 class="event-title-en">{{ rolledEvent.titleES }}</h3>
              </div>
            </div>
            <p class="event-desc-en">{{ rolledEvent.descES }}</p>

            <!-- Comprehension quiz -->
            <div v-if="!comprehensionAnswered" class="comp-quiz">
              <p class="comp-question">❓ <strong>¿Qué pasó hoy?</strong></p>
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
                ? `✅ ¡Correcto! Entendiste la situación — descuento del 25% en gastos`
                : `❌ Incorrecto. Lee el evento con más atención la próxima vez.` }}
              <strong class="event-impact">
                Impacto: {{ rolledEvent.amount > 0 ? '+' : '' }}🪙 {{ finalEventAmount }}
              </strong>
            </div>
          </div>

          <button
            v-if="!isSpinning && rolledEvent && comprehensionAnswered"
            class="btn-continue confirm-btn"
            @click="confirmDay"
          >
            Confirmar y Terminar Día ✓
          </button>
        </div>

        <!-- PHASE 3: Day Summary (ESPAÑOL) -->
        <div v-else-if="eodPhase === 'summary'" class="eod-phase">
          <h2>📊 Resumen del Día {{ summaryData.diaCompletado }}</h2>

          <!-- Desglose de lo que afectó el saldo -->
          <div class="breakdown-box">
            <div class="bk-row">
              <span>🏠 Gastos fijos del día</span>
              <span class="bk-neg">−🪙 {{ summaryData.gastosF }}</span>
            </div>
            <div class="bk-row" v-if="summaryData.eventoAmount !== 0">
              <span>
                {{ summaryData.eventoIcon }}
                {{ summaryData.eventoLabelES }}
                <small class="bk-en-hint">({{ summaryData.eventoTitleES }})</small>
              </span>
              <span :class="summaryData.eventoAmount > 0 ? 'bk-pos' : 'bk-neg'">
                {{ summaryData.eventoAmount > 0 ? '+' : '' }}🪙 {{ summaryData.eventoAmount }}
              </span>
            </div>
            <div class="bk-row" v-else>
              <span>📅 Sin eventos inesperados</span>
              <span class="bk-neutral">$0</span>
            </div>
            <div class="bk-total">
              <span>Cambio neto del día</span>
              <span :class="summaryData.cambioNeto <= 0 ? 'bk-neg' : 'bk-pos'">
                {{ summaryData.cambioNeto > 0 ? '+' : '' }}🪙 {{ summaryData.cambioNeto }}
              </span>
            </div>
          </div>

          <div class="summary-grid">
            <div class="sum-card" :class="summaryData.inDebt ? 'sum-debt' : 'sum-ok'">
              <span>{{ summaryData.inDebt ? '🔴' : '🟢' }}</span>
              <div>
                <p class="sc-label">Estado</p>
                <p class="sc-val">{{ summaryData.inDebt ? 'En Deuda' : 'Sin Deuda' }}</p>
              </div>
            </div>
            <div class="sum-card">
              <span>💰</span>
              <div>
                <p class="sc-label">Disponible</p>
                <p class="sc-val">🪙 {{ summaryData.dineroDisponible }}</p>
              </div>
            </div>
            <div class="sum-card">
              <span>⚡</span>
              <div>
                <p class="sc-label">Energía mañana</p>
                <p class="sc-val">{{ summaryData.energiaMaxima }}</p>
              </div>
            </div>
          </div>

          <div v-if="summaryData.inDebt" class="debt-warning">
            ⚠️ <strong>¡Tienes deuda!</strong> Mañana tendrás menos energía (máx {{ summaryData.energiaMaxima }}).
            Juega para ganar dinero y saldar la deuda.
          </div>
          <div v-else class="success-note">
            ✅ ¡Bien hecho! Superaste el día {{ summaryData.diaCompletado }} sin deuda.
          </div>

          <button class="btn-continue" @click="close">Comenzar Día {{ summaryData.diaCompletado + 1 }} →</button>
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
  { id: 'rent',      icon: '🏠', nameEN: 'Housing — daily rent installment',    nameES: 'Arriendo diario',    amount: 20 },
  { id: 'food',      icon: '🛒', nameEN: 'Food & Groceries',                    nameES: 'Alimentos',          amount: 15 },
  { id: 'transport', icon: '🚌', nameEN: 'Transportation — public transit pass', nameES: 'Transporte',         amount: 10 },
  { id: 'utilities', icon: '💡', nameEN: 'Utilities — electricity & water',      nameES: 'Servicios básicos',  amount: 5  },
]
const TOTAL_FIXED = EXPENSES.reduce((s, e) => s + e.amount, 0)

// ── RNG EVENT POOL ────────────────────────────────────────────────────────

const eventPool = [
  // Negativo
  { type: 'negative', icon: '🏥',
    titleEN: 'Medical Appointment',  titleES: 'Consulta Médica',
    descEN:  'An unexpected doctor visit was required. Health always comes first, but it comes at a cost.',
    descES:  'Se requirió una visita inesperada al médico. La salud es primero, pero tiene un costo.',
    amount: -35, prob: 0.12,
    correctAnswerES: 'Tuviste un gasto médico inesperado',
    wrongAnswersES:  ['Ganaste un concurso de salud', 'Tu seguro cubrió todo el costo'] },
  { type: 'negative', icon: '🔧',
    titleEN: 'Equipment Failure',    titleES: 'Falla de Equipo',
    descEN:  'Your bicycle requires urgent repair before tomorrow\'s deliveries. The mechanic charges for parts and labor.',
    descES:  'Tu bicicleta necesita reparación urgente antes de las entregas de mañana. El mecánico cobra por piezas y mano de obra.',
    amount: -28, prob: 0.08,
    correctAnswerES: 'Tu bicicleta se averió y requirió reparación',
    wrongAnswersES:  ['Compraste una bicicleta nueva', 'Alguien robó tu bicicleta'] },
  { type: 'negative', icon: '📈',
    titleEN: 'Price Surge',          titleES: 'Alza de Precios',
    descEN:  'Market prices for basic goods surged today due to supply chain disruptions. Extra food expenses incurred.',
    descES:  'Los precios de artículos básicos subieron hoy por problemas en la cadena de suministro. Se generaron gastos extra en alimentación.',
    amount: -12, prob: 0.10,
    correctAnswerES: 'Los precios de alimentos subieron inesperadamente',
    wrongAnswersES:  ['Encontraste un cupón de descuento', 'Donaste alimentos a una organización benéfica'] },
  { type: 'negative', icon: '👛',
    titleEN: 'Lost Wallet',          titleES: 'Billetera Perdida',
    descEN:  'You misplaced your wallet on public transit. Some cash is gone — consider keeping less on you.',
    descES:  'Perdiste tu billetera en el transporte público. Algo de efectivo se fue — considera llevar menos dinero encima.',
    amount: -18, prob: 0.04,
    correctAnswerES: 'Perdiste algo de efectivo',
    wrongAnswersES:  ['Alguien devolvió tu billetera con dinero extra', 'Tu banco aumentó tu línea de crédito'] },
  { type: 'negative', icon: '🎫',
    titleEN: 'Parking Fine',         titleES: 'Multa de Tránsito',
    descEN:  'A parking violation ticket was issued to your account. Pay within 5 business days to avoid surcharges.',
    descES:  'Te emitieron una multa por infracción de estacionamiento. Paga dentro de 5 días hábiles para evitar recargos.',
    amount: -22, prob: 0.06,
    correctAnswerES: 'Recibiste una multa por infracción',
    wrongAnswersES:  ['Ganaste un sorteo municipal de estacionamiento', 'La municipalidad devolvió multas antiguas'] },
  { type: 'negative', icon: '📋',
    titleEN: 'Tax Adjustment',       titleES: 'Ajuste Tributario',
    descEN:  'The government issued an annual tax underpayment notice. A small amount is due immediately.',
    descES:  'El Servicio de Impuestos Internos emitió un aviso de pago insuficiente de impuestos. Se debe pagar un monto de inmediato.',
    amount: -40, prob: 0.03,
    correctAnswerES: 'Debes pagar impuestos adicionales al SII',
    wrongAnswersES:  ['Recibiste una devolución de impuestos', 'El gobierno canceló todos tus impuestos'] },
  // Positivo
  { type: 'positive', icon: '💵',
    titleEN: 'Lucky Find',           titleES: 'Hallazgo Afortunado',
    descEN:  'You found cash on the ground near the market. It\'s your lucky day — small wins matter!',
    descES:  '¡Encontraste dinero en el suelo cerca del mercado! Es tu día de suerte — los pequeños hallazgos cuentan.',
    amount: +10, prob: 0.07,
    correctAnswerES: 'Encontraste dinero de manera inesperada',
    wrongAnswersES:  ['Ganaste pago por horas extra en el trabajo', 'Ganaste la lotería nacional'] },
  { type: 'positive', icon: '⏰',
    titleEN: 'Overtime Pay',         titleES: 'Horas Extra Pagadas',
    descEN:  'You completed an extra shift at work. The overtime wages have been credited to your account.',
    descES:  'Completaste un turno adicional en el trabajo. Las horas extra fueron acreditadas a tu cuenta.',
    amount: +20, prob: 0.08,
    correctAnswerES: 'Ganaste dinero extra por trabajar horas adicionales',
    wrongAnswersES:  ['Tu sueldo fue reducido este mes', 'Recibiste un bono del gobierno'] },
  { type: 'positive', icon: '🏅',
    titleEN: 'Performance Bonus',    titleES: 'Bono por Desempeño',
    descEN:  'Your employer recognized your monthly performance. A one-time bonus has been credited.',
    descES:  'Tu empleador reconoció tu desempeño mensual. Se acreditó un bono único a tu cuenta.',
    amount: +30, prob: 0.05,
    correctAnswerES: 'Tu empleador te pagó un bono por buen desempeño',
    wrongAnswersES:  ['Recibiste una sanción económica en el trabajo', 'Tu empleador olvidó pagarte este mes'] },
  { type: 'positive', icon: '📩',
    titleEN: 'Tax Rebate',           titleES: 'Devolución de Impuestos',
    descEN:  'The government issued a tax overpayment refund. Your account has been credited accordingly.',
    descES:  'El SII emitió un reembolso por pago en exceso de impuestos. Tu cuenta fue acreditada con el monto correspondiente.',
    amount: +25, prob: 0.03,
    correctAnswerES: 'El gobierno te devolvió impuestos pagados de más',
    wrongAnswersES:  ['Pagaste impuestos adicionales por error propio', 'Donaste dinero a un fondo del gobierno'] },
  { type: 'positive', icon: '🎓',
    titleEN: 'Academic Scholarship', titleES: 'Beca Académica',
    descEN:  'You were awarded an academic merit scholarship. The grant has been deposited into your account.',
    descES:  '¡Fuiste premiado con una beca de mérito académico! El monto fue depositado directamente en tu cuenta.',
    amount: +50, prob: 0.02,
    correctAnswerES: 'Ganaste una beca por tu rendimiento académico',
    wrongAnswersES:  ['Pagaste aranceles universitarios este mes', 'Una beca que tenías fue cancelada'] },
  // Neutro
  { type: 'neutral', icon: '📅',
    titleEN: 'Ordinary Day',         titleES: 'Día Sin Novedades',
    descEN:  'No unexpected events today. Sometimes the most valuable thing is stability.',
    descES:  'Sin eventos inesperados hoy. A veces lo más valioso es la estabilidad y la constancia.',
    amount: 0, prob: 0.32,
    correctAnswerES: 'No ocurrió nada inusual hoy',
    wrongAnswersES:  ['Recibiste una ganancia enorme inesperada', 'Sufriste una pérdida económica importante'] },
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
  const correct = rolledEvent.value.correctAnswerES
  const wrong   = rolledEvent.value.wrongAnswersES
  return [correct, ...wrong].sort(() => 0.5 - Math.random())
})

const answerComprehension = (i) => {
  comprehensionCorrect.value  = comprehensionOptions.value[i] === rolledEvent.value.correctAnswerES
  comprehensionAnswered.value = true
  const discount = comprehensionCorrect.value && rolledEvent.value.amount < 0 ? 0.75 : 1
  finalEventAmount.value = Math.round(rolledEvent.value.amount * discount)
}

// ── CONFIRM DAY ───────────────────────────────────────────────────────────

const dayNumber   = computed(() => player.diaActual)
const summaryData = ref({})

const eventLabelES = computed(() => {
  if (!rolledEvent.value) return 'Sin eventos'
  const map = { negative: 'Gasto inesperado', positive: 'Ingreso extra', neutral: 'Sin eventos' }
  return map[rolledEvent.value.type] ?? 'Evento del día'
})

const confirmDay = () => {
  const diaCompletado = player.diaActual
  const dineroAntes   = player.dineroDisponible

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

  // Run the day end (applies TOTAL_FIXED costs internally)
  player.terminarDia()

  summaryData.value = {
    diaCompletado,
    inDebt:          player.enDeuda,
    dineroDisponible: player.dineroDisponible,
    energiaMaxima:   player.energiaMaxima,
    gastosF:         TOTAL_FIXED,
    eventoAmount:    finalEventAmount.value,
    eventoIcon:      rolledEvent.value?.icon ?? '📅',
    eventoTitleES:   rolledEvent.value?.titleES ?? '',
    eventoLabelES:   eventLabelES.value,
    cambioNeto:      -(TOTAL_FIXED) + (finalEventAmount.value ?? 0),
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

/* Breakdown */
.breakdown-box { background: #f8fafc; border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1.25rem; }
.bk-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; gap: 0.5rem; }
.bk-row:last-child { border-bottom: none; }
.bk-total { display: flex; justify-content: space-between; align-items: center; padding-top: 0.6rem; font-weight: 800; font-size: 0.95rem; }
.bk-pos { color: #00b894; font-weight: 800; }
.bk-neg { color: #d63031; font-weight: 800; }
.bk-neutral { color: #636e72; font-weight: 700; }
.bk-en-hint { font-size: 0.75rem; color: #636e72; font-style: italic; }

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
