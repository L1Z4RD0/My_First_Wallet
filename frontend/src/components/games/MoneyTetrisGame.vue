<template>
  <div class="money-tetris">

    <!-- ── INTRO ─────────────────────────────────────────────────────── -->
    <div v-if="phase === 'intro'" class="mt-intro">
      <div class="mt-hero">
        <div class="mt-hero-icons">💰🏦💸🎮</div>
        <h1>Money Tetris</h1>
        <p class="mt-sub">{{ t('subtitle') }}</p>
      </div>

      <div class="mt-legend">
        <div v-for="bt in BLOCK_TYPES_INFO" :key="bt.type" class="legend-row">
          <span class="legend-badge" :style="{background: bt.color}">{{ bt.emoji }}</span>
          <div class="legend-text">
            <strong>{{ t(bt.nameKey) }}</strong>
            <span>{{ t(bt.descKey) }}</span>
          </div>
        </div>
      </div>

      <div class="mt-combos">
        <div class="combo combo-good">✅ {{ t('goodCombo') }}</div>
        <div class="combo combo-bad">❌ {{ t('badCombo') }}</div>
      </div>

      <div class="mt-goal-row">
        <span>🏆 {{ t('goal') }}: {{ WIN_SCORE }} {{ t('points') }}</span>
        <span>⚡ 1 {{ t('energy') }}</span>
      </div>

      <p v-if="!hasEnergy" class="no-energy-warn">⚡ {{ t('noEnergy') }}</p>
      <button v-else class="mt-btn-primary" @click="startGame">{{ t('play') }} 🚀</button>
    </div>

    <!-- ── PLAYING ────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'playing'" class="mt-playing">

      <!-- HUD -->
      <div class="mt-hud">
        <div class="hud-block">
          <span class="hud-lbl">{{ t('score') }}</span>
          <span class="hud-val hud-score">{{ score }}</span>
        </div>
        <div class="hud-health-block">
          <span class="hud-lbl">{{ t('health') }}</span>
          <div class="health-track">
            <div class="health-fill" :style="{width: health+'%', background: healthColor}"></div>
          </div>
          <span class="health-pct" :style="{color: healthColor}">{{ health }}%</span>
        </div>
        <div class="hud-block hud-next">
          <span class="hud-lbl">{{ t('next') }}</span>
          <div class="next-preview">
            <div v-for="(row, r) in nextPiece.shape" :key="r" class="next-row">
              <div
                v-for="(cell, c) in row"
                :key="c"
                class="next-cell"
                :class="cell ? nextPiece.type : 'next-empty'"
              >{{ cell ? BLOCK_INFO[nextPiece.type]?.emoji : '' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mt-progress">
        <div class="mt-progress-fill" :style="{width: Math.min(score/WIN_SCORE*100,100)+'%'}"></div>
        <span class="mt-progress-txt">{{ score }} / {{ WIN_SCORE }}</span>
      </div>

      <!-- Board -->
      <div class="mt-board-wrap" :class="{shake: shaking}">
        <div class="mt-board">
          <template v-for="(row, r) in displayBoard" :key="r">
            <div
              v-for="(cell, c) in row"
              :key="`${r}-${c}`"
              class="mt-cell"
              :class="[cell?.type ?? 'mt-empty', {ghost: cell?.ghost}]"
            >
              <span v-if="cell && !cell.ghost">{{ BLOCK_INFO[cell.type]?.emoji }}</span>
            </div>
          </template>
        </div>
        <div v-if="flashActive" class="mt-flash"></div>
      </div>

      <!-- Educational popup -->
      <transition name="edu-pop">
        <div v-if="eduMessage" class="edu-msg" :class="`edu-${eduMsgType}`">
          {{ eduMessage }}
        </div>
      </transition>

      <!-- Mobile controls -->
      <div class="mt-controls">
        <button class="ctrl-btn" @click="moveLeft">◀</button>
        <div class="ctrl-center">
          <button class="ctrl-btn ctrl-rot" @click="rotatePiece">↺</button>
          <button class="ctrl-btn ctrl-down" @click="softDrop">▼</button>
        </div>
        <button class="ctrl-btn" @click="moveRight">▶</button>
      </div>
    </div>

    <!-- ── RESULT ─────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'result'" class="mt-result">
      <div class="result-icon">{{ won ? '🏆' : '💸' }}</div>
      <h2 :class="won ? 'r-win' : 'r-lose'">{{ won ? t('youWin') : t('youLose') }}</h2>

      <div class="r-stats">
        <div class="r-stat">
          <span>🎯 {{ t('score') }}</span>
          <strong>{{ score }}</strong>
        </div>
        <div class="r-stat">
          <span>✅ {{ t('goodLines') }}</span>
          <strong class="r-good">{{ goodLines }}</strong>
        </div>
        <div class="r-stat">
          <span>❌ {{ t('badLines') }}</span>
          <strong class="r-bad">{{ badLines }}</strong>
        </div>
        <div class="r-stat" :class="won ? 'r-coins-win' : 'r-coins-lose'">
          <span>💰 {{ t('coins') }}</span>
          <strong>{{ won ? '+10' : (penaltyApplied ? '-5' : '$0') }}</strong>
        </div>
      </div>

      <div class="r-edu">{{ eduSummary }}</div>

      <button class="mt-btn-primary" @click="finish">{{ t('finish') }}</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../../store/player'

const props = defineProps({ language: { type: String, default: 'es' } })
const emit  = defineEmits(['game-completed'])

const player = usePlayerStore()
const isEN   = computed(() => props.language === 'en')

// ── TEXTS ──────────────────────────────────────────────────────────────────
const TEXTS = {
  es: {
    subtitle: 'Forma líneas con combinaciones financieras inteligentes',
    income: 'Ingreso', incomeDesc: 'Dinero que recibes',
    savings: 'Ahorro', savingsDesc: 'Dinero que guardas',
    expense: 'Gasto',  expenseDesc: 'Pagos necesarios',
    impulse: 'Compra Impulsiva', impulseDesc: 'Compras sin planificar',
    goodCombo: 'Ingreso + Ahorro = ¡Línea saludable! +100 pts',
    badCombo:  'Gasto + Impulsivo = ¡Línea peligrosa! Pierdes salud',
    goal: 'Meta', points: 'puntos', energy: 'energía',
    noEnergy: 'Sin energía. ¡Termina el día para recuperarla!',
    play: 'Jugar', score: 'Puntaje', health: 'Salud Financiera', next: 'Siguiente',
    youWin: '¡Ganaste! 🎉', youLose: 'Fin del Juego', finish: 'Terminar',
    goodLines: 'Líneas saludables', badLines: 'Líneas peligrosas', coins: 'Monedas',
    winMsg: '¡Excelente! Combinaste bien tus ingresos con el ahorro. Esa es la clave de la salud financiera.',
    loseMsg: 'Recuerda: los gastos impulsivos y el gasto sin control debilitan tu estabilidad económica. ¡Inténtalo de nuevo!',
    msgs: {
      good1: '💡 Ahorrar parte de tus ingresos te ayuda a alcanzar tus metas.',
      good2: '🌱 Ingreso + Ahorro = el camino hacia la libertad financiera.',
      good3: '📈 ¡Bien hecho! Esa combinación construye riqueza a largo plazo.',
      bad1:  '⚠️ Los gastos impulsivos reducen tu capacidad de ahorro.',
      bad2:  '📉 El gasto sin control puede llevarte a deudas difíciles.',
      bad3:  '💸 Comprar sin planificar siempre tiene un costo oculto.',
      neutral: '⚖️ Un presupuesto equilibrado es el primer paso al ahorro.',
    }
  },
  en: {
    subtitle: 'Build lines with smart financial combinations',
    income: 'Income', incomeDesc: 'Money you receive',
    savings: 'Savings', savingsDesc: 'Money you save',
    expense: 'Expense', expenseDesc: 'Necessary payments',
    impulse: 'Impulse Buy', impulseDesc: 'Unplanned purchases',
    goodCombo: 'Income + Savings = Healthy line! +100 pts',
    badCombo:  'Expense + Impulse = Dangerous line! Lose health',
    goal: 'Goal', points: 'points', energy: 'energy',
    noEnergy: 'No energy left. Finish the day to recover it!',
    play: 'Play', score: 'Score', health: 'Financial Health', next: 'Next',
    youWin: 'You Win! 🎉', youLose: 'Game Over', finish: 'Finish',
    goodLines: 'Healthy lines', badLines: 'Dangerous lines', coins: 'Coins',
    winMsg: 'Excellent! You combined income and savings well. That is the key to financial health.',
    loseMsg: 'Remember: impulse purchases and uncontrolled spending weaken your financial stability. Try again!',
    msgs: {
      good1: '💡 Saving part of your income helps you reach your goals.',
      good2: '🌱 Income + Savings = the path to financial freedom.',
      good3: '📈 Well done! That combo builds long-term wealth.',
      bad1:  '⚠️ Impulse purchases reduce your ability to save.',
      bad2:  '📉 Uncontrolled spending can lead to difficult debts.',
      bad3:  '💸 Buying without planning always has a hidden cost.',
      neutral: '⚖️ A balanced budget is the first step to savings.',
    }
  }
}
const t = (key) => (isEN.value ? TEXTS.en : TEXTS.es)[key] ?? key

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const COLS      = 10
const ROWS      = 20
const WIN_SCORE = 500
const INIT_SPEED = 700
const MIN_SPEED  = 150

const BLOCK_INFO = {
  income:  { emoji: '💰', color: '#00b894' },
  savings: { emoji: '🏦', color: '#0984e3' },
  expense: { emoji: '💸', color: '#d63031' },
  impulse: { emoji: '🎮', color: '#e17055' },
}
const BLOCK_TYPES_INFO = [
  { type: 'income',  nameKey: 'income',  descKey: 'incomeDesc',  emoji: '💰', color: '#00b894' },
  { type: 'savings', nameKey: 'savings', descKey: 'savingsDesc', emoji: '🏦', color: '#0984e3' },
  { type: 'expense', nameKey: 'expense', descKey: 'expenseDesc', emoji: '💸', color: '#d63031' },
  { type: 'impulse', nameKey: 'impulse', descKey: 'impulseDesc', emoji: '🎮', color: '#e17055' },
]

const SHAPES = [
  [[1,1,1,1]],               // I
  [[1,1],[1,1]],              // O
  [[0,1,0],[1,1,1]],         // T
  [[1,0,0],[1,1,1]],         // J
  [[0,0,1],[1,1,1]],         // L
  [[0,1,1],[1,1,0]],         // S
  [[1,1,0],[0,1,1]],         // Z
]

// Weighted type pool: income 30%, savings 25%, expense 25%, impulse 20%
const TYPE_POOL = [
  'income','income','income','savings','savings','savings',
  'expense','expense','expense','impulse','impulse','impulse',
  'income','savings','expense','impulse',
]

// ── STATE ──────────────────────────────────────────────────────────────────
const phase        = ref('intro')
const board        = ref(makeBoard())
const score        = ref(0)
const health       = ref(70)
const goodLines    = ref(0)
const badLines     = ref(0)
const won          = ref(false)
const penaltyApplied = ref(false)
const shaking      = ref(false)
const flashActive  = ref(false)
const eduMessage   = ref('')
const eduMsgType   = ref('neutral')
const eduSummary   = ref('')

const currentPiece = reactive({ shape: [], type: 'income', x: 3, y: 0 })
const nextPiece    = reactive({ shape: [[1]], type: 'income' })

let gameLoop          = null
let currentSpeed      = INIT_SPEED
let linesClearedTotal = 0

const hasEnergy   = computed(() => player.energiaActual > 0)
const healthColor = computed(() => {
  if (health.value >= 60) return '#00b894'
  if (health.value >= 30) return '#fdcb6e'
  return '#d63031'
})

// ── BOARD HELPERS ──────────────────────────────────────────────────────────
function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function isValid(shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = y + r, nc = x + c
      if (nc < 0 || nc >= COLS || nr >= ROWS) return false
      if (nr >= 0 && board.value[nr][nc]) return false
    }
  }
  return true
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length
  const out = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out[c][rows - 1 - r] = shape[r][c]
  return out
}

