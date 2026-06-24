<template>
  <div class="financial-runner">

    <!-- ── INTRO ──────────────────────────────────────────────────────── -->
    <div v-if="phase === 'intro'" class="fr-intro">
      <div class="fr-hero">
        <div class="hero-emojis">🏃💨💰🏦🌆</div>
        <h1>Financial Runner</h1>
        <p class="fr-sub">{{ t('subtitle') }}</p>
      </div>

      <div class="fr-legend">
        <div class="leg-col leg-pos">
          <h4>✅ {{ t('collect') }}</h4>
          <div v-for="it in SHOW_POS" :key="it.emoji" class="leg-row">
            <span class="leg-em">{{ it.emoji }}</span>
            <div><strong>{{ t(it.nk) }}</strong><small>{{ t(it.dk) }}</small></div>
          </div>
        </div>
        <div class="leg-col leg-neg">
          <h4>❌ {{ t('avoid') }}</h4>
          <div v-for="it in SHOW_NEG" :key="it.emoji" class="leg-row">
            <span class="leg-em">{{ it.emoji }}</span>
            <div><strong>{{ t(it.nk) }}</strong><small>{{ t(it.dk) }}</small></div>
          </div>
        </div>
      </div>

      <div class="fr-hint">{{ t('ctrlHint') }}</div>

      <div class="fr-goal-row">
        <span>🏆 {{ t('goal') }}: {{ WIN_DIST }}m</span>
        <span>⚡ 1 {{ t('energy') }}</span>
      </div>

      <p v-if="!hasEnergy" class="no-energy">⚡ {{ t('noEnergy') }}</p>
      <button v-else class="fr-btn" @click="startGame">{{ t('play') }} 🚀</button>
    </div>

    <!-- ── PLAYING ─────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'playing'" class="fr-playing">
      <div class="fr-hud">
        <div class="hud-stat">
          <span class="hud-lbl">📏</span>
          <span class="hud-val">{{ Math.floor(dDist) }}m</span>
        </div>
        <div class="hud-health">
          <div class="health-bar">
            <div class="health-fill" :style="{width: dHealth+'%', background: hColor}"></div>
          </div>
          <span class="health-pct" :style="{color: hColor}">{{ dHealth }}%</span>
        </div>
        <div class="hud-stat">
          <span class="hud-lbl">💰</span>
          <span class="hud-val hud-coins">{{ dCoins }}</span>
        </div>
      </div>

      <div class="fr-prog">
        <div class="fr-prog-fill" :style="{width: Math.min(dDist/WIN_DIST*100,100)+'%'}"></div>
        <span class="fr-prog-txt">{{ Math.floor(dDist) }}/{{ WIN_DIST }}m</span>
      </div>

      <canvas ref="cvs" width="480" height="260" class="fr-canvas"></canvas>

      <transition name="msg-pop">
        <div v-if="eduMsg" class="fr-msg" :class="eduPos ? 'msg-pos' : 'msg-neg'">{{ eduMsg }}</div>
      </transition>

      <div class="fr-ctrl-btns">
        <button class="fr-mv-btn" @click="laneUp">⬆ {{ t('up') }}</button>
        <button class="fr-mv-btn" @click="laneDown">⬇ {{ t('down') }}</button>
      </div>
    </div>

    <!-- ── RESULT ──────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'result'" class="fr-result">
      <div class="res-icon">{{ won ? '🏆' : '💔' }}</div>
      <h2 :class="won ? 'r-win' : 'r-lose'">{{ won ? t('youWin') : t('youLose') }}</h2>

      <div class="r-stats">
        <div class="r-stat"><span>📏 {{ t('dist') }}</span><strong>{{ Math.floor(fDist) }}m</strong></div>
        <div class="r-stat"><span>💰 {{ t('collected') }}</span><strong>{{ fCoins }}</strong></div>
        <div class="r-stat"><span>💥 {{ t('hits') }}</span><strong>{{ fHits }}</strong></div>
        <div class="r-stat" :class="won ? 'r-pos' : 'r-neg'">
          <span>🎁 {{ t('reward') }}</span>
          <strong>{{ won ? '+10' : (penalty ? '-5' : '$0') }}</strong>
        </div>
      </div>

      <div class="r-edu">{{ eduSummary }}</div>
      <button class="fr-btn" @click="finish">{{ t('finish') }}</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../../store/player'

