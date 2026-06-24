<template>
  <div class="sg-container">

    <!-- ══ INTRO ══════════════════════════════════════════════════════════ -->
    <div v-if="phase === 'intro'" class="phase">
      <div class="phase-icon">🛒</div>
      <h2>{{ isEN ? 'Supermarket Sprint' : 'El Supermercado' }}</h2>

      <div class="intro-box">
        <p v-if="!isEN">
          Tienes <strong>${{ budget }}</strong> para comprar <strong>{{ items.length }} productos</strong>.
          Compara tamaños y precios — las "ofertas" no siempre convienen.
        </p>
        <p v-else>
          You have <strong>${{ budget }}</strong> to complete your shopping list.
          Read carefully — some promotions are traps. Calculate the real price per unit before you buy!
        </p>

        <div class="shopping-list-preview">
          <div v-for="item in items" :key="item.id" class="list-row">
            <span>{{ item.emoji }}</span>
            <span>{{ isEN ? item.nameEN : item.name }}</span>
            <span class="need-tag">{{ item.needed }}{{ item.unit }}</span>
          </div>
        </div>
      </div>

      <div class="joker-hint">
        💡 {{ isEN ? 'You have 1 wildcard — it reveals the best option and selects it for you (single use).' : 'Tienes 1 comodín — revela la mejor opción y la selecciona por ti (un solo uso).' }}
      </div>

      <div class="variant-badge" v-if="variant > 1">
        <span>⚡ Día {{ variant }} — {{ variantLabel }}</span>
      </div>
      <button class="btn-primary" @click="startShopping">
        {{ isEN ? '🛒 Start Shopping' : '🛒 Ir de Compras' }}
      </button>
    </div>

    <!-- ══ SHOPPING ════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'shopping'" class="phase shopping-phase">
      <div class="shop-topbar">
        <span class="item-counter">{{ isEN ? 'Item' : 'Producto' }} {{ itemIdx + 1 }}/{{ items.length }}</span>
        <span class="budget-display" :class="{ low: spent > budget * 0.8 }">
          💰 ${{ budget - spent }} {{ isEN ? 'left' : 'restante' }}
        </span>
      </div>

      <div class="item-card">
        <span class="item-big-emoji">{{ currentItem.emoji }}</span>
        <div>
          <h3>{{ isEN ? currentItem.nameEN : currentItem.name }}</h3>
          <p class="need-line">
            {{ isEN ? 'You need:' : 'Necesitas:' }}
            <strong>{{ currentItem.needed }}{{ currentItem.unit }}</strong>
          </p>
          <p v-if="isEN && currentItem.clueEN" class="clue-en">📋 {{ currentItem.clueEN }}</p>
        </div>
      </div>

      <div class="options-grid" :class="`cols-${currentItem.options.length}`">
        <div
          v-for="(opt, i) in currentItem.options"
          :key="i"
          class="opt-card"
          :class="{ selected: pick === i, trap: opt.isTrap && showCalc }"
          @click="pick = i; showCalc = false"
        >
          <div v-if="opt.promo" class="promo-ribbon">{{ opt.promo }}</div>
          <div class="opt-top">
            <span class="opt-size">{{ opt.label }}</span>
            <span class="opt-price">${{ opt.price }}</span>
          </div>
          <div v-if="showCalc" class="unit-price" :class="{ best: isOptimalOption(i) }">
            ${{ unitPrice(opt) }}/{{ currentItem.unit }}
            <span v-if="isOptimalOption(i)"> ✓</span>
          </div>
          <div v-if="opt.note && !isEN" class="opt-note">{{ opt.note }}</div>
          <div v-if="opt.noteEN && isEN" class="opt-note">{{ opt.noteEN }}</div>
        </div>
      </div>

      <div class="actions-row">
        <button
          class="btn-joker"
          :class="{ used: jokerUsed }"
          :disabled="jokerUsed"
          @click="useJoker"
        >
          {{ jokerUsed
              ? (isEN ? '💡 Used ✓' : '💡 Usado ✓')
              : (isEN ? '💡 Wildcard' : '💡 Comodín') }}
        </button>
        <button class="btn-primary" :disabled="pick === null" @click="confirmPick">
          {{ isEN ? '✓ Add to Cart' : '✓ Agregar' }}
        </button>
      </div>
    </div>

    <!-- ══ RESULT ══════════════════════════════════════════════════════════ -->
    <div v-else-if="phase === 'result'" class="phase result-phase">
      <div class="result-header" :class="scoreClass">
        <span class="result-icon">{{ scoreIcon }}</span>
        <h2>{{ isEN ? scoreEN : scoreES }}</h2>
        <p>{{ isEN ? 'Savings vs. worst choices:' : 'Ahorro vs. peores opciones:' }} <strong>${{ savings }}</strong></p>
      </div>

      <div class="choices-review">
        <div v-for="(c, i) in choices" :key="i" class="choice-line" :class="{ ok: c.optimal }">
          <span class="ci-emoji">{{ c.emoji }}</span>
          <span class="ci-name">{{ isEN ? c.nameEN : c.name }}</span>
          <span class="ci-sel">${{ c.selectedPrice }}</span>
          <span class="ci-badge" :class="c.optimal ? 'badge-ok' : 'badge-miss'">
            {{ c.optimal ? '✓' : '↓' }}
          </span>
          <span v-if="!c.optimal" class="ci-tip">
            {{ isEN ? 'Best was' : 'Mejor era' }}: ${{ c.bestPrice }} ({{ isEN ? c.bestLabelEN : c.bestLabel }})
          </span>
        </div>
      </div>

      <div class="reward-box">
        <p>{{ isEN ? 'Reward' : 'Recompensa' }}: <strong class="coins">+{{ rewardCoins }} 🪙</strong></p>
      </div>

      <button class="btn-primary" @click="finish">
        {{ isEN ? 'Finish' : 'Terminar' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../../store/player'

const props  = defineProps({ language: { type: String, default: 'es' } })
const emit   = defineEmits(['game-completed'])
const player = usePlayerStore()

const isEN    = computed(() => props.language === 'en')
const variant = computed(() => Math.min(player.diaActual, 4))

const phase      = ref('intro')
const itemIdx    = ref(0)
const pick       = ref(null)
const showCalc   = ref(false)
const spent      = ref(0)
const choices    = ref([])
const jokerUsed  = ref(false)   // one-time wildcard per game

// ── ITEM POOLS ─────────────────────────────────────────────────────────────

const allItemsES = [
  {
    id: 'rice', name: 'Arroz', nameEN: 'Rice', emoji: '🍚',
    needed: 800, unit: 'g',
    clueEN: 'You need exactly 800g. Avoid buying more than double the needed amount.',
    options: [
      { label: '500g', price: 390,  amount: 500,  promo: null,         note: null,                                noteEN: null },
      { label: '1 kg', price: 680,  amount: 1000, promo: null,         note: null,                                noteEN: 'Best value per gram' },
      { label: '250g', price: 215,  amount: 250,  promo: null,         note: 'Muy poco, necesitarás 3',          noteEN: 'Too small — you need 3 packs!' },
      { label: '2 kg', price: 1290, amount: 2000, promo: 'JUMBO PACK', note: 'Más de lo que necesitas',          noteEN: 'More than needed', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'oil', name: 'Aceite (500 ml)', nameEN: 'Oil (500 ml)', emoji: '🫙',
    needed: 500, unit: 'ml',
    clueEN: 'Get the standard size. The bulk option is poor value.',
    options: [
      { label: '250 ml',  price: 320, amount: 250,  promo: null,           note: 'Solo la mitad',     noteEN: 'Only half — buy 2?' },
      { label: '500 ml',  price: 580, amount: 500,  promo: null,           note: null,                noteEN: null },
      { label: '1 L',     price: 1200, amount: 1000, promo: 'OFERTA',      note: 'Parece barato…',   noteEN: 'Seems cheap…', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'pasta', name: 'Fideos (400g)', nameEN: 'Pasta (400g)', emoji: '🍝',
    needed: 400, unit: 'g',
    clueEN: 'Brand does NOT matter. Focus on price per gram.',
    options: [
      { label: '200g Marca A', price: 280, amount: 200, promo: null,              note: 'Solo la mitad',      noteEN: 'Only half the amount' },
      { label: '400g Marca B', price: 490, amount: 400, promo: null,              note: null,                 noteEN: null },
      { label: '3x2 de 200g',  price: 560, amount: 600, promo: '3×2',            note: 'Compra más de lo necesario', noteEN: 'More than needed — waste risk', isTrap: true },
      { label: '400g Premium', price: 750, amount: 400, promo: 'PREMIUM',        note: 'Igual calidad, más caro', noteEN: 'Same quality, more expensive', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'milk', name: 'Leche (1 litro)', nameEN: 'Milk (1 liter)', emoji: '🥛',
    needed: 1000, unit: 'ml',
    clueEN: 'You need exactly 1 liter. "Fresh" and "UHT" taste the same for cooking.',
    options: [
      { label: '500 ml',    price: 240,  amount: 500,  promo: null,           note: 'Solo la mitad',    noteEN: 'Only half' },
      { label: '1 litro',   price: 420,  amount: 1000, promo: null,           note: null,               noteEN: null },
      { label: '1L Fresca', price: 680,  amount: 1000, promo: 'FRESCA',       note: '+60% más caro',   noteEN: '60% more — same nutrition', isTrap: true },
      { label: '2 litros',  price: 790,  amount: 2000, promo: '2× AHORRO',   note: 'El doble de necesario', noteEN: 'Double quantity needed', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'bread', name: 'Pan de Molde', nameEN: 'Sliced Bread', emoji: '🍞',
    needed: 1, unit: 'pkg',
    clueEN: 'Check the description: "whole grain" and "white" have the same price — but the list says "whole grain".',
    options: [
      { label: 'Pan Blanco',      price: 380, amount: 1, promo: null,              note: null,                    noteEN: 'Regular white bread' },
      { label: 'Pan Integral',    price: 380, amount: 1, promo: null,              note: 'Misma calidad y precio', noteEN: 'Same price — matches description ✓' },
      { label: 'Pan Artesanal',   price: 890, amount: 1, promo: 'ARTESANAL',       note: '2.3× más caro, mismo uso', noteEN: '2.3× more expensive', isTrap: true },
    ],
    optimal: 1
  },
]

const allItemsEN = [
  {
    id: 'cereal', name: 'Cereal', nameEN: 'Cereal', emoji: '🥣',
    needed: 500, unit: 'g',
    clueEN: '"Economy size" does NOT mean best value. Check grams vs. price.',
    options: [
      { label: '300g',          price: 350, amount: 300, promo: null,           noteEN: null },
      { label: '500g',          price: 520, amount: 500, promo: null,           noteEN: 'Good value' },
      { label: '700g Economy',  price: 950, amount: 700, promo: 'ECONOMY SIZE', noteEN: 'More than needed + higher $/g', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'juice', name: 'Jugo de naranja', nameEN: 'Orange Juice', emoji: '🍊',
    needed: 1000, unit: 'ml',
    clueEN: 'The label says "Natural Juice" — but ALL options are 100% natural. Ignore the marketing.',
    options: [
      { label: '500 ml',              price: 310, amount: 500,  promo: null,           noteEN: 'Half the needed amount' },
      { label: '1 L Standard',        price: 560, amount: 1000, promo: null,           noteEN: null },
      { label: '1 L Natural Premium', price: 920, amount: 1000, promo: 'NATURAL',      noteEN: 'Same as standard — 64% more expensive!', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'tuna', name: 'Atún en lata', nameEN: 'Canned Tuna', emoji: '🐟',
    needed: 300, unit: 'g',
    clueEN: 'Buy exactly 300g. "Buy 3 pay 2" sounds great — but do you actually need 3?',
    options: [
      { label: '150g × 2',  price: 580, amount: 300, promo: null,      noteEN: 'Two small cans' },
      { label: '300g',      price: 520, amount: 300, promo: null,      noteEN: 'Single can — cheapest total' },
      { label: '150g × 3×2',price: 870, amount: 450, promo: 'BUY 3 PAY 2', noteEN: '50% extra you don\'t need', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'butter', name: 'Mantequilla', nameEN: 'Butter', emoji: '🧈',
    needed: 250, unit: 'g',
    clueEN: '"Unsalted" and "Salted" differ in taste only — price per gram is what matters here.',
    options: [
      { label: '125g Salted',    price: 320, amount: 125, promo: null,              noteEN: 'Only half — buy 2?' },
      { label: '250g Unsalted',  price: 590, amount: 250, promo: null,              noteEN: 'Matches needed amount' },
      { label: '500g "Savings"', price: 1050, amount: 500, promo: 'SAVE 10%',      noteEN: '10% off but double quantity wasted', isTrap: true },
    ],
    optimal: 1
  },
  {
    id: 'soap', name: 'Jabón', nameEN: 'Dish Soap', emoji: '🧴',
    needed: 500, unit: 'ml',
    clueEN: 'The "concentrated" formula — 250ml makes the same as 500ml standard. Which is cheaper per effective ml?',
    options: [
      { label: '500ml Standard',      price: 480, amount: 500,  promo: null,              noteEN: '1:1 concentration' },
      { label: '250ml Concentrated',  price: 380, amount: 500,  promo: 'CONCENTRATED',    noteEN: '250ml = 500ml effective — BEST value' },
      { label: '1L Bulk',             price: 870, amount: 1000, promo: 'BULK VALUE',      noteEN: 'More than needed', isTrap: true },
    ],
    optimal: 1
  },
]

// ── VARIANT ITEM SELECTION ─────────────────────────────────────────────────

const budget = computed(() => {
  // Budgets sized so optimal choices always fit (optimal totals ≈ $1750/3items, $2170/4, $2550/5)
  const base = { 1: 1900, 2: 2400, 3: 2900, 4: 3400 }
  return base[variant.value] ?? 2900
})

const shuffledPool = ref([])

const buildPool = () => {
  const source = isEN.value ? allItemsEN : allItemsES
  // Shuffle items AND options within each item for variety each session
  const shuffled = [...source]
    .sort(() => 0.5 - Math.random())
    .map(item => ({ ...item, options: [...item.options].sort(() => 0.5 - Math.random()) }))
  shuffledPool.value = shuffled
}

onMounted(buildPool)

const items = computed(() => {
  if (!shuffledPool.value.length) buildPool()
  const counts = { 1: 3, 2: 4, 3: 5, 4: 5 }
  return shuffledPool.value.slice(0, counts[variant.value] ?? 5)
})

const variantLabel = computed(() => {
  const labels = { 2: 'Promociones trampa', 3: 'Full complejidad', 4: 'Modo experto' }
  return labels[variant.value] ?? ''
})

const currentItem = computed(() => items.value[itemIdx.value])

// ── ACTIONS ───────────────────────────────────────────────────────────────

const startShopping = () => {
  buildPool()
  itemIdx.value   = 0
  pick.value      = null
  showCalc.value  = false
  spent.value     = 0
  choices.value   = []
  jokerUsed.value = false
  phase.value     = 'shopping'
}

const useJoker = () => {
  if (jokerUsed.value) return
  jokerUsed.value = true
  showCalc.value  = true
  // Auto-select the optimal option so player sees it chosen
  const item    = currentItem.value
  const bestIdx = item.options.reduce((bi, o, i) =>
    (o.price / o.amount) < (item.options[bi].price / item.options[bi].amount) ? i : bi, 0)
  pick.value = bestIdx
}

// ── HELPERS ───────────────────────────────────────────────────────────────

const unitPrice = (opt) => (opt.price / opt.amount).toFixed(2)

const isOptimalOption = (i) => {
  const item = currentItem.value
  const best = item.options.reduce((bi, o, idx) => {
    const ratio = o.price / o.amount
    return ratio < item.options[bi].price / item.options[bi].amount ? idx : bi
  }, 0)
  return i === best
}

// ── ACTIONS ───────────────────────────────────────────────────────────────

const confirmPick = () => {
  const item = currentItem.value
  const opt  = item.options[pick.value]
  const bestIdx = item.options.reduce((bi, o, i) =>
    (o.price / o.amount) < (item.options[bi].price / item.options[bi].amount) ? i : bi, 0)
  const best = item.options[bestIdx]

  spent.value += opt.price
  choices.value.push({
    emoji:        item.emoji,
    name:         item.name,
    nameEN:       item.nameEN,
    selectedPrice: opt.price,
    bestPrice:    best.price,
    bestLabel:    best.label,
    bestLabelEN:  best.label,
    optimal:      pick.value === bestIdx,
  })

  if (itemIdx.value < items.value.length - 1) {
    itemIdx.value++
    pick.value    = null
    showCalc.value = false
  } else {
    computeResult()
    phase.value = 'result'
  }
}

// ── RESULT LOGIC ──────────────────────────────────────────────────────────

const rewardCoins = ref(0)
const savings     = ref(0)

const computeResult = () => {
  const maxSavings = choices.value.reduce((acc, c) => {
    const item   = items.value.find(it => it.emoji === c.emoji)
    const worst  = item ? Math.max(...item.options.map(o => o.price)) : c.selectedPrice
    return acc + (worst - c.bestPrice)
  }, 0)

  const achievedSavings = choices.value.reduce((acc, c) => {
    const item   = items.value.find(it => it.emoji === c.emoji)
    const worst  = item ? Math.max(...item.options.map(o => o.price)) : c.selectedPrice
    return acc + (worst - c.selectedPrice)
  }, 0)

  savings.value = achievedSavings
  const pct     = maxSavings > 0 ? achievedSavings / maxSavings : 0
  const optimal = choices.value.filter(c => c.optimal).length
  const base    = [15, 25, 35, 50][variant.value - 1] ?? 25
  const bonus   = Math.round(base * pct)
  rewardCoins.value = bonus
}

const optimalCount = computed(() => choices.value.filter(c => c.optimal).length)
const scoreClass   = computed(() => {
  const r = optimalCount.value / choices.value.length
  return r >= 0.8 ? 'score-great' : r >= 0.5 ? 'score-ok' : 'score-bad'
})
const scoreIcon = computed(() => scoreClass.value === 'score-great' ? '🏆' : scoreClass.value === 'score-ok' ? '👍' : '📉')
const scoreES   = computed(() => scoreClass.value === 'score-great' ? '¡Compra Perfecta!' : scoreClass.value === 'score-ok' ? 'Bastante Bien' : 'Necesitas Practicar')
const scoreEN   = computed(() => scoreClass.value === 'score-great' ? 'Perfect Shopper!' : scoreClass.value === 'score-ok' ? 'Not Bad!' : 'Keep Practicing')

const finish = () => {
  const res = player.jugarMinijuego('supermercado', rewardCoins.value)
  emit('game-completed', {
    success:    res.recompensa > 0,
    recompensa: res.recompensa,
    title:      isEN.value ? scoreEN.value : scoreES.value,
    msg:        isEN.value
      ? `You chose the optimal option ${optimalCount.value}/${choices.value.length} times. Real savings: $${savings.value}.`
      : `Elegiste la opción óptima ${optimalCount.value}/${choices.value.length} veces. Ahorro real: $${savings.value}.`
  })
}
</script>

<style scoped>
.sg-container { max-width: 680px; margin: 0 auto; }

.phase { animation: fadeSlide 0.35s ease; }

@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* INTRO */
.phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
h2 { text-align: center; color: var(--primary-color); margin-bottom: 1.5rem; }

.intro-box { background: #f8fafc; border-radius: var(--border-radius-md); padding: 1.5rem; margin-bottom: 1.5rem; }
.intro-box p { font-size: 1.05rem; line-height: 1.7; text-align: center; margin-bottom: 1rem; }

.shopping-list-preview { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem; }
.list-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: white; border-radius: 10px; font-size: 0.95rem; }
.need-tag { margin-left: auto; background: var(--primary-color); color: white; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; }

.variant-badge { text-align: center; margin-bottom: 1rem; }
.variant-badge span { background: #fdcb6e; color: #6c4b00; padding: 0.3rem 1rem; border-radius: 999px; font-size: 0.85rem; font-weight: 800; }

/* SHOPPING */
.shop-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; font-weight: 700; }
.item-counter { color: #636e72; font-size: 0.9rem; }
.budget-display { background: #d1fae5; color: #065f46; padding: 0.4rem 1rem; border-radius: 999px; font-size: 1rem; }
.budget-display.low { background: #fee2e2; color: #991b1b; }

.item-card { display: flex; align-items: center; gap: 1.25rem; background: white; border-radius: var(--border-radius-md); padding: 1.25rem 1.5rem; box-shadow: var(--shadow-sm); margin-bottom: 1.25rem; }
.item-big-emoji { font-size: 3.5rem; }
.item-card h3 { margin: 0 0 0.3rem; color: var(--text-dark); }
.need-line { font-size: 0.95rem; color: #636e72; margin: 0; }
.clue-en { font-size: 0.85rem; color: #5b5fb5; background: #eef0ff; padding: 0.4rem 0.75rem; border-radius: 8px; margin-top: 0.4rem; }

.options-grid { display: grid; gap: 0.85rem; margin-bottom: 1rem; }
.options-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.options-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.options-grid.cols-4 { grid-template-columns: repeat(2, 1fr); }

.opt-card { background: white; border: 2px solid #e2e8f0; border-radius: var(--border-radius-md); padding: 1rem; cursor: pointer; position: relative; transition: all 0.18s; }
.opt-card:hover { border-color: var(--primary-color); transform: translateY(-3px); }
.opt-card.selected { border-color: var(--primary-color); background: #eef0ff; box-shadow: 0 0 0 3px rgba(91,95,251,0.15); }
.opt-card.trap.selected { border-color: #e17055; background: #fff5f5; }

.promo-ribbon { position: absolute; top: -1px; right: -1px; background: #e17055; color: white; font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 0 12px 0 8px; }

.opt-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
.opt-size { font-weight: 700; font-size: 0.95rem; }
.opt-price { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 700; color: var(--primary-color); }

.unit-price { font-size: 0.8rem; color: #636e72; margin-top: 0.3rem; background: #f1f2f6; padding: 0.2rem 0.5rem; border-radius: 6px; }
.unit-price.best { background: #d1fae5; color: #065f46; font-weight: 800; }

.opt-note { font-size: 0.78rem; color: #e17055; margin-top: 0.3rem; font-weight: 700; }

.joker-hint { background: #fff8e1; border: 1.5px solid #f1c40f; border-radius: 12px; padding: 0.7rem 1rem; font-size: 0.87rem; font-weight: 700; color: #7d5a00; text-align: center; margin-bottom: 0.5rem; }

.actions-row { display: flex; gap: 0.75rem; margin-top: 0.75rem; }

.btn-joker {
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  color: white; border: none; padding: 0.65rem 1.3rem;
  border-radius: 20px; font-size: 0.9rem; font-weight: 800;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  box-shadow: 0 3px 10px rgba(241,196,15,0.45);
  letter-spacing: 0.3px;
}
.btn-joker:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(241,196,15,0.55); }
.btn-joker.used, .btn-joker:disabled {
  background: linear-gradient(135deg, #b2bec3, #95a5a6);
  box-shadow: none; cursor: not-allowed; opacity: 0.75;
  transform: none;
}
.btn-primary { flex: 1; background: linear-gradient(135deg, var(--primary-color), #a29bfe); color: white; border: none; padding: 0.85rem 1.5rem; border-radius: 50px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
.btn-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(91,95,251,0.35); }

/* RESULT */
.result-header { text-align: center; border-radius: var(--border-radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; }
.result-header h2 { margin: 0.5rem 0 0.4rem; }
.result-header p { margin: 0; font-size: 1rem; opacity: 0.9; }
.result-icon { font-size: 3.5rem; display: block; }
.score-great { background: linear-gradient(135deg, #00b894, #55efc4); color: white; }
.score-ok    { background: linear-gradient(135deg, #fdcb6e, #e17055); color: white; }
.score-bad   { background: linear-gradient(135deg, #b2bec3, #636e72); color: white; }

.choices-review { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
.choice-line { display: flex; align-items: center; gap: 0.6rem; background: white; border-radius: 12px; padding: 0.75rem 1rem; flex-wrap: wrap; box-shadow: var(--shadow-sm); }
.choice-line.ok { border-left: 4px solid #00b894; }
.ci-emoji { font-size: 1.3rem; }
.ci-name { flex: 1; font-weight: 700; font-size: 0.9rem; }
.ci-sel { font-weight: 800; color: var(--text-dark); font-size: 1rem; }
.badge-ok   { background: #d1fae5; color: #065f46; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; }
.badge-miss { background: #fee2e2; color: #991b1b; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; }
.ci-tip { width: 100%; font-size: 0.78rem; color: #e17055; font-weight: 700; padding-left: 1.9rem; }

.reward-box { text-align: center; background: linear-gradient(135deg, #fdcb6e, #ffeaa7); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1.25rem; }
.coins { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #6c4b00; }
</style>