function calcGhostY() {
  let gy = currentPiece.y
  while (isValid(currentPiece.shape, currentPiece.x, gy + 1)) gy++
  return gy
}

// ── DISPLAY BOARD (static + ghost + active piece) ──────────────────────────
const displayBoard = computed(() => {
  const b = board.value.map(row => row.map(cell => cell ? { ...cell } : null))
  if (phase.value !== 'playing') return b

  const gy = calcGhostY()
  if (gy !== currentPiece.y) {
    currentPiece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return
        const br = gy + r, bc = currentPiece.x + c
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS && !b[br][bc])
          b[br][bc] = { type: currentPiece.type, ghost: true }
      })
    })
  }

  currentPiece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return
      const br = currentPiece.y + r, bc = currentPiece.x + c
      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS)
        b[br][bc] = { type: currentPiece.type }
    })
  })
  return b
})

// ── GAME LOGIC ─────────────────────────────────────────────────────────────
function randShape() { return SHAPES[Math.floor(Math.random() * SHAPES.length)] }
function randType()  { return TYPE_POOL[Math.floor(Math.random() * TYPE_POOL.length)] }

function spawnPiece() {
  currentPiece.shape = nextPiece.shape.map(r => [...r])
  currentPiece.type  = nextPiece.type
  currentPiece.x     = Math.floor((COLS - currentPiece.shape[0].length) / 2)
  currentPiece.y     = 0
  nextPiece.shape    = randShape()
  nextPiece.type     = randType()
  if (!isValid(currentPiece.shape, currentPiece.x, currentPiece.y))
    endGame(false)
}