const props = defineProps({ language: { type: String, default: 'es' } })
const emit  = defineEmits(['game-completed'])
const player = usePlayerStore()
const isEN   = computed(() => props.language === 'en')
const t      = k => (isEN.value ? TEXTS.en : TEXTS.es)[k] ?? k

// ── TEXTS ──────────────────────────────────────────────────────────────────
const TEXTS = {
  es: {
    subtitle:  'Corre por la ciudad financiera: recoge monedas y esquiva deudas',
    collect: 'Recoger', avoid: 'Evitar',
    coin: 'Moneda', coinD: '+salud, +puntos',
    savings: 'Alcancía', savingsD: '+salud extra y monedas',
    impulse: 'Compra Impulsiva', impulseD: '−salud severa',
    fine: 'Multa', fineD: '−salud moderada',
    debt: 'Deuda', debtD: '−salud grave',
    ctrlHint: 'Usa ⬆ ⬇ o las flechas del teclado para cambiar de carril',
    goal: 'Meta', energy: 'energía',
    noEnergy: 'Sin energía. ¡Termina el día para recuperarla!',
    play: 'Correr', dist: 'Distancia', health: 'Salud', coins: 'Monedas',
    up: 'Arriba', down: 'Abajo',
    youWin: '¡Meta alcanzada! 🎉', youLose: '¡Sin salud financiera!',
    collected: 'Monedas recogidas', hits: 'Golpes recibidos', reward: 'Recompensa',
    finish: 'Terminar',
    winMsg: '¡Excelente! Corriste con inteligencia financiera. El ahorro y las buenas decisiones te llevaron hasta la meta.',
    loseMsg: 'Las compras impulsivas y las deudas frenaron tu carrera. Planifica mejor tus gastos para llegar más lejos.',
    msgs: {
      p1: '💡 Ahorrar hoy te ayuda a cumplir metas mañana.',
      p2: '🌱 Guardar monedas fortalece tu futuro financiero.',
      p3: '📈 ¡Bien! El ahorro constante crea riqueza a largo plazo.',
      p4: '🏦 Depositar en una alcancía es el primer paso al ahorro.',
      n1: '⚠️ Las compras impulsivas reducen tu salud financiera.',
      n2: '📉 Las multas son gastos evitables con más atención.',
      n3: '💳 Las deudas acumuladas son difíciles de superar.',
    }
  },
  en: {
    subtitle:  'Run through the financial city — collect coins and dodge debts!',
    collect: 'Collect', avoid: 'Avoid',
    coin: 'Coin', coinD: '+health, +points',
    savings: 'Piggy Bank', savingsD: '+extra health and coins',
    impulse: 'Impulse Buy', impulseD: '−severe health',
    fine: 'Fine', fineD: '−moderate health',
    debt: 'Debt', debtD: '−severe health',
    ctrlHint: 'Use ⬆ ⬇ arrow keys or the buttons to switch lanes',
    goal: 'Goal', energy: 'energy',
    noEnergy: 'No energy left. Finish the day to recover it!',
    play: 'Run', dist: 'Distance', health: 'Health', coins: 'Coins',
    up: 'Up', down: 'Down',
    youWin: 'Goal Reached! 🎉', youLose: 'No Financial Health!',
    collected: 'Coins collected', hits: 'Obstacles hit', reward: 'Reward',
    finish: 'Finish',
    winMsg: 'Excellent! You ran with financial intelligence. Savings and smart decisions carried you to the goal.',
    loseMsg: 'Impulse purchases and debts slowed your run. Plan your spending better to go further.',
    msgs: {
      p1: '💡 Saving today helps you reach tomorrow\'s goals.',
      p2: '🌱 Collecting coins strengthens your financial future.',
      p3: '📈 Great! Consistent savings build long-term wealth.',
      p4: '🏦 A piggy bank is the first step to financial freedom.',
      n1: '⚠️ Impulse purchases reduce your financial health.',
      n2: '📉 Fines are avoidable costs with more attention.',
      n3: '💳 Accumulated debt is hard to overcome.',
    }
  }
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const WIN_DIST  = 1000
const CW = 480, CH = 260, SKY_H = 60
const LANE_Y    = [SKY_H + 33, SKY_H + 100, SKY_H + 167]  // 93, 160, 227
const CHAR_X    = 85
const HIT_R     = 26
const INIT_SPD  = 2.5
const MAX_SPD   = 8

const ITEM_DEFS = {
  coin:    { emoji: '💰', pos: true,  hp: +5,  sc: 1 },
  savings: { emoji: '🏦', pos: true,  hp: +15, sc: 3 },
  impulse: { emoji: '🎮', pos: false, hp: -22, sc: 0 },
  fine:    { emoji: '📄', pos: false, hp: -18, sc: 0 },
  debt:    { emoji: '💳', pos: false, hp: -28, sc: 0 },
}
const SPAWN_POOL = [
  'coin','coin','coin','coin','coin',
  'savings','savings',
  'impulse','impulse','impulse',
  'fine','fine',
  'debt',
]

const SHOW_POS = [
  { emoji:'💰', nk:'coin',    dk:'coinD'    },
  { emoji:'🏦', nk:'savings', dk:'savingsD' },
]
const SHOW_NEG = [
  { emoji:'🎮', nk:'impulse', dk:'impulseD' },
  { emoji:'📄', nk:'fine',    dk:'fineD'    },
  { emoji:'💳', nk:'debt',    dk:'debtD'    },
]

// Tiling buildings for parallax
const BLDGS = [
  {x:0,   w:55, h:62,  c:'#7986CB'},
  {x:60,  w:44, h:82,  c:'#4DB6AC'},
  {x:110, w:58, h:52,  c:'#FFB74D'},
  {x:174, w:48, h:88,  c:'#F06292'},
  {x:228, w:68, h:62,  c:'#7986CB'},
  {x:302, w:44, h:74,  c:'#A5D6A7'},
  {x:352, w:58, h:86,  c:'#FF8A65'},
  {x:416, w:52, h:58,  c:'#4DB6AC'},
]
const BG_W = 474

// Lane colors (top=park, mid=road, bot=alley)
const LANE_COLORS = ['#A5D6A7', '#90A4AE', '#78909C']

// ── VUE REFS (HUD + result) ────────────────────────────────────────────────
const phase      = ref('intro')
const dDist      = ref(0)
const dHealth    = ref(70)
const dCoins     = ref(0)
const eduMsg     = ref('')
const eduPos     = ref(true)
const eduSummary = ref('')
const won        = ref(false)
const penalty    = ref(false)
const fDist      = ref(0)
const fCoins     = ref(0)
const fHits      = ref(0)
const cvs        = ref(null)

const hasEnergy = computed(() => player.energiaActual > 0)
const hColor    = computed(() => {
  const h = dHealth.value
  return h >= 60 ? '#00b894' : h >= 30 ? '#fdcb6e' : '#d63031'
})

// ── GAME STATE (mutable, outside Vue reactivity) ───────────────────────────
let g        = null
let rafId    = null
let lastTs   = 0
let eduTimer = null

function mkG() {
  return {
    running:  false,
    lane:     1,
    charY:    LANE_Y[1],
    targetY:  LANE_Y[1],
    bounceY:  0,
    items:    [],
    bgX:      0,
    spd:      INIT_SPD,
    dist:     0,
    frame:    0,
    hitFlash: 0,
    gainFlash:0,
    spawnCD:  80,
    health:   70,
    coinsTotal:0,
    hits:     0,
  }
}

// ── LOOP ───────────────────────────────────────────────────────────────────
function loop(ts) {
  if (!g?.running) return
  const dt = Math.min((ts - lastTs) / 16.67, 3)
  lastTs = ts
  update(dt)
  draw()
  rafId = requestAnimationFrame(loop)
}

function update(dt) {
  // Lane interpolation
  g.charY   += (g.targetY - g.charY) * Math.min(0.22 * dt, 1)
  g.bounceY *= Math.pow(0.78, dt)

  // Background scroll
  g.bgX += g.spd * 0.38 * dt

  // Move items
  for (const it of g.items) it.x -= g.spd * dt
  g.items = g.items.filter(it => it.x > -42)

  // Spawn
  g.spawnCD -= g.spd * dt
  if (g.spawnCD <= 0) {
    const type = SPAWN_POOL[Math.floor(Math.random() * SPAWN_POOL.length)]
    g.items.push({ type, x: CW + 32, y: LANE_Y[Math.floor(Math.random() * 3)] })
    g.spawnCD = 65 + Math.random() * 90
  }

  // Collisions
  const cy = g.charY + g.bounceY
  for (let i = g.items.length - 1; i >= 0; i--) {
    const it = g.items[i]
    const dx = it.x - CHAR_X, dy = it.y - cy
    if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
      const def = ITEM_DEFS[it.type]
      g.items.splice(i, 1)
      if (def.pos) {
        g.health      = Math.min(100, g.health + def.hp)
        g.coinsTotal += def.sc
        g.gainFlash   = 1
        dCoins.value  = g.coinsTotal
        dHealth.value = Math.round(g.health)
        showMsg(true)
      } else {
        g.health  = Math.max(0, g.health + def.hp)
        g.hits++
        g.hitFlash = 1
        dHealth.value = Math.round(g.health)
        showMsg(false)
      }
    }
  }

  // Flash decay
  g.hitFlash  = Math.max(0, g.hitFlash  - 0.04 * dt)
  g.gainFlash = Math.max(0, g.gainFlash - 0.055 * dt)

  // Distance + speed
  g.dist += g.spd * dt * 0.055
  g.spd   = Math.min(MAX_SPD, INIT_SPD + g.dist * 0.005)

  // Sync HUD every 4 frames
  g.frame++
  if (g.frame % 4 === 0) dDist.value = g.dist

  // Win / lose
  if (g.health <= 0)       stopGame(false)
  else if (g.dist >= WIN_DIST) stopGame(true)
}

