<template>
  <div class="quiz-container">

    <!-- ══ START ═══════════════════════════════════════════════════════════ -->
    <div v-if="state === 'start'" class="phase">
      <div class="phase-icon">{{ isEN ? '📝' : '💡' }}</div>
      <h2>{{ isEN ? 'Mind Challenge' : 'Desafío Mental' }}</h2>

      <div class="rules-box">
        <p v-if="!isEN">Elige tu apuesta <strong>antes</strong> de ver la pregunta. Más riesgo = mayor recompensa.</p>
        <p v-else>Choose your stake <strong>before</strong> seeing the question. Higher risk = higher reward.</p>
        <div class="rules-grid">
          <div class="rule-item">⚡ {{ questionCount }} {{ isEN ? 'questions' : 'preguntas' }}</div>
          <div class="rule-item">💰 {{ isEN ? 'Stake before question' : 'Apuesta antes de ver' }}</div>
          <div class="rule-item">🔥 {{ isEN ? '3-streak = ×1.5 bonus' : 'Racha 3 = ×1.5 bonus' }}</div>
          <div class="rule-item">🧮 {{ isEN ? 'Power-ups available' : 'Power-ups disponibles' }}</div>
        </div>
      </div>

      <div v-if="alreadyPlayed" class="played-msg">
        {{ isEN ? '⚠️ Already played today. Come back tomorrow!' : '⚠️ Ya jugaste hoy. ¡Vuelve mañana!' }}
      </div>
      <button v-else class="btn-primary" @click="startGame">
        {{ isEN ? '🎯 Start Quiz' : '🎯 Comenzar Quiz' }}
      </button>
    </div>

    <!-- ══ STAKE SELECTION ════════════════════════════════════════════════ -->
    <div v-else-if="state === 'stake'" class="phase">
      <div class="progress-bar"><div class="pb-fill" :style="{ width: progressPct + '%' }"></div></div>

      <div class="question-meta">
        <span>{{ isEN ? 'Question' : 'Pregunta' }} {{ qIdx + 1 }}/{{ questionCount }}</span>
        <span class="streak-badge" v-if="streak > 0">🔥 {{ streak }}</span>
        <span class="balance-badge">💰 ${{ currentBalance }}</span>
      </div>

      <div class="stake-header">
        <h3>{{ isEN ? 'Choose your stake' : 'Elige tu apuesta' }}</h3>
        <p class="cat-preview">
          {{ isEN ? 'Category:' : 'Categoría:' }}
          <strong>{{ isEN ? currentQ.categoryEN : currentQ.category }}</strong>
          · {{ isEN ? 'Difficulty:' : 'Dificultad:' }}
          <strong>{{ diffLabel }}</strong>
        </p>
      </div>

      <div class="stake-grid">
        <div
          v-for="opt in stakeOptions"
          :key="opt.value"
          class="stake-card"
          :class="{ selected: chosenStake === opt.value, disabled: opt.value > currentBalance }"
          @click="opt.value <= currentBalance && (chosenStake = opt.value)"
        >
          <span class="stake-icon">{{ opt.icon }}</span>
          <span class="stake-amt">${{ opt.value }}</span>
          <span class="stake-mult">×{{ (currentQ.multiplier * (streak >= 3 ? 1.5 : 1)).toFixed(1) }}</span>
          <span class="stake-win">Win: ${{ Math.round(opt.value * currentQ.multiplier * (streak >= 3 ? 1.5 : 1)) }}</span>
        </div>
      </div>

      <button class="btn-primary" :disabled="!chosenStake" @click="state = 'question'">
        {{ isEN ? 'Confirm stake →' : 'Confirmar apuesta →' }}
      </button>
    </div>

    <!-- ══ QUESTION ════════════════════════════════════════════════════════ -->
    <div v-else-if="state === 'question'" class="phase">
      <div class="progress-bar"><div class="pb-fill" :style="{ width: progressPct + '%' }"></div></div>

      <div class="question-meta">
        <span>{{ isEN ? 'Question' : 'Pregunta' }} {{ qIdx + 1 }}/{{ questionCount }}</span>
        <span class="streak-badge" v-if="streak >= 3">🔥 ×1.5 bonus activo</span>
        <span class="stake-indicator">🎰 ${{ chosenStake }}</span>
      </div>

      <div class="question-card" :key="currentQ.id">
        <span class="diff-badge" :class="'diff-' + currentQ.difficulty">{{ diffLabel }}</span>
        <h3>{{ isEN ? currentQ.questionEN : currentQ.question }}</h3>

        <div class="powerups-row" v-if="!answered">
          <button
            class="pu-btn"
            :disabled="usedFiftyFifty || currentBalance < 50"
            @click="useFiftyFifty"
            title="Elimina 2 opciones incorrectas ($50)"
          >50/50 💸$50</button>
          <button
            class="pu-btn"
            :disabled="usedHint || currentBalance < 40"
            @click="useHint"
            title="Pista ($40)"
          >💡 Hint $40</button>
        </div>

        <div v-if="hintText" class="hint-display">{{ hintText }}</div>

        <div class="options-col">
          <button
            v-for="(opt, i) in visibleOptions"
            :key="i"
            class="opt-btn"
            :class="{
              correct:  answered && opt.originalIndex === currentQ.correct,
              wrong:    answered && selectedOpt === opt.originalIndex && opt.originalIndex !== currentQ.correct,
              disabled: answered
            }"
            :disabled="answered"
            @click="answer(opt.originalIndex)"
          >
            <span class="opt-letter">{{ String.fromCharCode(65 + i) }}</span>
            {{ isEN ? opt.textEN : opt.text }}
          </button>
        </div>

        <div v-if="answered" class="feedback" :class="lastCorrect ? 'fb-correct' : 'fb-wrong'">
          <strong>{{ lastCorrect ? (isEN ? '✅ Correct!' : '✅ ¡Correcto!') : (isEN ? '❌ Wrong!' : '❌ Incorrecto') }}</strong>
          {{ lastCorrect
            ? (isEN ? `+$${earnedCoins}` : `+$${earnedCoins}`)
            : (isEN ? `-$${chosenStake}` : `-$${chosenStake}`) }}
          <span v-if="!answered && streak >= 3" class="streak-active">🔥 Streak ×1.5</span>
          <p v-if="!isEN && currentQ.explanation" class="explanation">{{ currentQ.explanation }}</p>
          <p v-if=" isEN && currentQ.explanationEN" class="explanation">{{ currentQ.explanationEN }}</p>
        </div>
      </div>

      <button v-if="answered" class="btn-primary" @click="nextQuestion">
        {{ qIdx < questionCount - 1 ? (isEN ? 'Next →' : 'Siguiente →') : (isEN ? 'See Results →' : 'Ver Resultados →') }}
      </button>
    </div>

    <!-- ══ RESULTS ═════════════════════════════════════════════════════════ -->
    <div v-else-if="state === 'results'" class="phase">
      <div class="result-header" :class="score.correct >= Math.ceil(questionCount * 0.6) ? 'win' : 'lose'">
        <span class="ri">{{ score.correct >= Math.ceil(questionCount * 0.6) ? '🏆' : '📉' }}</span>
        <h2>{{ isEN ? 'Quiz Complete!' : '¡Quiz Completado!' }}</h2>
        <p>{{ score.correct }}/{{ questionCount }} {{ isEN ? 'correct' : 'correctas' }}</p>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="sl">{{ isEN ? 'Correct' : 'Correctas' }}</span>
          <span class="sv green">{{ score.correct }}</span>
        </div>
        <div class="stat-card">
          <span class="sl">{{ isEN ? 'Wrong' : 'Incorrectas' }}</span>
          <span class="sv red">{{ score.wrong }}</span>
        </div>
        <div class="stat-card">
          <span class="sl">{{ isEN ? 'Best Streak' : 'Mayor Racha' }}</span>
          <span class="sv orange">{{ score.maxStreak }} 🔥</span>
        </div>
      </div>

      <div class="net-earnings">
        <p>{{ isEN ? 'Net earnings:' : 'Ganancias netas:' }}</p>
        <span class="net-val" :class="netEarnings >= 0 ? 'green' : 'red'">
          {{ netEarnings >= 0 ? '+' : '' }}${{ netEarnings }}
        </span>
      </div>

      <button class="btn-primary" @click="finish">
        {{ isEN ? 'Finish' : 'Terminar' }}
      </button>
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

