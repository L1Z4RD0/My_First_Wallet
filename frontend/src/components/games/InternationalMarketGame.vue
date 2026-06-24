<template>
  <div class="im-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🌐</div>
      <h2>International Market</h2>
      <p class="subtitle">Read the news. Predict the market. Profit.</p>

      <div class="intro-box">
        <p>
          You have <strong>${{ startingCapital }}</strong> to invest across {{ assets.length }} assets.
          Each round you'll read <strong>real financial news headlines</strong>. Based on what you read,
          decide where to put your money before the market reacts.
        </p>
        <div class="rules-grid">
          <div class="rule">📰 Read the news carefully — some headlines are traps</div>
          <div class="rule">📊 Allocate your portfolio before each round</div>
          <div class="rule">💡 Some bad-sounding news is actually GOOD for stocks</div>
          <div class="rule">⏱️ {{ roundCount }} rounds total</div>
        </div>
      </div>

      <div class="assets-preview">
        <div v-for="a in assets" :key="a.id" class="asset-chip">
          <span>{{ a.emoji }}</span>
          <span>{{ a.name }}</span>
        </div>
      </div>

      <button class="btn-primary" @click="startGame">📈 Start Trading</button>
    </div>

    <!-- ══ NEWS + ALLOCATION ═══════════════════════════════════════════════ -->
    <div v-else-if="phase === 'reading' || phase === 'allocating'" class="phase">
      <div class="round-header">
        <span class="round-badge">Round {{ currentRound }}/{{ roundCount }}</span>
        <span class="capital-display">💰 ${{ Math.round(capital) }}</span>
      </div>

      <!-- News panel -->
      <div class="news-panel">
        <h3>📰 Market News</h3>
        <div v-for="(news, i) in currentRoundNews" :key="i" class="news-item">
          <span class="news-source">{{ news.source }}</span>
          <p class="news-headline">{{ news.headline }}</p>
          <span v-if="phase === 'allocating' && news.hintVisible" class="news-hint">
            💡 {{ news.hint }}
          </span>
        </div>
      </div>

      <div v-if="phase === 'reading'" class="reading-timer">
        <div class="timer-bar">
          <div class="timer-fill" :style="{ width: timerPct + '%' }"></div>
        </div>
        <p>⏳ Read carefully — {{ timerSec }}s remaining</p>
        <button class="btn-secondary" @click="goToAllocation">I've read it →</button>
      </div>

      <div v-else class="allocation-section">
        <h3>📊 Allocate Your Portfolio</h3>
        <p class="alloc-hint">Distribute <strong>${{ Math.round(capital) }}</strong> across assets (must total 100%)</p>

        <div v-for="a in assets" :key="a.id" class="asset-row">
          <div class="asset-info">
            <span class="a-emoji">{{ a.emoji }}</span>
            <div>
              <span class="a-name">{{ a.name }}</span>
              <span class="a-desc">{{ a.description }}</span>
            </div>
          </div>
          <div class="pct-control">
            <button @click="adjustPct(a.id, -10)" :disabled="allocPct[a.id] <= 0">−</button>
            <span class="pct-val">{{ allocPct[a.id] }}%</span>
            <button @click="adjustPct(a.id, +10)" :disabled="totalAllocated >= 100">+</button>
          </div>
          <span class="dollar-val">${{ Math.round(capital * allocPct[a.id] / 100) }}</span>
        </div>

        <div class="total-row" :class="totalAllocated === 100 ? 'ok' : 'warn'">
          Total: {{ totalAllocated }}%
          <span v-if="totalAllocated < 100"> — {{ 100 - totalAllocated }}% in cash (inflation risk)</span>
          <span v-if="totalAllocated > 100"> — ⚠️ Over 100%!</span>
        </div>

        <button class="btn-primary" :disabled="totalAllocated > 100" @click="resolveRound">
          Confirm Allocation →
        </button>
      </div>
    </div>

    <!-- ══ ROUND RESULT ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'round-result'" class="phase">
      <h3>📊 Round {{ currentRound }} Results</h3>

      <div class="results-grid">
        <div v-for="a in assets" :key="a.id" class="asset-result" :class="lastReturns[a.id] >= 0 ? 'up' : 'down'">
          <span class="ar-emoji">{{ a.emoji }}</span>
          <span class="ar-name">{{ a.name }}</span>
          <span class="ar-return">{{ lastReturns[a.id] >= 0 ? '+' : '' }}{{ lastReturns[a.id].toFixed(1) }}%</span>
          <span class="ar-alloc">Your allocation: {{ allocPct[a.id] }}%</span>
        </div>
      </div>

      <div class="round-pnl" :class="roundPnl >= 0 ? 'pnl-up' : 'pnl-down'">
        <span>{{ roundPnl >= 0 ? '📈' : '📉' }}</span>
        <div>
          <p>Round P&L: <strong>{{ roundPnl >= 0 ? '+' : '' }}${{ Math.round(roundPnl) }}</strong></p>
          <p>Portfolio: <strong>${{ Math.round(capital) }}</strong></p>
        </div>
      </div>

      <div class="insight-row">
        <p v-for="ins in roundInsights" :key="ins" class="insight">💡 {{ ins }}</p>
      </div>

      <button class="btn-primary" @click="nextRound">
        {{ currentRound < roundCount ? 'Next Round →' : 'See Final Results →' }}
      </button>
    </div>

    <!-- ══ FINAL RESULT ════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase">
      <div class="final-header" :class="finalGain >= 0 ? 'win' : 'loss'">
        <span class="final-icon">{{ finalGain >= 0 ? '🏆' : '📉' }}</span>
        <h2>{{ finalGain >= 0 ? 'Profitable Trader!' : 'Market Lesson Learned' }}</h2>
        <p>
          Started with <strong>${{ startingCapital }}</strong> →
          Ended with <strong>${{ Math.round(capital) }}</strong>
          ({{ finalGain >= 0 ? '+' : '' }}{{ finalGain.toFixed(1) }}%)
        </p>
      </div>

      <div class="lessons">
        <h3>📚 Key Lessons</h3>
        <div v-for="l in lessons" :key="l" class="lesson-item">{{ l }}</div>
      </div>

      <div class="reward-box">
        <p>Reward: <strong class="coins">+{{ rewardCoins }} 🪙</strong></p>
      </div>

      <button class="btn-primary" @click="finish">Finish</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { usePlayerStore } from '../../store/player'

