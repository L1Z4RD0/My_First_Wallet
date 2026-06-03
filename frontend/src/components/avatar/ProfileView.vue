<template>
  <div class="profile-view">
    <div class="header-section">
      <h2>Mi Perfil</h2>
      <p>Personaliza tu identidad en My First Wallet</p>
    </div>

    <div class="content-tabs">
      <button 
        :class="{ active: activeTab === 'avatar' }"
        @click="activeTab = 'avatar'"
      >
        Personalizar Avatar
      </button>
      <button 
        :class="{ active: activeTab === 'inventory' }"
        @click="activeTab = 'inventory'"
      >
        Inventario
      </button>
      <button 
        :class="{ active: activeTab === 'achievements' }"
        @click="activeTab = 'achievements'"
      >
        Logros 🏆
      </button>
      <button 
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        Configuración ⚙️
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="activeTab === 'avatar'" key="avatar" class="avatar-tab-layout">
        <!-- Panel izquierdo: Insignias ancladas -->
        <aside class="pinned-sidebar">
          <h3>🏅 Mis Insignias</h3>
          <p class="pinned-hint">Ancla tus logros desde la pestaña Logros</p>
          <div v-if="playerStore.achievements.some(a => a.pinned)" class="pinned-list-v">
            <div
              class="pinned-badge-card"
              v-for="achievement in playerStore.achievements.filter(a => a.pinned)"
              :key="achievement.id"
            >
              <span class="pb-icon">{{ achievement.badge }}</span>
              <div class="pb-info">
                <strong>{{ achievement.title }}</strong>
                <p>{{ achievement.description }}</p>
              </div>
            </div>
          </div>
          <div v-else class="no-pins">
            <span class="np-icon">🔒</span>
            <p>Desbloquea logros y ancla los que más te gusten</p>
          </div>
        </aside>
        <!-- Panel derecho: Personalización del avatar -->
        <div class="avatar-main">
          <AvatarCreator />
        </div>
      </div>
      <div v-else-if="activeTab === 'inventory'" key="inventory" class="inventory-section">
        <div class="inventory-container">
          <div class="equipped-preview">
            <h3>Equipado</h3>
            <div class="mini-preview">
              <AvatarPreview :config="store.avatarConfig" />
            </div>
          </div>
          
          <div class="items-list">
            <h3>Mi Colección</h3>
            <div v-if="store.inventory.length === 0" class="empty-inventory">
              <p>Aún no tienes objetos comprados. ¡Visita la tienda! 🛍️</p>
            </div>
            <div class="items-grid">
              <div class="item-card" v-for="item in store.inventory" :key="item.id">
                <span class="item-icon">{{ item.icon }}</span>
                <div class="item-details">
                  <strong>{{ item.name }}</strong>
                  <span class="item-type">{{ item.type }}</span>
                </div>
                <button 
                  class="equip-btn"
                  :class="{ active: store.avatarConfig[item.type] === item.value }"
                  @click="store.updateConfig(item.type, item.value)"
                >
                  {{ store.avatarConfig[item.type] === item.value ? 'Equipado' : 'Equipar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'achievements'" key="achievements" class="achievements-section">
        <!-- Pinned badges are shown in the Avatar tab (profile) -->

        <div class="achievement-list">
          <h3>Mis Logros</h3>
          <div class="achievement-card" v-for="achievement in playerStore.achievements" :key="achievement.id" :class="{ unlocked: achievement.unlocked }">
            <div class="achievement-left">
              <span class="badge-icon">{{ achievement.badge }}</span>
              <div>
                <strong>{{ achievement.title }}</strong>
                <p>{{ achievement.description }}</p>
              </div>
            </div>
            <div class="achievement-actions">
              <span class="difficulty-pill">{{ achievement.difficulty }}</span>
              <button
                class="btn-secondary"
                :disabled="!achievement.unlocked"
                @click="togglePin(achievement.id)"
              >
                {{ achievement.pinned ? 'Desanclar' : 'Anclar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'settings'" key="settings" class="settings-section">
        <div class="settings-card">
          <h3>Opciones Avanzadas</h3>
          <p class="warning-text">¡Cuidado! Reiniciar el juego borrará todo tu progreso (dinero, días, historial). Solo podrás hacerlo una vez cada 30 días.</p>
          
          <div class="reset-info" v-if="playerStore.ultimoReset">
            Último reinicio: {{ new Date(playerStore.ultimoReset).toLocaleDateString() }}
          </div>

          <button class="danger-btn" @click="confirmReset">
            Reiniciar Juego 🔄
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAvatarStore } from '../../store/avatar'
import { usePlayerStore } from '../../store/player'
import { showConfirm } from '../../composables/useModal'
import AvatarCreator from './AvatarCreator.vue'
import AvatarPreview from './AvatarPreview.vue'
import { showNotification } from '../../composables/useNotification'

const store = useAvatarStore()
const playerStore = usePlayerStore()
const activeTab = ref('avatar')
const slots = ['Cabeza', 'Torso', 'Piernas', 'Pies']

const confirmReset = async () => {
  const ok = await showConfirm('¿ESTÁS SEGURO? Esta acción no se puede deshacer y perderás todo tu dinero y progreso.', 'Reiniciar juego')
  if (!ok) return
  const result = playerStore.resetJuego()
  if (!result.success) {
    showNotification('warning', result.msg)
  } else {
    showNotification('success', result.msg)
    location.reload() // Reload to clean everything
  }
}

const togglePin = (id) => {
  if (!playerStore.togglePinAchievement(id)) {
    showNotification('info', 'Primero debes desbloquear el logro para poder anclarlo.')
  }
}

onMounted(() => {
  store.init()
})
</script>

<style scoped>
.profile-view {
  animation: fadeIn 0.5s ease-out;
}

.header-section {
  text-align: center;
  margin-bottom: 2rem;
}

.header-section h2 {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.content-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.content-tabs button {
  background: white;
  border: 2px solid #eee;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.content-tabs button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.inventory-section {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: var(--shadow-md);
}

.inventory-container {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

.mini-preview {
  width: 100%;
  max-width: 250px;
  margin: 1rem 0;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  transition: all 0.2s;
}

.item-card:hover {
  border-color: var(--accent-color);
}

.item-icon {
  font-size: 2.5rem;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 12px;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-type {
  font-size: 0.8rem;
  color: #999;
  text-transform: capitalize;
}

.equip-btn {
  background: #eee;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.equip-btn.active {
  background: var(--accent-color);
  color: var(--text-dark);
}

.empty-inventory {
  text-align: center;
  padding: 3rem;
  color: #999;
  font-style: italic;
}

.achievements-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pinned-achievements {
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 24px;
  box-shadow: var(--shadow-md);
}

/* Avatar tab two-column layout */
.avatar-tab-layout {
  display: grid;
  grid-template-columns: 230px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.pinned-sidebar {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 1rem;
}

.pinned-sidebar h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: var(--primary-color);
}

.pinned-hint {
  font-size: 0.78rem;
  color: #999;
  margin: 0 0 1rem;
  line-height: 1.4;
}

.avatar-main {
  min-width: 0;
}

.pinned-list-v {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pinned-badge-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #eef0ff;
  border-radius: 14px;
  padding: 0.85rem;
}

.pb-icon {
  font-size: 1.8rem;
  line-height: 1;
  flex-shrink: 0;
}

.pb-info strong {
  display: block;
  font-size: 0.85rem;
  color: var(--text-dark);
}

.pb-info p {
  font-size: 0.75rem;
  color: #636e72;
  margin: 0.2rem 0 0;
  line-height: 1.3;
}

.no-pins {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: #aaa;
}

.np-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.no-pins p {
  font-size: 0.8rem;
  line-height: 1.4;
  margin: 0;
}

.pinned-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.achievement-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 2px dashed var(--accent-color);
  padding: 1rem;
  border-radius: 20px;
  flex: 1 1 220px;
  min-width: 220px;
}

.achievement-list {
  display: grid;
  gap: 1rem;
}

.achievement-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 20px;
  border: 2px solid #f0f0f0;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.achievement-card.unlocked {
  border-color: var(--primary-color);
  box-shadow: 0 12px 24px rgba(91, 95, 251, 0.12);
}

.achievement-card:hover {
  transform: translateY(-3px);
}

.achievement-left {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.badge-icon {
  font-size: 2rem;
}

.achievement-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.difficulty-pill {
  background: #f1f2f6;
  color: #333;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  text-transform: uppercase;
  font-size: 0.8rem;
  font-weight: 700;
}

.btn-secondary {
  background: linear-gradient(135deg, var(--secondary-color), #1dd1a1);
  color: white;
  border: none;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.2s;
}

.btn-secondary:disabled {
  background: #dcdde1;
  cursor: not-allowed;
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
}

.settings-section {
  background: white;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: var(--shadow-md);
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.warning-text {
  color: #e74c3c;
  font-weight: 600;
  margin: 1.5rem 0;
  line-height: 1.6;
}

.reset-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  color: #666;
  font-size: 0.9rem;
}

.danger-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.danger-btn:hover {
  background: #c0392b;
  transform: scale(1.05);
  box-shadow: 0 10px 20px rgba(231, 76, 60, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .avatar-tab-layout {
    grid-template-columns: 1fr;
  }
  .pinned-sidebar {
    position: static;
  }
}

@media (max-width: 768px) {
  .inventory-container {
    grid-template-columns: 1fr;
  }
}
</style>
