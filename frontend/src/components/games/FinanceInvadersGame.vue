<template>
  <div class="finance-invaders">

    <!-- ── INTRO ──────────────────────────────────────────────────────── -->
    <div v-if="phase === 'intro'" class="fi-intro">
      <div class="fi-hero">
        <div class="fi-hero-title">
          <span class="fi-ship-icon">🚀</span>
          <h1>Finance Invaders</h1>
        </div>
        <p class="fi-sub">{{ t('subtitle') }}</p>
      </div>

      <div class="fi-legend">
        <div class="fi-leg-col fi-leg-pos">
          <h4>✅ {{ t('catch') }}</h4>
          <div v-for="it in SHOW_POS" :key="it.type" class="fi-leg-row">
            <span class="fi-lem">{{ it.emoji }}</span>
            <div><strong>{{ t(it.nk) }}</strong><small>{{ t(it.dk) }}</small></div>
          </div>
        </div>
        <div class="fi-leg-col fi-leg-neg">
          <h4>💥 {{ t('shoot') }}</h4>
          <div v-for="it in SHOW_NEG" :key="it.type" class="fi-leg-row">
            <span class="fi-lem">{{ it.emoji }}</span>
            <div><strong>{{ t(it.nk) }}</strong><small>{{ t(it.dk) }}</small></div>
          </div>
        </div>
      </div>

      <div class="fi-pu-row">
        <span v-for="pu in SHOW_PU" :key="pu.emoji" class="fi-pu-badge" :title="t(pu.nk)">
          {{ pu.emoji }}
        </span>
        <span class="fi-pu-label">{{ t('powerups') }}</span>
      </div>

      <div class="fi-ctrl-hint">{{ t('ctrlHint') }}</div>

      <div class="fi-goal-row">
        <span>🏆 {{ t('goal') }}: ${{ WIN_BAL }}</span>
        <span>⚡ 1 {{ t('energy') }}</span>
      </div>

      <p v-if="!hasEnergy" class="no-energy">⚡ {{ t('noEnergy') }}</p>
      <button v-else class="fi-btn" @click="startGame">{{ t('play') }} 🚀</button>
    </div>

    <!-- ── PLAYING ─────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'playing'" class="fi-playing">

      <div class="fi-hud">
        <div class="hud-bal" :class="{'hud-pos': balFlash > 0, 'hud-neg': balFlash === -1}">
          💰 ${{ dBal }}
        </div>
        <div class="hud-wave">🌊 {{ t('wave') }} {{ dWave }}/4</div>
        <div class="hud-score">⭐ {{ dScore }}</div>
        <div v-if="dPu" class="hud-pu">{{ dPu }}</div>
      </div>

      <div class="fi-prog">
        <div class="fi-prog-fill" :style="{width: Math.min(dBal/WIN_BAL*100,100)+'%'}"></div>
        <span class="fi-prog-txt">${{ dBal }} / ${{ WIN_BAL }}</span>
      </div>

      <canvas ref="cvs" width="480" height="260" class="fi-canvas"></canvas>

      <transition name="wave-pop">
        <div v-if="waveMsg" class="fi-wave-msg">{{ waveMsg }}</div>
      </transition>

      <transition name="msg-pop">
        <div v-if="eduMsg" class="fi-edu-msg" :class="eduPos ? 'msg-pos' : 'msg-neg'">{{ eduMsg }}</div>
      </transition>

      <div class="fi-ctrl">
        <button class="fi-cb fi-cb-move"
          @pointerdown="mleft=true" @pointerup="mleft=false" @pointerleave="mleft=false">◀</button>
        <button class="fi-cb fi-cb-shoot"
          @pointerdown="mshoot=true" @pointerup="mshoot=false" @pointerleave="mshoot=false">🔫</button>
        <button class="fi-cb fi-cb-move"
          @pointerdown="mright=true" @pointerup="mright=false" @pointerleave="mright=false">▶</button>
      </div>
    </div>

    <!-- ── RESULT ──────────────────────────────────────────────────────── -->
    <div v-else-if="phase === 'result'" class="fi-result">
      <div class="res-icon">{{ won ? '🏆' : '💸' }}</div>
      <h2 :class="won ? 'r-win' : 'r-lose'">{{ won ? t('youWin') : t('youLose') }}</h2>

      <div class="r-stats">
        <div class="r-stat"><span>💰 {{ t('balance') }}</span><strong>${{ fBal }}</strong></div>
        <div class="r-stat"><span>⭐ {{ t('score') }}</span><strong>{{ fScore }}</strong></div>
        <div class="r-stat"><span>💥 {{ t('destroyed') }}</span><strong>{{ fKills }}</strong></div>
        <div class="r-stat"><span>🎁 {{ t('caught') }}</span><strong>{{ fCaught }}</strong></div>
        <div class="r-stat" :class="won ? 'r-pos' : 'r-neg'">
          <span>🎁 {{ t('reward') }}</span>
          <strong>{{ won ? '+10' : (penaltyOk ? '-5' : '$0') }}</strong>
        </div>
      </div>

      <div class="r-edu">{{ eduSummary }}</div>
      <button class="fi-btn" @click="finish">{{ t('finish') }}</button>
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
    subtitle:  'Defiende tu economía: dispara las deudas y captura los ingresos',
    catch: 'Capturar (dejar llegar)', shoot: 'Disparar (destruir)',
    income:'Ingreso', incomeD:'Muévete debajo para capturarlo',
    salary:'Salario', salaryD:'Captura el pago mensual',
    bonus:'Bono', bonusD:'¡Un ingreso extra!',
    invest:'Inversión', investD:'El mejor ingreso — ¡no lo dispares!',
    impulse:'Gasto Impulsivo', impulseD:'Dispara antes que llegue',
    debt:'Deuda', debtD:'Crece si no la eliminas rápido',
    fine:'Multa', fineD:'Gasto evitable',
    subs:'Suscripción', subsD:'Drena el saldo lentamente',
    tax:'Impuesto', taxD:'Aparece en patrones inesperados',
    shield:'Fondo de Emergencia', slow:'Educación Financiera',
    multi:'Ingreso Extra', burst:'Optimización de Gastos',
    powerups: '← Power-ups disponibles',
    ctrlHint: '⬅ ➡ para mover • 🔫 para disparar • ¡Captura los verdes!',
    goal:'Meta de ahorro', energy:'energía',
    noEnergy: 'Sin energía. ¡Termina el día para recuperarla!',
    play:'¡Defender!', wave:'Oleada', balance:'Saldo final',
    score:'Puntaje', destroyed:'Destruidos', caught:'Capturados', reward:'Recompensa',
    youWin:'¡Meta alcanzada! 🎉', youLose:'¡Saldo agotado!',
    finish:'Terminar',
    winMsg: '¡Excelente gestión! Disparaste los gastos a tiempo y capturaste los ingresos clave. Eso es educación financiera en acción.',
    loseMsg: 'Las deudas y gastos impulsivos acabaron con tu saldo. Recuerda: eliminar gastos y capturar ingresos es la clave para la salud financiera.',
    msgs: {
      p1:'💡 Capturar ingresos y eliminar deudas fortalece tu economía.',
      p2:'📈 ¡Bien! Los ingresos bien gestionados construyen riqueza.',
      p3:'🏦 Ahorrar parte de cada ingreso te da estabilidad.',
      p4:'🎁 Los bonos son ingresos extra — ¡no los desperdicies disparando!',
      n1:'⚠️ Las deudas crecen si no las eliminas a tiempo.',
      n2:'💸 Las compras impulsivas son el mayor enemigo del ahorro.',
      n3:'📄 Las multas son gastos totalmente evitables.',
      n4:'📺 Las suscripciones que no usas drenan tu saldo mes a mes.',
    }
  },
  en: {
    subtitle: 'Defend your economy: shoot the debts and catch the income!',
    catch: 'Catch (let them reach you)', shoot: 'Shoot (destroy)',
    income:'Income', incomeD:'Move under it to catch',
    salary:'Salary', salaryD:'Catch your monthly pay',
    bonus:'Bonus', bonusD:'Extra income — don\'t shoot it!',
    invest:'Investment', investD:'Best income — never shoot it!',
    impulse:'Impulse Buy', impulseD:'Shoot before it hits',
    debt:'Debt', debtD:'Grows if not eliminated fast',
    fine:'Fine', fineD:'Avoidable expense',
    subs:'Subscription', subsD:'Slowly drains your balance',
    tax:'Tax', taxD:'Appears in unexpected patterns',
    shield:'Emergency Fund', slow:'Financial Education',
    multi:'Extra Income', burst:'Spending Optimizer',
    powerups: '← Available power-ups',
    ctrlHint: '⬅ ➡ to move • 🔫 to shoot • Catch the green ones!',
    goal:'Savings goal', energy:'energy',
    noEnergy: 'No energy. Finish the day to recover it!',
    play:'Defend!', wave:'Wave', balance:'Final balance',
    score:'Score', destroyed:'Destroyed', caught:'Caught', reward:'Reward',
    youWin:'Goal Reached! 🎉', youLose:'Balance Depleted!',
    finish:'Finish',
    winMsg: 'Excellent financial management! You shot the expenses on time and captured key income. That is financial literacy in action.',
    loseMsg: 'Debts and impulse spending drained your balance. Remember: eliminating expenses and capturing income is key to financial health.',
    msgs: {
      p1:'💡 Catching income and eliminating debt strengthens your economy.',
      p2:'📈 Great! Well-managed income builds wealth.',
      p3:'🏦 Saving part of each income gives you stability.',
      p4:'🎁 Bonuses are extra income — don\'t waste them by shooting!',
      n1:'⚠️ Debts grow if you don\'t eliminate them in time.',
      n2:'💸 Impulse purchases are the biggest enemy of savings.',
      n3:'📄 Fines are completely avoidable expenses.',
      n4:'📺 Unused subscriptions drain your balance month by month.',
    }
  }
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const WIN_BAL    = 400
const START_BAL  = 200
const GAME_SECS  = 120
const CW = 480, CH = 260
const PLAYER_Y   = 238
const GAME_BOT   = 215
const SHIP_MIN   = 28, SHIP_MAX = 452
const PLAYER_SPD = 4
const BULLET_SPD = 7
const MAX_BULLETS = 8
const SHOOT_CD   = 18   // frames between shots (normal)
const SHOOT_CD_BURST = 9