function lockPiece() {
  currentPiece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return
      const br = currentPiece.y + r, bc = currentPiece.x + c
      if (br >= 0 && br < ROWS) board.value[br][bc] = { type: currentPiece.type }
    })
  })
}

function clearLines() {
  const cleared = []
  const kept    = []
  for (let r = 0; r < ROWS; r++) {
    if (board.value[r].every(c => c !== null)) cleared.push([...board.value[r]])
    else kept.push([...board.value[r]])
  }
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null))
  board.value = kept
  return cleared
}

function evalRow(cells) {
  const types   = cells.map(c => c?.type).filter(Boolean)
  const good    = types.filter(t => t === 'income' || t === 'savings').length
  const bad     = types.filter(t => t === 'expense' || t === 'impulse').length
  if (good >= bad + 3) return 'good'
  if (bad >= good + 3) return 'bad'
  return 'neutral'
}

function showEduMsg(type) {
  const pool = isEN.value ? TEXTS.en.msgs : TEXTS.es.msgs
  const map  = {
    good:    [pool.good1, pool.good2, pool.good3],
    bad:     [pool.bad1,  pool.bad2,  pool.bad3 ],
    neutral: [pool.neutral]
  }
  const arr = map[type] || [pool.neutral]
  eduMessage.value  = arr[Math.floor(Math.random() * arr.length)]
  eduMsgType.value  = type
  clearTimeout(eduTimer)
  eduTimer = setTimeout(() => { eduMessage.value = '' }, 3200)
}