const questionCount = computed(() => ({ 1: 3, 2: 4, 3: 5, 4: 5 }[variant.value] ?? 3))

const stakeOptions = [
  { value: 25,  icon: '🪙' },
  { value: 75,  icon: '💵' },
  { value: 150, icon: '💰' },
  { value: 300, icon: '💎' },
]

// ── QUESTION BANK ─────────────────────────────────────────────────────────

const questions = [
  // EASY – Math
  {
    id: 1, difficulty: 'easy', multiplier: 1.2, category: 'Ahorro', categoryEN: 'Savings',
    question: '¿Qué porcentaje de tus ingresos se recomienda ahorrar como mínimo?',
    questionEN: 'What is the minimum recommended percentage of income to save?',
    options: [
      { text: '2%',  textEN: '2%' }, { text: '10%', textEN: '10%' },
      { text: '50%', textEN: '50%' }, { text: '0%',  textEN: '0%' }
    ],
    correct: 1,
    explanation: 'La regla 50/30/20 recomienda ahorrar al menos el 20%.',
    explanationEN: 'The 50/30/20 rule recommends saving at least 20%.'
  },
  {
    id: 2, difficulty: 'easy', multiplier: 1.2, category: 'Deuda', categoryEN: 'Debt',
    question: '¿Qué es el interés de una deuda?',
    questionEN: 'What is interest on a debt?',
    options: [
      { text: 'Un regalo del banco', textEN: 'A bank gift' },
      { text: 'El costo de pedir prestado',  textEN: 'The cost of borrowing money' },
      { text: 'Una multa del gobierno', textEN: 'A government fine' },
      { text: 'Una forma de ahorrar', textEN: 'A way to save' }
    ],
    correct: 1,
    explanation: 'El interés es el precio que pagas por usar dinero prestado.',
    explanationEN: 'Interest is the price you pay for using borrowed money.'
  },
  // MEDIUM – Math
  {
    id: 3, difficulty: 'medium', multiplier: 1.8, category: 'Interés compuesto', categoryEN: 'Compound Interest',
    question: 'Tienes $100 al 10% de interés anual. ¿Cuánto tendrás después de 2 años con interés compuesto?',
    questionEN: 'You have $100 at 10% annual interest. After 2 years with compound interest, you have:',
    options: [
      { text: '$120', textEN: '$120' }, { text: '$121', textEN: '$121' },
      { text: '$110', textEN: '$110' }, { text: '$200', textEN: '$200' }
    ],
    correct: 1,
    explanation: '$100 × 1.10 = $110 año 1; $110 × 1.10 = $121 año 2. El interés del año 2 incluye el interés del año 1.',
    explanationEN: '$100 × 1.10 = $110 year 1; $110 × 1.10 = $121 year 2. Year 2 interest includes year 1 interest.'
  },
  {
    id: 4, difficulty: 'medium', multiplier: 1.8, category: 'Presupuesto', categoryEN: 'Budgeting',
    question: 'Ganas $500/mes. Gastas $300 en necesidades y $100 en ocio. ¿Cuánto puedes ahorrar?',
    questionEN: 'You earn $500/month. Needs cost $300, entertainment $100. How much can you save?',
    options: [
      { text: '$50',  textEN: '$50' },  { text: '$100', textEN: '$100' },
      { text: '$200', textEN: '$200' }, { text: '$150', textEN: '$150' }
    ],
    correct: 1,
    explanation: '$500 − $300 − $100 = $100 disponibles para ahorrar.',
    explanationEN: '$500 − $300 − $100 = $100 available to save.'
  },
  // HARD – Math
  {
    id: 5, difficulty: 'hard', multiplier: 2.8, category: 'Inflación', categoryEN: 'Inflation',
    question: 'Si la inflación es 8% y tu cuenta bancaria rinde 3% anual, ¿qué pasa con tu poder adquisitivo?',
    questionEN: 'Inflation is 8% and your savings account yields 3% annually. Your purchasing power:',
    options: [
      { text: 'Aumenta un 5%', textEN: 'Increases by 5%' },
      { text: 'Disminuye un 5%', textEN: 'Decreases by 5%' },
      { text: 'Se mantiene igual', textEN: 'Stays the same' },
      { text: 'Aumenta un 11%', textEN: 'Increases by 11%' }
    ],
    correct: 1,
    explanation: 'Rendimiento real ≈ 3% − 8% = −5%. Tu dinero pierde poder de compra.',
    explanationEN: 'Real return ≈ 3% − 8% = −5%. Your money loses purchasing power.'
  },
  {
    id: 6, difficulty: 'hard', multiplier: 2.8, category: 'Inversión', categoryEN: 'Investment',
    question: 'Tienes $1000 y dos opciones: pagar deuda al 15%/año o invertir al 9%/año. ¿Qué conviene más?',
    questionEN: 'You have $1000: pay 15%/year debt OR invest at 9%/year. Which is better?',
    options: [
      { text: 'Invertir al 9%', textEN: 'Invest at 9%' },
      { text: 'Pagar la deuda al 15%', textEN: 'Pay the 15% debt' },
      { text: 'Son igual de buenas', textEN: 'Both are equally good' },
      { text: 'Depende del banco', textEN: 'Depends on the bank' }
    ],
    correct: 1,
    explanation: 'Pagar deuda al 15% equivale a una inversión libre de riesgo al 15%. Siempre mayor al 9%.',
    explanationEN: 'Paying 15% debt = risk-free 15% return. Always better than 9% investment.'
  },
  // ENGLISH specific – medium
  {
    id: 7, difficulty: 'medium', multiplier: 1.8, category: 'Vocabulario Financiero EN', categoryEN: 'Financial Vocabulary',
    question: '¿Qué significa "liquidity" en finanzas?',
    questionEN: 'What does "liquidity" mean in finance?',
    options: [
      { text: 'Inversión a largo plazo', textEN: 'Long-term investment' },
      { text: 'Facilidad de convertir un activo en efectivo', textEN: 'How easily an asset can be converted to cash' },
      { text: 'Deuda pendiente', textEN: 'Outstanding debt' },
      { text: 'Tasa de interés alta', textEN: 'High interest rate' }
    ],
    correct: 1,
    explanation: '"Liquidity" es qué tan fácil es vender un activo sin pérdida de valor.',
    explanationEN: 'Liquidity = how quickly and easily an asset converts to cash without losing value.'
  },
  {
    id: 8, difficulty: 'medium', multiplier: 1.8, category: 'Vocabulario Financiero EN', categoryEN: 'Financial Vocabulary',
    question: '¿Qué describe "bear market" en inglés?',
    questionEN: 'What does "bear market" describe?',
    options: [
      { text: 'Mercado en alza sostenida', textEN: 'Market with sustained price increases' },
      { text: 'Caída de precios mayor al 20%', textEN: 'Market declining more than 20% from peak' },
      { text: 'Mercado de commodities agrícolas', textEN: 'Agricultural commodities market' },
      { text: 'Mercado de bonos gubernamentales', textEN: 'Government bond market' }
    ],
    correct: 1,
    explanation: '"Bear market" = caída del mercado ≥20% desde su máximo.',
    explanationEN: 'A bear market = 20%+ decline from recent peak. Opposite of "bull market".'
  },
  // EXPERT – Math
  {
    id: 9, difficulty: 'expert', multiplier: 4.0, category: 'Análisis Avanzado', categoryEN: 'Advanced Analysis',
    question: 'La regla del 72 dice que $1000 al 6% se duplica en aprox. ¿cuántos años?',
    questionEN: 'The Rule of 72 states that $1000 at 6% doubles in approximately:',
    options: [
      { text: '6 años',  textEN: '6 years' },  { text: '12 años', textEN: '12 years' },
      { text: '18 años', textEN: '18 years' }, { text: '72 años', textEN: '72 years' }
    ],
    correct: 1,
    explanation: 'Regla del 72: 72 ÷ tasa% = años para duplicar. 72 ÷ 6 = 12 años.',
    explanationEN: 'Rule of 72: 72 ÷ rate% = years to double. 72 ÷ 6 = 12 years.'
  },
  {
    id: 10, difficulty: 'expert', multiplier: 4.0, category: 'Análisis Avanzado', categoryEN: 'Advanced Analysis',
    question: '¿Cuál de estas es una señal de que una empresa puede estar en problemas financieros?',
    questionEN: 'Which of these signals a company may be in financial trouble?',
    options: [
      { text: 'Alto flujo de caja operativo', textEN: 'High operating cash flow' },
      { text: 'Deuda mayor que capital propio', textEN: 'Debt exceeding equity (debt-to-equity > 1)' },
      { text: 'Márgenes de ganancia crecientes', textEN: 'Growing profit margins' },
      { text: 'Reservas de efectivo elevadas', textEN: 'High cash reserves' }
    ],
    correct: 1,
    explanation: 'Si deuda > capital, el riesgo de insolvencia aumenta significativamente.',
    explanationEN: 'High debt-to-equity means the company owes more than it owns — insolvency risk.'
  }
]