const emit   = defineEmits(['game-completed'])
const player = usePlayerStore()
const variant = computed(() => Math.min(player.diaActual, 4))

// ── ASSETS ────────────────────────────────────────────────────────────────

const allAssets = [
  { id: 'tech',  emoji: '💻', name: 'Tech Stocks',    description: 'High growth — sensitive to interest rates' },
  { id: 'oil',   emoji: '🛢️', name: 'Oil & Energy',   description: 'Linked to OPEC and geopolitics' },
  { id: 'bonds', emoji: '🏛️', name: 'Gov. Bonds',      description: 'Safe haven — inverse to stocks' },
  { id: 'real',  emoji: '🏠', name: 'Real Estate',     description: 'Inflation hedge — slow mover' },
]

const assets = computed(() => {
  const counts = { 1: 2, 2: 3, 3: 4, 4: 4 }
  return allAssets.slice(0, counts[variant.value] ?? 4)
})

const startingCapital = computed(() => ({ 1: 500, 2: 700, 3: 1000, 4: 1000 }[variant.value] ?? 1000))
const roundCount       = computed(() => ({ 1: 2, 2: 3, 3: 3, 4: 4 }[variant.value] ?? 4))

// ── NEWS POOL ─────────────────────────────────────────────────────────────
// Each item: headline, source, effects per asset (%), hint, trap flag