let eduTimer = null

function triggerFlash() {
  flashActive.value = true
  setTimeout(() => { flashActive.value = false }, 350)
}
function triggerShake() {
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 500)
}

function tick() {
  if (phase.value !== 'playing') return
  if (isValid(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++
    return
  }

  lockPiece()
  const cleared = clearLines()

  if (cleared.length) {
    triggerFlash()
    linesClearedTotal += cleared.length
    let hasGood = false, hasBad = false

    cleared.forEach(row => {
      const result = evalRow(row)
      if (result === 'good') {
        score.value  += 100 * cleared.length
        health.value  = Math.min(100, health.value + 12)
        goodLines.value++
        hasGood = true
      } else if (result === 'bad') {
        score.value  += 20
        health.value  = Math.max(0, health.value - 18)
        badLines.value++
        hasBad = true
        triggerShake()
      } else {
        score.value  += 50
        health.value  = Math.min(100, health.value + 4)
      }
    })

    if (hasGood)      showEduMsg('good')
    else if (hasBad)  showEduMsg('bad')
    else              showEduMsg('neutral')

    if (linesClearedTotal % 3 === 0) {
      currentSpeed = Math.max(MIN_SPEED, currentSpeed - 50)
      restartLoop()
    }
  }

  if (health.value <= 0 || score.value >= WIN_SCORE) {
    endGame(score.value >= WIN_SCORE)
    return
  }
  spawnPiece()
}

function restartLoop() {
  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(tick, currentSpeed)
}

// ── CONTROLS ───────────────────────────────────────────────────────────────
function moveLeft()  { if (isValid(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) currentPiece.x-- }
function moveRight() { if (isValid(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) currentPiece.x++ }

function rotatePiece() {
  const rot = rotateCW(currentPiece.shape)
  const kicks = [0, -1, 1, -2, 2]
  for (const k of kicks) {
    if (isValid(rot, currentPiece.x + k, currentPiece.y)) {
      currentPiece.shape = rot
      currentPiece.x += k
      return
    }
  }
}

function softDrop() {
  if (isValid(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) currentPiece.y++
  else tick()
}

function onKey(e) {
  if (phase.value !== 'playing') return
  const map = {
    ArrowLeft:  moveLeft,
    ArrowRight: moveRight,
    ArrowUp:    rotatePiece,
    ArrowDown:  softDrop,
    ' ':        () => { while (isValid(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) currentPiece.y++; tick() },
  }
  if (map[e.key]) { e.preventDefault(); map[e.key]() }
}

// ── LIFECYCLE ──────────────────────────────────────────────────────────────
function startGame() {
  board.value       = makeBoard()
  score.value       = 0
  health.value      = 70
  goodLines.value   = 0
  badLines.value    = 0
  won.value         = false
  penaltyApplied.value = false
  eduMessage.value  = ''
  currentSpeed      = INIT_SPEED
  linesClearedTotal = 0
  nextPiece.shape   = randShape()
  nextPiece.type    = randType()
  spawnPiece()
  phase.value       = 'playing'
  restartLoop()
}

function endGame(didWin) {
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null }
  won.value            = didWin
  penaltyApplied.value = !didWin && player.dineroDisponible >= 5
  eduSummary.value     = didWin ? t('winMsg') : t('loseMsg')
  phase.value          = 'result'
}

function finish() {
  if (won.value) {
    const result = player.jugarMinijuego('tetris', 10)
    emit('game-completed', {
      success: true,
      recompensa: result.recompensa,
      title: t('youWin'),
      msg: `${t('score')}: ${score.value} — ${goodLines.value} ${t('goodLines')}`
    })
  } else {
    if (penaltyApplied.value) player.gastarDinero(5)
    player.jugarMinijuego('tetris', 0)
    emit('game-completed', {
      success: false,
      recompensa: 0,
      title: t('youLose'),
      msg: t('loseMsg')
    })
  }
}

onMounted(()   => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (gameLoop) clearInterval(gameLoop)
  if (eduTimer) clearTimeout(eduTimer)
})
</script>

<style scoped>
/* ── CONTAINER ───────────────────────────────────────────────────────────── */
.money-tetris {
  font-family: 'Fredoka', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  padding: 0.5rem;
  user-select: none;
}

/* ── INTRO ───────────────────────────────────────────────────────────────── */
.mt-intro { display: flex; flex-direction: column; gap: 1.2rem; }

.mt-hero { text-align: center; }
.mt-hero-icons { font-size: 2.2rem; letter-spacing: 0.3rem; margin-bottom: 0.4rem; }
.mt-hero h1 { font-size: 2.4rem; margin: 0; background: linear-gradient(135deg, #00b894, #0984e3, #e17055); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.mt-sub { color: #636e72; font-size: 1rem; margin: 0.4rem 0 0; }

.mt-legend { background: #f8fafc; border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 0.7rem; }
.legend-row { display: flex; align-items: center; gap: 0.75rem; }
.legend-badge { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 3px 8px rgba(0,0,0,0.15); }
.legend-text { display: flex; flex-direction: column; }
.legend-text strong { font-size: 0.95rem; color: #2d3436; }
.legend-text span   { font-size: 0.78rem; color: #636e72; }

.mt-combos { display: flex; flex-direction: column; gap: 0.5rem; }
.combo { padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; }
.combo-good { background: #d1fae5; color: #065f46; }
.combo-bad  { background: #fee2e2; color: #991b1b; }

.mt-goal-row { display: flex; justify-content: space-between; background: #eef0ff; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; color: #5b5bf6; }

.no-energy-warn { text-align: center; color: #d63031; font-weight: 700; padding: 0.75rem; background: #fee2e2; border-radius: 10px; }
.mt-btn-primary { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #00b894, #0984e3); color: white; border: none; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.mt-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,184,148,0.35); }

/* ── PLAYING ─────────────────────────────────────────────────────────────── */
.mt-playing { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }

.mt-hud { width: 100%; display: flex; align-items: center; gap: 0.6rem; background: #1a1a2e; border-radius: 12px; padding: 0.6rem 0.8rem; }
.hud-block { display: flex; flex-direction: column; align-items: center; min-width: 52px; }
.hud-health-block { flex: 1; display: flex; flex-direction: column; align-items: stretch; gap: 3px; }
.hud-lbl { font-size: 0.62rem; text-transform: uppercase; color: #a0a0c0; font-weight: 800; letter-spacing: 0.04em; }
.hud-val { font-size: 1.3rem; font-weight: 800; color: #f0f0ff; }
.hud-score { color: #ffeaa7; }

.health-track { height: 10px; background: #2d2d4e; border-radius: 5px; overflow: hidden; }
.health-fill  { height: 100%; border-radius: 5px; transition: width 0.4s ease, background 0.4s; }
.health-pct   { font-size: 0.8rem; font-weight: 800; text-align: right; }

.hud-next { align-items: center; }
.next-preview { margin-top: 3px; }
.next-row { display: flex; }
.next-cell { width: 14px; height: 14px; border-radius: 3px; font-size: 9px; display: flex; align-items: center; justify-content: center; margin: 1px; }
.next-cell.income  { background: #00b894; }
.next-cell.savings { background: #0984e3; }
.next-cell.expense { background: #d63031; }
.next-cell.impulse { background: #e17055; }
.next-empty { background: #2d2d4e; }

.mt-progress { width: 100%; height: 16px; background: #e2e8f0; border-radius: 8px; overflow: hidden; position: relative; }
.mt-progress-fill { height: 100%; background: linear-gradient(90deg, #00b894, #0984e3); border-radius: 8px; transition: width 0.5s ease; }
.mt-progress-txt { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 800; color: #2d3436; }

/* ── BOARD ───────────────────────────────────────────────────────────────── */
.mt-board-wrap { position: relative; border-radius: 10px; overflow: hidden; background: #0d0d1a; padding: 4px; border: 3px solid #2d2d4e; box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
.mt-board { display: grid; grid-template-columns: repeat(10, 28px); grid-auto-rows: 28px; gap: 2px; }
.mt-cell { border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: background 0.1s; }
.mt-cell.mt-empty { background: rgba(255,255,255,0.04); }
.mt-cell.income  { background: #00b894; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); }
.mt-cell.savings { background: #0984e3; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); }
.mt-cell.expense { background: #d63031; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); }
.mt-cell.impulse { background: #e17055; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); }
.mt-cell.ghost   { background: rgba(200,200,255,0.12); border: 1px dashed rgba(200,200,255,0.3); }

.mt-flash { position: absolute; inset: 0; background: rgba(255,255,200,0.35); pointer-events: none; animation: flash-out 0.35s ease forwards; }
@keyframes flash-out { from { opacity: 1; } to { opacity: 0; } }

.shake { animation: board-shake 0.5s ease; }
@keyframes board-shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}

/* ── EDU MESSAGE ─────────────────────────────────────────────────────────── */
.edu-msg { width: 100%; padding: 0.7rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; text-align: center; line-height: 1.4; }
.edu-good    { background: #d1fae5; color: #065f46; }
.edu-bad     { background: #fee2e2; color: #991b1b; }
.edu-neutral { background: #eef0ff; color: #3730a3; }

.edu-pop-enter-active, .edu-pop-leave-active { transition: opacity 0.4s, transform 0.4s; }
.edu-pop-enter-from  { opacity: 0; transform: translateY(10px); }
.edu-pop-leave-to    { opacity: 0; transform: translateY(-8px); }

/* ── CONTROLS ────────────────────────────────────────────────────────────── */
.mt-controls { display: flex; justify-content: space-around; align-items: center; width: 100%; gap: 0.5rem; padding: 0.25rem 0; }
.ctrl-center { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; }
.ctrl-btn { width: 58px; height: 58px; border-radius: 50%; border: none; background: linear-gradient(135deg, #2d2d4e, #1a1a2e); color: #f0f0ff; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.35); touch-action: manipulation; transition: transform 0.1s, box-shadow 0.1s; }
.ctrl-btn:active { transform: scale(0.92); box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
.ctrl-rot  { background: linear-gradient(135deg, #6c5ce7, #a29bfe); font-size: 1.4rem; }
.ctrl-down { background: linear-gradient(135deg, #0984e3, #74b9ff); font-size: 1.2rem; }

/* ── RESULT ──────────────────────────────────────────────────────────────── */
.mt-result { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; padding: 0.5rem 0; }
.result-icon { font-size: 4rem; animation: pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes pop-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.r-win  { color: #00b894; font-size: 2rem; margin: 0; }
.r-lose { color: #d63031; font-size: 2rem; margin: 0; }

.r-stats { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.r-stat { background: #f8fafc; border-radius: 12px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
.r-stat strong { font-size: 1.1rem; }
.r-good { color: #00b894; }
.r-bad  { color: #d63031; }
.r-coins-win  { background: #d1fae5; grid-column: 1/-1; }
.r-coins-lose { background: #fee2e2; grid-column: 1/-1; }
.r-coins-win  strong { color: #00b894; font-size: 1.3rem; }
.r-coins-lose strong { color: #d63031; font-size: 1.3rem; }

.r-edu { background: #eef0ff; color: #3730a3; border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; text-align: center; width: 100%; }

/* ── RESPONSIVE ──────────────────────────────────────────────────────────── */
@media (max-width: 400px) {
  .mt-board { grid-template-columns: repeat(10, 24px); grid-auto-rows: 24px; gap: 1px; }
  .mt-cell  { font-size: 0.9rem; }
  .ctrl-btn { width: 50px; height: 50px; font-size: 1.2rem; }
}
</style>