const ENEMY_DEFS = {
  income:  { emoji:'💰', pos:true,  reward:+20, label:'income'  },
  salary:  { emoji:'💼', pos:true,  reward:+40, label:'salary'  },
  bonus:   { emoji:'🎁', pos:true,  reward:+30, label:'bonus'   },
  invest:  { emoji:'📈', pos:true,  reward:+55, label:'invest'  },
  impulse: { emoji:'💸', pos:false, penalty:-20, pts:12, label:'impulse' },
  debt:    { emoji:'💳', pos:false, penalty:-32, pts:22, label:'debt', grows:true },
  fine:    { emoji:'📄', pos:false, penalty:-22, pts:15, label:'fine'    },
  subs:    { emoji:'📺', pos:false, penalty:-12, pts:8,  label:'subs'    },
  tax:     { emoji:'🏛️', pos:false, penalty:-28, pts:18, label:'tax'    },
  shield:  { emoji:'🛡️', pu:true, label:'shield' },
  slow:    { emoji:'📚', pu:true, label:'slow'   },
  multi:   { emoji:'⚡', pu:true, label:'multi'  },
  burst:   { emoji:'⚙️', pu:true, label:'burst'  },
}

const SPAWN_POOLS = [
  ['impulse','impulse','impulse','income','income','salary','subs','subs'],
  ['impulse','impulse','debt','income','salary','fine','subs','bonus'],
  ['debt','debt','impulse','tax','income','salary','invest','fine','subs'],
  ['debt','debt','tax','tax','impulse','impulse','invest','salary','bonus','fine'],
]
const SPAWN_INTERVALS = [148, 112, 86, 66]  // frames