const newsPool = [
  {
    headline: "Federal Reserve raises interest rates by 0.5% to combat inflation",
    source: "REUTERS",
    hint: "Higher rates → cheaper borrowing unlikely → tech growth slows. Bonds become more attractive.",
    effects: { tech: -8, oil: -2, bonds: +6, real: -4 },
    trap: false
  },
  {
    headline: "OPEC+ unanimously agrees to cut oil production by 1.5 million barrels/day",
    source: "BLOOMBERG",
    hint: "Less supply = higher oil prices. Energy stocks benefit directly.",
    effects: { tech: -1, oil: +10, bonds: 0, real: +1 },
    trap: false
  },
  {
    headline: "Inflation SLOWS to 4.2% — lowest reading in 18 months",
    source: "WSJ",
    hint: "SLOWS sounds bad but it's an improvement. Fed less likely to raise rates → tech and growth stocks recover.",
    effects: { tech: +7, oil: -2, bonds: -3, real: +2 },
    trap: true
  },
  {
    headline: "Major tech company posts RECORD quarterly losses of $2.1 billion",
    source: "CNBC",
    hint: "Surprise: stock may GO UP. If losses were expected to be worse, 'beating expectations' triggers buying.",
    effects: { tech: +5, oil: 0, bonds: +1, real: 0 },
    trap: true
  },
  {
    headline: "Unemployment drops to 3.4%, a 50-year low",
    source: "FT",
    hint: "Low unemployment sounds great — but it signals inflation risk → Fed may raise rates → mixed for stocks.",
    effects: { tech: -3, oil: +1, bonds: -2, real: +3 },
    trap: true
  },
  {
    headline: "Trade war escalates: 25% tariff imposed on imported electronics",
    source: "REUTERS",
    hint: "Tariffs hurt importers (tech hardware) but domestic manufacturers benefit slightly.",
    effects: { tech: -9, oil: -1, bonds: +4, real: +2 },
    trap: false
  },
  {
    headline: "Global GDP growth forecast upgraded to 3.1% for next year",
    source: "IMF REPORT",
    hint: "Stronger economic growth → companies earn more → most assets benefit. Oil demand increases too.",
    effects: { tech: +8, oil: +6, bonds: -2, real: +4 },
    trap: false
  },
  {
    headline: "Central bank cuts rates by 0.25% citing 'cooling economy'",
    source: "BLOOMBERG",
    hint: "Rate cuts = cheaper money → tech and growth stocks love this. Bonds less attractive at lower yields.",
    effects: { tech: +9, oil: +2, bonds: -4, real: +5 },
    trap: false
  },
  {
    headline: "Oil supply disruption in Middle East raises geopolitical tensions",
    source: "REUTERS",
    hint: "Geopolitical risk → investors flee to safe havens (bonds, gold). Oil price spike short-term.",
    effects: { tech: -4, oil: +12, bonds: +5, real: -1 },
    trap: false
  },
  {
    headline: "New regulation: tech companies must pay 15% global minimum tax",
    source: "FT",
    hint: "More taxes on profits → directly reduces tech earnings. Straightforward negative.",
    effects: { tech: -7, oil: 0, bonds: +3, real: 0 },
    trap: false
  },
  {
    headline: "Real estate prices fall 8% in major cities — 'market correction'",
    source: "WSJ",
    hint: "'Correction' sounds alarming — but a cheaper entry point may attract investors. Short-term negative, long-term opportunity.",
    effects: { tech: 0, oil: 0, bonds: +2, real: -6 },
    trap: true
  },
  {
    headline: "Consumer spending surges 5.3% — strongest growth since 2019",
    source: "CNBC",
    hint: "Strong consumer spending → companies sell more → most sectors benefit. Possible inflation signal.",
    effects: { tech: +6, oil: +3, bonds: -1, real: +4 },
    trap: false
  }
]

// ── STATE ─────────────────────────────────────────────────────────────────

const phase        = ref('intro')
const capital      = ref(0)
const currentRound = ref(1)
const allocPct     = reactive({})
const lastReturns  = reactive({})
const roundPnl     = ref(0)
const roundInsights = ref([])
const usedNewsIdx  = ref([])
const currentRoundNews = ref([])
const rewardCoins  = ref(0)
const timerSec     = ref(15)
const timerPct     = ref(100)
let timerInterval  = null

const totalAllocated = computed(() => assets.value.reduce((s, a) => s + (allocPct[a.id] ?? 0), 0))
const finalGain      = computed(() => ((capital.value - startingCapital.value) / startingCapital.value) * 100)

// ── LESSONS PER ASSET ─────────────────────────────────────────────────────

const lessons = computed(() => {
  const base = [
    "📰 Headlines often mislead — always ask: 'Is this actually BETTER or WORSE than expected?'",
    "💰 Diversification reduces risk but also limits maximum gains.",
    "🏛️ Bonds and stocks often move in OPPOSITE directions — balance them for safety.",
  ]
  if (variant.value >= 3) base.push("📉 'Record losses' can trigger a STOCK RALLY if investors expected worse.")
  if (variant.value >= 4) base.push("🌍 Geopolitical events create short-term volatility — long-term trends matter more.")
  return base
})

// ── INIT ──────────────────────────────────────────────────────────────────

const startGame = () => {
  capital.value = startingCapital.value
  assets.value.forEach(a => { allocPct[a.id] = 0; lastReturns[a.id] = 0 })
  phase.value = 'reading'
  loadRoundNews()
  startTimer()
}

const loadRoundNews = () => {
  const available = newsPool
    .map((n, i) => ({ ...n, idx: i }))
    .filter(n => !usedNewsIdx.value.includes(n.idx))
  const newsPerRound = variant.value >= 3 ? 3 : 2
  const picked = available.sort(() => 0.5 - Math.random()).slice(0, newsPerRound)
  picked.forEach(n => usedNewsIdx.value.push(n.idx))
  currentRoundNews.value = picked.map(n => ({ ...n, hintVisible: false }))
}