// ── STATE ─────────────────────────────────────────────────────────────────

const state          = ref('start')
const qIdx           = ref(0)
const chosenStake    = ref(null)
const answered       = ref(false)
const selectedOpt    = ref(null)
const lastCorrect    = ref(false)
const earnedCoins    = ref(0)
const streak         = ref(0)
const score          = ref({ correct: 0, wrong: 0, maxStreak: 0 })
const netEarnings    = ref(0)
const sessionQs      = ref([])
const currentBalance = ref(0)
const usedFiftyFifty = ref(false)
const usedHint       = ref(false)
const hintText       = ref('')
const hiddenOptions  = ref([])

const alreadyPlayed = computed(() => player.juegosJugadosHoy.quiz >= 1)

const currentQ = computed(() => sessionQs.value[qIdx.value])

const progressPct = computed(() => ((qIdx.value) / questionCount.value) * 100)

const diffLabel = computed(() => {
  const map = { easy: isEN.value ? 'Easy' : 'Fácil', medium: isEN.value ? 'Medium' : 'Medio', hard: isEN.value ? 'Hard' : 'Difícil', expert: isEN.value ? 'Expert' : 'Experto' }
  return currentQ.value ? map[currentQ.value.difficulty] : ''
})

const visibleOptions = computed(() => {
  if (!currentQ.value) return []
  return currentQ.value.options
    .map((o, i) => ({ ...o, originalIndex: i }))
    .filter(o => !hiddenOptions.value.includes(o.originalIndex))
})