const SHOW_POS = [
  { type:'income', emoji:'💰', nk:'income', dk:'incomeD' },
  { type:'salary', emoji:'💼', nk:'salary', dk:'salaryD' },
  { type:'bonus',  emoji:'🎁', nk:'bonus',  dk:'bonusD'  },
  { type:'invest', emoji:'📈', nk:'invest', dk:'investD' },
]
const SHOW_NEG = [
  { type:'impulse', emoji:'💸', nk:'impulse', dk:'impulseD' },
  { type:'debt',    emoji:'💳', nk:'debt',    dk:'debtD'    },
  { type:'fine',    emoji:'📄', nk:'fine',    dk:'fineD'    },
  { type:'subs',    emoji:'📺', nk:'subs',    dk:'subsD'    },
  { type:'tax',     emoji:'🏛️', nk:'tax',    dk:'taxD'     },
]
const SHOW_PU = [
  { emoji:'🛡️', nk:'shield' }, { emoji:'📚', nk:'slow' },
  { emoji:'⚡',  nk:'multi'  }, { emoji:'⚙️', nk:'burst' },
]

// Pre-generated star field
const STARS = Array.from({ length: 50 }, () => ({
  x: Math.random() * CW, y: Math.random() * CH,
  r: Math.random() * 1.3 + 0.4, b: 0.3 + Math.random() * 0.7
}))
// City silhouette
const CITY_BLDS = [
  {x:0,w:44,h:22},{x:47,w:30,h:38},{x:80,w:52,h:18},{x:136,w:40,h:30},
  {x:180,w:44,h:42},{x:228,w:58,h:16},{x:290,w:36,h:34},{x:330,w:46,h:22},
  {x:380,w:42,h:40},{x:426,w:54,h:26},
]

// ── VUE REFS ───────────────────────────────────────────────────────────────
const phase      = ref('intro')
const dBal       = ref(START_BAL)
const dWave      = ref(1)
const dScore     = ref(0)
const dPu        = ref('')
const waveMsg    = ref('')
const eduMsg     = ref('')
const eduPos     = ref(true)
const eduSummary = ref('')
const balFlash   = ref(0)
const won        = ref(false)
const penaltyOk  = ref(false)
const fBal       = ref(0)
const fScore     = ref(0)
const fKills     = ref(0)
const fCaught    = ref(0)
const cvs        = ref(null)