const startTimer = () => {
  timerSec.value = { 1: 20, 2: 18, 3: 15, 4: 12 }[variant.value] ?? 15
  timerPct.value = 100
  const total = timerSec.value
  timerInterval = setInterval(() => {
    timerSec.value--
    timerPct.value = (timerSec.value / total) * 100
    if (timerSec.value <= 0) { clearInterval(timerInterval); goToAllocation() }
  }, 1000)
}

const goToAllocation = () => {
  clearInterval(timerInterval)
  // Show hints only in higher variants
  if (variant.value >= 3) {
    currentRoundNews.value.forEach(n => { n.hintVisible = true })
  }
  phase.value = 'allocating'
}

const adjustPct = (id, delta) => {
  const newVal = (allocPct[id] ?? 0) + delta
  if (newVal < 0) return
  if (totalAllocated.value + delta > 100) return
  allocPct[id] = newVal
}

// ── RESOLVE ROUND ─────────────────────────────────────────────────────────

const resolveRound = () => {
  // Average effects from this round's news
  const avgEffects = {}
  assets.value.forEach(a => { avgEffects[a.id] = 0 })
  currentRoundNews.value.forEach(n => {
    assets.value.forEach(a => {
      avgEffects[a.id] = (avgEffects[a.id] ?? 0) + (n.effects[a.id] ?? 0)
    })
  })
  assets.value.forEach(a => {
    avgEffects[a.id] /= currentRoundNews.value.length
    // Add small noise
    avgEffects[a.id] += (Math.random() - 0.5) * 2
    lastReturns[a.id] = avgEffects[a.id]
  })

  // Cash keeps inflation drag
  const cashPct = (100 - totalAllocated.value) / 100
  let newCapital = capital.value * cashPct * 0.997 // cash loses 0.3%

  assets.value.forEach(a => {
    const invested = capital.value * (allocPct[a.id] ?? 0) / 100
    newCapital += invested * (1 + avgEffects[a.id] / 100)
  })

  roundPnl.value = newCapital - capital.value
  capital.value  = Math.round(newCapital)

  // Build insights
  roundInsights.value = []
  currentRoundNews.value.filter(n => n.trap).forEach(n => {
    roundInsights.value.push(n.hint)
  })

  phase.value = 'round-result'
}

const nextRound = () => {
  if (currentRound.value >= roundCount.value) {
    computeReward()
    phase.value = 'result'
  } else {
    currentRound.value++
    assets.value.forEach(a => { allocPct[a.id] = 0 })
    loadRoundNews()
    phase.value = 'reading'
    startTimer()
  }
}

const computeReward = () => {
  const base = [20, 30, 40, 55][variant.value - 1] ?? 30
  const gain = finalGain.value
  const mult = gain > 20 ? 1.5 : gain > 5 ? 1.0 : gain > -5 ? 0.7 : 0.4
  rewardCoins.value = Math.round(base * mult)
}

const finish = () => {
  const res = player.jugarMinijuego('quiz', rewardCoins.value)
  emit('game-completed', {
    success:    finalGain.value >= 0,
    recompensa: res.recompensa,
    title:      finalGain.value >= 0 ? 'Profitable Trader!' : 'Market lesson learned',
    msg: `You turned $${startingCapital.value} into $${Math.round(capital.value)} (${finalGain.value >= 0 ? '+' : ''}${finalGain.value.toFixed(1)}%). Reading news critically is a financial superpower.`
  })
}
</script>

<style scoped>
.im-container { max-width: 680px; margin: 0 auto; }
.phase { animation: fadeSlide 0.3s ease; }
@keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

