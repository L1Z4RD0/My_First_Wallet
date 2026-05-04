<template>
  <div class="profile-view">
    <div class="header-section">
      <h2>Mi Perfil</h2>
      <p>Personaliza tu identidad en EduFinanzas</p>
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
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        Configuración ⚙️
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="activeTab === 'avatar'" key="avatar">
        <AvatarCreator />
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
import AvatarCreator from './AvatarCreator.vue'
import AvatarPreview from './AvatarPreview.vue'

const store = useAvatarStore()
const playerStore = usePlayerStore()
const activeTab = ref('avatar')
const slots = ['Cabeza', 'Torso', 'Piernas', 'Pies']

const confirmReset = () => {
  if (confirm('¿ESTÁS SEGURO? Esta acción no se puede deshacer y perderás todo tu dinero y progreso.')) {
    const result = playerStore.resetJuego()
    if (!result.success) {
      alert(result.msg)
    } else {
      alert(result.msg)
      location.reload() // Reload to clean everything
    }
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

@media (max-width: 768px) {
  .inventory-container {
    grid-template-columns: 1fr;
  }
}
</style>