// ── DRAW ───────────────────────────────────────────────────────────────────
function draw() {
  const ctx = cvs.value?.getContext('2d')
  if (!ctx) return

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_H)
  sky.addColorStop(0, '#42A5F5')
  sky.addColorStop(1, '#B3E5FC')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CW, SKY_H)

  // Buildings (parallax tiling)
  const bOff = g.bgX % BG_W
  for (const b of BLDGS) {
    for (let tile = -1; tile <= 1; tile++) {
      const bx = b.x - bOff + tile * BG_W
      if (bx + b.w < 0 || bx > CW) continue
      ctx.fillStyle = b.c
      ctx.fillRect(bx, SKY_H - b.h, b.w, b.h)
      ctx.fillStyle = 'rgba(255,255,255,0.32)'
      for (let wy = SKY_H - b.h + 8; wy < SKY_H - 8; wy += 16) {
        for (let wx = bx + 5; wx < bx + b.w - 7; wx += 13) {
          ctx.fillRect(wx, wy, 7, 9)
        }
      }
    }
  }

  // Lane strips
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = LANE_COLORS[i]
    ctx.fillRect(0, SKY_H + i * 67, CW, 67)
  }

  // Lane dividers
  ctx.setLineDash([22, 16])
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 2
  for (const ly of [SKY_H + 67, SKY_H + 134]) {
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(CW, ly); ctx.stroke()
  }
  ctx.setLineDash([])

  // Ground strip
  ctx.fillStyle = '#4CAF50'
  ctx.fillRect(0, CH - 6, CW, 6)

  // Items
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '26px serif'
  for (const it of g.items) {
    ctx.fillText(ITEM_DEFS[it.type].emoji, it.x, it.y)
  }

  // Character (custom drawn for guaranteed visibility)
  drawCharacter(ctx, CHAR_X, g.charY + g.bounceY)

  // Hit flash (red tint)
  if (g.hitFlash > 0) {
    ctx.fillStyle = `rgba(210,40,40,${g.hitFlash * 0.38})`
    ctx.fillRect(0, 0, CW, CH)
  }
  // Gain flash (gold tint)
  if (g.gainFlash > 0) {
    ctx.fillStyle = `rgba(255,215,0,${g.gainFlash * 0.22})`
    ctx.fillRect(0, 0, CW, CH)
  }
}