h2 { text-align: center; color: var(--primary-color); }
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
.subtitle { text-align: center; color: #636e72; margin-bottom: 1.5rem; }

/* Intro */
.intro-box { background: #f8fafc; border-radius: var(--border-radius-md); padding: 1.5rem; margin-bottom: 1rem; }
.intro-box p { line-height: 1.7; margin-bottom: 1rem; text-align: center; }
.rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.rule { background: white; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; }
.assets-preview { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1.25rem; }
.asset-chip { background: white; border: 2px solid #dfe6e9; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.9rem; display: flex; gap: 0.4rem; align-items: center; }

/* Round header */
.round-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.round-badge { background: var(--primary-color); color: white; padding: 0.3rem 0.9rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem; }
.capital-display { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 700; color: #00b894; }

/* News */
.news-panel { background: #1a1a2e; border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
.news-panel h3 { color: #edf2f7; margin: 0 0 1rem; }
.news-item { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #2d2d4e; }
.news-item:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.news-source { font-size: 0.7rem; font-weight: 800; color: #a29bfe; text-transform: uppercase; letter-spacing: 0.1em; }
.news-headline { color: #edf2f7; font-size: 1rem; font-weight: 700; margin: 0.3rem 0 0; line-height: 1.4; }
.news-hint { display: block; margin-top: 0.5rem; color: #fdcb6e; font-size: 0.82rem; font-style: italic; line-height: 1.5; }

/* Timer */
.reading-timer { text-align: center; }
.timer-bar { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 0.75rem; }
.timer-fill { height: 100%; background: var(--primary-color); border-radius: 4px; transition: width 1s linear; }
.reading-timer p { color: #636e72; margin-bottom: 0.75rem; }

/* Allocation */
.allocation-section h3 { margin: 0 0 0.4rem; }
.alloc-hint { color: #636e72; font-size: 0.9rem; margin-bottom: 1rem; }
.asset-row { display: flex; align-items: center; gap: 0.75rem; background: white; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 0.6rem; box-shadow: var(--shadow-sm); flex-wrap: wrap; }
.asset-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
.a-emoji { font-size: 1.8rem; }
.a-name { font-weight: 800; font-size: 0.95rem; display: block; }
.a-desc { font-size: 0.78rem; color: #636e72; }
.pct-control { display: flex; align-items: center; gap: 0.5rem; }
.pct-control button { width: 32px; height: 32px; border: 2px solid #dfe6e9; background: white; border-radius: 50%; font-size: 1.2rem; cursor: pointer; font-weight: 800; transition: all 0.15s; }
.pct-control button:not(:disabled):hover { border-color: var(--primary-color); background: #eef0ff; }
.pct-control button:disabled { opacity: 0.4; cursor: not-allowed; }
.pct-val { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; min-width: 3rem; text-align: center; }
.dollar-val { font-size: 1rem; font-weight: 700; color: #00b894; min-width: 60px; text-align: right; }
.total-row { text-align: center; padding: 0.65rem 1rem; border-radius: 10px; font-weight: 700; margin-bottom: 1rem; font-size: 0.9rem; }
.total-row.ok { background: #d1fae5; color: #065f46; }
.total-row.warn { background: #fef3c7; color: #92400e; }

/* Round result */
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
.asset-result { background: white; border-radius: 12px; padding: 1rem; text-align: center; box-shadow: var(--shadow-sm); }
.asset-result.up { border-top: 3px solid #00b894; }
.asset-result.down { border-top: 3px solid #d63031; }
.ar-emoji { font-size: 2rem; display: block; }
.ar-name { font-size: 0.82rem; font-weight: 700; display: block; margin: 0.3rem 0; }
.ar-return { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 700; display: block; }
.asset-result.up .ar-return { color: #00b894; }
.asset-result.down .ar-return { color: #d63031; }
.ar-alloc { font-size: 0.75rem; color: #636e72; display: block; margin-top: 0.3rem; }

.round-pnl { display: flex; align-items: center; gap: 1rem; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
.pnl-up { background: #d1fae5; color: #065f46; }
.pnl-down { background: #fee2e2; color: #991b1b; }
.round-pnl span { font-size: 2rem; }
.round-pnl p { margin: 0.2rem 0; font-size: 0.95rem; }

.insight-row { margin-bottom: 1rem; }
.insight { background: #eef0ff; color: #3730a3; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; }

/* Final */
.final-header { text-align: center; border-radius: var(--border-radius-lg); padding: 2rem; margin-bottom: 1.5rem; }
.final-icon { font-size: 4rem; display: block; margin-bottom: 0.5rem; }
.final-header.win  { background: linear-gradient(135deg, #00b894, #55efc4); color: white; }
.final-header.loss { background: linear-gradient(135deg, #b2bec3, #636e72); color: white; }
.final-header h2 { color: white; margin: 0.25rem 0 0.5rem; }
.final-header p { opacity: 0.9; margin: 0; }

.lessons { background: #1a1a2e; border-radius: var(--border-radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
.lessons h3 { color: #edf2f7; margin: 0 0 0.75rem; }
.lesson-item { color: #a8b2d8; font-size: 0.88rem; padding: 0.5rem 0; border-bottom: 1px solid #2d2d4e; line-height: 1.5; }
.lesson-item:last-child { border-bottom: none; }

.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
.btn-primary { display: block; width: 100%; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.9rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }
.btn-secondary { background: white; border: 2px solid var(--primary-color); color: var(--primary-color); padding: 0.65rem 1.5rem; border-radius: 50px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
.btn-secondary:hover { background: #eef0ff; }
</style>