// ── INIT ──────────────────────────────────────────────────────────────────

const startGame = () => {
  if (alreadyPlayed.value) return
  const diffLevels = { 1: ['easy'], 2: ['easy','medium'], 3: ['easy','medium','hard'], 4: ['medium','hard','expert'] }
  const allowed = diffLevels[variant.value] ?? diffLevels[1]
  const pool = questions.filter(q => allowed.includes(q.difficulty)).sort(() => 0.5 - Math.random())
  sessionQs.value = pool.slice(0, questionCount.value)
  currentBalance.value = player.dineroDisponible
  player.juegosJugadosHoy.quiz = 1
  player.save()
  state.value = 'stake'
}

// ── ANSWER ────────────────────────────────────────────────────────────────

const answer = (optIdx) => {
  if (answered.value) return
  selectedOpt.value = optIdx
  answered.value    = true
  const correct     = optIdx === currentQ.value.correct

  if (correct) {
    const streakMult = streak.value >= 3 ? 1.5 : 1
    earnedCoins.value = Math.round(chosenStake.value * currentQ.value.multiplier * streakMult)
    netEarnings.value += earnedCoins.value
    currentBalance.value += earnedCoins.value
    streak.value++
    if (streak.value > score.value.maxStreak) score.value.maxStreak = streak.value
    score.value.correct++
    lastCorrect.value = true
    player.ganarDinero(earnedCoins.value)
  } else {
    const loss = chosenStake.value
    netEarnings.value -= loss
    currentBalance.value = Math.max(0, currentBalance.value - loss)
    streak.value = 0
    score.value.wrong++
    lastCorrect.value = false
    player.gastarDinero(loss)
  }
}