// ── CHARACTER DRAWING ──────────────────────────────────────────────────────
function drawCharacter(ctx, x, y) {
  const sw = Math.sin(g.frame * 0.22) * 13   // leg swing amplitude

  ctx.save()
  ctx.lineCap = 'round'

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + 1, y + 22, 17, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Back leg (darker) ──────────────────────────────────────────────────
  ctx.lineWidth = 7
  ctx.strokeStyle = '#1a252f'
  ctx.beginPath()
  ctx.moveTo(x, y + 9)
  ctx.lineTo(x - sw, y + 22)
  ctx.stroke()
  // Back shoe
  ctx.fillStyle = '#922b21'
  ctx.beginPath()
  ctx.ellipse(x - sw, y + 25, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Front leg (lighter) ────────────────────────────────────────────────
  ctx.strokeStyle = '#2C3E50'
  ctx.beginPath()
  ctx.moveTo(x + 2, y + 9)
  ctx.lineTo(x + sw + 2, y + 22)
  ctx.stroke()
  // Front shoe
  ctx.fillStyle = '#E74C3C'
  ctx.beginPath()
  ctx.ellipse(x + sw + 3, y + 25, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Body – bright green shirt ──────────────────────────────────────────
  ctx.fillStyle = '#27AE60'
  ctx.strokeStyle = '#1a7a43'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 12, y + 9)
  ctx.lineTo(x - 13, y - 9)
  ctx.bezierCurveTo(x - 13, y - 14, x + 14, y - 14, x + 13, y - 9)
  ctx.lineTo(x + 12, y + 9)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // $ on shirt
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('$', x + 0.5, y - 0.5)

  // ── Back arm ───────────────────────────────────────────────────────────
  ctx.lineWidth = 5
  ctx.strokeStyle = '#FDCB6E'
  ctx.beginPath()
  ctx.moveTo(x - 11, y - 4)
  ctx.lineTo(x - 21 + sw * 0.55, y + 7)
  ctx.stroke()

  // ── Front arm ──────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(x + 11, y - 4)
  ctx.lineTo(x + 21 - sw * 0.55, y + 7)
  ctx.stroke()

  // ── Head outline (contrast ring) ───────────────────────────────────────
  ctx.fillStyle = '#1a252f'
  ctx.beginPath()
  ctx.arc(x + 1, y - 22, 14, 0, Math.PI * 2)
  ctx.fill()

  // Head (skin)
  ctx.fillStyle = '#FDCB6E'
  ctx.beginPath()
  ctx.arc(x + 1, y - 22, 12, 0, Math.PI * 2)
  ctx.fill()

  // Hair
  ctx.fillStyle = '#2C3E50'
  ctx.beginPath()
  ctx.arc(x + 1, y - 29, 10, Math.PI + 0.4, -0.12)
  ctx.fill()

  // Eye white
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(x + 6, y - 22, 3, 0, Math.PI * 2)
  ctx.fill()
  // Pupil
  ctx.fillStyle = '#2C3E50'
  ctx.beginPath()
  ctx.arc(x + 7, y - 22, 1.8, 0, Math.PI * 2)
  ctx.fill()

  // Smile
  ctx.strokeStyle = '#c0392b'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(x + 4, y - 18, 4, 0.2, Math.PI - 0.2)
  ctx.stroke()

  ctx.restore()
}

// ── CONTROLS ───────────────────────────────────────────────────────────────
function laneUp() {
  if (!g?.running || g.lane <= 0) return
  g.lane--; g.targetY = LANE_Y[g.lane]; g.bounceY = -7
}
function laneDown() {
  if (!g?.running || g.lane >= 2) return
  g.lane++; g.targetY = LANE_Y[g.lane]; g.bounceY = 5
}
function onKey(e) {
  if (phase.value !== 'playing') return
  if (e.key === 'ArrowUp')   { e.preventDefault(); laneUp()   }
  if (e.key === 'ArrowDown') { e.preventDefault(); laneDown() }
}

// ── EDU MESSAGES ───────────────────────────────────────────────────────────
function showMsg(pos) {
  const m = isEN.value ? TEXTS.en.msgs : TEXTS.es.msgs
  const pool = pos ? [m.p1, m.p2, m.p3, m.p4] : [m.n1, m.n2, m.n3]
  eduMsg.value = pool[Math.floor(Math.random() * pool.length)]
  eduPos.value = pos
  if (eduTimer) clearTimeout(eduTimer)
  eduTimer = setTimeout(() => { eduMsg.value = '' }, 2800)
}

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
function startGame() {
  g = mkG()
  g.running  = true
  dDist.value = 0; dHealth.value = 70; dCoins.value = 0
  eduMsg.value = ''
  phase.value  = 'playing'
  lastTs       = performance.now()
  rafId        = requestAnimationFrame(loop)
}

function stopGame(didWin) {
  if (g) g.running = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  won.value     = didWin
  penalty.value = !didWin && player.dineroDisponible >= 5
  fDist.value   = g?.dist ?? 0
  fCoins.value  = g?.coinsTotal ?? 0
  fHits.value   = g?.hits ?? 0
  dDist.value   = g?.dist ?? 0
  dHealth.value = Math.max(0, Math.round(g?.health ?? 0))
  eduSummary.value = didWin ? t('winMsg') : t('loseMsg')
  phase.value = 'result'
}

function finish() {
  if (won.value) {
    const res = player.jugarMinijuego('runner', 10)
    emit('game-completed', {
      success: true,
      recompensa: res.recompensa,
      title: t('youWin'),
      msg: `${t('dist')}: ${Math.floor(fDist.value)}m — ${fCoins.value} 💰`
    })
  } else {
    if (penalty.value) player.gastarDinero(5)
    player.jugarMinijuego('runner', 0)
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
  if (rafId)    cancelAnimationFrame(rafId)
  if (eduTimer) clearTimeout(eduTimer)
  if (g) g.running = false
})
</script>

<style scoped>
/* ── CONTAINER ───────────────────────────────────────────────────────────── */
.financial-runner {
  font-family: 'Fredoka', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  user-select: none;
}

/* ── INTRO ───────────────────────────────────────────────────────────────── */
.fr-intro { display: flex; flex-direction: column; gap: 1.1rem; }
.fr-hero { text-align: center; }
.hero-emojis { font-size: 2rem; letter-spacing: 0.2rem; margin-bottom: 0.3rem; }
.fr-hero h1 {
  font-size: 2.4rem; margin: 0.1rem 0;
  background: linear-gradient(135deg, #00b894, #0984e3, #e17055);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fr-sub { color: #636e72; font-size: 0.93rem; margin: 0; }

.fr-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.leg-col { background: #f8fafc; border-radius: 12px; padding: 0.8rem; }
.leg-col h4 { margin: 0 0 0.55rem; font-size: 0.82rem; font-weight: 800; }
.leg-pos h4 { color: #065f46; }
.leg-neg h4 { color: #991b1b; }
.leg-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.45rem; }
.leg-em { font-size: 1.5rem; }
.leg-row strong { font-size: 0.82rem; display: block; color: #2d3436; }
.leg-row small  { font-size: 0.7rem; color: #636e72; }

.fr-hint { background: #eef0ff; color: #5b5bf6; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; text-align: center; }

.fr-goal-row { display: flex; justify-content: space-between; background: #f8fafc; padding: 0.62rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; color: #2d3436; }

.no-energy { text-align: center; color: #d63031; font-weight: 700; background: #fee2e2; padding: 0.75rem; border-radius: 10px; margin: 0; }

.fr-btn {
  width: 100%; padding: 0.9rem;
  background: linear-gradient(135deg, #00b894, #0984e3);
  color: white; border: none; border-radius: 50px;
  font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.fr-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,184,148,0.38); }

/* ── PLAYING ─────────────────────────────────────────────────────────────── */
.fr-playing { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }

.fr-hud {
  width: 100%; display: flex; align-items: center; gap: 0.6rem;
  background: #1a1a2e; border-radius: 12px; padding: 0.52rem 0.8rem;
}
.hud-stat { display: flex; flex-direction: column; align-items: center; min-width: 46px; }
.hud-lbl  { font-size: 0.72rem; }
.hud-val  { font-size: 1.15rem; font-weight: 800; color: #f0f0ff; }
.hud-coins { color: #ffeaa7; }
.hud-health { flex: 1; display: flex; align-items: center; gap: 0.4rem; }
.health-bar { flex: 1; height: 11px; background: #2d2d4e; border-radius: 6px; overflow: hidden; }
.health-fill { height: 100%; border-radius: 6px; transition: width 0.35s, background 0.35s; }
.health-pct  { font-size: 0.76rem; font-weight: 800; min-width: 32px; text-align: right; }

.fr-prog { width: 100%; height: 14px; background: #e2e8f0; border-radius: 7px; overflow: hidden; position: relative; }
.fr-prog-fill { height: 100%; background: linear-gradient(90deg, #00b894, #0984e3); border-radius: 7px; transition: width 0.5s; }
.fr-prog-txt  { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 0.68rem; font-weight: 800; color: #2d3436; }

.fr-canvas { width: 100%; max-width: 480px; height: auto; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: block; }

.fr-msg { width: 100%; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; text-align: center; line-height: 1.4; }
.msg-pos { background: #d1fae5; color: #065f46; }
.msg-neg { background: #fee2e2; color: #991b1b; }
.msg-pop-enter-active, .msg-pop-leave-active { transition: opacity 0.32s, transform 0.32s; }
.msg-pop-enter-from { opacity: 0; transform: translateY(8px); }
.msg-pop-leave-to   { opacity: 0; }

.fr-ctrl-btns { display: flex; gap: 1rem; width: 100%; }
.fr-mv-btn {
  flex: 1; padding: 0.8rem;
  background: linear-gradient(135deg, #2d2d4e, #1a1a2e);
  color: #f0f0ff; border: none; border-radius: 50px;
  font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 700;
  cursor: pointer; touch-action: manipulation; transition: transform 0.1s;
}
.fr-mv-btn:active { transform: scale(0.94); }

/* ── RESULT ──────────────────────────────────────────────────────────────── */
.fr-result { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.res-icon { font-size: 4rem; animation: pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes pop-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.r-win  { color: #00b894; font-size: 2rem; margin: 0; }
.r-lose { color: #d63031; font-size: 2rem; margin: 0; }

.r-stats { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.r-stat  { background: #f8fafc; border-radius: 12px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
.r-stat strong { font-size: 1.1rem; }
.r-pos { background: #d1fae5; grid-column: 1/-1; }
.r-neg { background: #fee2e2; grid-column: 1/-1; }
.r-pos strong { color: #00b894; font-size: 1.3rem; }
.r-neg strong { color: #d63031; font-size: 1.3rem; }

.r-edu { background: #eef0ff; color: #3730a3; border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.55; text-align: center; width: 100%; }
</style>