// Control state (plain vars for performance)
let mleft = false, mright = false, mshoot = false
// Expose setters to template
const setML = v => { mleft = v }
const setMR = v => { mright = v }
const setMS = v => { mshoot = v }

const hasEnergy = computed(() => player.energiaActual > 0)

// ── MUTABLE GAME STATE ────────────────────────────────────────────────────
let g        = null
let rafId    = null
let lastTs   = 0
let startTs  = 0
let eduTimer = null
let waveMsgTimer = null

function mkG() {
  return {
    running:   false,
    playerX:   240,
    bullets:   [],
    enemies:   [],
    floats:    [],   // floating damage/heal text
    balance:   START_BAL,
    wave:      1,
    score:     0,
    kills:     0,
    caught:    0,
    frame:     0,
    shootCD:   0,
    spawnCD:   60,
    puCD:      2400,  // power-up spawn cooldown (frames)
    hitFlash:  0,
    gainFlash: 0,
    powerups: { shield:false, slow:false, multi:false, burst:false, slowTimer:0, multiTimer:0, burstTimer:0 },
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
  const elapsed = (performance.now() - startTs) / 1000

  // Wave progression
  const newWave = Math.min(4, Math.floor(elapsed / 30) + 1)
  if (newWave !== g.wave) {
    g.wave = newWave
    dWave.value = newWave
    if (waveMsgTimer) clearTimeout(waveMsgTimer)
    waveMsg.value = `🌊 ${t('wave')} ${newWave}`
    waveMsgTimer = setTimeout(() => { waveMsg.value = '' }, 2200)
  }

  // Power-up timers
  const pu = g.powerups
  if (pu.slow)  { pu.slowTimer  -= dt; if (pu.slowTimer  <= 0) { pu.slow  = false; dPu.value = '' } }
  if (pu.multi) { pu.multiTimer -= dt; if (pu.multiTimer <= 0) { pu.multi = false; dPu.value = '' } }
  if (pu.burst) { pu.burstTimer -= dt; if (pu.burstTimer <= 0) { pu.burst = false; dPu.value = '' } }

  // Player movement
  if (mleft)  g.playerX = Math.max(SHIP_MIN, g.playerX - PLAYER_SPD * dt)
  if (mright) g.playerX = Math.min(SHIP_MAX, g.playerX + PLAYER_SPD * dt)

  // Shooting
  g.shootCD = Math.max(0, g.shootCD - dt)
  const cd = pu.burst ? SHOOT_CD_BURST : SHOOT_CD
  if (mshoot && g.shootCD <= 0 && g.bullets.length < MAX_BULLETS) {
    g.bullets.push({ x: g.playerX, y: PLAYER_Y - 20 })
    if (pu.burst) {
      g.bullets.push({ x: g.playerX - 10, y: PLAYER_Y - 14 })
      g.bullets.push({ x: g.playerX + 10, y: PLAYER_Y - 14 })
    }
    g.shootCD = cd
  }

  // Bullets
  for (const b of g.bullets) b.y -= BULLET_SPD * dt
  g.bullets = g.bullets.filter(b => b.y > -10)

  // Enemies
  const waveSpd = 0.7 + (g.wave - 1) * 0.4
  const spdMod  = pu.slow ? 0.45 : 1
  for (const e of g.enemies) {
    e.y += e.spd * waveSpd * spdMod * dt
    if (e.def.grows) {
      e.age = (e.age || 0) + dt
      e.penalty = Math.min(55, 32 + Math.floor(e.age / 180) * 7)
    }
  }

  // Bullet ↔ enemy collision
  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei]
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi]
      const dx = b.x - e.x, dy = b.y - e.y
      if (Math.sqrt(dx*dx + dy*dy) < 24) {
        g.bullets.splice(bi, 1)
        if (e.def.pu) {
          // Shot a power-up (collect on shoot)
          activatePowerup(e.def.label, e.x, e.y)
          g.enemies.splice(ei, 1)
        } else if (e.def.pos) {
          // Shot a positive enemy (wasted)
          pushFloat('-' + t(e.def.label), e.x, e.y, '#e17055')
          g.enemies.splice(ei, 1)
          showEduMsg(false, 'p4')
        } else {
          // Shot a negative enemy (good!)
          g.score += e.def.pts
          g.kills++
          g.gainFlash = 0.7
          pushFloat(`+${e.def.pts}pts`, e.x, e.y, '#ffd700')
          g.enemies.splice(ei, 1)
        }
        break
      }
    }
  }

  // Enemies reaching bottom
  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei]
    if (e.y < GAME_BOT) continue
    if (e.def.pu) {
      // Power-up at bottom: collect if player nearby
      if (Math.abs(e.x - g.playerX) < 50) {
        activatePowerup(e.def.label, e.x, GAME_BOT)
      }
      g.enemies.splice(ei, 1)
    } else if (e.def.pos) {
      // Positive: catch if player close
      if (Math.abs(e.x - g.playerX) < 48) {
        const reward = Math.round((e.def.reward || 0) * (pu.multi ? 2 : 1))
        g.balance += reward
        g.caught++
        g.score += Math.floor(reward / 2)
        g.gainFlash = 1
        pushFloat(`+$${reward}`, g.playerX, PLAYER_Y - 25, '#00b894')
        showEduMsg(true)
      }
      g.enemies.splice(ei, 1)
    } else {
      // Negative hits player
      if (pu.shield) {
        pu.shield = false
        dPu.value = ''
        pushFloat('🛡️ Bloqueado', g.playerX, PLAYER_Y - 25, '#74b9ff')
      } else {
        const loss = e.penalty || e.def.penalty
        g.balance -= loss
        g.hitFlash = 1
        pushFloat(`-$${loss}`, g.playerX, PLAYER_Y - 25, '#d63031')
        showEduMsg(false)
      }
      g.enemies.splice(ei, 1)
    }
  }

  // Debt interest mechanic
  for (const e of g.enemies) {
    if (e.def.grows && e.age % 180 < dt) showEduMsg(false, 'n1')
  }

  // Flash decay
  g.hitFlash  = Math.max(0, g.hitFlash  - 0.04 * dt)
  g.gainFlash = Math.max(0, g.gainFlash - 0.05 * dt)

  // Floating texts
  for (const f of g.floats) { f.y -= 0.7 * dt; f.age += dt }
  g.floats = g.floats.filter(f => f.age < 70)

  // Spawn enemy
  g.spawnCD -= dt
  if (g.spawnCD <= 0) {
    spawnEnemy()
    g.spawnCD = SPAWN_INTERVALS[g.wave - 1]
  }

  // Spawn power-up
  g.puCD -= dt
  if (g.puCD <= 0) {
    const puTypes = ['shield','slow','multi','burst']
    const puType  = puTypes[Math.floor(Math.random() * puTypes.length)]
    g.enemies.push({
      type: puType, def: ENEMY_DEFS[puType],
      x: 60 + Math.random() * 360, y: -20, spd: 0.5, age: 0, penalty: 0
    })
    g.puCD = 2200 + Math.random() * 1000
  }

  g.frame++
  if (g.frame % 4 === 0) {
    dBal.value   = Math.max(0, Math.floor(g.balance))
    dScore.value = g.score
  }

  // Win / lose check
  if (g.balance <= 0) stopGame(false)
  else if (g.balance >= WIN_BAL || elapsed >= GAME_SECS) stopGame(true)
}

