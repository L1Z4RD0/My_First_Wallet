<template>
  <header class="app-header">
    <div class="logo">
      <h1>💼 My First Wallet</h1>
      <div class="game-time">
        <span class="day-badge">Día {{ playerStore.diaActual }}</span>
        <button class="end-day-btn" @click="terminarDia">Terminar Día 🌙</button>
      </div>
    </div>
    
    <nav class="nav-links">
      <button :class="['nav-btn', { active: currentView === 'games' }]" @click="$emit('change-view', 'games')">Juegos</button>
      <button :class="['nav-btn', { active: currentView === 'wallet' }]" @click="$emit('change-view', 'wallet')">Billetera</button>
      <button :class="['nav-btn', { active: currentView === 'profile' }]" @click="$emit('change-view', 'profile')">Perfil</button>
      <button :class="['nav-btn', { active: currentView === 'shop' }]" @click="$emit('change-view', 'shop')">Tienda 🛒</button>
    </nav>

    <div class="status-widgets">
      <div class="streak-widget" title="Racha de conexión">
        <span class="icon">🔥</span>
        <span class="value">{{ currentStreak }} días</span>
      </div>

      <div class="badge-widget" title="Logros desbloqueados">
        <span class="icon">🏅</span>
        <span class="value">{{ achievementsCount }}</span>
      </div>

      <div class="wallet-widget" @click="$emit('change-view', 'wallet')" style="cursor: pointer;" title="Dinero Disponible">
        <span class="wallet-icon">💰</span>
        <div class="wallet-info">
          <span class="wallet-label">Disponible</span>
          <span class="wallet-balance">${{ playerStore.dineroDisponible }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { usePlayerStore } from '../store/player'

defineProps({
  currentView: {
    type: String,
    default: 'games'
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  achievementsCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['change-view'])

const playerStore = usePlayerStore()

const terminarDia = () => {
  if (confirm('¿Estás seguro de terminar el día? Se cobrarán tus gastos diarios (20 monedas).')) {
    playerStore.terminarDia()
    if (playerStore.enDeuda) {
      alert(`¡Cuidado! Tus gastos fueron mayores que tu dinero y has entrado en deuda por ${playerStore.deuda} monedas. Mañana tendrás menos energía.`)
    } else {
      alert(`¡Día terminado con éxito! Bienvenido al día ${playerStore.diaActual}.`)
    }
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 1rem;
}

.logo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.logo h1 {
  font-size: 1.9rem;
  color: var(--primary-color);
  margin: 0;
}

.game-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.day-badge {
  background: #dfe6e9;
  color: #2d3436;
  font-weight: 800;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.9rem;
}

.end-day-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 0.35rem 0.9rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.end-day-btn:hover {
  background: #5b4db8;
  transform: translateY(-2px);
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-btn {
  background: white;
  border: 2px solid #dfe6e9;
  padding: 0.5rem 1.4rem;
  border-radius: 20px;
  font-family: 'Nunito', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-dark);
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: #f1f2f6;
  border-color: #b2bec3;
}

.nav-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: #5b4db8;
  transform: scale(1.03);
}

.status-widgets {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.streak-widget, .badge-widget, .energy-widget, .debt-widget {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 1rem;
  background: #f7f9fc;
  color: #2d3436;
  border: 1px solid #e3e8ef;
}

.wallet-widget {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, var(--accent-color), #ffd32a);
  padding: 0.75rem 1.3rem;
  border-radius: 50px;
  box-shadow: 0 4px 10px rgba(255, 230, 109, 0.4);
  transition: var(--transition);
}

.wallet-widget:hover {
  transform: scale(1.05);
}

.wallet-icon {
  font-size: 1.8rem;
}

.wallet-info {
  display: flex;
  flex-direction: column;
}

.wallet-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #8a6b00;
  text-transform: uppercase;
}

.wallet-balance {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #3d3d3d;
}
</style>