const useFiftyFifty = () => {
  if (usedFiftyFifty.value || currentBalance.value < 50) return
  usedFiftyFifty.value = true
  player.gastarDinero(50); currentBalance.value -= 50; netEarnings.value -= 50
  const wrong = currentQ.value.options.map((_, i) => i).filter(i => i !== currentQ.value.correct)
  const toHide = wrong.sort(() => 0.5 - Math.random()).slice(0, 2)
  hiddenOptions.value = toHide
}

const useHint = () => {
  if (usedHint.value || currentBalance.value < 40) return
  usedHint.value = true
  player.gastarDinero(40); currentBalance.value -= 40; netEarnings.value -= 40
  hintText.value = isEN.value ? currentQ.value.explanationEN : currentQ.value.explanation
}

const nextQuestion = () => {
  if (qIdx.value < questionCount.value - 1) {
    qIdx.value++
    answered.value    = false
    selectedOpt.value = null
    chosenStake.value  = null
    usedFiftyFifty.value = false
    usedHint.value    = false
    hintText.value    = ''
    hiddenOptions.value = []
    state.value = 'stake'
  } else {
    state.value = 'results'
  }
}

// ── FINISH ────────────────────────────────────────────────────────────────

const finish = () => {
  const pct    = score.value.correct / questionCount.value
  const reward = Math.max(0, netEarnings.value)
  emit('game-completed', {
    success:    pct >= 0.6,
    recompensa: reward,
    title:      isEN.value
      ? (pct >= 0.8 ? 'Financial Genius!' : pct >= 0.6 ? 'Good Job!' : 'Keep Studying')
      : (pct >= 0.8 ? '¡Genio Financiero!' : pct >= 0.6 ? '¡Buen Trabajo!' : 'Sigue Estudiando'),
    msg: isEN.value
      ? `${score.value.correct}/${questionCount.value} correct. Net: ${netEarnings.value >= 0 ? '+' : ''}$${netEarnings.value}`
      : `${score.value.correct}/${questionCount.value} correctas. Neto: ${netEarnings.value >= 0 ? '+' : ''}$${netEarnings.value}`
  })
}
</script>