function spawnEnemy() {
  const pool = SPAWN_POOLS[g.wave - 1]
  const type = pool[Math.floor(Math.random() * pool.length)]
  const def  = ENEMY_DEFS[type]
  g.enemies.push({
    type, def, x: 32 + Math.random() * 416, y: -18,
    spd: 0.6 + Math.random() * 0.4, age: 0,
    penalty: def.penalty || 0,
  })
}

function activatePowerup(label, x, y) {
  const pu = g.powerups
  const icon = ENEMY_DEFS[label]?.emoji ?? '⚡'
  if (label === 'shield') { pu.shield = true; dPu.value = '🛡️' }
  if (label === 'slow')   { pu.slow = true; pu.slowTimer  = 480; dPu.value = '📚' }
  if (label === 'multi')  { pu.multi = true; pu.multiTimer = 600; dPu.value = '⚡' }
  if (label === 'burst')  { pu.burst = true; pu.burstTimer = 480; dPu.value = '⚙️' }
  pushFloat(`${icon} ${t(label)}!`, x, y, '#a29bfe')
}

function pushFloat(text, x, y, color) {
  g.floats.push({ text, x, y, color, age: 0 })
}

// ── DRAW ───────────────────────────────────────────────────────────────────
function draw() {
  const ctx = cvs.value?.getContext('2d')
  if (!ctx) return

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CH)
  bg.addColorStop(0, '#0a0a1e')
  bg.addColorStop(1, '#1a1040')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CW, CH)

  // Stars
  for (const s of STARS) {
    const pulse = 0.5 + 0.5 * Math.sin(g.frame * 0.02 + s.x)
    ctx.globalAlpha = s.b * pulse
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Grid (retro feel)
  ctx.strokeStyle = 'rgba(100,80,200,0.07)'
  ctx.lineWidth = 1
  for (let x = 0; x <= CW; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke()
  }
  for (let y = 0; y <= CH; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke()
  }

  // City silhouette
  ctx.fillStyle = 'rgba(20,15,50,0.9)'
  for (const b of CITY_BLDS) ctx.fillRect(b.x, CH - b.h, b.w, b.h)

  // Player zone separator
  ctx.strokeStyle = 'rgba(100,150,255,0.18)'
  ctx.lineWidth = 1
  ctx.setLineDash([8,8])
  ctx.beginPath(); ctx.moveTo(0, GAME_BOT); ctx.lineTo(CW, GAME_BOT); ctx.stroke()
  ctx.setLineDash([])

  // Enemies
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const e of g.enemies) {
    const def = e.def
    const glow = def.pu ? 'rgba(160,120,255,0.28)'
      : def.pos ? 'rgba(0,200,100,0.25)' : 'rgba(220,60,60,0.28)'
    const ring = def.pu ? '#a29bfe' : def.pos ? '#00b894' : '#e74c3c'
    const sz   = def.grows ? Math.min(30, 22 + (e.age / 120) * 6) : 24

    // Glow circle
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(e.x, e.y, sz + 8, 0, Math.PI * 2)
    ctx.fill()
    // Ring
    ctx.strokeStyle = ring
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(e.x, e.y, sz + 8, 0, Math.PI * 2)
    ctx.stroke()
    // Emoji
    ctx.font = `${sz * 2}px serif`
    ctx.fillText(def.emoji, e.x, e.y)
    // Catch arrow for positives
    if (def.pos) {
      ctx.fillStyle = '#00b894'
      ctx.font = '10px sans-serif'
      ctx.fillText('▼CATCH', e.x, e.y + sz + 12)
    }
    // Debt growth warning
    if (def.grows && e.age > 120) {
      ctx.fillStyle = '#ff6b6b'
      ctx.font = '9px sans-serif'
      ctx.fillText(`-$${e.penalty}`, e.x, e.y - sz - 12)
    }
  }

  // Bullets
  for (const b of g.bullets) {
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.roundRect(b.x - 2, b.y - 7, 4, 14, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,200,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(b.x, b.y, 7, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Player ship
  drawShip(ctx, g.playerX, PLAYER_Y, mshoot, g.powerups.shield)

  // Floating texts
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const f of g.floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / 65)
    ctx.fillStyle   = f.color
    ctx.font        = 'bold 15px Fredoka, sans-serif'
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1

  // Hit flash
  if (g.hitFlash > 0) {
    ctx.fillStyle = `rgba(200,30,30,${g.hitFlash * 0.38})`
    ctx.fillRect(0, 0, CW, CH)
  }
  if (g.gainFlash > 0) {
    ctx.fillStyle = `rgba(0,200,100,${g.gainFlash * 0.2})`
    ctx.fillRect(0, 0, CW, CH)
  }
}

function drawShip(ctx, x, y, firing, shielded) {
  // Shield bubble
  if (shielded) {
    ctx.strokeStyle = 'rgba(100,150,255,0.6)'
    ctx.lineWidth   = 2.5
    ctx.beginPath()
    ctx.arc(x, y - 4, 26, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Engine flame (animated)
  const fPhase = g.frame % 6
  ctx.fillStyle = fPhase < 3 ? '#f39c12' : '#e74c3c'
  ctx.beginPath()
  ctx.moveTo(x - 5, y + 10)
  ctx.lineTo(x, y + 18 + (firing ? 7 : 3))
  ctx.lineTo(x + 5, y + 10)
  ctx.closePath()
  ctx.fill()
  // Left wing
  ctx.fillStyle = '#2980b9'
  ctx.beginPath()
  ctx.moveTo(x - 5, y - 4)
  ctx.lineTo(x - 18, y + 8)
  ctx.lineTo(x - 7, y + 6)
  ctx.closePath()
  ctx.fill()
  // Right wing
  ctx.beginPath()
  ctx.moveTo(x + 5, y - 4)
  ctx.lineTo(x + 18, y + 8)
  ctx.lineTo(x + 7, y + 6)
  ctx.closePath()
  ctx.fill()
  // Main body
  ctx.fillStyle = '#3498db'
  ctx.beginPath()
  ctx.moveTo(x, y - 18)
  ctx.lineTo(x + 8, y + 4)
  ctx.lineTo(x + 5, y + 10)
  ctx.lineTo(x - 5, y + 10)
  ctx.lineTo(x - 8, y + 4)
  ctx.closePath()
  ctx.fill()
  // Cockpit
  ctx.fillStyle = '#74b9ff'
  ctx.beginPath()
  ctx.ellipse(x, y - 7, 4, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  // Gun tip glow when shooting
  if (firing) {
    ctx.fillStyle = 'rgba(255,220,0,0.5)'
    ctx.beginPath()
    ctx.arc(x, y - 19, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── EDU MESSAGES ───────────────────────────────────────────────────────────
function showEduMsg(pos, forceKey) {
  const m = isEN.value ? TEXTS.en.msgs : TEXTS.es.msgs
  let msg
  if (forceKey) {
    msg = m[forceKey]
  } else {
    const pool = pos ? [m.p1, m.p2, m.p3] : [m.n1, m.n2, m.n3, m.n4]
    msg = pool[Math.floor(Math.random() * pool.length)]
  }
  eduMsg.value = msg
  eduPos.value = pos
  if (eduTimer) clearTimeout(eduTimer)
  eduTimer = setTimeout(() => { eduMsg.value = '' }, 2800)
}

// ── CONTROLS ───────────────────────────────────────────────────────────────
function onKey(e) {
  if (phase.value !== 'playing') return
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft'  || e.key === 'a') { e.preventDefault(); mleft  = down }
  if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); mright = down }
  if (e.key === ' ')  { e.preventDefault(); mshoot = down }
}

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
function startGame() {
  g = mkG()
  g.running = true
  dBal.value = START_BAL; dWave.value = 1; dScore.value = 0; dPu.value = ''
  eduMsg.value = ''; waveMsg.value = ''
  mleft = false; mright = false; mshoot = false
  phase.value  = 'playing'
  lastTs = startTs = performance.now()
  rafId  = requestAnimationFrame(loop)
}

function stopGame(didWin) {
  if (g) g.running = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  won.value      = didWin
  penaltyOk.value = !didWin && player.dineroDisponible >= 5
  fBal.value     = Math.max(0, Math.floor(g?.balance ?? 0))
  fScore.value   = g?.score ?? 0
  fKills.value   = g?.kills ?? 0
  fCaught.value  = g?.caught ?? 0
  dBal.value     = fBal.value
  eduSummary.value = didWin ? t('winMsg') : t('loseMsg')
  phase.value    = 'result'
}

function finish() {
  if (won.value) {
    const res = player.jugarMinijuego('invaders', 10)
    emit('game-completed', {
      success: true,
      recompensa: res.recompensa,
      title: t('youWin'),
      msg: `$${fBal.value} — ${fKills.value} 💥 ${fCaught.value} 🎁`
    })
  } else {
    if (penaltyOk.value) player.gastarDinero(5)
    player.jugarMinijuego('invaders', 0)
    emit('game-completed', {
      success: false,
      recompensa: 0,
      title: t('youLose'),
      msg: t('loseMsg')
    })
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup',   onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup',   onKey)
  if (rafId) cancelAnimationFrame(rafId)
  if (eduTimer) clearTimeout(eduTimer)
  if (waveMsgTimer) clearTimeout(waveMsgTimer)
  if (g) g.running = false
})
</script>

<style scoped>
/* ── CONTAINER ───────────────────────────────────────────────────────────── */
.finance-invaders {
  font-family: 'Fredoka', sans-serif;
  max-width: 480px;
  margin: 0 auto;
  user-select: none;
}

/* ── INTRO ───────────────────────────────────────────────────────────────── */
.fi-intro { display: flex; flex-direction: column; gap: 1.1rem; }
.fi-hero { text-align: center; }
.fi-hero-title { display: flex; align-items: center; justify-content: center; gap: 0.6rem; }
.fi-ship-icon { font-size: 2.2rem; animation: bob 2s ease-in-out infinite; }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
.fi-hero h1 {
  font-size: 2.4rem; margin: 0;
  background: linear-gradient(135deg, #74b9ff, #a29bfe, #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fi-sub { color: #636e72; font-size: 0.93rem; margin: 0.3rem 0 0; }

.fi-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.fi-leg-col { background: #f8fafc; border-radius: 12px; padding: 0.8rem; }
.fi-leg-col h4 { margin: 0 0 0.55rem; font-size: 0.82rem; font-weight: 800; }
.fi-leg-pos h4 { color: #065f46; }
.fi-leg-neg h4 { color: #991b1b; }
.fi-leg-row { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.4rem; }
.fi-lem { font-size: 1.4rem; }
.fi-leg-row strong { font-size: 0.8rem; display: block; color: #2d3436; }
.fi-leg-row small  { font-size: 0.7rem; color: #636e72; }

.fi-pu-row { display: flex; align-items: center; gap: 0.6rem; background: #f0eeff; padding: 0.6rem 1rem; border-radius: 10px; }
.fi-pu-badge { font-size: 1.6rem; }
.fi-pu-label { font-size: 0.8rem; color: #5b5bf6; font-weight: 700; }

.fi-ctrl-hint { background: #1a1a2e; color: #a0aec0; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; text-align: center; }

.fi-goal-row { display: flex; justify-content: space-between; background: #f8fafc; padding: 0.62rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700; color: #2d3436; }

.no-energy { text-align: center; color: #d63031; font-weight: 700; background: #fee2e2; padding: 0.75rem; border-radius: 10px; margin: 0; }

.fi-btn {
  width: 100%; padding: 0.9rem;
  background: linear-gradient(135deg, #3498db, #6c5ce7);
  color: white; border: none; border-radius: 50px;
  font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.fi-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(108,92,231,0.45); }

/* ── PLAYING ─────────────────────────────────────────────────────────────── */
.fi-playing { display: flex; flex-direction: column; align-items: center; gap: 0.45rem; }

.fi-hud {
  width: 100%; display: flex; align-items: center; gap: 0.5rem;
  background: #0d0d1e; border-radius: 12px; padding: 0.5rem 0.8rem;
  border: 1px solid rgba(100,100,200,0.2);
}
.hud-bal   { font-size: 1.1rem; font-weight: 800; color: #ffd700; min-width: 80px; transition: color 0.3s; }
.hud-wave  { flex: 1; font-size: 0.88rem; font-weight: 700; color: #a0c4ff; text-align: center; }
.hud-score { font-size: 0.9rem; font-weight: 700; color: #c8b8ff; min-width: 60px; text-align: right; }
.hud-pu    { font-size: 1.1rem; margin-left: 0.3rem; animation: pulse 0.7s ease-in-out infinite alternate; }
@keyframes pulse { from{opacity:0.7} to{opacity:1} }
.hud-pos { color: #00b894 !important; }
.hud-neg { color: #d63031 !important; }

.fi-prog { width: 100%; height: 14px; background: #1a1a2e; border-radius: 7px; overflow: hidden; position: relative; border: 1px solid rgba(100,100,200,0.2); }
.fi-prog-fill { height: 100%; background: linear-gradient(90deg, #3498db, #a29bfe, #ffd700); border-radius: 7px; transition: width 0.5s; }
.fi-prog-txt  { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 0.68rem; font-weight: 800; color: #e0e0ff; }

.fi-canvas { width: 100%; max-width: 480px; height: auto; display: block; border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,0.5), 0 0 0 2px rgba(100,100,200,0.2); }

.fi-wave-msg {
  position: absolute; left: 50%; transform: translateX(-50%);
  font-size: 1.8rem; font-weight: 800; color: #ffd700;
  text-shadow: 0 0 20px #f39c12, 0 2px 0 #c0392b;
  pointer-events: none; z-index: 10;
}
.wave-pop-enter-active, .wave-pop-leave-active { transition: opacity 0.4s, transform 0.4s; }
.wave-pop-enter-from { opacity: 0; transform: translateX(-50%) scale(1.4); }
.wave-pop-leave-to   { opacity: 0; transform: translateX(-50%) scale(0.8); }

.fi-edu-msg { width: 100%; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.86rem; font-weight: 700; text-align: center; line-height: 1.4; }
.msg-pos { background: #d1fae5; color: #065f46; }
.msg-neg { background: #fee2e2; color: #991b1b; }
.msg-pop-enter-active, .msg-pop-leave-active { transition: opacity 0.3s, transform 0.3s; }
.msg-pop-enter-from { opacity: 0; transform: translateY(6px); }
.msg-pop-leave-to   { opacity: 0; }

.fi-ctrl { display: flex; gap: 0.75rem; width: 100%; }
.fi-cb {
  flex: 1; padding: 0.85rem 0;
  background: linear-gradient(135deg, #1a1a2e, #2d2d4e);
  color: #f0f0ff; border: 1px solid rgba(100,100,200,0.25); border-radius: 50px;
  font-family: 'Fredoka', sans-serif; font-size: 1.2rem; font-weight: 700;
  cursor: pointer; touch-action: manipulation; transition: transform 0.08s;
}
.fi-cb:active { transform: scale(0.93); }
.fi-cb-shoot { background: linear-gradient(135deg, #c0392b, #e74c3c); flex: 1.4; border-color: rgba(200,50,50,0.4); font-size: 1.1rem; }
.fi-cb-move  { flex: 0.8; }

/* ── RESULT ──────────────────────────────────────────────────────────────── */
.fi-result { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.res-icon { font-size: 4rem; animation: pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes pop-in { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
.r-win  { color: #ffd700; font-size: 2rem; margin: 0; }
.r-lose { color: #e74c3c; font-size: 2rem; margin: 0; }
.r-stats { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.r-stat  { background: #f8fafc; border-radius: 12px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
.r-stat strong { font-size: 1.1rem; }
.r-pos { background: #d1fae5; grid-column: 1/-1; }
.r-neg { background: #fee2e2; grid-column: 1/-1; }
.r-pos strong { color: #00b894; font-size: 1.3rem; }
.r-neg strong { color: #d63031; font-size: 1.3rem; }
.r-edu { background: #eef0ff; color: #3730a3; border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.55; text-align: center; width: 100%; }
</style>