<style scoped>
.quiz-container { max-width: 620px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }

/* Start */
.rules-box { background: #f8fafc; border-radius: var(--border-radius-md); padding: 1.5rem; margin-bottom: 1.25rem; }
.rules-box p { text-align: center; margin-bottom: 1rem; line-height: 1.6; }
.rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.rule-item { background: white; padding: 0.6rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; text-align: center; }
.played-msg { text-align: center; background: #fef3c7; color: #92400e; padding: 1rem; border-radius: 12px; font-weight: 700; margin-bottom: 1rem; }

/* Progress */
.progress-bar { background: #e2e8f0; height: 8px; border-radius: 4px; margin-bottom: 1rem; overflow: hidden; }
.pb-fill { height: 100%; background: linear-gradient(90deg, var(--primary-color), #a29bfe); border-radius: 4px; transition: width 0.4s; }

.question-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; font-size: 0.9rem; flex-wrap: wrap; }
.streak-badge { background: #fdcb6e; color: #6c4b00; padding: 0.2rem 0.7rem; border-radius: 999px; font-weight: 800; font-size: 0.82rem; }
.balance-badge { margin-left: auto; font-weight: 800; color: #00b894; }
.stake-indicator { margin-left: auto; background: #eef0ff; color: var(--primary-color); padding: 0.2rem 0.7rem; border-radius: 999px; font-weight: 800; font-size: 0.82rem; }

/* Stake */
.stake-header { margin-bottom: 1rem; }
.stake-header h3 { margin: 0 0 0.3rem; }
.cat-preview { font-size: 0.88rem; color: #636e72; margin: 0; }
.stake-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-bottom: 1.25rem; }
.stake-card { background: white; border: 2px solid #e2e8f0; border-radius: var(--border-radius-md); padding: 1rem; cursor: pointer; text-align: center; transition: all 0.18s; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.stake-card:hover:not(.disabled) { border-color: var(--primary-color); transform: translateY(-3px); }
.stake-card.selected { border-color: var(--primary-color); background: #eef0ff; }
.stake-card.disabled { opacity: 0.4; cursor: not-allowed; }
.stake-icon { font-size: 1.8rem; }
.stake-amt { font-family: 'Fredoka', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
.stake-mult { font-size: 0.78rem; font-weight: 800; color: #636e72; }
.stake-win { font-size: 0.85rem; font-weight: 800; color: #00b894; }

/* Question */
.powerups-row { display: flex; gap: 0.6rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.pu-btn { background: white; border: 2px solid #dfe6e9; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.pu-btn:not(:disabled):hover { border-color: var(--primary-color); background: #eef0ff; }
.pu-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.hint-display { background: #eef0ff; color: #3730a3; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.75rem; line-height: 1.5; }

.question-card { background: white; border-radius: var(--border-radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.diff-badge { display: inline-block; font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 999px; margin-bottom: 0.75rem; text-transform: uppercase; }
.diff-easy   { background: #d1fae5; color: #065f46; }
.diff-medium { background: #fef3c7; color: #92400e; }
.diff-hard   { background: #fee2e2; color: #991b1b; }
.diff-expert { background: #1a1a2e; color: #a29bfe; }

.question-card h3 { font-size: 1.2rem; line-height: 1.5; margin-bottom: 1.25rem; }

.options-col { display: flex; flex-direction: column; gap: 0.6rem; }
.opt-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border: 2px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; font-size: 0.95rem; font-weight: 600; text-align: left; transition: all 0.18s; }
.opt-btn:not(.disabled):hover { border-color: var(--primary-color); background: #f8fafc; }
.opt-btn.disabled { cursor: default; }
.opt-btn.correct { background: #d1fae5; border-color: #10b981; color: #065f46; }
.opt-btn.wrong   { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
.opt-letter { background: #e2e8f0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0; }

.feedback { padding: 1rem; border-radius: 12px; margin-top: 1rem; font-size: 1rem; }
.fb-correct { background: #d1fae5; color: #065f46; }
.fb-wrong   { background: #fee2e2; color: #991b1b; }
.explanation { font-size: 0.85rem; margin-top: 0.5rem; line-height: 1.5; opacity: 0.85; }

/* Results */
.result-header { text-align: center; border-radius: var(--border-radius-lg); padding: 2rem; margin-bottom: 1.25rem; }
.result-header.win  { background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; }
.result-header.lose { background: linear-gradient(135deg, #b2bec3, #636e72); color: white; }
.result-header h2 { color: white; margin: 0.5rem 0 0.4rem; }
.result-header p { opacity: 0.9; margin: 0; }
.ri { font-size: 3.5rem; display: block; }

.stats-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
.stat-card { flex: 1; background: white; border-radius: 12px; padding: 1rem; text-align: center; box-shadow: var(--shadow-sm); }
.sl { display: block; font-size: 0.75rem; font-weight: 800; color: #636e72; text-transform: uppercase; margin-bottom: 0.3rem; }
.sv { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; font-weight: 700; display: block; }
.green { color: #00b894; } .red { color: #d63031; } .orange { color: #e17055; }

.net-earnings { text-align: center; background: white; border-radius: 12px; padding: 1rem; box-shadow: var(--shadow-sm); margin-bottom: 1rem; }
.net-earnings p { margin: 0 0 0.3rem; font-size: 0.9rem; color: #636e72; }
.net-val { font-family: 'Fredoka', sans-serif; font-size: 2rem; font-weight: 700; }

.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
</style>
